// src/app/api/customer/packages/[id]/invoices/route.ts
// Get invoice files for a specific package

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Authenticate user
    const payload = await getAuthFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id;
    const userRole = payload.role;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate id
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid package ID" }, { status: 400 });
    }

    await dbConnect();

    // Find the package
    const pkg: any = await Package.findById(id).lean();

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Check if user owns the package or is admin
    const pkgUserId = pkg.userId?.toString();
    if (userRole !== "admin" && pkgUserId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to view this package's invoices" },
        { status: 403 }
      );
    }

    // Check if package has invoices
    if (!pkg.invoiceUploaded || !pkg.invoiceFiles || pkg.invoiceFiles.length === 0) {
      return NextResponse.json({
        success: true,
        packageId: id,
        hasInvoices: false,
        message: "No invoices uploaded for this package",
        invoices: []
      });
    }

    // Format invoice files for response
    const invoices = pkg.invoiceFiles.map((file: any, index: number) => ({
      index,
      url: file.url,
      publicId: file.publicId,
      filename: file.filename,
      size: file.size,
      uploadedAt: file.uploadedAt,
      // Determine file type from extension
      type: getFileType(file.filename),
      // Generate thumbnail URL for images
      thumbnailUrl: isImage(file.filename) ? file.url.replace('/upload/', '/upload/w_200,h_200,c_fit/') : null
    }));

    return NextResponse.json({
      success: true,
      packageId: id,
      hasInvoices: true,
      trackingNumber: pkg.trackingNumber || pkg.TrackingNumber,
      invoiceStatus: pkg.invoiceStatus,
      pricePaid: pkg.pricePaid,
      pricePaidCurrency: pkg.pricePaidCurrency,
      invoiceSubmittedAt: pkg.invoiceSubmittedAt,
      invoiceCount: invoices.length,
      invoices
    });

  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// Helper to determine file type
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png'
  };
  return typeMap[ext || ''] || 'application/octet-stream';
}

// Helper to check if file is an image
function isImage(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png'].includes(ext || '');
}
