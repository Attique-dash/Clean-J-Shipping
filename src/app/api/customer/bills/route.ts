import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package, IPackage } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
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

  const pkgs = await Package.find({ userCode, status: { $ne: "Deleted" } })
    .select("trackingNumber invoiceDocuments invoiceRecords updatedAt createdAt description")
    .sort({ updatedAt: -1 })
    .limit(500)
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

  const bills: Bill[] = pkgs.flatMap((p: IPackage & { invoiceRecords?: any[]; invoiceDocuments?: any[] }) => {
    const recs = Array.isArray(p.invoiceRecords) ? p.invoiceRecords : [];
    if (recs.length === 0) {
      // No structured invoice yet; reflect if documents exist
      const docs = Array.isArray(p.invoiceDocuments) ? p.invoiceDocuments : [];
      const payment_status: Bill["payment_status"] = docs.length > 0 ? "submitted" : "none";
      return [
        {
          tracking_number: p.trackingNumber,
          description: (p as any).description,
          amount_due: 0,
          payment_status,
          last_updated: (p.updatedAt || p.createdAt) ? new Date((p.updatedAt || p.createdAt) as any).toISOString() : undefined,
        },
      ];
    }
    const latest = recs[recs.length - 1];
    return [
      {
        tracking_number: p.trackingNumber,
        description: (p as any).description,
        invoice_number: latest.invoiceNumber,
        invoice_date: latest.invoiceDate ? new Date(latest.invoiceDate).toISOString() : undefined,
        currency: latest.currency || "USD",
        amount_due: typeof latest.totalValue === "number" ? Number(latest.totalValue) : 0,
        payment_status: latest.status || "submitted",
        document_url: latest.documentUrl,
        last_updated: (p.updatedAt || p.createdAt) ? new Date((p.updatedAt || p.createdAt) as any).toISOString() : undefined,
      },
    ];
  });

  return NextResponse.json({ bills, total_count: bills.length });
}
