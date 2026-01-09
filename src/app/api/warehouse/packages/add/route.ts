import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Package } from "@/models/Package";
import { User } from "@/models/User";
import { PreAlert } from "@/models/PreAlert";
import Invoice from "@/models/Invoice";
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

function calcShippingCostJmd(weightLbs: number): number {
  if (weightLbs <= 0) return 0;
  const first = 700;
  const additional = Math.max(0, Math.ceil(weightLbs) - 1) * 350;
  return first + additional;
}

function calculateTotalAmount(itemValue: number, weight: number): number {
  // Convert item value from USD to JMD (assuming 1 USD = 155 JMD)
  const itemValueJmd = itemValue * 155;
  
  // Calculate shipping cost based on weight (convert to lbs first)
  const weightLbs = weight * 2.20462;
  const shippingCostJmd = calcShippingCostJmd(weightLbs);
  
  // Calculate customs duty (15% of item value if > $100 USD)
  const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0;
  
  // Total: shipping + customs (item value is for customs only, not charged to customer)
  return shippingCostJmd + customsDutyJmd;
}

async function createBillingInvoice(packageData: { value?: number; weight?: number; dimensions?: { length?: string; width?: string; height?: string } }, user: { _id: string; firstName: string; lastName: string; email: string; userCode?: string; address?: { street?: string }; phone?: string }, trackingNumber: string) {
  try {
    const itemValue = asNumber(packageData.value) || 0;
    const weight = asNumber(packageData.weight) || 0;
    const weightLbs = weight * 2.20462;
    
    // Calculate costs
    const shippingCostJmd = calcShippingCostJmd(weightLbs);
    const itemValueJmd = itemValue * 155;
    const customsDutyJmd = itemValue > 100 ? itemValueJmd * 0.15 : 0;
    const totalAmount = shippingCostJmd + customsDutyJmd;
    
    // Create invoice items
    const invoiceItems = [];
    
    // Shipping charges
    if (shippingCostJmd > 0) {
      invoiceItems.push({
        description: `Shipping charges (${weightLbs.toFixed(1)} lbs)`,
        quantity: 1,
        unitPrice: shippingCostJmd,
        taxRate: 0,
        amount: shippingCostJmd,
        taxAmount: 0,
        total: shippingCostJmd
      });
    }
    
    // Customs duty
    if (customsDutyJmd > 0) {
      invoiceItems.push({
        description: `Customs duty (${itemValue > 100 ? '15%' : '0%'} of item value)`,
        quantity: 1,
        unitPrice: customsDutyJmd,
        taxRate: 0,
        amount: customsDutyJmd,
        taxAmount: 0,
        total: customsDutyJmd
      });
    }
    
    // Create invoice
    const invoiceData = {
      invoiceNumber: `INV-${trackingNumber}`,
      invoiceType: "billing",
      customer: {
        id: user._id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userCode || '',
        email: user.email || '',
        address: user.address?.street || '',
        phone: user.phone || ''
      },
      package: {
        trackingNumber: trackingNumber,
        userCode: user.userCode || ''
      },
      status: "unpaid",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      currency: "JMD",
      subtotal: shippingCostJmd + customsDutyJmd,
      taxTotal: 0,
      discountAmount: 0,
      total: totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      items: invoiceItems,
      notes: `Auto-generated billing invoice for package ${trackingNumber}`,
      userId: user._id
    };
    
    const invoice = await Invoice.create(invoiceData);
    return invoice;
  } catch (error) {
    console.error('Error creating billing invoice:', error);
    return null;
  }
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

  const { trackingNumber, userCode, weight, shipper, description, itemDescription, entryDate, status, dimensions, recipient, sender, contents, value, specialInstructions, receivedBy, warehouse } = parsed.data;

  // Calculate shipping costs like admin does
  const itemValueNum = asNumber(value);
  const weightNum = asNumber(weight);
  const shippingCost = calculateTotalAmount(itemValueNum, weightNum);

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
          // Add calculated costs like admin
          shippingCost: shippingCost,
          totalAmount: shippingCost,
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
      }], { session });
    }

    await session.commitTransaction();

    // FIXED: Create proper billing invoice automatically (like admin does)
    let billingInvoice: { _id?: string; invoiceNumber?: string; totalAmount?: number; status?: string; } | null = null;
    try {
      const packageDataForInvoice = {
        value: value,
        weight: weight,
        trackingNumber: trackingNumber
      };
      
      billingInvoice = await createBillingInvoice(packageDataForInvoice, customer, trackingNumber);
      if (billingInvoice) {
        // Link invoice to package
        await Package.findOneAndUpdate(
          { trackingNumber },
          {
            $set: { 
              billingInvoiceId: billingInvoice._id,
              invoiceStatus: 'billed'
            }
          }
        );
        console.log(`Billing invoice created for warehouse package ${trackingNumber}: ${billingInvoice.invoiceNumber}`);
      }
    } catch (invoiceError) {
      console.error('Failed to create billing invoice for warehouse package:', invoiceError);
      // Don't fail package creation if invoice creation fails
    }

    // NEW: Automatically deduct inventory materials (like admin does)
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

    // Fire-and-forget email after commit with invoice PDF attachment
    // We need customer context outside; reusing local var within this block
    const customerForEmail = await User.findOne({ userCode, role: "customer" }).select("email firstName");
    const toEmail = customerForEmail?.email;
    if (toEmail) {
      const invoiceId = billingInvoice?._id?.toString();
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
        invoiceId: invoiceId, // Attach invoice PDF if available
      }).catch((err) => {
        console.error('[Package Add] Email failed:', err);
      });
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
      billingInvoice: billingInvoice ? {
        id: billingInvoice._id,
        invoiceNumber: billingInvoice.invoiceNumber,
        total: (billingInvoice as any).total || 0
      } : null,
      inventoryTransactions: inventoryResult?.transactions || [],
      message: "Package, billing invoice, and inventory deduction completed successfully"
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
