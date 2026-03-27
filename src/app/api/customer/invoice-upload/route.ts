// src/app/api/customer/invoice-upload/route.ts
// Invoice upload endpoint with Cloudinary integration

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";
import { Types } from "mongoose";
import { uploadFile, CloudinaryUploadResult } from "@/lib/cloudinary";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

// GET - Fetch all packages needing invoice upload for the customer
export async function GET(req: Request) {
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

    await dbConnect();

    // Find packages that need invoice upload
    // - Package is received or in processing
    // - Invoice not yet uploaded or pending
    const packages = await Package.find({
      userId: new Types.ObjectId(userId),
      status: { $in: ['received', 'in_processing', 'pending', 'processing', 'customs_pending'] },
      $or: [
        { invoiceUploaded: { $exists: false } },
        { invoiceUploaded: false },
        { invoiceStatus: { $in: ['pending', 'rejected'] } }
      ]
    }).sort({ dateReceived: -1 }).lean();

    // Format packages for frontend
    const formattedPackages = packages.map(pkg => ({
      id: pkg._id?.toString(),
      trackingNumber: pkg.trackingNumber,
      tracking_number: pkg.trackingNumber,
      shipper: pkg.shipper || pkg.senderName || 'N/A',
      weight: pkg.weight,
      serviceMode: pkg.serviceMode || 'air',
      dateReceived: pkg.dateReceived || pkg.createdAt,
      received_date: pkg.dateReceived?.toISOString() || pkg.createdAt?.toISOString(),
      invoiceStatus: pkg.invoiceStatus || 'pending',
      invoiceUploaded: pkg.invoiceUploaded || false,
      pricePaid: pkg.pricePaid || 0,
      pricePaidCurrency: pkg.pricePaidCurrency || 'USD',
      invoiceFiles: pkg.invoiceFiles || [],
      invoiceSubmittedAt: pkg.invoiceSubmittedAt,
      hasInvoice: pkg.invoiceUploaded === true,
      description: pkg.itemDescription || pkg.description,
      warehouseLocation: pkg.warehouseLocation
    }));

    return NextResponse.json({
      success: true,
      packages: formattedPackages
    });

  } catch (error) {
    console.error("Error fetching packages for invoice upload:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

// POST - Submit all invoices
export async function POST(req: Request) {
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

    await dbConnect();

    const formData = await req.formData();
    
    // Parse uploads from form data
    const uploads: any[] = [];
    let index = 0;
    
    while (formData.has(`upload_${index}`)) {
      const uploadData = JSON.parse(formData.get(`upload_${index}`) as string);
      const files = formData.getAll(`files_${index}`) as File[];
      
      uploads.push({
        ...uploadData,
        files: files
      });
      
      index++;
    }

    if (uploads.length === 0) {
      return NextResponse.json({ error: "No uploads provided" }, { status: 400 });
    }

    const results = [];
    const uploadedFiles: CloudinaryUploadResult[] = [];

    for (const upload of uploads) {
      try {
        // Verify package exists and belongs to user
        const pkg = await Package.findOne({ 
          trackingNumber: upload.tracking_number,
          userId: new Types.ObjectId(userId),
          status: { $in: ['received', 'in_processing', 'pending', 'processing', 'customs_pending'] }
        });

        if (!pkg) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "Package not found, doesn't belong to user, or not eligible for invoice upload"
          });
          continue;
        }

        // Check if already uploaded and submitted
        if (pkg.invoiceUploaded && pkg.invoiceStatus === 'submitted') {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "Invoice already submitted for this package"
          });
          continue;
        }

        // Validate required fields
        if (!upload.price_paid || upload.price_paid <= 0) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "Price paid is required and must be greater than 0"
          });
          continue;
        }

        if (!upload.currency || upload.currency.length < 3) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "Valid currency code is required"
          });
          continue;
        }

        // Validate files
        if (!upload.files || upload.files.length === 0) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "At least one invoice file is required"
          });
          continue;
        }

        // Limit to 3 files per package
        const filesToProcess = upload.files.slice(0, 3);
        
        // Validate file types and sizes
        for (const file of filesToProcess) {
          if (!ALLOWED_TYPES.includes(file.type)) {
            results.push({
              tracking_number: upload.tracking_number,
              success: false,
              error: `Invalid file type: ${file.name}. Only PDF, JPG, and PNG files are allowed.`
            });
            continue;
          }

          if (file.size > MAX_FILE_SIZE) {
            results.push({
              tracking_number: upload.tracking_number,
              success: false,
              error: `File too large: ${file.name}. Maximum size is 10MB.`
            });
            continue;
          }
        }

        // Upload files to Cloudinary
        const cloudinaryFiles: CloudinaryUploadResult[] = [];
        
        for (const file of filesToProcess) {
          try {
            const result = await uploadFile(file, {
              folder: `invoices/${upload.tracking_number}`,
              tags: ['invoice', `package:${upload.tracking_number}`, `user:${userId}`],
            });
            cloudinaryFiles.push(result);
            uploadedFiles.push(result);
          } catch (uploadError) {
            console.error(`Failed to upload ${file.name} to Cloudinary:`, uploadError);
            // Rollback: delete already uploaded files for this package
            for (const uploadedFile of cloudinaryFiles) {
              try {
                const { deleteFile } = await import("@/lib/cloudinary");
                await deleteFile(uploadedFile.publicId);
              } catch (deleteError) {
                console.error("Failed to rollback file:", deleteError);
              }
            }
            results.push({
              tracking_number: upload.tracking_number,
              success: false,
              error: `Failed to upload file ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
            });
            continue;
          }
        }

        // Check if at least one file was uploaded
        if (cloudinaryFiles.length === 0) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "No files were successfully uploaded"
          });
          continue;
        }

        // Update package with invoice information and Cloudinary file data
        await Package.findByIdAndUpdate(
          pkg._id,
          { 
            $set: { 
              invoiceUploaded: true,
              invoiceFiles: cloudinaryFiles,
              pricePaid: upload.price_paid,
              pricePaidCurrency: upload.currency,
              invoiceSubmittedAt: new Date(),
              invoiceStatus: 'submitted'
            }
          }
        );

        results.push({
          tracking_number: upload.tracking_number,
          success: true,
          files_uploaded: cloudinaryFiles.length,
          price_paid: upload.price_paid,
          currency: upload.currency,
          invoiceFiles: cloudinaryFiles
        });

      } catch (error) {
        console.error(`Error processing upload for ${upload.tracking_number}:`, error);
        results.push({
          tracking_number: upload.tracking_number,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    if (failureCount === 0) {
      return NextResponse.json({
        success: true,
        message: `Successfully uploaded ${successCount} invoice(s)`,
        results
      });
    } else if (successCount === 0) {
      return NextResponse.json({
        success: false,
        message: "Failed to upload any invoices",
        results
      }, { status: 400 });
    } else {
      return NextResponse.json({
        success: true,
        message: `Successfully uploaded ${successCount} invoice(s), ${failureCount} failed`,
        results
      });
    }

  } catch (error) {
    console.error("Invoice upload error:", error);
    return NextResponse.json(
      { error: "Failed to process invoice upload" },
      { status: 500 }
    );
  }
}
