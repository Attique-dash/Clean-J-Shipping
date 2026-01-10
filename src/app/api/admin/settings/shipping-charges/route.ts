import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/rbac";
import { Settings } from "@/models/Settings";

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const settings = await Settings.find({ category: "shipping_charges" }).lean();
    
    const defaultSettings = {
      baseRate: 700,
      additionalRate: 350,
      customsDutyRate: 15,
      customsThreshold: 100,
      storageFreeDays: 7,
      storageDailyRate: 50,
      exchangeRate: 155,
    };

    if (settings.length === 0) {
      return NextResponse.json(defaultSettings);
    }

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = typeof setting.value === "number" ? setting.value : parseFloat(String(setting.value)) || 0;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      baseRate: settingsMap.baseRate || defaultSettings.baseRate,
      additionalRate: settingsMap.additionalRate || defaultSettings.additionalRate,
      customsDutyRate: settingsMap.customsDutyRate || defaultSettings.customsDutyRate,
      customsThreshold: settingsMap.customsThreshold || defaultSettings.customsThreshold,
      storageFreeDays: settingsMap.storageFreeDays || defaultSettings.storageFreeDays,
      storageDailyRate: settingsMap.storageDailyRate || defaultSettings.storageDailyRate,
      exchangeRate: settingsMap.exchangeRate || defaultSettings.exchangeRate,
    });
  } catch (error) {
    console.error("Shipping charges GET error:", error);
    return NextResponse.json(
      { error: "Failed to load shipping charges settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const {
      baseRate,
      additionalRate,
      customsDutyRate,
      customsThreshold,
      storageFreeDays,
      storageDailyRate,
      exchangeRate,
    } = body;

    const adminId = payload._id || payload.id || payload.uid;

    const settingsToUpdate = [
      { key: "baseRate", value: baseRate, category: "shipping_charges", description: "Base shipping rate per first lb (JMD)" },
      { key: "additionalRate", value: additionalRate, category: "shipping_charges", description: "Additional rate per lb after first (JMD)" },
      { key: "customsDutyRate", value: customsDutyRate, category: "shipping_charges", description: "Customs duty rate (%)" },
      { key: "customsThreshold", value: customsThreshold, category: "shipping_charges", description: "Customs duty threshold (USD)" },
      { key: "storageFreeDays", value: storageFreeDays, category: "shipping_charges", description: "Free storage days" },
      { key: "storageDailyRate", value: storageDailyRate, category: "shipping_charges", description: "Daily storage rate after free period (JMD)" },
      { key: "exchangeRate", value: exchangeRate, category: "shipping_charges", description: "USD to JMD exchange rate" },
    ];

    const updated = [];
    for (const setting of settingsToUpdate) {
      if (setting.value !== undefined) {
        const result = await Settings.findOneAndUpdate(
          { key: setting.key },
          {
            value: setting.value,
            category: setting.category,
            description: setting.description,
            updatedBy: adminId,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
        updated.push(result);
      }
    }

    return NextResponse.json({
      success: true,
      updated: updated.length,
      settings: {
        baseRate: updated.find((s) => s.key === "baseRate")?.value || baseRate,
        additionalRate: updated.find((s) => s.key === "additionalRate")?.value || additionalRate,
        customsDutyRate: updated.find((s) => s.key === "customsDutyRate")?.value || customsDutyRate,
        customsThreshold: updated.find((s) => s.key === "customsThreshold")?.value || customsThreshold,
        storageFreeDays: updated.find((s) => s.key === "storageFreeDays")?.value || storageFreeDays,
        storageDailyRate: updated.find((s) => s.key === "storageDailyRate")?.value || storageDailyRate,
        exchangeRate: updated.find((s) => s.key === "exchangeRate")?.value || exchangeRate,
      },
    });
  } catch (error) {
    console.error("Shipping charges PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update shipping charges settings" },
      { status: 500 }
    );
  }
}

