import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';

export async function generateInvoice(shipment: any) {
  try {
    await dbConnect();
    
    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(6, "0")}`;
    
    // Calculate total amount
    const totalAmount = shipment.shippingCost || 0;
    
    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      currency: "USD",
      customer: {
        id: shipment.sender?.id || shipment.sender?.email || "unknown",
        name: shipment.sender?.name || shipment.sender?.email || "Unknown Sender",
        email: shipment.sender?.email || "",
        phone: shipment.sender?.phone || "",
        address: shipment.sender?.address || "",
        city: shipment.sender?.city || "",
        country: shipment.sender?.country || "",
      },
      items: [{
        description: `Shipping for ${shipment.description || 'package'}`,
        quantity: 1,
        unitPrice: totalAmount,
        taxRate: 0,
        amount: totalAmount,
        taxAmount: 0,
        total: totalAmount,
      }],
      subtotal: totalAmount,
      taxTotal: 0,
      discountAmount: 0,
      total: totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      shipment: shipment._id,
      status: "sent",
    });
    
    return invoice;
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

export async function generateInvoiceNumber() {
  try {
    await dbConnect();
    const invoiceCount = await Invoice.countDocuments();
    return `INV-${String(invoiceCount + 1).padStart(6, "0")}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw error;
  }
}
