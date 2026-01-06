// Test file to verify all imports work correctly
import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { dbConnect } from "@/lib/db";
import { GeneratedInvoice } from "@/models/GeneratedInvoice";
import { PosTransaction } from "@/models/PosTransaction";
import Invoice from "@/models/Invoice";
import { Package } from "@/models/Package";

export async function GET(req: Request) {
  try {
    // Test that all models can be imported
    console.log("✅ All models imported successfully");
    
    return NextResponse.json({ 
      message: "All imports working correctly",
      models: {
        GeneratedInvoice: !!GeneratedInvoice,
        PosTransaction: !!PosTransaction,
        Invoice: !!Invoice,
        Package: !!Package
      }
    });
  } catch (error) {
    console.error("❌ Import test failed:", error);
    return NextResponse.json({ 
      error: "Import test failed",
      details: error.message 
    }, { status: 500 });
  }
}
