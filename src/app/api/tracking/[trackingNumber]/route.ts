import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage, PackageStatus } from "@/models/Package";

function toUiStatus(status: string): "in_transit" | "ready_for_pickup" | "delivered" | "pending" | "received" {
  switch (status) {
    case "In Transit":
      return "in_transit";
    case "Delivered":
      return "delivered";
    case "At Local Port":
      return "ready_for_pickup";
    case "At Warehouse":
      return "received";
    case "Unknown":
    default:
      return "pending";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { trackingNumber: string } }
) {
  await dbConnect();
  const pkg = await Package.findOne({ trackingNumber: params.trackingNumber })
    .select(
      "trackingNumber description status branch weight entryDate createdAt history"
    )
    .lean();
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pkgDoc = pkg as Pick<IPackage, "trackingNumber" | "description" | "status" | "weight" | "history" | "createdAt"> & {
    branch?: string;
    entryDate?: Date;
  };

  const status = toUiStatus(pkgDoc.status);
  const current_location = pkgDoc.branch || undefined;
  const weight = typeof pkgDoc.weight === "number" ? `${pkgDoc.weight} kg` : undefined;

  // Build tracking history (newest first)
  const tracking_history = Array.isArray(pkgDoc.history)
    ? [...(pkgDoc.history as { status: PackageStatus; at?: Date; note?: string }[])]
        .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
        .map((h) => {
          const s = toUiStatus(h.status);
          let description: string | undefined;
          if (s === "ready_for_pickup") description = "Package ready for customer pickup";
          else if (s === "in_transit") description = "Package in transit to destination";
          else if (s === "received") description = "Package received at facility";
          return {
            status: s,
            timestamp: h.at ? new Date(h.at).toISOString() : undefined,
            location: undefined,
            description,
          };
        })
    : [];

  // No ETA in schema; set undefined. If needed, derive from business rules later.
  const estimated_delivery = undefined as unknown as string | undefined;

  return NextResponse.json({
    tracking_number: pkgDoc.trackingNumber,
    description: pkgDoc.description || undefined,
    status,
    current_location,
    weight,
    tracking_history,
    estimated_delivery,
  });
}
