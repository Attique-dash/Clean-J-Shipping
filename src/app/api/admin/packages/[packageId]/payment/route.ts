import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import {
  parsePackagePayments,
  serializePackagePayments,
  toKcdPackage,
} from "@/lib/package-format";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ packageId: string }> | { packageId: string } }
) {
  try {
    await dbConnect();

    const auth = await getAuthFromRequest(req);
    if (!auth?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!['admin', 'staff', 'warehouse_staff', 'customer_support'].includes(auth.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { packageId } = await params;
    const body = await req.json();
    const { paymentStatus, paymentMethod, amountPaid, paymentNote } = body;

    if (!paymentStatus) {
      return NextResponse.json(
        { success: false, error: "paymentStatus is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "paid", "partially_paid"];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid payment status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const { Package } = await import("@/models/Package");
    const packageItem = await Package.findById(packageId);
    if (!packageItem) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 });
    }

    const doc = packageItem.toObject() as Record<string, unknown>;
    const current = parsePackagePayments(
      String(doc.PackagePayments || doc.packagePayments || ''),
      doc
    );

    let totalAmountUsd = current.totalAmountUsd;
    if (totalAmountUsd <= 0) {
      totalAmountUsd = current.itemValueUsd + current.shippingCostUsd;
    }

    const paidAmount =
      paymentStatus === "paid"
        ? amountPaid ?? totalAmountUsd
        : paymentStatus === "partially_paid"
          ? amountPaid ?? current.amountPaidUsd
          : current.amountPaidUsd;

    const paymentMeta = {
      ...current,
      paymentStatus,
      paymentMethod: paymentMethod || "cash",
      totalAmountUsd,
      amountPaidUsd: paidAmount,
      currency: current.currency || "USD",
    };

    const updateData: Record<string, unknown> = {
      paymentStatus,
      paymentMethod: paymentMethod || "cash",
      totalAmount: totalAmountUsd,
      amountPaid: paidAmount,
      amountPaidCurrency: current.currency || "USD",
      paymentCurrency: current.currency || "USD",
      itemValueUSD: current.itemValueUsd,
      PackagePayments: serializePackagePayments(paymentMeta),
    };

    if (paymentStatus === "paid") {
      updateData.paidAt = new Date();
      updateData.paidBy = auth.email || "admin";
    }

    const paymentHistoryEntry = {
      timestamp: new Date(),
      status: paymentStatus,
      amountPaid: paidAmount,
      paymentMethod: paymentMethod || "cash",
      note: paymentNote || `Payment status updated to ${paymentStatus} by admin`,
      updatedBy: auth.email || "admin",
    };

    const updatedPackage = await Package.findByIdAndUpdate(
      packageId,
      {
        $set: updateData,
        $push: { paymentHistory: paymentHistoryEntry },
      },
      { new: true, runValidators: true }
    );

    const updatedDoc = updatedPackage!.toObject() as Record<string, unknown>;
    const billingInvoiceId = updatedDoc.billingInvoiceId;
    if (billingInvoiceId) {
      try {
        const Invoice = (await import('@/models/Invoice')).default;
        const invoice = (await Invoice.findById(billingInvoiceId).lean()) as any;
        const invoiceTotal = invoice?.total ?? totalAmountUsd;
        const invoiceCurrency = (invoice?.currency as string) || current.currency || 'USD';
        const amountPaidLocal = paidAmount;
        const balanceDue = Math.max(0, invoiceTotal - amountPaidLocal);
        const invoiceStatus =
          balanceDue <= 0 ? 'paid' : amountPaidLocal > 0 ? 'partially_paid' : 'unpaid';

        await Invoice.findByIdAndUpdate(billingInvoiceId, {
          $set: {
            amountPaid: amountPaidLocal,
            balanceDue,
            status: invoiceStatus,
            updatedAt: new Date(),
          },
          $push: {
            paymentHistory: {
              amount: amountPaidLocal,
              date: new Date(),
              method: paymentMethod || 'cash',
              reference: paymentNote || undefined,
            },
          },
        });
      } catch (invoiceErr) {
        console.error('Failed to update billing invoice on payment:', invoiceErr);
      }
    }

    const kcd = toKcdPackage(updatedDoc);

    return NextResponse.json({
      success: true,
      message: `Package payment status updated to ${paymentStatus}`,
      package: kcd,
      paymentUpdate: paymentHistoryEntry,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update payment status";
    console.error("Error updating package payment status:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
