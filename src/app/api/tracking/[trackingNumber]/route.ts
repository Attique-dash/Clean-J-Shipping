import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";

export async function GET(
  _req: Request,
  { params }: { params: { trackingNumber: string } }
) {
  const trackingRaw = decodeURIComponent(params.trackingNumber || "").trim();
  if (!trackingRaw) {
    return NextResponse.json({ error: "Missing tracking number" }, { status: 400 });
  }

  await dbConnect();

  // Case-insensitive lookup; also try normalized variants
  const candidates = [trackingRaw, trackingRaw.toUpperCase(), trackingRaw.toLowerCase()].filter((v, i, a) => a.indexOf(v) === i);

  const pkg = await Package.findOne({ trackingNumber: { $in: candidates } })
    .select(
      "trackingNumber status userCode weight shipper description history branch length width height entryDate updatedAt createdAt serviceTypeId serviceTypeName externalStatusLabel"
    )
    .lean();

  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const history = Array.isArray(pkg.history)
    ? pkg.history.map((h: { status?: string; at?: Date; note?: string }) => ({
        status: String(h.status || ""),
        at: h.at ? new Date(h.at).toISOString() : new Date().toISOString(),
        note: h.note ? String(h.note) : undefined,
      }))
    : [];

  return NextResponse.json({
    trackingNumber: pkg.trackingNumber,
    status: pkg.status,
    userCode: pkg.userCode,
    weight: typeof pkg.weight === "number" ? pkg.weight : undefined,
    shipper: pkg.shipper || undefined,
    description: pkg.description || undefined,
    currentLocation: (pkg as any).branch || undefined,
    dimensions: {
      length: typeof (pkg as any).length === "number" ? (pkg as any).length : undefined,
      width: typeof (pkg as any).width === "number" ? (pkg as any).width : undefined,
      height: typeof (pkg as any).height === "number" ? (pkg as any).height : undefined,
    },
    entryDate: (pkg as any).entryDate ? new Date((pkg as any).entryDate).toISOString() : undefined,
    updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt as any).toISOString() : undefined,
    serviceTypeId: (pkg as any).serviceTypeId || undefined,
    serviceTypeName: (pkg as any).serviceTypeName || undefined,
    externalStatusLabel: (pkg as any).externalStatusLabel || undefined,
    history,
  });
}
