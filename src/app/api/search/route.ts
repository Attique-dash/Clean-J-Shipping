import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

    await dbConnect();

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const [pkgs, users] = await Promise.all([
      Package.find({ $or: [ { trackingNumber: regex }, { userCode: regex }, { description: regex } ], status: { $ne: "Deleted" } })
        .select("trackingNumber userCode description status updatedAt")
        .limit(10)
        .lean(),
      User.find({ $or: [ { email: regex }, { firstName: regex }, { lastName: regex }, { userCode: regex } ] })
        .select("firstName lastName email userCode role")
        .limit(10)
        .lean(),
    ]);

    const results: Array<{
      type: "package" | "user";
      title: string;
      subtitle?: string;
      href: string;
    }> = [];

    for (const p of pkgs) {
      const title = `Package ${p.trackingNumber}`;
      const subtitle = `${p.userCode || ""}${p.description ? " • " + p.description : ""}`.trim();
      results.push({ type: "package", title, subtitle, href: `/admin?tracking=${encodeURIComponent(p.trackingNumber)}` });
    }
    for (const u of users) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
      const subtitle = `${u.userCode || ""} • ${u.role}`;
      results.push({ type: "user", title: name, subtitle, href: `/admin/customers?code=${encodeURIComponent(u.userCode || "")}` });
    }

    return NextResponse.json({ q, results });
  } catch (e) {
    console.error("/api/search failed", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
