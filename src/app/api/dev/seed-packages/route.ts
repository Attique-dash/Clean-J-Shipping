import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { getAuthFromRequest } from "@/lib/rbac";

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTracking(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `PKG-${s}`;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const count = Math.max(1, Math.min(200, Number(url.searchParams.get("count") || 10)));
  const userCodeParam = url.searchParams.get("userCode") || undefined;
  const emailParam = url.searchParams.get("email") || undefined;

  // Resolve target userCode
  let userCode: string | undefined = undefined;

  if (userCodeParam) {
    userCode = userCodeParam;
  } else if (emailParam) {
    const u = await User.findOne({ email: emailParam }).select("userCode");
    userCode = u?.userCode;
  } else {
    const payload = await getAuthFromRequest(req);
    if (payload?.userCode) userCode = String(payload.userCode);
    if (!userCode && payload?._id) {
      const u = await User.findById(payload._id).select("userCode");
      userCode = u?.userCode;
    }
  }

  if (!userCode) {
    return NextResponse.json(
      { error: "No user context. Provide userCode/email query or send request as an authenticated user." },
      { status: 400 }
    );
  }

  const statuses = ["Unknown", "At Warehouse", "In Transit", "At Local Port", "Delivered"] as const;
  const shippers = ["DHL", "FedEx", "UPS", "USPS", "Aramex", "Local"];

  const created: string[] = [];
  const docs: any[] = [];

  for (let i = 0; i < count; i++) {
    const status = randomItem([...statuses]);
    const weight = Math.round((Math.random() * 20 + 0.2) * 10) / 10;
    const trackingNumber = randomTracking();

    const history = [
      { status: "Unknown", at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
      { status: "At Warehouse", at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
    ];
    if (status === "In Transit" || status === "At Local Port" || status === "Delivered") {
      history.push({ status: "In Transit", at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) });
    }
    if (status === "At Local Port" || status === "Delivered") {
      history.push({ status: "At Local Port", at: new Date(Date.now() - 1000 * 60 * 60) });
    }
    if (status === "Delivered") {
      history.push({ status: "Delivered", at: new Date(Date.now() - 1000 * 60 * 10) });
    }

    docs.push({
      trackingNumber,
      userCode,
      weight,
      shipper: randomItem(shippers),
      status,
      description: `Sample package ${i + 1}`,
      branch: randomItem(["HQ", "NYC", "LAX", "MIA"]),
      serviceTypeId: randomItem(["S1", "S2", "S3"]),
      history,
    });
  }

  // Insert sequentially to honor unique trackingNumber; ignore duplicates if any race (unlikely)
  for (const d of docs) {
    try {
      const doc = await Package.create(d);
      created.push(doc.trackingNumber);
    } catch (e: any) {
      // duplicate key -> regenerate tracking once and retry
      if (e && e.code === 11000) {
        d.trackingNumber = randomTracking();
        try {
          const doc = await Package.create(d);
          created.push(doc.trackingNumber);
        } catch {
          // skip on second failure
        }
      }
    }
  }

  return NextResponse.json({ message: "Seeded packages", userCode, count: created.length, trackingNumbers: created });
}
