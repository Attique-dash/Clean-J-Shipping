import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.id || payload._id || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");

    // Connect to database
    await dbConnect();

    // Get user information to include userCode
    const user = await User.findById(userId).select('userCode').lean();
    const userCode = user?.userCode;
    
    if (!userCode) {
      console.error('User code not found for user:', userId);
      return NextResponse.json({ tickets: [] });
    }

    // Build query for messages
    const where: Record<string, unknown> = {
      userCode: userCode,
      sender: "customer" // Only get customer-created support tickets
    };

    if (status) where.status = status;
    if (category) where.category = category;

    const tickets = await Message.find(where)
      .sort({ createdAt: 'desc' })
      .limit(200)
      .lean();

    // Format tickets for frontend
    const formattedTickets = tickets.map((ticket) => ({
      _id: ticket._id,
      subject: ticket.subject || "Support Request",
      message: ticket.body,
      status: ticket.status || "open",
      category: ticket.category || "inquiry",
      priority: ticket.priority || "normal",
      createdAt: ticket.createdAt?.toISOString(),
      updatedAt: ticket.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error) {
    console.error("Support tickets GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getAuthFromRequest(req);
    if (!payload || payload.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.id || payload._id || payload.uid;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const body = await req.json();
    const { subject, message, category, priority } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();

    // Get user information to include userCode
    const user = await User.findById(userId).select('userCode').lean();
    const userCode = user?.userCode;
    
    if (!userCode) {
      console.error('User code not found for user:', userId);
      return NextResponse.json({ error: "User code not found" }, { status: 400 });
    }

    const ticket = await Message.create({
      userCode: userCode,
      customer: userId,
      subject,
      body: message,
      category: category || "inquiry",
      priority: priority || "normal",
      sender: "customer",
      read: false,
    });

    return NextResponse.json(
      {
        success: true,
        ticket: {
          _id: ticket._id,
          subject: ticket.subject,
          message: ticket.body,
          status: ticket.status || "open",
          category: ticket.category || "inquiry",
          priority: ticket.priority || "normal",
          createdAt: ticket.createdAt?.toISOString(),
          updatedAt: ticket.updatedAt?.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Support ticket POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ticket" },
      { status: 500 }
    );
  }
}

