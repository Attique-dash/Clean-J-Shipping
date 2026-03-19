// src/app/api/customer/bills/[billNumber]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/rbac';
import { dbConnect } from '@/lib/db';
import { Bill, IBill } from '@/models/Bill';
import Package, { IPackage } from '@/models/Package';
import { Types } from 'mongoose';

// GET - Fetch single bill details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ billNumber: string }> }
) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billNumber } = await params;

    await dbConnect();

    // Find the bill with lean and proper typing
    const bill = await Bill.findOne({
      billNumber,
      customerId: new Types.ObjectId(userId)
    }).lean() as IBill & { _id: Types.ObjectId } | null;

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Fetch package details for each package in the bill
    const packageIds = bill.packages.map((p: IBill['packages'][0]) => p.packageId);
    const packages = await Package.find({
      _id: { $in: packageIds }
    }).lean();

    const packageMap = new Map<string, unknown>(
      packages.map((p) => [String((p as { _id: { toString(): string }})._id), p])
    );

    // Format response with full package details
    const formattedBill = {
      billId: bill._id?.toString(),
      billNumber: bill.billNumber,
      status: bill.status,
      
      // Financial Details
      itemTotal: bill.itemTotal,
      shippingFee: bill.shippingFee,
      customsFee: bill.customsFee,
      additionalFees: bill.additionalFees || [],
      totalAmount: bill.totalAmount,
      
      // Payment Information
      paidAt: bill.paidAt?.toISOString(),
      paidAmount: bill.paidAmount,
      
      // Timestamps
      createdAt: bill.createdAt?.toISOString(),
      updatedAt: bill.updatedAt?.toISOString(),
      sentAt: bill.sentAt?.toISOString(),
      
      // Packages with full details
      packages: bill.packages.map((pkg: IBill['packages'][0]) => {
        const fullPackage = packageMap.get(pkg.packageId?.toString() || '') as {
          invoiceFiles?: string[];
          itemDescription?: string;
          warehouseLocation?: string;
          dateReceived?: Date;
        } | undefined;
        return {
          packageId: pkg.packageId?.toString(),
          trackingNumber: pkg.trackingNumber,
          shipper: pkg.shipper,
          weight: pkg.weight,
          itemValue: pkg.itemValue,
          shippingFee: pkg.shippingFee,
          customsFee: pkg.customsFee,
          total: pkg.total,
          // Additional package details
          invoiceFiles: fullPackage?.invoiceFiles || [],
          itemDescription: fullPackage?.itemDescription,
          warehouseLocation: fullPackage?.warehouseLocation,
          dateReceived: fullPackage?.dateReceived?.toISOString()
        };
      }),
      
      // Notes
      adminNotes: bill.adminNotes,
      customerNotes: bill.customerNotes
    };

    return NextResponse.json({
      success: true,
      data: formattedBill
    });

  } catch (error) {
    console.error('Error fetching bill details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bill details' },
      { status: 500 }
    );
  }
}
