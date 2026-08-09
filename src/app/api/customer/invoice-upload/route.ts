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

// Helper function to escape regex special characters
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

    // Check if tracking parameter is provided
    const { searchParams } = new URL(req.url);
    const trackingParam = searchParams.get('tracking');
    
    console.log('[Invoice Upload GET] Request details:', {
      userId,
      trackingParam: trackingParam || 'none',
      hasTrackingParam: !!trackingParam,
    });

    let packages;

    if (trackingParam) {
      // When tracking param is present, return that specific package regardless of invoice status
      // This allows customers to upload invoices even if the package was previously marked differently
      const re = new RegExp(`^${escapeRegex(trackingParam)}$`, 'i');
      packages = await Package.find({
        userId: new Types.ObjectId(userId),
        $or: [
          { TrackingNumber: re },
          { trackingNumber: re },
          { ControlNumber: re }
        ]
      }).sort({ dateReceived: -1 }).lean();
    } else {
      // Find packages that need invoice upload
      // - Package is received or in processing or at warehouse
      // - Invoice not yet uploaded or pending
      packages = await Package.find({
        userId: new Types.ObjectId(userId),
        status: { $in: ['received', 'in_processing', 'pending', 'processing', 'customs_pending', 'AT WAREHOUSE', 'At Warehouse', 'at warehouse'] },
        $or: [
          { invoiceUploaded: { $exists: false } },
          { invoiceUploaded: false },
          { invoiceStatus: { $in: ['pending', 'rejected'] } }
        ]
      }).sort({ dateReceived: -1 }).lean();
    }

    // Also find pre-alerts that need invoice upload
    // - Pre-alert is pending or approved
    // - No attachment file uploaded yet
    // - Exclude pre-alerts that have already been converted to packages (tracking number exists in packages)
    const packageTrackingNumbers = packages.map(p => p.TrackingNumber || p.trackingNumber || p.TrackingNumber);
    
    let preAlerts;
    
    if (trackingParam) {
      // When tracking param is present, also look for matching pre-alerts
      const re = new RegExp(`^${escapeRegex(trackingParam)}$`, 'i');
      preAlerts = await PreAlert.find({
        customer: new Types.ObjectId(userId),
        trackingNumber: re,
        status: { $in: ['pending', 'approved'] }
      }).sort({ expectedDate: -1 }).lean();
    } else {
      // Original pre-alert logic for general listing
      preAlerts = await PreAlert.find({
        customer: new Types.ObjectId(userId),
        status: { $in: ['pending', 'approved'] },
        trackingNumber: { $nin: packageTrackingNumbers },
        $or: [
          { attachmentFile: { $exists: false } },
          { attachmentFile: null }
        ]
      }).sort({ expectedDate: -1 }).lean();
    }

    // Helper function to resolve currency from multiple possible fields
    const resolveCurrency = (doc: any): string => {
      const values = [
        doc.pricePaidCurrency,
        doc.paymentCurrency,
        doc.amountPaidCurrency,
        doc.currency,
        doc.currencyCode,
        doc.paymentCurrencyCode,
      ];
      for (const value of values) {
        if (value && typeof value === 'string' && value.trim()) {
          return value.trim().toUpperCase();
        }
      }
      return 'USD';
    };

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
      pricePaidCurrency: resolveCurrency(pkg),
      displayCurrency: resolveCurrency(pkg), // Add canonical currency field for consistent UI formatting
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
      pricePaidCurrency: resolveCurrency(pa),
      displayCurrency: resolveCurrency(pa), // Add canonical currency field for consistent UI formatting
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
        const trackingValForPreAlert = (upload.tracking_number || '').toString().trim();
        const preAlert = await PreAlert.findOne({
          trackingNumber: trackingValForPreAlert,
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
        // Search multiple tracking number fields for consistency with GET route
        const trackingValRaw = upload.tracking_number || upload.trackingNumber || upload.TrackingNumber || '';
        const trackingVal = String(trackingValRaw).trim();
        
        console.debug(`[InvoiceUpload] finding package tracking="${trackingVal}" userId=${userId}`);
        
        const re = new RegExp(`^${escapeRegex(trackingVal)}$`, 'i');
        
        const pkg = await Package.findOne({
          userId: new Types.ObjectId(userId),
          $or: [
            { TrackingNumber: re },
            { trackingNumber: re },
            { ControlNumber: re }
          ],
          status: {
            $in: [
              'received', 'in_processing', 'pending', 'processing', 'customs_pending',
              'AT WAREHOUSE', 'At Warehouse', 'at warehouse'
            ]
          }
        });

        if (!pkg) {
          // DEV: helpful debugging only - remove in production
          const sample = await Package.findOne({
            $or: [
              { TrackingNumber: trackingVal },
              { trackingNumber: trackingVal },
              { ControlNumber: trackingVal }
            ]
          }).lean() as any;
          console.debug('[InvoiceUpload] package sample (no userId filter):', sample ? { id: sample._id?.toString(), TrackingNumber: sample.TrackingNumber || sample.trackingNumber } : null);
          
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

        // Validate description field
        if (!upload.description || !upload.description.trim()) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "Description of goods is required"
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

        // Update package with customer invoice information
        console.log('[Invoice Upload POST] Updating package with invoice data:', {
          tracking_number: upload.tracking_number,
          price_paid: upload.price_paid,
          currency: upload.currency,
          description: upload.description,
          files_count: cloudinaryFiles.length,
        });
        
        await Package.findByIdAndUpdate(
          pkg._id,
          { 
            $set: { 
              invoiceUploaded: true,
              invoiceFiles: cloudinaryFiles,
              pricePaid: upload.price_paid,
              pricePaidCurrency: upload.currency,
              invoiceSubmittedAt: new Date(),
              invoiceStatus: 'submitted',
              customerInvoice: {
                amount: upload.price_paid,
                currency: upload.currency,
                description: upload.description,
                files: cloudinaryFiles,
                submittedAt: new Date()
              }
            }
          }
        );
        
        console.log('[Invoice Upload POST] Package updated successfully:', {
          tracking_number: upload.tracking_number,
          packageId: pkg._id,
        });

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

// DELETE - Delete invoice upload data for a package
export async function DELETE(req: Request) {
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

    const body = await req.json();
    const { tracking_number } = body;

    if (!tracking_number) {
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 });
    }

    await dbConnect();

    // Check if it's a pre-alert
    const preAlert = await PreAlert.findOne({
      trackingNumber: tracking_number,
      customer: new Types.ObjectId(userId),
    });

    if (preAlert) {
      // Delete invoice from pre-alert
      await PreAlert.findByIdAndUpdate(
        preAlert._id,
        {
          $unset: { attachmentFile: 1, pricePaid: 1 },
        }
      );

      return NextResponse.json({
        success: true,
        message: "Invoice deleted successfully from pre-alert"
      });
    }

    // Find the package
    const pkg = await Package.findOne({
      trackingNumber: tracking_number,
      userId: new Types.ObjectId(userId),
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found or doesn't belong to user" }, { status: 404 });
    }

    // Delete invoice files from Cloudinary
    if (pkg.invoiceFiles && Array.isArray(pkg.invoiceFiles)) {
      const { deleteFile } = await import("@/lib/cloudinary");
      for (const file of pkg.invoiceFiles) {
        if (typeof file === 'object' && file.publicId) {
          try {
            await deleteFile(file.publicId);
          } catch (deleteError) {
            console.error(`Failed to delete file ${file.publicId}:`, deleteError);
          }
        }
      }
    }

    // Clear invoice upload data from package
    await Package.findByIdAndUpdate(
      pkg._id,
      {
        $unset: {
          invoiceFiles: 1,
          invoiceUploaded: 1,
          pricePaid: 1,
          pricePaidCurrency: 1,
          invoiceSubmittedAt: 1,
        },
        $set: {
          invoiceStatus: 'pending'
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "Invoice deleted successfully"
    });

  } catch (error) {
    console.error("Invoice delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
