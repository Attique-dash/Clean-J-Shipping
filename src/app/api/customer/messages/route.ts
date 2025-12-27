import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload.id || payload._id || payload.uid;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found" }, { status: 400 });
  }

  try {
    // Connect to database
    await dbConnect();

    // Get user information to include userCode
    const user = (await User.findById(userId).select('userCode').lean()) as unknown as { userCode?: string } | null;
    const userCode = user?.userCode;
    
    if (!userCode) {
      console.error('User code not found for user:', userId);
      return NextResponse.json({ messages: [] });
    }

    // Fetch messages for this customer using userCode
    const messages = await Message.find({
      userCode: userCode,
    })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

    // Transform the data to match frontend expectations
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      subject: msg.subject,
      body: msg.body,
      sender: msg.sender,
      createdAt: msg.createdAt?.toISOString(),
      last_updated: msg.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

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

    const { subject, body } = raw as { subject: string; body: string };

    if (!body) {
      return NextResponse.json(
        { error: "Message body is required" }, 
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get user information to include userCode
    const user = await User.findById(userId).select('userCode').lean();
    const userCode = (user as any)?.userCode;
    
    if (!userCode) {
      console.error('User code not found for user:', userId);
      return NextResponse.json({ error: "User code not found" }, { status: 400 });
    }

    const created = await Message.create({
      userCode: userCode,
      customer: userId,
      subject: subject || "Support Team",
      body: body,
      sender: "customer",
      read: false,
    });

    return NextResponse.json({
      _id: created._id,
      subject: created.subject,
      body: created.body,
      sender: created.sender,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
