import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';
import { authOptions } from '@/lib/auth-config';

export async function PUT(request, { params }) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const { id } = params;
    const { status, notes, location, signature, photo, recipientName } = await request.json();
    
    const shipment = await Shipment.findById(id);
    
    if (!shipment) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }
    
    // Update status
    if (status) {
      shipment.status = status;
    }
    
    // Update location if provided
    if (location) {
      shipment.currentLocation = {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        lastUpdated: new Date()
      };
    }
    
    // Add to status history
    const statusUpdate = {
      status: status || shipment.status,
      timestamp: new Date(),
      updatedBy: session.user.name || 'System',
      notes: notes || ''
    };
    
    if (location) {
      statusUpdate.location = {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
        city: location.city,
        country: location.country
      };
    }
    
    shipment.statusHistory.push(statusUpdate);
    
    // Handle delivery completion
    if (status === 'delivered') {
      shipment.actualDeliveryDate = new Date();
      if (signature || photo || recipientName) {
        shipment.deliveryProof = {
          signature,
          photo,
          recipientName
        };
      }
      
      // TODO: Send delivery confirmation email
    }
    
    await shipment.save();
    
    // TODO: Emit real-time update via WebSocket
    
    return NextResponse.json({
      success: true,
      data: shipment,
      message: 'Shipment status updated successfully'
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
