import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Manifest } from "@/models/Manifest";
import { manifestSchema } from "@/lib/validators";

export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const parsed = manifestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { manifestId, description, data } = parsed.data;
  const manifest = await Manifest.findOneAndUpdate(
    { manifestId },
    { manifestId, description, data },
    { upsert: true, new: true }
  );

  return NextResponse.json({ message: "Manifest stored", manifest });
}
