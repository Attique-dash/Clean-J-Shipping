import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Manifest } from "@/models/Manifest";
import { getAuthFromRequest } from "@/lib/rbac";
import { manifestSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
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

  const { manifestId, data } = parsed.data;
  const description = (raw as any)?.description as string | undefined;

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
