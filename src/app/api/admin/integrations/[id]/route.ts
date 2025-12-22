import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Integration, IIntegration } from "@/models/Integration";
import { getAuthFromRequest } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const integration = await Integration.findById(params.id).lean() as IIntegration | null;

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    // Remove sensitive credentials from response
    const sanitized = {
      ...integration,
      credentials: integration.credentials ? { masked: true } : undefined,
      webhookSecret: integration.webhookSecret ? "***" : undefined,
    };

    return NextResponse.json({ integration: sanitized });
  } catch (error) {
    console.error("Integration GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch integration" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { name, config, credentials, webhookUrl, webhookSecret, testMode, isActive, metadata } = body;

    const adminId = payload._id || payload.id || payload.uid;

    const updateData: Record<string, unknown> = {
      updatedBy: adminId,
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = config;
    if (credentials !== undefined) updateData.credentials = credentials;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;
    if (webhookSecret !== undefined) updateData.webhookSecret = webhookSecret;
    if (testMode !== undefined) updateData.testMode = testMode;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (metadata !== undefined) updateData.metadata = metadata;

    const integration = await Integration.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    ).lean() as IIntegration | null;

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      integration: {
        ...integration,
        credentials: integration.credentials ? { masked: true } : undefined,
        webhookSecret: integration.webhookSecret ? "***" : undefined,
      },
    });
  } catch (error) {
    console.error("Integration PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const integration = await Integration.findByIdAndDelete(params.id);

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Integration deleted" });
  } catch (error) {
    console.error("Integration DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete integration" },
      { status: 500 }
    );
  }
}

