// src/app/api/warehouse/messages/route.ts
import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    // Fetch all customer messages (team conversations - not broadcasts)
    const messages = await Message.find({
      broadcastId: { $exists: false }, // Exclude broadcasts
      sender: "customer", // Only customer messages
    })
      .populate('customer', 'firstName lastName email userCode')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Group messages by userCode (conversation thread)
    const conversations = new Map<string, {
      userCode: string;
      customerName: string;
      customerEmail: string;
      customerId: string;
      messages: any[];
      unread: number;
      lastMessage?: string;
      lastAt?: Date;
    }>();

    for (const msg of messages) {
      const customer = msg.customer as any;
      const userCode = customer?.userCode || msg.userCode;
      
      if (!userCode) continue;

      if (!conversations.has(userCode)) {
        conversations.set(userCode, {
          userCode,
          customerName: customer?.firstName && customer?.lastName 
            ? `${customer.firstName} ${customer.lastName}` 
            : customer?.email || 'Unknown Customer',
          customerEmail: customer?.email || '',
          customerId: customer?._id?.toString() || '',
          messages: [],
          unread: 0,
        });
      }

      const conv = conversations.get(userCode)!;
      conv.messages.push({
        _id: msg._id,
        subject: msg.subject,
        body: msg.body,
        sender: msg.sender,
        read: msg.read,
        createdAt: msg.createdAt?.toISOString(),
        updatedAt: msg.updatedAt?.toISOString(),
      });

      if (!msg.read) conv.unread++;
      if (!conv.lastAt || (msg.createdAt && new Date(msg.createdAt) > conv.lastAt)) {
        conv.lastAt = msg.createdAt;
        conv.lastMessage = msg.body;
      }
    }

    // Convert to array and sort by last activity
    const conversationsList = Array.from(conversations.values())
      .map(conv => ({
        ...conv,
        messages: conv.messages.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ),
      }))
      .sort((a, b) => 
        new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
      );

    return NextResponse.json({ conversations: conversationsList });
  } catch (error) {
    console.error("Error fetching warehouse messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { userCode, body, subject } = raw as { userCode: string; body: string; subject?: string };

    if (!userCode || !body) {
      return NextResponse.json(
        { error: "userCode and body are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find customer by userCode
    const customer = await User.findOne({ userCode, role: "customer" }).select("_id userCode");
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create reply message
    const created = await Message.create({
      userCode: customer.userCode,
      customer: customer._id,
      subject: subject || "Support Team",
      body: body,
      sender: "support", // Warehouse staff replies as support
      read: false,
    });

    // Mark customer's previous messages as read
    await Message.updateMany(
      { userCode: customer.userCode, sender: "customer", read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({
      _id: created._id,
      subject: created.subject,
      body: created.body,
      sender: created.sender,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating warehouse message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messageId, read } = body;

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    await dbConnect();

    await Message.findByIdAndUpdate(messageId, { $set: { read: read !== undefined ? read : true } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

