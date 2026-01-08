import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { User } from "@/models/User";

export async function GET() {
  try {
    console.log("🔍 Testing database connection...");
    
    // Test database connection
    await dbConnect();
    console.log("✅ Database connected successfully");
    
    // Test user count
    const userCount = await User.countDocuments();
    console.log("📊 Total users in database:", userCount);
    
    // Test creating a simple user
    console.log("🧪 Testing user creation...");
    const testUserCode = `TEST${Date.now()}`;
    const testUser = {
      userCode: testUserCode,
      firstName: "Test",
      lastName: "User",
      email: `test${Date.now()}@example.com`,
      passwordHash: "testhash",
      phone: "",
      role: "customer",
      registrationStep: 3,
      emailVerified: true,
      accountStatus: "active"
    };
    
    const created = await User.create(testUser);
    console.log("✅ Test user created:", { id: created._id, userCode: created.userCode });
    
    // Clean up test user
    await User.findByIdAndDelete(created._id);
    console.log("🧹 Test user cleaned up");
    
    return NextResponse.json({ 
      success: true, 
      message: "Database test completed successfully",
      userCount,
      testUserCode
    });
    
  } catch (error: unknown) {
    console.error("❌ Database test failed:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : String(error),
      errors: (error as any).errors,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      details: {
        name: (error as any).name || 'Unknown Error',
        errors: (error as any).errors || []
      }
    }, { status: 500 });
  }
}
