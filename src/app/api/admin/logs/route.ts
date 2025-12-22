import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
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
    const resource = url.searchParams.get("resource");
    const resourceId = url.searchParams.get("resourceId");
    const action = url.searchParams.get("action");
    const userId = url.searchParams.get("userId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));

    const filter: Record<string, unknown> & { timestamp?: { $gte?: Date; $lte?: Date } } = {};
    if (resource) filter.resource = resource;
    if (resourceId) filter.resourceId = resourceId;
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Logs GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

