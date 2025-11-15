import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { trackingNumber } = params;
    
    const shipment = await Shipment.findOne({ trackingNumber })
      .select('-__v -paymentIntentId -customerPortalAccess -paymentStatus')
      .lean();
    
    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Tracking number not found' },
        { status: 404 }
      );
    }
    
    // Return only necessary fields for public tracking
    const responseData = {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      statusHistory: shipment.statusHistory,
      currentLocation: shipment.currentLocation,
      estimatedDelivery: shipment.estimatedDeliveryDate,
      receiver: {
        name: shipment.receiver.name,
        city: shipment.receiver.address.split(',')[1]?.trim() || ''
      },
      sender: {
        name: shipment.sender.name,
        city: shipment.sender.address.split(',')[1]?.trim() || ''
      },
      lastUpdated: shipment.updatedAt
    };
    
    return NextResponse.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
