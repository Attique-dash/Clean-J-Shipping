import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { PreAlert } from "@/models/PreAlert";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const preAlert = await PreAlert.findById(id);
    if (!preAlert) {
      return NextResponse.json({ error: "Pre-alert not found" }, { status: 404 });
    }

    // Update status with admin tracking
    preAlert.status = status;
    preAlert.decidedBy = payload._id;
    preAlert.decidedAt = new Date();
    await preAlert.save();

    return NextResponse.json({
      success: true,
      pre_alert: {
        _id: preAlert._id,
        status: preAlert.status,
        decidedAt: preAlert.decidedAt,
        decidedBy: preAlert.decidedBy,
      },
    });
  } catch (error) {
    console.error("Pre-alert PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update pre-alert" },
      { status: 500 }
    );
  }
}

