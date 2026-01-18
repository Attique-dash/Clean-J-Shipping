import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { Package, IPackage } from "@/models/Package";
import { Message } from "@/models/Message";
import { Types } from "mongoose";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || (payload.role !== "customer" && payload.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  let userCode = payload.userCode as string | undefined;
  if (!userCode && payload._id) {
    const user = await User.findById(payload._id).select("userCode");
    userCode = user?.userCode;
  }
  if (!userCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user ID for package query
  const userId = (payload as any).uid || (payload as any)._id || (payload as any).id;
  
  // Archived packages: delivered or deleted (case-insensitive match)
  // Also check by userId if userCode doesn't match
  const pkgs = await Package.find({ 
    $or: [
      { userCode, 
        $or: [
          { status: { $regex: /^delivered$/i } },
          { status: { $regex: /^deleted$/i } },
          { status: { $regex: /delivered/i } },
          { status: { $regex: /deleted/i } }
        ]
      },
      ...(userId ? [{
        userId: new Types.ObjectId(userId),
        $or: [
          { status: { $regex: /^delivered$/i } },
          { status: { $regex: /^deleted$/i } },
          { status: { $regex: /delivered/i } },
          { status: { $regex: /deleted/i } }
        ]
      }] : [])
    ]
  })
    .select("trackingNumber description status updatedAt createdAt invoiceRecords invoiceDocuments")
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();

  // Archived messages: most recent 200 for this user
  const msgs = await Message.find({ userCode })
    .select("subject body sender createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  type Bill = {
    tracking_number: string;
    description?: string;
    invoice_number?: string;
    invoice_date?: string;
    currency?: string;
    amount_due: number;
    payment_status: "submitted" | "reviewed" | "rejected" | "none";
    document_url?: string;
    last_updated?: string;
  };

  const bills: Bill[] = (pkgs as unknown[]).flatMap((p) => {
    const pkg = p as IPackage & { invoiceRecords?: any[]; invoiceDocuments?: any[] };
    const recs = Array.isArray(pkg.invoiceRecords) ? pkg.invoiceRecords : [];
    if (recs.length === 0) {
      const docs = Array.isArray(pkg.invoiceDocuments) ? pkg.invoiceDocuments : [];
      const payment_status: Bill["payment_status"] = docs.length > 0 ? "submitted" : "none";
      return [
        {
          tracking_number: pkg.trackingNumber,
          description: (pkg as any).description,
          amount_due: 0,
          payment_status,
          last_updated: (pkg.updatedAt || pkg.createdAt) ? new Date((pkg.updatedAt || pkg.createdAt) as any).toISOString() : undefined,
        },
      ];
    }
    const latest = recs[recs.length - 1];
    return [
      {
        tracking_number: pkg.trackingNumber,
        description: (pkg as any).description,
        invoice_number: latest.invoiceNumber,
        invoice_date: latest.invoiceDate ? new Date(latest.invoiceDate).toISOString() : undefined,
        currency: latest.currency || "USD",
        amount_due: typeof latest.totalValue === "number" ? Number(latest.totalValue) : 0,
        payment_status: latest.status || "submitted",
        document_url: latest.documentUrl,
        last_updated: (pkg.updatedAt || pkg.createdAt) ? new Date((pkg.updatedAt || pkg.createdAt) as any).toISOString() : undefined,
      },
    ];
  });

  const packages = pkgs.map((p) => ({
    tracking_number: p.trackingNumber,
    description: (p as any).description,
    status: p.status,
    last_updated: (p.updatedAt || p.createdAt) ? new Date((p.updatedAt || p.createdAt) as any).toISOString() : undefined,
  }));

  const messages = msgs.map((m) => ({
    subject: m.subject || null,
    body: m.body,
    sender: m.sender,
    created_at: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
  }));

  return NextResponse.json({ packages, bills, messages });
}
