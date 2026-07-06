// src/app/api/customer/invoice-upload/route.ts
// Invoice upload endpoint with Cloudinary integration

import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import { PreAlert } from "@/models/PreAlert";
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

    // Also find pre-alerts that need invoice upload
    // - Pre-alert is pending or approved
    // - No attachment file uploaded yet
    const preAlerts = await PreAlert.find({
      customer: new Types.ObjectId(userId),
      status: { $in: ['pending', 'approved'] },
      $or: [
        { attachmentFile: { $exists: false } },
        { attachmentFile: null }
      ]
    }).sort({ expectedDate: -1 }).lean();

    // Format packages for frontend — use PascalCase (KCD model) with camelCase fallbacks
    const formattedPackages = packages.map(pkg => ({
      id: pkg._id?.toString(),
      trackingNumber: pkg.TrackingNumber || pkg.trackingNumber || pkg.TrackingNumber,
      tracking_number: pkg.TrackingNumber || pkg.trackingNumber || pkg.TrackingNumber,
      shipper: pkg.Shipper || pkg.shipper || 'N/A',
      merchant: pkg.Shipper || pkg.shipper || 'N/A',
      weight: pkg.Weight || pkg.weight || 0,
      serviceMode: pkg.ServiceTypeID || pkg.serviceMode || 'air',
      dateReceived: pkg.EntryDate || pkg.EntryDateTime || pkg.dateReceived || pkg.createdAt,
      received_date: (pkg.EntryDate || pkg.EntryDateTime || pkg.dateReceived || pkg.createdAt)?.toISOString?.() || pkg.EntryDate || pkg.EntryDateTime || pkg.dateReceived || pkg.createdAt,
      invoiceStatus: pkg.invoiceStatus || 'pending',
      invoiceUploaded: pkg.invoiceUploaded || false,
      pricePaid: pkg.pricePaid || 0,
      pricePaidCurrency: pkg.pricePaidCurrency || 'USD',
      invoiceFiles: pkg.invoiceFiles || [],
      invoiceSubmittedAt: pkg.invoiceSubmittedAt,
      hasInvoice: pkg.invoiceUploaded === true,
      description: pkg.Description || pkg.description || pkg.itemDescription || '',
      itemDescription: pkg.Description || pkg.description || '',
      warehouseLocation: pkg.Branch || pkg.warehouseLocation || pkg.branch || '',
      branch: pkg.Branch || pkg.branch || '',
      userCode: pkg.UserCode || pkg.userCode || '',
      pieces: pkg.Pieces || pkg.pieces || 1,
      freight: pkg.freight || pkg.shipping_cost || 0,
      totalAmount: pkg.totalAmount || pkg.total_amount || pkg.freight || 0,
      total_amount: pkg.totalAmount || pkg.total_amount || pkg.freight || 0,
      houseAwb: pkg.TrackingNumber || pkg.trackingNumber || '',
      trackingNum: pkg.TrackingNumber || pkg.trackingNumber || '',
      status: pkg.status || 'received',
      isPreAlert: false,
    }));

    // Format pre-alerts for frontend
    const formattedPreAlerts = preAlerts.map(pa => ({
      id: pa._id?.toString(),
      trackingNumber: pa.trackingNumber,
      tracking_number: pa.trackingNumber,
      shipper: pa.carrier || pa.overseasCourier || 'N/A',
      merchant: pa.merchant || 'N/A',
      weight: 0,
      serviceMode: 'air',
      dateReceived: pa.expectedDate,
      received_date: pa.expectedDate?.toISOString?.() || pa.expectedDate,
      invoiceStatus: pa.status === 'approved' ? 'submitted' : 'pending',
      invoiceUploaded: !!pa.attachmentFile,
      pricePaid: pa.pricePaid || 0,
      pricePaidCurrency: pa.pricePaidCurrency || 'USD',
      invoiceFiles: pa.attachmentFile ? [pa.attachmentFile] : [],
      invoiceSubmittedAt: pa.createdAt,
      hasInvoice: !!pa.attachmentFile,
      description: pa.description || '',
      itemDescription: pa.description || '',
      warehouseLocation: pa.origin || '',
      branch: '',
      userCode: pa.userCode || '',
      pieces: 1,
      freight: 0,
      totalAmount: pa.pricePaid || 0,
      total_amount: pa.pricePaid || 0,
      houseAwb: pa.trackingNumber,
      trackingNum: pa.trackingNumber,
      status: pa.status || 'pending',
      isPreAlert: true,
    }));

    // Combine packages and pre-alerts
    const allItems = [...formattedPackages, ...formattedPreAlerts].sort((a, b) => {
      const dateA = new Date(a.dateReceived || 0).getTime();
      const dateB = new Date(b.dateReceived || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      packages: allItems
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
        // First check if it's a pre-alert
        const preAlert = await PreAlert.findOne({
          trackingNumber: upload.tracking_number,
          customer: new Types.ObjectId(userId),
          status: { $in: ['pending', 'approved'] }
        });

        if (preAlert) {
          // Handle pre-alert invoice upload
          // Validate files
          if (!upload.files || upload.files.length === 0) {
            results.push({
              tracking_number: upload.tracking_number,
              success: false,
              error: "At least one invoice file is required"
            });
            continue;
          }

          // Limit to 3 files
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
                folder: `prealerts/${upload.tracking_number}`,
                tags: ['prealert', `package:${upload.tracking_number}`, `user:${userId}`],
              });
              cloudinaryFiles.push(result);
              uploadedFiles.push(result);
            } catch (uploadError) {
              console.error(`Failed to upload ${file.name} to Cloudinary:`, uploadError);
              results.push({
                tracking_number: upload.tracking_number,
                success: false,
                error: `Failed to upload file ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
              });
              continue;
            }
          }

          if (cloudinaryFiles.length === 0) {
            results.push({
              tracking_number: upload.tracking_number,
              success: false,
              error: "No files were successfully uploaded"
            });
            continue;
          }

          // Update pre-alert with attachment file (use first file)
          await PreAlert.findByIdAndUpdate(
            preAlert._id,
            { 
              $set: { 
                attachmentFile: cloudinaryFiles[0],
                pricePaid: upload.price_paid || preAlert.pricePaid || 0,
              }
            }
          );

          results.push({
            tracking_number: upload.tracking_number,
            success: true,
            files_uploaded: cloudinaryFiles.length,
            price_paid: upload.price_paid,
            currency: upload.currency,
            invoiceFiles: cloudinaryFiles,
            isPreAlert: true
          });
          continue;
        }

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

        // Validate minimum price based on weight (minimum $1 per kg or $5 total)
        const minPricePerKg = 1.0; // $1 per kg minimum
        const absoluteMinPrice = 5.0; // $5 absolute minimum
        const calculatedMinPrice = Math.max(
          pkg.weight * minPricePerKg,
          absoluteMinPrice
        );
        
        if (upload.price_paid < calculatedMinPrice) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: `Declared price ($${upload.price_paid}) is too low. Minimum required: $${calculatedMinPrice.toFixed(2)} (based on ${pkg.weight}kg weight). Please enter the correct item value.`
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
