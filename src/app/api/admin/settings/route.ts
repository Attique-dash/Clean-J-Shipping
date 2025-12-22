import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Settings } from "@/models/Settings";
import { getAuthFromRequest } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const url = new URL(req.url);
    const category = url.searchParams.get("category");

    const filter: Record<string, unknown> = {};
    if (category) {
      filter.category = category;
    }

    const settings = await Settings.find(filter).sort({ category: 1, key: 1 }).lean();

    // Group by category for easier frontend consumption
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updatedAt,
      });
      return acc;
    }, {} as Record<string, unknown[]>);

    return NextResponse.json({
      settings: grouped,
      flat: settings,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: "Settings must be an array" }, { status: 400 });
    }

    const updatedSettings = [];
    const adminId = payload._id || payload.id || payload.uid;

    for (const setting of settings) {
      const { key, value, category, description } = setting;

      if (!key || value === undefined || !category) {
        continue; // Skip invalid entries
      }

      const result = await Settings.findOneAndUpdate(
        { key },
        {
          value,
          category,
          description,
          updatedBy: adminId,
          updatedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      updatedSettings.push(result);
    }

    return NextResponse.json({
      success: true,
      updated: updatedSettings.length,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}

