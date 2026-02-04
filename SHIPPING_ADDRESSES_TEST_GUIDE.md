# Shipping Addresses API Testing Guide

## **1. Setup Warehouse Addresses**

First, set up the warehouse addresses using the Admin API:

### **PUT /api/admin/warehouses/[warehouseId]/shipping-addresses**

```bash
curl -X PUT "https://clean-j-shipping.vercel.app/api/admin/warehouses/[WAREHOUSE_ID]/shipping-addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -d '{
    "airAddress": "Jamaica Airport Cargo Terminal, Norman Manley International Airport, Kingston",
    "seaAddress": "Kingston Wharves Limited, Port of Kingston, Jamaica",
    "chinaAddress": "Beijing International Airport Cargo Terminal, Beijing, China"
  }'
```

## **2. Test Customer Shipping Addresses API**

### **GET /api/customer/shipping-addresses**

```bash
curl -X GET "https://clean-j-shipping.vercel.app/api/customer/shipping-addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [CUSTOMER_TOKEN]"
```

**Expected Response:**
```json
{
  "success": true,
  "addresses": {
    "air": "Jamaica Airport Cargo Terminal, Norman Manley International Airport, Kingston",
    "sea": "Kingston Wharves Limited, Port of Kingston, Jamaica", 
    "china": "Beijing International Airport Cargo Terminal, Beijing, China"
  },
  "warehouses": [
    {
      "name": "Main Warehouse",
      "code": "MAIN",
      "address": "123 Main St",
      "city": "Kingston",
      "country": "Jamaica",
      "airAddress": "Jamaica Airport Cargo Terminal, Norman Manley International Airport, Kingston",
      "seaAddress": "Kingston Wharves Limited, Port of Kingston, Jamaica",
      "chinaAddress": "Beijing International Airport Cargo Terminal, Beijing, China"
    }
  ]
}
```

## **3. Test Warehouse Package Creation with Shipping Method Detection**

### **POST /api/warehouse/packages/add**

```bash
curl -X POST "https://clean-j-shipping.vercel.app/api/warehouse/packages/add" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [WAREHOUSE_TOKEN]" \
  -d '{
    "trackingNumber": "TEST123456",
    "userCode": "CUST001",
    "weight": 2.5,
    "shipper": "FedEx Express",
    "description": "Air shipment from Miami",
    "recipient": {
      "name": "John Doe",
      "address": "123 Main St, Kingston",
      "country": "Jamaica"
    }
  }'
```

**Expected Response:**
```json
{
  "tracking_number": "TEST123456",
  "customer_id": "64a7b8c9d1e2f3g4h5i6j7k8",
  "status": "At Warehouse",
  "warehouseAddresses": {
    "airAddress": "Jamaica Airport Cargo Terminal, Norman Manley International Airport, Kingston",
    "seaAddress": "Kingston Wharves Limited, Port of Kingston, Jamaica",
    "chinaAddress": "Beijing International Airport Cargo Terminal, Beijing, China"
  },
  "message": "Package, billing invoice, and inventory deduction completed successfully"
}
```

## **4. Test Customer Packages API with Warehouse Addresses**

### **GET /api/customer/packages**

```bash
curl -X GET "https://clean-j-shipping.vercel.app/api/customer/packages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [CUSTOMER_TOKEN]"
```

**Expected Response:**
```json
{
  "packages": [
    {
      "tracking_number": "TEST123456",
      "serviceMode": "air",
      "warehouseAddresses": {
        "airAddress": "Jamaica Airport Cargo Terminal, Norman Manley International Airport, Kingston",
        "seaAddress": "Kingston Wharves Limited, Port of Kingston, Jamaica",
        "chinaAddress": "Beijing International Airport Cargo Terminal, Beijing, China"
      },
      "receiverAddress": "123 Main St, Kingston",
      "senderAddress": "Miami Distribution Center"
    }
  ]
}
```

## **5. Test Shipping Method Detection**

The system automatically detects shipping method based on:

### **Air Shipments** (detects keywords: air, fedex, dhl, ups, express)
```json
{
  "shipper": "FedEx Express",
  "description": "Air shipment from Miami"
}
```

### **Sea Shipments** (detects keywords: sea, ocean, cargo, freight, vessel)
```json
{
  "shipper": "Maersk Cargo",
  "description": "Sea freight from China"
}
```

### **China Shipments** (detects keywords: china, beijing, shanghai, guangzhou)
```json
{
  "shipper": "China Post",
  "origin": "Shanghai"
}
```

## **6. Test Frontend Access**

Customers can view addresses by:
1. Logging into their account
2. Navigating to "Shipping Addresses" in the menu
3. Viewing the three shipping method addresses

## **Testing Checklist:**

✅ Warehouse addresses can be set via Admin API  
✅ Customers can fetch addresses via Customer API  
✅ Package creation detects shipping method automatically  
✅ Customer packages include warehouse addresses  
✅ Frontend displays addresses correctly  
✅ Different addresses show for air/sea/china methods
