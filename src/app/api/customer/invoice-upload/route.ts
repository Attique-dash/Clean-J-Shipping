import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Package from "@/models/Package";
import Invoice from "@/models/Invoice";
import { getAuthFromRequest } from "@/lib/rbac";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { Types } from "mongoose";
import { validateFileUpload } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user ID
    const userId = (payload as { id?: string; _id?: string; uid?: string }).id || 
                  (payload as { id?: string; _id?: string; uid?: string })._id || 
                  (payload as { id?: string; _id?: string; uid?: string }).uid;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads", "invoices");
    try {
      mkdirSync(uploadsDir, { recursive: true });
    } catch (_error) {
      // Directory might already exist
    }

    const results = [];

    for (const upload of uploads) {
      try {
        // Verify package exists and belongs to user
        const pkg = await Package.findOne({ 
          trackingNumber: upload.tracking_number,
          userId: new Types.ObjectId(userId) 
        });

        if (!pkg) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "Package not found or doesn't belong to user"
          });
          continue;
        }

        // Validate and save uploaded files
        const savedFiles = [];
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSizeMB = 10;
        
        for (const file of upload.files) {
          // Server-side validation
          const validation = validateFileUpload(file, maxSizeMB, allowedTypes);
          if (!validation.valid) {
            results.push({
              tracking_number: upload.tracking_number,
              success: false,
              error: validation.error || "File validation failed"
            });
            continue;
          }
          
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          // Generate unique filename
          const timestamp = Date.now();
          const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${upload.tracking_number}_${timestamp}_${originalName}`;
          const filepath = join(uploadsDir, filename);
          
          // Write file to disk
          writeFileSync(filepath, buffer);
          
          savedFiles.push({
            originalName: file.name,
            filename: filename,
            path: `/uploads/invoices/${filename}`,
            size: file.size,
            type: file.type
          });
        }
        
        // Check if at least one file was saved
        if (savedFiles.length === 0) {
          results.push({
            tracking_number: upload.tracking_number,
            success: false,
            error: "No valid files were uploaded"
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

        // Create or update invoice record
        const invoiceData = {
          tracking_number: upload.tracking_number,
          userId: new Types.ObjectId(userId),
          price_paid: upload.price_paid,
          currency: upload.currency || "USD",
          description: upload.description || "",
          item_description: upload.item_description,
          item_category: upload.item_category,
          item_quantity: upload.item_quantity || 1,
          hs_code: upload.hs_code,
          declared_value: upload.declared_value,
          supplier_name: upload.supplier_name,
          supplier_address: upload.supplier_address,
          purchase_date: upload.purchase_date,
          files: savedFiles,
          upload_date: new Date(),
          status: "submitted",
          invoiceType: "commercial", // NEW: Mark as commercial invoice for customs
          invoiceNumber: `COMM-${Date.now()}`, // Different numbering for commercial
          customer: {
            id: userId,
            name: "Customer Upload", // Will be updated with actual user data
            email: "" // Will be updated with actual user data
          },
          items: [] // Commercial invoices don't have billing items
        };

        // Check if invoice already exists for this package
        const existingInvoice = await Invoice.findOne({ 
          tracking_number: upload.tracking_number,
          userId: new Types.ObjectId(userId) 
        });

        let invoice;
        if (existingInvoice) {
          // Update existing invoice
          invoice = await Invoice.findByIdAndUpdate(
            existingInvoice._id,
            { 
              $set: invoiceData,
              $push: { files: { $each: savedFiles } }
            },
            { new: true }
          );
        } else {
          // Create new invoice
          invoice = new Invoice(invoiceData);
          await invoice.save();
        }

        // Update package to indicate invoice has been uploaded
        await Package.findByIdAndUpdate(
          pkg._id,
          { 
            $set: { 
              invoice_status: "uploaded",
              invoice_uploaded_date: new Date()
            }
          }
        );

        results.push({
          tracking_number: upload.tracking_number,
          success: true,
          invoice_id: invoice._id,
          files_uploaded: savedFiles.length
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
