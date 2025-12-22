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
    const { items, totalAmount, currency, paymentMethod, paypalOrderId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid total amount" },
        { status: 400 }
      );
    }

    // Get user
    const userId = (payload as any).uid || (payload as any)._id;
    const user = await User.findById(userId).select("email firstName lastName name userCode");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userCode = (user as any).userCode || (payload as any).userCode;
    const results: Array<{ trackingNumber: string; success: boolean; error?: string }> = [];
    const processedPackages: any[] = [];

    // Process each item
    for (const item of items) {
      const { trackingNumber, amount, invoiceNumber } = item;

      try {
        // Find package
        const pkg = await Package.findOne({ trackingNumber });
        if (!pkg) {
          results.push({ trackingNumber, success: false, error: "Package not found" });
          continue;
        }

        // Verify user owns this package
        if (pkg.userCode !== userCode) {
          results.push({ trackingNumber, success: false, error: "Unauthorized" });
          continue;
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
                note: `Payment received: ${amount} ${currency || "JMD"} via ${paymentMethod} (Bulk payment)`,
              },
            },
          });
        }

        // Record transaction in Payment model for admin dashboard
        await Payment.create({
          userCode: userCode,
          customer: userId,
          trackingNumber,
          amount: Number(amount),
          currency: currency || "JMD",
          method: (paymentMethod === "paypal" ? "paypal" : paymentMethod) as any,
          status: "captured",
          gatewayId: paypalOrderId || undefined,
          reference: invoiceNumber || trackingNumber,
          meta: {
            paypalOrderId: paypalOrderId || undefined,
            invoiceNumber: invoiceNumber,
            bulkPayment: true,
            totalItems: items.length,
          },
        }).catch((err) => {
          console.error(`Failed to record payment transaction for ${trackingNumber}:`, err);
        });

        processedPackages.push({ pkg, amount, invoiceNumber });
        results.push({ trackingNumber, success: true });
      } catch (error) {
        console.error(`Error processing payment for ${trackingNumber}:`, error);
        results.push({
          trackingNumber,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Send confirmation email for bulk payment
    const customerName = (user as any).firstName && (user as any).lastName
      ? `${(user as any).firstName} ${(user as any).lastName}`
      : (user as any).name || user.email;

    if (user.email && processedPackages.length > 0) {
      sendPaymentReceiptEmail({
        to: user.email,
        firstName: customerName.split(" ")[0] || customerName,
        amount: totalAmount,
        currency: currency || "JMD",
        method: paymentMethod,
        trackingNumber: processedPackages.map(p => p.pkg.trackingNumber).join(", "),
        reference: paypalOrderId || `BULK-${Date.now()}`,
        receiptNumber: paypalOrderId || `PAY-${Date.now()}`,
        paidAt: new Date(),
      }).catch((err) => {
        console.error("Failed to send payment confirmation email:", err);
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      message: `Processed ${successCount} of ${items.length} payment${items.length !== 1 ? 's' : ''}`,
      results,
      totalAmount,
      currency: currency || "JMD",
      processedCount: successCount,
      failedCount: failureCount,
    });
  } catch (error) {
    console.error("Bulk payment processing error:", error);
    return NextResponse.json(
      {
        error: "Failed to process bulk payment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

