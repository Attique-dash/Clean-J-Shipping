import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { getAuthFromRequest } from "@/lib/rbac";

export async function GET(req: Request) {
  const payload = getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const resource = url.searchParams.get("resource");
  const resourceId = url.searchParams.get("resourceId");
  const action = url.searchParams.get("action");
  const userId = url.searchParams.get("userId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));

  const filter: Record<string, unknown> = {};
  if (resource) filter.resource = resource;
  if (resourceId) filter.resourceId = resourceId;
  if (action) filter.action = action;
  if (userId) filter.userId = userId;

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
}
