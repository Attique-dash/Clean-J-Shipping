import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { User } from "@/models/User";
import { Package } from "@/models/Package";

export async function POST(req: Request) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // 1. Find and update all users with hyphens in userCode or shippingId
    const usersWithHyphen = await User.find({
      $or: [
        { userCode: { $regex: /-/ } },
        { shippingId: { $regex: /-/ } },
      ],
    });

    let updatedUsersCount = 0;
    const userUpdates: Array<{ id: string; oldCode: string; newCode: string }> = [];

    for (const user of usersWithHyphen) {
      const oldCode = user.userCode || "";
      const newCode = oldCode.replace(/-/g, "").toUpperCase();
      const oldShippingId = (user as any).shippingId || "";
      const newShippingId = oldShippingId.replace(/-/g, "").toUpperCase();

      if (newCode !== oldCode || newShippingId !== oldShippingId) {
        user.userCode = newCode || user.userCode;
        if (newShippingId) {
          (user as any).shippingId = newShippingId;
        }
        await user.save();
        updatedUsersCount++;
        userUpdates.push({
          id: user._id.toString(),
          oldCode,
          newCode,
        });
      }
    }

    // 2. Also update packages with hyphens in UserCode / userCode
    const packagesWithHyphen = await Package.find({
      $or: [
        { UserCode: { $regex: /-/ } },
        { userCode: { $regex: /-/ } },
      ],
    });

    let updatedPackagesCount = 0;
    for (const pkg of packagesWithHyphen) {
      const oldPkgCode = (pkg.UserCode || (pkg as any).userCode || "");
      const newPkgCode = oldPkgCode.replace(/-/g, "").toUpperCase();
      if (newPkgCode !== oldPkgCode) {
        pkg.UserCode = newPkgCode;
        (pkg as any).userCode = newPkgCode;
        await pkg.save();
        updatedPackagesCount++;
      }
    }

    console.log(`[Remove Hyphens Migration] Updated ${updatedUsersCount} users and ${updatedPackagesCount} packages`);

    return NextResponse.json({
      success: true,
      message: `Successfully removed hyphens from ${updatedUsersCount} users and ${updatedPackagesCount} packages`,
      updatedUsersCount,
      updatedPackagesCount,
      sampleUpdates: userUpdates.slice(0, 10),
    });
  } catch (error) {
    console.error("[Remove Hyphens Migration] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  // Allow checking how many users/packages currently have hyphens
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || (auth.role !== "admin" && auth.role !== "warehouse")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const usersCount = await User.countDocuments({
      $or: [{ userCode: { $regex: /-/ } }, { shippingId: { $regex: /-/ } }],
    });

    const packagesCount = await Package.countDocuments({
      $or: [{ UserCode: { $regex: /-/ } }, { userCode: { $regex: /-/ } }],
    });

    return NextResponse.json({
      success: true,
      usersWithHyphens: usersCount,
      packagesWithHyphens: packagesCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
