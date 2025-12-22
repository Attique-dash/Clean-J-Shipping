import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { getAuthFromRequest } from "@/lib/rbac";
import { sendPaymentReceiptEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { trackingNumber, amount, currency, paymentMethod, paypalOrderId } = body;

    if (!trackingNumber || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user
    const userId = (payload as any).uid || (payload as any)._id;
    const user = await User.findById(userId).select("email firstName lastName name");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find package
    const pkg = await Package.findOne({ trackingNumber });
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Verify user owns this package
    if (pkg.userCode !== (payload as any).userCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update invoice record
    const invoiceRecords = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
    if (invoiceRecords.length > 0) {
      const latestRecord = invoiceRecords[invoiceRecords.length - 1];
      latestRecord.status = "paid";
      latestRecord.paymentDate = new Date();
      latestRecord.paymentMethod = paymentMethod;
      latestRecord.paypalOrderId = paypalOrderId || undefined;
      
      await Package.findByIdAndUpdate(pkg._id, {
        $set: {
          invoiceRecords,
          updatedAt: new Date(),
        },
        $push: {
          history: {
            status: pkg.status,
            at: new Date(),
            note: `Payment received: ${amount} ${currency || "JMD"} via ${paymentMethod}`,
          },
        },
      });
    }

    // Record transaction in Payment model for admin dashboard
    const userCode = (payload as any).userCode || pkg.userCode;
    await Payment.create({
      userCode,
      customer: userId,
      trackingNumber,
      amount: Number(amount),
      currency: currency || "JMD",
      method: (paymentMethod === "paypal" ? "paypal" : paymentMethod) as any,
      status: "captured",
      gatewayId: paypalOrderId || undefined,
      reference: invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber || trackingNumber,
      meta: {
        paypalOrderId: paypalOrderId || undefined,
        invoiceNumber: invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber,
      },
    }).catch((err) => {
      console.error("Failed to record payment transaction:", err);
      // Don't fail the payment if transaction recording fails
    });

    // Send confirmation email
    const customerName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user as any).name || user.email;

    if (user.email) {
      sendPaymentReceiptEmail({
        to: user.email,
        firstName: customerName.split(" ")[0] || customerName,
        amount,
        currency: currency || "JMD",
        method: paymentMethod,
        trackingNumber,
        reference: invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber,
        receiptNumber: paypalOrderId || `PAY-${Date.now()}`,
        paidAt: new Date(),
      }).catch((err) => {
        console.error("Failed to send payment confirmation email:", err);
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      trackingNumber,
      amount,
      currency: currency || "JMD",
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

