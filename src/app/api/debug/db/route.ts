import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export async function GET() {
  try {
    const uri = process.env.MONGODB_URI ? `${process.env.MONGODB_URI}`.replace(/:\/\/([^:@]+):([^@]+)@/, "://***:***@") : "<not-set>";
    const db = process.env.MONGODB_DB || "<not-set>";
    await dbConnect();
    return NextResponse.json({ ok: true, uri, db });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
