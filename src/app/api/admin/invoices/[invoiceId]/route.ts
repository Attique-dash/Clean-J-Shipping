// src/app/api/admin/invoices/[invoiceId]/route.ts
// Admin endpoint to delete invoice files

import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";
import { deleteFile } from "@/lib/cloudinary";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { invoiceId } = await params;

    // Authenticate user - must be admin
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // invoiceId format: "packageId_index" (e.g., "65f123..._0")
    const parts = invoiceId.split('_');
    if (parts.length < 2) {
      return NextResponse.json(
        { error: "Invalid invoice ID format. Expected: packageId_index" },
        { status: 400 }
      );
    }

    // Extract package ID and file index
    const fileIndex = parseInt(parts.pop() || '0', 10);
    const packageId = parts.join('_'); // Rejoin in case packageId contains underscores

    if (isNaN(fileIndex) || fileIndex < 0) {
      return NextResponse.json(
        { error: "Invalid file index" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the package
    const pkg = await Package.findById(packageId);

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    // Check if package has invoices
    if (!pkg.invoiceFiles || !Array.isArray(pkg.invoiceFiles) || pkg.invoiceFiles.length === 0) {
      return NextResponse.json(
        { error: "No invoices found for this package" },
        { status: 404 }
      );
    }

    // Check if index is valid
    if (fileIndex >= pkg.invoiceFiles.length) {
      return NextResponse.json(
        { error: "Invoice file index out of range" },
        { status: 400 }
      );
    }

    // Get the invoice file to delete
    const fileToDelete = pkg.invoiceFiles[fileIndex];
    const publicId = fileToDelete.publicId;

    if (!publicId) {
      return NextResponse.json(
        { error: "Invalid invoice file - missing publicId" },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    let cloudinaryDeleted = false;
    try {
      cloudinaryDeleted = await deleteFile(publicId);
      if (!cloudinaryDeleted) {
        console.warn(`Failed to delete file from Cloudinary: ${publicId}`);
      }
    } catch (cloudinaryError) {
      console.error("Cloudinary delete error:", cloudinaryError);
      // Continue to remove from database even if Cloudinary delete fails
    }

    // Remove the file from the package's invoiceFiles array
    pkg.invoiceFiles.splice(fileIndex, 1);

    // Update package status if no more invoices
    if (pkg.invoiceFiles.length === 0) {
      pkg.invoiceUploaded = false;
      pkg.invoiceStatus = 'pending';
      pkg.pricePaid = 0;
    }

    await pkg.save();

    return NextResponse.json({
      success: true,
      message: "Invoice file deleted successfully",
      packageId,
      fileIndex,
      cloudinaryDeleted,
      remainingInvoices: pkg.invoiceFiles.length,
      invoiceStatus: pkg.invoiceStatus
    });

  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}

// GET - Get details of a specific invoice (admin only)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { invoiceId } = await params;

    // Authenticate user - must be admin
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // invoiceId format: "packageId_index"
    const parts = invoiceId.split('_');
    if (parts.length < 2) {
      return NextResponse.json(
        { error: "Invalid invoice ID format" },
        { status: 400 }
      );
    }

    const fileIndex = parseInt(parts.pop() || '0', 10);
    const packageId = parts.join('_');

    if (isNaN(fileIndex) || fileIndex < 0) {
      return NextResponse.json(
        { error: "Invalid file index" },
        { status: 400 }
      );
    }

    await dbConnect();

    const pkg: any = await Package.findById(packageId).lean();

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    if (!pkg.invoiceFiles || !Array.isArray(pkg.invoiceFiles) || fileIndex >= pkg.invoiceFiles.length) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const invoice = pkg.invoiceFiles[fileIndex];

    return NextResponse.json({
      success: true,
      packageId,
      fileIndex,
      invoice: {
        ...invoice,
        type: getFileType(invoice.filename),
        isImage: isImage(invoice.filename)
      }
    });

  } catch (error) {
    console.error("Error fetching invoice details:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice details" },
      { status: 500 }
    );
  }
}

// Helper functions
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

function isImage(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png'].includes(ext || '');
}
