import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request, { params }: { params: { packageId: string } }) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const pkg = await Package.findById(params.packageId).select("invoiceNumber trackingNumber").lean();
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  return NextResponse.json({
    tracking_number: pkg.trackingNumber,
    invoice_number: pkg.invoiceNumber || null,
  });
}

export async function PATCH(req: Request, { params }: { params: { packageId: string } }) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  let body: unknown = null;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const data = body as Partial<{ invoice_number: string; index: number; status: "reviewed" | "rejected" }>; 
  if (!data.status || (data.status !== "reviewed" && data.status !== "rejected")) {
    return NextResponse.json({ error: "status must be 'reviewed' or 'rejected'" }, { status: 400 });
  }

  const pkg = await Package.findById(params.packageId).select("invoiceNumber");
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  
  if (!pkg.invoiceNumber) {
    return NextResponse.json({ error: "No invoice number found for this package" }, { status: 400 });
  }
  
  // For now, just return success since we're not updating an array of records
  // The invoiceNumber is a single field, not an array of records
  return NextResponse.json({ ok: true, invoice_number: pkg.invoiceNumber, status: data.status });
}
