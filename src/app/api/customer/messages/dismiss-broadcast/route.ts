import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { Message } from "@/models/Message";

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.id || payload._id || payload.uid;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 400 });
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { broadcastId } = raw as { broadcastId: string };

    if (!broadcastId) {
      return NextResponse.json(
        { error: "Broadcast ID is required" }, 
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Mark all messages with this broadcastId as read for this user
    const result = await Message.updateMany(
      { 
        broadcastId: broadcastId,
        customer: userId
      },
      { 
        read: true 
      }
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error dismissing broadcast:", error);
    return NextResponse.json({ error: "Failed to dismiss broadcast" }, { status: 500 });
  }
}
