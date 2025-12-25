import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Manifest } from "@/models/Manifest";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'warehouse'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const skip = parseInt(url.searchParams.get("skip") || "0");

    const manifests = await Manifest.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return NextResponse.json({ manifests });
  } catch (error) {
    console.error("Manifests GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch manifests" },
      { status: 500 }
    );
  }
}

