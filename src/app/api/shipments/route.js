import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';
import { generateInvoice } from '@/utils/invoiceGenerator';
import { sendEmail } from '@/utils/email';

export async function POST(request) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Calculate shipping cost (you can expand this function as needed)
    const calculateShippingCost = (data) => {
      const baseRate = 10; // $10 base
      const weightRate = 2; // $2 per kg
      
      let cost = baseRate + (data.weight * weightRate);
      
      // Add insurance if needed
      if (data.insuranceRequired) {
        cost += 15;
      }
      
      return cost;
    };

    const shipment = new Shipment({
      sender: data.sender,
      receiver: data.receiver,
      weight: data.weight,
      dimensions: data.dimensions,
      description: data.description,
      shippingCost: calculateShippingCost(data),
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        notes: 'Shipment created'
      }],
      paymentStatus: 'pending',
      estimatedDeliveryDate: data.estimatedDeliveryDate
    });
    
    // Save the shipment first to get the _id
    await shipment.save();
    
    try {
      // Generate and save invoice
      const invoice = await generateInvoice(shipment);
      
      // Update shipment with invoice details
      shipment.invoiceNumber = invoice.number;
      shipment.invoiceUrl = invoice.url;
      await shipment.save();
      
      // Send confirmation email with invoice
      if (shipment.sender?.email) {
        await sendEmail({
          to: shipment.sender.email,
          subject: `Invoice #${invoice.number} - Clean J Shipping`,
          html: `
            <h2>Thank you for your shipment!</h2>
            <p>Your shipment has been created successfully.</p>
            <p><strong>Tracking Number:</strong> ${shipment.trackingNumber}</p>
            <p><strong>Invoice Number:</strong> ${invoice.number}</p>
            <p><strong>Total Amount:</strong> $${invoice.total}</p>
            <p>You can download your invoice <a href="${process.env.NEXT_PUBLIC_APP_URL}${invoice.url}">here</a>.</p>
            <p>Track your shipment: <a href="${process.env.NEXT_PUBLIC_APP_URL}/track/${shipment.trackingNumber}">Track Now</a></p>
          `
        });
      }
    } catch (error) {
      console.error('Error generating invoice or sending email:', error);
      // Don't fail the request if invoice generation or email fails
    }
    
    return NextResponse.json({
      success: true,
      data: shipment,
      message: 'Shipment created successfully'
    }, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const query = {};
    
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    const skip = (page - 1) * limit;
    
    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shipment.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      data: shipments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
