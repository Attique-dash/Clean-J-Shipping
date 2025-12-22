// src/app/api/warehouse/packages/bulk-upload/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { isWarehouseAuthorized } from "@/lib/rbac";
import { sendNewPackageEmail } from "@/lib/email";

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = json as { packages?: unknown[] };
  if (!Array.isArray(data.packages)) {
    return NextResponse.json({ error: "packages must be an array" }, { status: 400 });
  }

  const results: { trackingNumber?: string; ok: boolean; error?: string }[] = [];
  const now = new Date();

  for (const pkg of data.packages) {
    try {
      const item = pkg as {
        trackingNumber?: string;
        userCode?: string;
        weight?: number;
        shipper?: string;
        description?: string;
        length?: number;
        width?: number;
        height?: number;
        warehouse?: string;
        receivedBy?: string;
      };

      const trackingNumber = String(item.trackingNumber || "").trim();
      const userCode = String(item.userCode || "").trim();

      if (!trackingNumber || !userCode) {
        results.push({ 
          trackingNumber, 
          ok: false, 
          error: "Missing trackingNumber or userCode" 
        });
        continue;
      }

      // Check if customer exists
      const customer = await User.findOne({ userCode, role: "customer" })
        .select("_id userCode email firstName");
      
      if (!customer) {
        results.push({ 
          trackingNumber, 
          ok: false, 
          error: "Customer not found" 
        });
        continue;
      }

      // Create/update package
      await Package.findOneAndUpdate(
        { trackingNumber },
        {
          $setOnInsert: {
            userCode: customer.userCode,
            customer: customer._id,
            createdAt: now,
          },
          $set: {
            weight: typeof item.weight === "number" ? item.weight : undefined,
            shipper: typeof item.shipper === "string" ? item.shipper : undefined,
            description: typeof item.description === "string" ? item.description : undefined,
            status: "At Warehouse",
            updatedAt: now,
            length: typeof item.length === "number" ? item.length : undefined,
            width: typeof item.width === "number" ? item.width : undefined,
            height: typeof item.height === "number" ? item.height : undefined,
            entryStaff: typeof item.receivedBy === "string" ? item.receivedBy : undefined,
            branch: typeof item.warehouse === "string" ? item.warehouse : undefined,
          },
          $push: {
            history: {
              status: "At Warehouse",
              at: now,
              note: `Bulk upload - Received at ${item.warehouse || "warehouse"}`,
            },
          },
        },
        { upsert: true, new: true }
      );

      // Send email notification (fire and forget)
      if (customer.email) {
        sendNewPackageEmail({
          to: customer.email,
          firstName: customer.firstName || "",
          trackingNumber,
          status: "At Warehouse",
          weight: item.weight,
          shipper: item.shipper,
        }).catch(() => {});
      }

      results.push({ trackingNumber, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ 
        trackingNumber: (pkg as { trackingNumber?: string })?.trackingNumber, 
        ok: false, 
        error: message 
      });
    }
  }

  const successCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;

  return NextResponse.json({
    ok: true,
    total: results.length,
    success: successCount,
    failed: failCount,
    results
  });
}