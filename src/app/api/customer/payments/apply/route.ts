import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const { payment_id_paypal, package_id, invoice_number, amount, currency } = await req.json();

    if (!payment_id_paypal) {
      return NextResponse.json({ error: "PayPal payment ID required" }, { status: 400 });
    }

    // For PayPal, we assume the payment was successful if this endpoint is called
    // In a real implementation, you would verify the payment with PayPal API
    const paymentAmount = amount || 0;
    const paymentCurrency = currency || "USD";

    // Find the package if package_id is provided
    let pkg = null;
    if (package_id) {
      pkg = await Package.findOne({ _id: package_id, userCode: payload.userCode });
      if (!pkg) {
        return NextResponse.json({ error: "Package not found" }, { status: 404 });
      }
    }

    // Update package with payment information
    if (pkg) {
      const invoiceRecords = pkg.invoiceRecords || [];
      
      if (invoice_number) {
        // Update specific invoice record
        const invoiceIndex = invoiceRecords.findIndex(
          (record: any) => record.invoiceNumber === invoice_number
        );
        
        if (invoiceIndex !== -1) {
          const currentPaid = invoiceRecords[invoiceIndex].amountPaid || 0;
          const totalValue = invoiceRecords[invoiceIndex].totalValue || 0;
          const newAmountPaid = currentPaid + paymentAmount;
          
          invoiceRecords[invoiceIndex].amountPaid = newAmountPaid;
          invoiceRecords[invoiceIndex].status = newAmountPaid >= totalValue ? "paid" : "partially_paid";
          invoiceRecords[invoiceIndex].lastPaymentDate = new Date();
          invoiceRecords[invoiceIndex].paymentMethod = "paypal";
        }
      } else {
        // Add or update payment record
        invoiceRecords.push({
          invoiceNumber: `PAY-${Date.now().toString(36).toUpperCase()}`,
          invoiceDate: new Date(),
          currency,
          totalValue: paymentAmount,
          amountPaid: paymentAmount,
          status: "paid",
          paymentMethod: "paypal",
          paypalOrderId: payment_id_paypal,
        });
      }

      // Update package
      await Package.findByIdAndUpdate(package_id, {
        invoiceRecords,
        paymentStatus: "paid",
        $push: {
          paymentHistory: {
            paymentAmount,
            currency,
            paymentMethod: "paypal",
            paypalPaymentId: payment_id_paypal,
            timestamp: new Date(),
            status: "completed",
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      payment_applied: {
        amount: paymentAmount,
        currency: paymentCurrency,
        paypal_payment_id: payment_id_paypal,
        package_id: pkg?._id,
        tracking_number: pkg?.trackingNumber,
        invoice_number,
      }
    });
  } catch (error) {
    console.error("Payment application error:", error);
    return NextResponse.json(
      { error: "Failed to apply payment" },
      { status: 500 }
    );
  }
}
