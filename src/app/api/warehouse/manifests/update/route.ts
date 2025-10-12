import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Manifest } from "@/models/Manifest";
import { isWarehouseAuthorized } from "@/lib/rbac";
import { manifestSchema } from "@/lib/validators";

export async function POST(req: Request) {
  if (!isWarehouseAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { manifestId, description, data } = parsed.data;
  const now = new Date();

  const doc = await Manifest.findOneAndUpdate(
    { manifestId },
    {
      $setOnInsert: { manifestId, createdAt: now },
      $set: { description, data, updatedAt: now },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true, manifest: doc });
}
