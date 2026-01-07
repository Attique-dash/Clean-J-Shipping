#!/usr/bin/env node

// Simple script to seed inventory items
// Run with: node seed-inventory.js

const mongoose = require('mongoose');

const inventoryItems = [
  {
    name: "Small Box",
    category: "boxes",
    currentStock: 100,
    minStock: 20,
    maxStock: 500,
    unit: "pieces",
    location: "Main Warehouse",
    supplier: "Packaging Supplies Co.",
    notes: "Standard small shipping boxes"
  },
  {
    name: "Medium Box", 
    category: "boxes",
    currentStock: 75,
    minStock: 15,
    maxStock: 400,
    unit: "pieces",
    location: "Main Warehouse",
    supplier: "Packaging Supplies Co.",
    notes: "Standard medium shipping boxes"
  },
  {
    name: "Packing Tape",
    category: "tape",
    currentStock: 200,
    minStock: 30,
    maxStock: 1000,
    unit: "meters",
    location: "Main Warehouse", 
    supplier: "Tape Industries Ltd.",
    notes: "Clear packing tape for sealing boxes"
  },
  {
    name: "Shipping Labels",
    category: "labels",
    currentStock: 500,
    minStock: 50,
    maxStock: 2000,
    unit: "pieces",
    location: "Main Warehouse",
    supplier: "Label Printers Inc.",
    notes: "Standard shipping labels"
  }
];

async function seedInventory() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to database');

    // Get the Inventory model
    const Inventory = mongoose.connection.db.collection('inventories');

    // Insert items if they don't exist
    for (const item of inventoryItems) {
      const existing = await Inventory.findOne({ 
        name: item.name, 
        location: item.location 
      });
      
      if (!existing) {
        const result = await Inventory.insertOne(item);
        console.log(`✅ Created inventory item: ${item.name}`);
      } else {
        console.log(`ℹ️  Inventory item already exists: ${item.name}`);
      }
    }

    console.log('🎉 Inventory seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

// Run the seeding
seedInventory();
