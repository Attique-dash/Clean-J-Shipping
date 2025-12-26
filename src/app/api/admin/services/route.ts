import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Service from '@/models/Service';

// GET all services
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serviceType = searchParams.get('serviceType');
    const isActive = searchParams.get('isActive');

    const query: Record<string, unknown> = {};
    
    if (serviceType) {
      query.serviceType = serviceType;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }

    const services = await Service.find(query)
      .sort({ serviceType: 1, name: 1 })
      .lean();

    return NextResponse.json({
      services,
      total: services.length
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST - Create new service
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    
    // Validate required fields
    if (!data.name || !data.description || !data.serviceType || data.unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Name, description, service type, and unit price are required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      await Service.updateMany(
        { serviceType: data.serviceType, isDefault: true },
        { isDefault: false }
      );
    }

    const service = new Service(data);
    await service.save();

    return NextResponse.json(service, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating service:', error);
    
    let errorMessage = 'Failed to create service';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update service
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { id } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      await Service.updateMany(
        { serviceType: data.serviceType, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    const service = await Service.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error: unknown) {
    console.error('Error updating service:', error);
    
    let errorMessage = 'Failed to update service';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete service
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    const service = await Service.findByIdAndDelete(id);
    
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Service deleted successfully',
      serviceName: service.name 
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
