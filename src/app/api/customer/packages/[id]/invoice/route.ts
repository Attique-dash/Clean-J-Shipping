import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import path from "path";
import fs from "fs/promises";
import { getAuthFromRequest, requireRole, AuthPayload } from "@/lib/rbac";

// This route writes to the local filesystem, so it must run on the Node.js runtime
export const runtime = "nodejs";

// Max 10 MB per file by default
const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_INVOICE_MB || 10) * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type InvoiceItem = {
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
};

type InvoiceRecord = {
  invoiceNumber: string;
  invoiceDate: Date;
  totalValue: number;
  currency: string;
  documentUrl: string;
  items: InvoiceItem[];
  status: "submitted" | "reviewed" | "rejected";
  submittedAt: Date;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = getAuthFromRequest(req);
  const unauthorized = requireRole(auth, "customer");
  if (unauthorized) return unauthorized;

  const packageId = params.id;
  if (!packageId) {
    return NextResponse.json({ error: "Missing package id" }, { status: 400 });
  }

  // Parse form-data for files
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form-data" }, { status: 400 });
  }

  // Accept multiple fields names: "files" or "invoice"
  const fileEntries = [
    ...form.getAll("files"),
    ...form.getAll("invoice"),
  ].filter(Boolean) as File[];

  if (!fileEntries.length) {
    return NextResponse.json({ error: "At least one file is required (field: files or invoice)" }, { status: 400 });
  }

  // Parse invoice metadata (optional but if present, will be stored in invoiceRecords)
  const invoiceNumber = (form.get("invoice_number") || form.get("invoiceNumber") || "").toString().trim();
  const invoiceDateRaw = (form.get("invoice_date") || form.get("invoiceDate") || "").toString().trim();
  const totalValueRaw = (form.get("total_value") || form.get("totalValue") || "").toString().trim();
  const currency = (form.get("currency") || "USD").toString().trim() || "USD";
  const itemsJson = (form.get("items") || "").toString().trim();

  let parsedDate: Date | null = null;
  if (invoiceDateRaw) {
    const d = new Date(invoiceDateRaw);
    if (!isNaN(d.getTime())) parsedDate = d; else parsedDate = null;
  }
  const totalValue = totalValueRaw ? Number(totalValueRaw) : NaN;

  await dbConnect();
  const pkg = await Package.findById(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  // Ensure the authenticated customer owns the package by userCode
  const userCode = (auth as AuthPayload)?.userCode as string | undefined;
  if (!userCode || pkg.userCode !== userCode) {
    return NextResponse.json({ error: "Forbidden: package does not belong to you" }, { status: 403 });
  }

  // Determine upload directory
  const baseDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads", "invoices");
  const publicPrefix = "/uploads/invoices"; // must align with baseDir within public
  await fs.mkdir(baseDir, { recursive: true });

  const saved: { filename: string; url: string; mimeType: string; size: number; uploadedAt: Date }[] = [];

  for (const file of fileEntries) {
    const mime = file.type || "";
    const size = typeof (file as File).size === "number" ? (file as File).size : undefined;

    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: `Unsupported file type: ${mime}` }, { status: 415 });
    }
    if (typeof size !== "number" || size <= 0) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }
    if (size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB` }, { status: 413 });
    }

    const originalName = (file as File).name || `invoice-${Date.now()}`;
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const fsPath = path.join(baseDir, unique);
    const url = `${publicPrefix}/${unique}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fsPath, buffer);

    saved.push({ filename: unique, url, mimeType: mime, size, uploadedAt: new Date() });
  }

  // Build optional structured invoice record if metadata is present and at least one file saved
  let invoiceRecord: InvoiceRecord | null = null;
  if (invoiceNumber && !isNaN(totalValue) && parsedDate && saved[0]) {
    let items: InvoiceItem[] = [];
    if (itemsJson) {
      try {
        const arr: unknown = JSON.parse(itemsJson);
        if (Array.isArray(arr)) {
          items = arr.map((raw): InvoiceItem => {
            const it = raw as Record<string, unknown>;
            return {
              description: String(it.description ?? ""),
              quantity: Number((it.quantity as number | string | undefined) ?? 0),
              unitValue: Number((it as any).unit_value ?? (it as any).unitValue ?? 0),
              totalValue: Number((it as any).total_value ?? (it as any).totalValue ?? 0),
            };
          });
        }
      } catch {}
    }

    invoiceRecord = {
      invoiceNumber,
      invoiceDate: parsedDate,
      totalValue: Number(totalValue.toFixed(2)),
      currency: currency || "USD",
      documentUrl: saved[0].url,
      items,
      status: "submitted",
      submittedAt: new Date(),
    };
  }

  // Push documents and optional invoice record
  // First push the uploaded documents
  let updated = await Package.findByIdAndUpdate(
    pkg._id,
    { $push: { invoiceDocuments: { $each: saved } } },
    { new: true }
  );

  // Then, if we have a structured invoice record, push it too
  if (invoiceRecord) {
    updated = await Package.findByIdAndUpdate(
      pkg._id,
      { $push: { invoiceRecords: invoiceRecord } },
      { new: true }
    );
  }

  return NextResponse.json({ ok: true, packageId: updated?._id, invoiceDocuments: updated?.invoiceDocuments });
}
