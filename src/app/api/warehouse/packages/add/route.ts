import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import { Warehouse } from "@/models/Warehouse";
import { getAuthFromRequest } from "@/lib/rbac";
import { addPackageSchema } from "@/lib/validators";
import { sendNewPackageEmail } from "@/lib/email";
import { startSession } from "mongoose";
import { InventoryService } from "@/lib/inventory-service";

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0; 
}

function detectShippingMethod(shipper?: string, origin?: string, description?: string): 'air' | 'sea' | 'china' | 'local' {
  const shipperLower = (shipper || '').toLowerCase();
  const originLower = (origin || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  // Check for China indicators
  if (shipperLower.includes('china') || originLower.includes('china') || descLower.includes('china') ||
      shipperLower.includes('beijing') || shipperLower.includes('shanghai') || shipperLower.includes('guangzhou')) {
    return 'china';
  }
  
  // Check for air indicators
  if (shipperLower.includes('air') || shipperLower.includes('fedex') || shipperLower.includes('dhl') || 
      shipperLower.includes('ups') || shipperLower.includes('express') || descLower.includes('air')) {
    return 'air';
  }
  
  // Check for sea indicators
  if (shipperLower.includes('sea') || shipperLower.includes('ocean') || shipperLower.includes('cargo') ||
      shipperLower.includes('freight') || shipperLower.includes('vessel') || descLower.includes('sea')) {
    return 'sea';
  }
  
  return 'local';
}

export async function POST(req: Request) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== "warehouse") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addPackageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trackingNumber, userCode, weight, shipper, description, itemDescription, entryDate, status, dimensions, recipient, sender, contents, value, specialInstructions, receivedBy, warehouse, currency, pricePaidCurrency, paymentCurrency } = parsed.data;

  // Detect shipping method
  const shippingMethod = detectShippingMethod(shipper, warehouse, description);
  console.log(`Detected shipping method for ${trackingNumber}: ${shippingMethod}`);

  // Resolve currency from package data or default to USD
  const packageCurrency = (currency || pricePaidCurrency || paymentCurrency || 'USD').toString().trim().toUpperCase();

  // Get warehouse addresses based on shipping method
  let warehouseAddresses = { airAddress: '', seaAddress: '', chinaAddress: '' };
  try {
    const defaultWarehouse = await Warehouse.findOne({ isActive: true, isDefault: true })
      .select('airAddress seaAddress chinaAddress address')
      .lean() as { airAddress?: string; seaAddress?: string; chinaAddress?: string; address?: string } | null;
    if (defaultWarehouse) {
      warehouseAddresses = {
        airAddress: defaultWarehouse.airAddress || defaultWarehouse.address || '',
        seaAddress: defaultWarehouse.seaAddress || defaultWarehouse.address || '',
        chinaAddress: defaultWarehouse.chinaAddress || defaultWarehouse.address || ''
      };
    }
  } catch (error) {
    console.error('Error fetching warehouse addresses:', error);
  }

  // Normalize received date to start of day UTC if a date-only string is supplied
  let now = new Date(entryDate ?? Date.now());
  if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    now = new Date(`${entryDate}T00:00:00.000Z`);
  }

  const session = await startSession();
  try {
    await session.startTransaction();

    // Ensure customer exists within the transaction
    const customer = await User.findOne({ userCode, role: "customer" })
      .session(session)
      .select("_id userCode email firstName");
    if (!customer) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create/update package within the transaction
    const pkg = await Package.findOneAndUpdate(
      { trackingNumber },
      {
        // Keep insert-only fields in $setOnInsert
        $setOnInsert: {
          userCode: customer.userCode,
          userId: customer._id,
          customer: customer._id,
          createdAt: now,
        },
        // Updatable fields in $set - remove duplicates from $setOnInsert
        $set: {
          weight: typeof weight === "number" ? weight : undefined,
          shipper: typeof shipper === "string" ? shipper : undefined,
          description: typeof description === "string" ? description : undefined,
          status: status || "received",
          updatedAt: now,
          // No auto-charges - regularCharge and customCharge start at 0
          regularCharge: 0,
          customCharge: 0,
          chargeCurrency: packageCurrency, // Use actual currency instead of hardcoded JMD
          pricePaidCurrency: packageCurrency, // Set for consistency
          paymentCurrency: packageCurrency, // Set for consistency
          paymentMethod: "cash",
          // Recipient information
          receiverName: recipient?.name || undefined,
          receiverEmail: recipient?.email || undefined,
          receiverPhone: recipient?.phone || undefined,
          receiverAddress: recipient?.address || undefined,
          receiverCountry: (recipient as { country?: string })?.country || undefined,
          // Sender information
          senderName: sender?.name || undefined,
          senderEmail: sender?.email || undefined,
          senderPhone: sender?.phone || undefined,
          senderAddress: sender?.address || undefined,
          senderCountry: (sender as { country?: string })?.country || undefined,
          // Package dimensions
          length: dimensions?.length ? Number(dimensions.length) : undefined,
          width: dimensions?.width ? Number(dimensions.width) : undefined,
          height: dimensions?.height ? Number(dimensions.height) : undefined,
          dimensionUnit: dimensions?.unit || "cm",
          weightUnit: "kg",
          // Package details
          itemDescription: typeof itemDescription === "string" ? itemDescription : undefined,
          itemValue: typeof value === "number" ? value : undefined,
          itemQuantity: 1,
          // Service defaults
          packageType: "parcel",
          serviceType: "standard",
          deliveryType: "door_to_door",
          // Add shipping method and warehouse addresses
          serviceMode: shippingMethod,
          warehouseAddresses: warehouseAddresses,
          // Special instructions
          specialInstructions: typeof specialInstructions === "string" ? specialInstructions : undefined,
          contents: typeof contents === "string" ? contents : undefined,
          value: typeof value === "number" ? value : undefined,
          entryStaff: typeof receivedBy === "string" ? receivedBy : undefined,
          branch: typeof warehouse === "string" ? warehouse : undefined,
          entryDate: entryDate ? new Date(entryDate) : undefined,
          // Add sender and recipient objects like admin API
          recipient: {
            name: recipient?.name || `${customer.firstName} ${customer.lastName}`.trim() || "Customer",
            email: recipient?.email || customer.email,
            shippingId: customer.userCode,
            phone: recipient?.phone || customer.phone || "",
            address: recipient?.address || customer.address?.street || "",
            country: (recipient as { country?: string })?.country || customer.address?.country || ""
          },
          sender: sender || {
            name: "Warehouse",
            email: "warehouse@shipping.com",
            phone: "0000000000",
            address: warehouse || "Main Warehouse",
            country: (sender as any)?.country || ""
          },
        },
        $push: {
          history: {
            status: status || "received",
            at: now,
            note: receivedBy ? `Received at ${warehouse || "warehouse"} by ${receivedBy}` : "Received at warehouse",
          },
        },
      },
      { upsert: true, new: true, session }
    );

    // Create pre-alert for customer when warehouse logs package
    // Check if pre-alert already exists for this tracking number
    const existingPreAlert = await PreAlert.findOne({ trackingNumber }).session(session);
    if (!existingPreAlert && pkg) {
      await PreAlert.create([{
        userCode: customer.userCode,
        customer: customer._id,
        trackingNumber,
        carrier: typeof shipper === "string" ? shipper : "Unknown Carrier",
        origin: typeof warehouse === "string" ? warehouse : "Unknown Origin",
        expectedDate: now, // Set expected date to when package was received
        status: "approved", // Auto-approved since warehouse received it
        notes: `Package received at warehouse${receivedBy ? ` by ${receivedBy}` : ""}`,
        decidedAt: now,
        description: description || itemDescription || `Package from ${shipper || 'unknown merchant'}`,
        merchant: typeof shipper === "string" ? shipper : "Unknown Merchant",
        overseasCourier: typeof warehouse === "string" ? warehouse : "Unknown Courier",
        pricePaid: value || 0,
        pricePaidCurrency: 'USD',
      }], { session });
    }

    await session.commitTransaction();

    // Automatically deduct inventory materials (like admin does)
    let inventoryResult: { success?: boolean; transactions?: { _id: string }[]; lowStockItems?: any[]; } | null = null;
    try {
      const packageDataForInventory = {
        value: value,
        weight: weight,
        trackingNumber: trackingNumber,
        dimensions: dimensions,
        warehouseLocation: warehouse || 'Main Warehouse',
        fragile: false // Can be added to schema if needed
      };
      
      inventoryResult = await InventoryService.deductPackageMaterials(
        packageDataForInventory,
        pkg._id.toString(),
        auth.id
      );
      
      if (inventoryResult.success) {
        console.log(`Inventory deducted for warehouse package ${trackingNumber}:`, inventoryResult.transactions);
        
        // Update package with inventory info
        await Package.findOneAndUpdate(
          { trackingNumber },
          {
            $set: { 
              inventoryDeducted: true,
              inventoryTransactionIds: inventoryResult.transactions?.map((t: { _id: string }) => t._id) || []
            }
          }
        );

        // Check for low stock alerts
        if (inventoryResult.lowStockItems && inventoryResult.lowStockItems.length > 0) {
          console.warn('Low stock alerts from warehouse package creation:', inventoryResult.lowStockItems);
          // TODO: Send notification to warehouse manager
        }
      } else {
        console.error('Inventory deduction failed for warehouse package:', (inventoryResult as any).message);
        // Don't fail package creation, but log issue
      }
    } catch (inventoryError) {
      console.error('Error during inventory deduction for warehouse package:', inventoryError);
      // Don't fail package creation if inventory deduction fails
    }

    // Fire-and-forget email after commit
    // We need customer context outside; reusing local var within this block
    const customerForEmail = await User.findOne({ userCode, role: "customer" }).select("email firstName lastName");
    const toEmail = customerForEmail?.email;
    if (toEmail) {
      // Send email to customer with package contents and warehouse addresses (no invoice)
      sendNewPackageEmail({
        to: toEmail,
        firstName: customerForEmail?.firstName || "",
        trackingNumber,
        status: "At Warehouse",
        weight,
        shipper,
        warehouse: warehouse || "Main Warehouse",
        receivedBy: receivedBy || "Warehouse Staff",
        receivedDate: now,
        description: typeof description === "string" ? description : undefined,
        itemDescription: typeof itemDescription === "string" ? itemDescription : undefined,
        warehouseAddresses: warehouseAddresses,
        userCode: customer.userCode,
      }).then((result) => {
        console.log(`[Warehouse Package Add] Customer email result for ${trackingNumber}:`, result);
      }).catch((err) => {
        console.error('[Warehouse Package Add] Email failed:', err);
      });
      
      // Send email to recipient if different from customer
      const recipientEmail = recipient?.email;
      if (recipientEmail && recipientEmail !== toEmail) {
        const { sendPackageNotificationToRecipient } = await import('@/lib/email');
        sendPackageNotificationToRecipient({
          to: recipientEmail,
          recipientName: recipient?.name || 'Recipient',
          trackingNumber,
          shipper,
          weight,
          warehouse: warehouse || 'Main Warehouse',
          receivedDate: now,
          customerName: `${customerForEmail?.firstName || ''} ${customerForEmail?.lastName || ''}`.trim() || toEmail,
        }).then((result) => {
          console.log(`[Warehouse Package Add] Recipient email result for ${trackingNumber}:`, result);
        }).catch((err) => {
          console.error('[Warehouse Package Add] Recipient email failed:', err);
        });
      }
    } else {
      console.warn(`[Warehouse Package Add] No customer email found for userCode: ${userCode}`);
    }

    return NextResponse.json({
      tracking_number: trackingNumber,
      customer_id: String((await User.findOne({ userCode, role: "customer" }).select("_id"))?._id || ""),
      description: description ?? null,
      weight: typeof weight === "number" ? weight : null,
      status: status || "At Warehouse",
      dimensions: dimensions || null,
      recipient: recipient || null,
      sender: sender || null,
      contents: contents || null,
      value: typeof value === "number" ? value : null,
      specialInstructions: specialInstructions || null,
      received_date: new Date(now).toISOString(),
      received_by: receivedBy ?? null,
      warehouse: warehouse ?? null,
      billingInvoice: null, // Auto-invoice disabled
      inventoryTransactions: inventoryResult?.transactions || [],
      message: "Package and inventory deduction completed successfully (manual billing only)"
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('[Package Add] Transaction failed:', error);
    return NextResponse.json({
      error: "Failed to add package",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  } finally {
    await session.endSession();
  }
}
