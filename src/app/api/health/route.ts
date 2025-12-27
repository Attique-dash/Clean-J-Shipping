import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export async function GET() {
  try {
    // Test database connection
    await dbConnect();
    
    return NextResponse.json({ 
      ok: true, 
      time: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      time: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}