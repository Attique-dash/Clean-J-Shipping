import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { Payment } from "@/models/Payment";
import Invoice from "@/models/Invoice";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const { amount, method, reference, gatewayId } = body;

    // Get package details
    const packageData = await Package.findById(id);
    if (!packageData) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Get customer details
    const customer = await User.findOne({ userCode: packageData.userCode });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create payment
    const payment = new Payment({
      userCode: packageData.userCode,
      customer: customer._id,
      amount: amount,
      currency: "USD",
      method: method,
      reference: reference,
      gatewayId: gatewayId,
      status: "captured",
      trackingNumber: packageData.trackingNumber,
      meta: {
        packageId: packageData._id,
        paymentDate: new Date()
      }
    });

    await payment.save();

    // Update any related invoices
    const invoices = await Invoice.find({ package: id, status: { $in: ['draft', 'sent'] } });
    for (const invoice of invoices) {
      const newAmountPaid = invoice.amountPaid + amount;
      invoice.amountPaid = newAmountPaid;
      invoice.balanceDue = invoice.total - newAmountPaid;
      
      if (invoice.balanceDue <= 0) {
        invoice.status = 'paid';
        invoice.amountPaid = invoice.total;
        invoice.balanceDue = 0;
      }
      
      await invoice.save();
    }

    return NextResponse.json({
      message: "Payment recorded successfully",
      payment: {
        id: payment._id,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        trackingNumber: payment.trackingNumber
      }
    });

  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    // Get payments for this package
    const payments = await Payment.find({ trackingNumber: id })
      .sort({ createdAt: -1 })
      .select('amount method status reference gatewayId createdAt');

    return NextResponse.json({ payments });

  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
