// src/app/api/invoices/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Package from '@/models/Package';
import { dbConnect } from '@/lib/db';

// GET - Download invoice file
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('file');
    
    if (!filename) {
      return NextResponse.json({ error: 'No file specified' }, { status: 400 });
    }

    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    await dbConnect();

    // Check if user has access to this file
    const pkg = await Package.findOne({
      invoiceFiles: { $regex: filename }
    });

    if (!pkg) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check permissions - admin can access all, customer can only access their own
    if (session.user?.role !== 'admin' && pkg.userId?.toString() !== session.user?.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Try to find file in /tmp
    const tmpFilePath = join('/tmp', 'uploads', 'invoices', filename);
    
    // Check if file exists in /tmp
    if (existsSync(tmpFilePath)) {
      const fileBuffer = readFileSync(tmpFilePath);
      
      // Determine content type
      const ext = filename.split('.').pop()?.toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // File not found on disk - might be deleted due to serverless /tmp cleanup
    // Return a helpful message with alternative
    return NextResponse.json({ 
      error: 'File not found on disk',
      message: 'The file may have been deleted due to server cleanup. Please ask the customer to re-upload the invoice.',
      filename: filename,
      packageId: pkg._id,
      trackingNumber: pkg.trackingNumber,
      uploadedAt: pkg.invoiceSubmittedAt
    }, { status: 404 });

  } catch (error) {
    console.error('Error serving invoice file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
