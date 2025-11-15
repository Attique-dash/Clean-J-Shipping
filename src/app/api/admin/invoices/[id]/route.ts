import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Invoice, { IInvoice } from '@/models/Invoice';
import { Types } from 'mongoose';

// Get invoice by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const invoice = await Invoice.findById(params.id)
      .populate('package', 'tracking_number user_code description weight')
      .populate('shipment', 'trackingNumber status currentLocation');

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// Update invoice
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const data = await req.json();
    const updates: Partial<IInvoice> = { ...data };

    // If items are being updated, recalculate totals
    if (data.items) {
      const invoice = await Invoice.findById(params.id);
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      
      invoice.items = data.items;
      invoice.calculateTotals();
      
      // Only update the fields that were changed
      updates.subtotal = invoice.subtotal;
      updates.taxTotal = invoice.taxTotal;
      updates.discountAmount = invoice.discountAmount;
      updates.total = invoice.total;
      updates.balanceDue = invoice.balanceDue;
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('package', 'tracking_number user_code')
      .populate('shipment', 'trackingNumber status');

    if (!updatedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// Delete invoice
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    const deletedInvoice = await Invoice.findByIdAndDelete(params.id);

    if (!deletedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
