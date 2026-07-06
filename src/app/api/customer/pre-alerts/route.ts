import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import { Package } from "@/models/Package";
import Invoice from "@/models/Invoice";
import { Message } from "@/models/Message";
import { customerPreAlertCreateSchema } from "@/lib/validators";
import { IPreAlert } from "@/models/PreAlert";
import { Types } from "mongoose";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { sendNewPackageEmail } from "@/lib/email";

type PreAlertLean = Omit<IPreAlert, "_id"> & {
  _id?: { toString(): string };
};

export async function GET(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userCode = payload.userCode as string | undefined;
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user ID for queries
  const userId = (payload as any).id || (payload as any)._id || (payload as any).uid;
  
  // Fetch pre-alerts
  const preAlerts = await PreAlert.find({ userCode }).sort({ createdAt: -1 }).limit(100).lean();
  
  // Fetch recent packages (as alerts)
  const recentPackages = await Package.find({ 
    $or: [
      { userCode },
      ...(userId ? [{ userId: new Types.ObjectId(userId) }] : [])
    ]
  })
    .select("trackingNumber status createdAt updatedAt")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  
  // Fetch recent bills/invoices (as alerts)
  let recentBills: any[] = [];
  try {
    if (userId) {
      recentBills = await Invoice.find({
        $or: [
          { userId: new Types.ObjectId(userId) },
          { 'customer.id': userId }
        ]
      })
        .select("invoiceNumber status createdAt total balanceDue")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }
  } catch (err) {
    console.error("Error fetching recent bills:", err);
    // Continue without bills if there's an error
    recentBills = [];
  }
  
  // Fetch recent messages (as alerts)
  const recentMessages = await Message.find({ userCode })
    .select("subject body sender createdAt read")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  
  return NextResponse.json({
    pre_alerts: preAlerts.map((p: any) => ({
      _id: p._id?.toString() || "",
      trackingNumber: p.trackingNumber,
      carrier: p.carrier || null,
      origin: p.origin || null,
      expectedDate: p.expectedDate ? new Date(p.expectedDate).toISOString() : null,
      notes: p.notes || null,
      status: p.status || "submitted",
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      decidedAt: p.decidedAt ? new Date(p.decidedAt).toISOString() : null,
      userCode: p.userCode,
      description: p.description || null,
      pricePaid: p.pricePaid || null,
      overseasCourier: p.overseasCourier || null,
      merchant: p.merchant || null,
      attachmentFile: p.attachmentFile || null,
    })),
    alerts: {
      packages: recentPackages.map((p: any) => ({
        type: 'package',
        id: p._id?.toString() || "",
        trackingNumber: p.trackingNumber,
        status: p.status,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        message: `Package ${p.trackingNumber} - ${p.status}`
      })),
      bills: recentBills.map((b: any) => ({
        type: 'bill',
        id: b._id?.toString() || "",
        invoiceNumber: b.invoiceNumber,
        status: b.status,
        total: b.total,
        balanceDue: b.balanceDue,
        createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
        message: `Invoice ${b.invoiceNumber} - ${b.status}`
      })),
      messages: recentMessages.map((m: any) => ({
        type: 'message',
        id: m._id?.toString() || "",
        subject: m.subject,
        body: m.body,
        sender: m.sender,
        read: m.read || false,
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
        message: m.subject || m.body?.substring(0, 50) || 'New message'
      }))
    }
  });
}

export async function POST(req: Request) {
  await dbConnect();
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  let formData: FormData | null = null;
  let body: any = {};

  // Handle both JSON and FormData
  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
    body = {};
    formData.forEach((value, key) => {
      if (value instanceof File) {
        body[key] = value;
      } else {
        body[key] = value;
      }
    });
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const tracking_number = body.tracking_number || body.trackingNumber;
  const carrier = body.carrier;
  const origin = body.origin;
  const expected_date = body.expected_date || body.expectedDate;
  const notes = body.notes;
  const description = body.description;
  const pricePaid = (body.price_paid || body.pricePaid) ? parseFloat(body.price_paid || body.pricePaid) : undefined;
  const pricePaidCurrency = body.price_paid_currency || body.pricePaidCurrency || 'USD';
  const overseasCourier = body.overseas_courier || body.overseasCourier;
  const merchant = body.merchant;
  const file = body.file;

  const user = payload._id ? await User.findById(payload._id).select("_id userCode email firstName") : null;
  const userCode = user?.userCode || (payload.userCode as string | undefined);
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expectedDate = expected_date
    ? (/^\d{4}-\d{2}-\d{2}$/.test(expected_date)
        ? new Date(`${expected_date}T00:00:00.000Z`)
        : new Date(expected_date))
    : null;

  if (!expectedDate) {
    return NextResponse.json({ error: "Expected arrival date is required" }, { status: 400 });
  }

  // Handle file upload
  let attachmentFile: any = null;
  if (file && file instanceof File) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "prealerts");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filepath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filepath, buffer);

    attachmentFile = {
      filename,
      originalName: file.name,
      mimetype: file.type,
      size: file.size,
      path: `/uploads/prealerts/${filename}`,
      url: `/uploads/prealerts/${filename}`,
    };
  }

  let created;
  try {
    created = await PreAlert.create({
      userCode,
      customer: user?._id,
      trackingNumber: tracking_number,
      carrier,
      origin,
      expectedDate,
      notes,
      description,
      pricePaid,
      pricePaidCurrency,
      overseasCourier,
      merchant,
      attachmentFile,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      const mongoError = error as { code: number; keyPattern?: { trackingNumber?: string } };
      if (mongoError.keyPattern?.trackingNumber) {
        return NextResponse.json({ error: `A pre-alert with tracking number "${tracking_number}" already exists` }, { status: 409 });
      }
    }
    console.error('PreAlert creation error:', error);
    return NextResponse.json({ error: "Failed to create pre-alert" }, { status: 500 });
  }

  // Send email notification to customer with invoice upload link
  try {
    if (user?.email) {
      // Get warehouse addresses from database
      let warehouseAddresses = { airAddress: '', seaAddress: '', chinaAddress: '' };
      try {
        const { Warehouse } = await import('@/models/Warehouse');
        const defaultWarehouse = await Warehouse.findOne({ isActive: true, isDefault: true })
          .select('airAddress seaAddress chinaAddress address')
          .lean() as { airAddress?: string; seaAddress?: string; chinaAddress?: string; address?: string } | null;
        if (defaultWarehouse) {
          warehouseAddresses = {
            airAddress: defaultWarehouse.airAddress || defaultWarehouse.address || '',
            seaAddress: defaultWarehouse.seaAddress || defaultWarehouse.address || '',
            chinaAddress: defaultWarehouse.chinaAddress || defaultWarehouse.address || ''
          };
        }
      } catch (whError) {
        console.error('[Pre-alert Create] Failed to fetch warehouse addresses:', whError);
      }
      
      await sendNewPackageEmail({
        to: user.email,
        firstName: user.firstName || 'Customer',
        trackingNumber: tracking_number,
        status: 'Pre-Alert Submitted',
        description: description || `Pre-alert for package from ${merchant || 'unknown merchant'}`,
        warehouseAddresses,
      });
    }
  } catch (emailError) {
    console.error('[Pre-alert Create] Email notification failed:', emailError);
    // Don't fail the request if email fails
  }

  return NextResponse.json({
    pre_alert_id: String(created._id),
    tracking_number,
    carrier: carrier ?? null,
    origin: origin ?? null,
    expected_date: expectedDate ? expectedDate.toISOString() : null,
    notes: notes ?? null,
    description: description ?? null,
    pricePaid: pricePaid ?? null,
    overseasCourier: overseasCourier ?? null,
    merchant: merchant ?? null,
    attachmentFile: attachmentFile ?? null,
    integration_source: "customer_pre_alert",
  });
}
