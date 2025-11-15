import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const pkg = await Package.findById(params.id).select("invoiceRecords trackingNumber userCode").lean();
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  return NextResponse.json({
    tracking_number: pkg.trackingNumber,
    user_code: pkg.userCode,
    invoice_records: Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [],
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  let body: unknown = null;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const data = body as Partial<{ invoice_number: string; index: number; status: "reviewed" | "rejected" }>; 
  if (!data.status || (data.status !== "reviewed" && data.status !== "rejected")) {
    return NextResponse.json({ error: "status must be 'reviewed' or 'rejected'" }, { status: 400 });
  }

  const pkg = await Package.findById(params.id).select("invoiceRecords");
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  const records = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
  if (records.length === 0) return NextResponse.json({ error: "No invoice records to update" }, { status: 400 });

  let idx = -1;
  if (typeof data.index === "number" && data.index >= 0 && data.index < records.length) {
    idx = data.index;
  } else if (data.invoice_number) {
    idx = records.findIndex((r: any) => (r as any).invoiceNumber === data.invoice_number);
  } else {
    idx = records.length - 1; // default to latest record
  }
  if (idx < 0) return NextResponse.json({ error: "Invoice record not found" }, { status: 404 });

  (pkg.invoiceRecords as any)[idx].status = data.status;
  await pkg.save();

  return NextResponse.json({ ok: true, index: idx, status: data.status });
}
