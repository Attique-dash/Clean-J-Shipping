// my-app/src/app/api/admin/shipments/manifests/update/route.ts
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import ShipmentManifest from "@/models/ShipmentManifest";
import { z } from "zod";

const shipmentItemSchema = z.object({
  tracking_number: z.string().min(1),
  status: z.string().optional(),
  weight: z.number().optional(),
  notes: z.string().optional(),
});

const manifestSchema = z.object({
  manifestId: z.string().min(1),
  description: z.string().optional(),
  data: z.object({
    title: z.string().optional(),
    mode: z.enum(["air", "sea", "land"]).default("air"),
    batch_date: z.string().optional(),
    shipments: z.array(shipmentItemSchema),
  }),
});

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body, null, 2)); // Debug log
    const validated = manifestSchema.parse(body);

    const { manifestId, description, data } = validated;
    console.log('Validated data:', { manifestId, description, data }); // Debug log

    // Calculate totals
    const totalItems = data.shipments.length;
    const totalWeight = data.shipments.reduce((sum, s) => sum + (s.weight || 0), 0);

    // Debug the data before saving
    console.log('Data before save:', {
      title: data.title,
      description: description,
      titleOrDesc: data.title || description,
      shipments: data.shipments.map(s => ({
        trackingNumber: s.tracking_number,
        notes: s.notes
      }))
    });

    // Upsert manifest
    const manifest = await ShipmentManifest.findOneAndUpdate(
      { manifestId },
      {
        $set: {
          manifestId,
          title: data.title || description,
          mode: data.mode,
          batchDate: data.batch_date ? new Date(data.batch_date) : undefined,
          shipments: data.shipments.map(s => ({
            trackingNumber: s.tracking_number,
            status: s.status || "pending",
            weight: s.weight,
            notes: s.notes,
          })),
          totalItems,
          totalWeight,
          updatedBy: payload._id || payload.email,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdBy: payload._id || payload.email,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    console.log('Saved manifest:', manifest); // Debug log

    return NextResponse.json({
      ok: true,
      manifest_id: manifest.manifestId,
      total_items: totalItems,
      total_weight: totalWeight,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating manifest:", error);
    return NextResponse.json(
      { error: "Failed to update manifest" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const url = new URL(req.url);
    const manifestId = url.searchParams.get("manifestId");

    if (manifestId) {
      const manifest = await ShipmentManifest.findOne({ manifestId }).lean();
      if (!manifest) {
        return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
      }
      return NextResponse.json({ manifest });
    }

    // List all manifests
    const manifests = await ShipmentManifest.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Migrate existing manifests to include new fields
    const migratedManifests = manifests.map(manifest => {
      // Ensure all required fields exist
      const migrated = {
        ...manifest,
        title: manifest.title || null,
        mode: manifest.mode || 'air',
        batchDate: manifest.batchDate || null,
        shipments: (manifest.shipments || []).map((shipment: { id?: string; trackingNumber?: string; status?: string; notes?: string; }) => ({
          ...shipment,
          notes: shipment.notes || null
        }))
      };
      return migrated;
    });

    return NextResponse.json({ manifests: migratedManifests });
  } catch (error) {
    console.error("Error fetching manifests:", error);
    return NextResponse.json(
      { error: "Failed to fetch manifests" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const url = new URL(req.url);
    const manifestId = url.searchParams.get("manifestId");

    if (!manifestId) {
      return NextResponse.json({ error: "Manifest ID is required" }, { status: 400 });
    }

    const manifest = await ShipmentManifest.findOneAndDelete({ manifestId });
    if (!manifest) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: "Manifest deleted successfully",
      manifest_id: manifestId
    });
  } catch (error) {
    console.error("Error deleting manifest:", error);
    return NextResponse.json(
      { error: "Failed to delete manifest" },
      { status: 500 }
    );
  }
}