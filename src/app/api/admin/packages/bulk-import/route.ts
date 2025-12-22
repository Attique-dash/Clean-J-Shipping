// my-app/src/app/api/admin/packages/bulk-import/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import Papa from "papaparse";

interface PackageRow {
  tracking_number: string;
  user_code: string;
  weight?: string;
  description?: string;
  branch?: string;
  shipper?: string;
  length?: string;
  width?: string;
  height?: string;
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Read file content
    const text = await file.text();
    
    // Parse CSV
    const parsed = Papa.parse<PackageRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_'),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "CSV parsing errors", details: parsed.errors },
        { status: 400 }
      );
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return NextResponse.json({ error: "No data in file" }, { status: 400 });
    }

    // Validate and process rows
    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; tracking: string; error: string }>,
    };

    // Get all unique user codes to validate
    const userCodes = [...new Set(rows.map(r => r.user_code).filter(Boolean))];
    const validUsers = await User.find({
      userCode: { $in: userCodes },
      role: "customer",
    }).select("userCode _id").lean();
    
    const userCodeMap = new Map(validUsers.map(u => [u.userCode, u._id]));

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        if (!row.tracking_number || !row.user_code) {
          throw new Error("Missing required fields: tracking_number or user_code");
        }

        const customerId = userCodeMap.get(row.user_code);
        if (!customerId) {
          throw new Error(`Invalid user_code: ${row.user_code}`);
        }

        // Create or update package
        await Package.findOneAndUpdate(
          { trackingNumber: row.tracking_number },
          {
            $setOnInsert: {
              trackingNumber: row.tracking_number,
              userCode: row.user_code,
              customer: customerId,
              status: "At Warehouse",
              createdAt: new Date(),
            },
            $set: {
              weight: row.weight ? parseFloat(row.weight) : undefined,
              description: row.description,
              branch: row.branch,
              shipper: row.shipper,
              length: row.length ? parseFloat(row.length) : undefined,
              width: row.width ? parseFloat(row.width) : undefined,
              height: row.height ? parseFloat(row.height) : undefined,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 2, // +2 for header row and 1-based index
          tracking: row.tracking_number || "N/A",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { error: "Failed to process bulk import" },
      { status: 500 }
    );
  }
}

// GET endpoint for downloading CSV template
export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = `tracking_number,user_code,weight,description,branch,shipper,length,width,height
TRK001,C12345,5.5,Electronics,Main Warehouse,DHL,30,20,15
TRK002,C12346,2.0,Documents,Branch A,FedEx,20,15,5`;

  return new NextResponse(template, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=package_import_template.csv",
    },
  });
}