import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Package } from "@/models/Package";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(",")),
  ].join("\n");
}

export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await dbConnect();

  const url = new URL(req.url);
  const start = url.searchParams.get("start"); // ISO date
  const end = url.searchParams.get("end"); // ISO date
  const format = (url.searchParams.get("format") || "json").toLowerCase(); // json|csv

  const dateAnd: Array<Record<string, unknown>> = [];
  if (start || end) {
    if (start) dateAnd.push({ createdAt: { $gte: new Date(start) } });
    if (end) dateAnd.push({ createdAt: { $lte: new Date(end) } });
  }

  let rows: Array<Record<string, unknown>> = [];

  if (type === "packages") {
    type PRow = {
      trackingNumber: string;
      userCode?: string;
      status?: string;
      branch?: string;
      weight?: number;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };
    const filter: Record<string, unknown> = { status: { $ne: "Deleted" } };
    if (dateAnd.length) (filter as Record<string, unknown>).$and = dateAnd;
    const list = await Package.find(filter)
      .select("trackingNumber userCode status weight branch createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean<PRow[]>();
    rows = list.map((p) => ({
      tracking_number: p.trackingNumber,
      user_code: p.userCode ?? null,
      status: p.status ?? null,
      branch: p.branch ?? null,
      weight: typeof p.weight === "number" ? p.weight : null,
      created_at: p.createdAt ? new Date(p.createdAt as Date).toISOString() : null,
      updated_at: p.updatedAt ? new Date(p.updatedAt as Date).toISOString() : null,
    }));
  } else if (type === "transactions") {
    type TRow = {
      _id: unknown;
      userCode: string;
      amount: number;
      currency: string;
      method: string;
      status: string;
      reference?: string;
      gatewayId?: string;
      createdAt?: Date | string;
    };
    const filter: Record<string, unknown> = {};
    if (dateAnd.length) (filter as Record<string, unknown>).$and = dateAnd;
    const list = await Payment.find(filter).sort({ createdAt: -1 }).limit(5000).lean<TRow[]>();
    rows = list.map((p) => ({
      id: String(p._id),
      user_code: p.userCode,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      status: p.status,
      reference: p.reference ?? null,
      gateway_id: p.gatewayId ?? null,
      created_at: p.createdAt ? new Date(p.createdAt as Date).toISOString() : null,
    }));
  } else if (type === "customers") {
    type CRow = {
      userCode: string;
      firstName?: string;
      lastName?: string;
      email: string;
      createdAt?: Date | string;
      lastLogin?: Date | string;
      accountStatus?: string;
    };
    const filter: Record<string, unknown> = { role: "customer" };
    if (dateAnd.length) (filter as Record<string, unknown>).$and = dateAnd;
    const list = await User.find(filter)
      .select("userCode firstName lastName email createdAt lastLogin accountStatus")
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean<CRow[]>();
    rows = list.map((u) => ({
      user_code: u.userCode,
      full_name: [u.firstName || "", u.lastName || ""].filter(Boolean).join(" "),
      email: u.email,
      account_status: u.accountStatus ?? "active",
      created_at: u.createdAt ? new Date(u.createdAt as Date).toISOString() : null,
      last_login: u.lastLogin ? new Date(u.lastLogin as Date).toISOString() : null,
    }));
  } else {
    return NextResponse.json({ error: `Unknown report type: ${type}` }, { status: 400 });
  }

  if (format === "csv") {
    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=report_${type}.csv`,
      },
    });
  }

  return NextResponse.json({ type, count: rows.length, rows });
}
