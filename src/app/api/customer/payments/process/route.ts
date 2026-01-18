import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import Invoice from "@/models/Invoice";
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
    const { trackingNumber, amount, currency, paymentMethod, paypalOrderId, cardDetails } = body;

    if (!trackingNumber || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields: trackingNumber, amount, and paymentMethod are required" },
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

    // Find invoice associated with this tracking number
    let invoice = await Invoice.findOne({
      $or: [
        { tracking_number: trackingNumber },
        { package: pkg._id }
      ]
    }).populate('package');

    let invoiceNumber: string | undefined;
    let paymentAmount = Number(amount);
    let paymentCurrency = currency || "USD";

    // Update Invoice model if found
    if (invoice) {
      invoiceNumber = invoice.invoiceNumber;
      paymentCurrency = invoice.currency || paymentCurrency;
      
      // Calculate new payment amounts
      const newAmountPaid = (invoice.amountPaid || 0) + paymentAmount;
      const newBalanceDue = Math.max(0, invoice.total - newAmountPaid);
      const newStatus = newBalanceDue <= 0 ? "paid" : newAmountPaid > 0 ? "sent" : invoice.status;

      // Update invoice
      invoice.amountPaid = newAmountPaid;
      invoice.balanceDue = newBalanceDue;
      invoice.status = newStatus as any;

      // Add to payment history
      if (!invoice.paymentHistory) {
        invoice.paymentHistory = [];
      }
      invoice.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        method: paymentMethod,
        reference: paypalOrderId || `PAY-${Date.now()}`,
      });

      await invoice.save();
      console.log(`Updated invoice ${invoiceNumber} with payment: ${paymentAmount} ${paymentCurrency}`);
    }

    // Update package invoice records
    const invoiceRecords = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
    if (invoiceRecords.length > 0) {
      const latestRecord = invoiceRecords[invoiceRecords.length - 1];
      const currentPaid = latestRecord.amountPaid || 0;
      const totalValue = latestRecord.totalValue || 0;
      const newAmountPaid = currentPaid + paymentAmount;
      
      latestRecord.amountPaid = newAmountPaid;
      latestRecord.status = newAmountPaid >= totalValue ? "paid" : "partially_paid";
      latestRecord.paymentDate = new Date();
      latestRecord.paymentMethod = paymentMethod;
      if (paypalOrderId) {
        latestRecord.paypalOrderId = paypalOrderId;
      }
      
      await Package.findByIdAndUpdate(pkg._id, {
        $set: {
          invoiceRecords,
          updatedAt: new Date(),
        },
        $push: {
          history: {
            status: pkg.status,
            at: new Date(),
            note: `Payment received: ${paymentAmount} ${paymentCurrency} via ${paymentMethod}`,
          },
        },
      });
      
      console.log(`Updated package ${trackingNumber} invoice records`);
    }

    // Record transaction in Payment model for Bills History
    const userCode = (payload as any).userCode || pkg.userCode;
    
    // Generate unique transaction ID to avoid duplicate key errors
    const uniqueTransactionId = paypalOrderId || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const paymentGateway = paypalOrderId ? "paypal" : "Testing";
    
    const paymentRecord = await Payment.create({
      userCode,
      customer: userId,
      trackingNumber,
      amount: paymentAmount,
      currency: paymentCurrency,
      method: paymentMethod as any,
      status: "captured",
      gatewayId: paypalOrderId || uniqueTransactionId,
      reference: invoiceNumber || invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber || trackingNumber,
      transactionId: uniqueTransactionId,
      meta: {
        paypalOrderId: paypalOrderId || undefined,
        invoiceNumber: invoiceNumber || invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber,
        paymentNumber: paymentNumber,
        paymentGateway: paymentGateway,
        cardDetails: cardDetails ? {
          // Only store last 4 digits for security
          last4: cardDetails.cardNumber ? cardDetails.cardNumber.replace(/\s/g, '').slice(-4) : undefined,
          expiry: cardDetails.expiry,
        } : undefined,
      },
    } as any); // Use 'as any' to allow extra fields like paymentNumber, paymentGateway that may be used elsewhere

    console.log(`Created payment record: ${paymentRecord._id}`);

    // Email functionality disabled for testing - payment works without email
    // Uncomment below if you want to enable email notifications in production
    /*
    const customerName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user as any).name || user.email;

    if (user.email) {
      sendPaymentReceiptEmail({
        to: user.email,
        firstName: customerName.split(" ")[0] || customerName,
        amount: paymentAmount,
        currency: paymentCurrency,
        method: paymentMethod,
        trackingNumber,
        reference: invoiceNumber || invoiceRecords[invoiceRecords.length - 1]?.invoiceNumber,
        receiptNumber: uniqueTransactionId,
        paidAt: new Date(),
      })
      .then((emailResult) => {
        if (emailResult.sent) {
          console.log(`Payment receipt email sent to ${user.email}`);
        } else {
          console.log(`Payment receipt email failed: ${emailResult.reason}`);
        }
      })
      .catch((err) => {
        console.error("Failed to send payment receipt email:", err);
      });
    }
    */

    // Return success response immediately - payment is complete
    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      trackingNumber,
      amount: paymentAmount,
      currency: paymentCurrency,
      invoiceNumber: invoiceNumber || undefined,
      paymentId: paymentRecord._id.toString(),
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationError = error as any;
      const errors = Object.keys(validationError.errors || {}).map(key => {
        return `${key}: ${validationError.errors[key].message}`;
      });
      return NextResponse.json(
        {
          error: "Validation error",
          details: errors.join(', ') || "Invalid payment data",
        },
        { status: 400 }
      );
    }
    
    // Handle duplicate key errors
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        {
          error: "Duplicate transaction",
          details: "This payment has already been processed",
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Failed to process payment",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

