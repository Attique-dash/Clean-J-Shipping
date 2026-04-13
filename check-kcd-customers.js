#!/usr/bin/env node
/**
 * Check what customers exist on www.cleanjshipping.com
 */

const API_BASE_URL = 'https://www.cleanjshipping.com';
const API_TOKEN = 'XoZedblJE0neONu5EvN3CE2xGkOw9ggwCSysjrGpjF2S2KqY';

async function checkCustomers() {
  console.log('Fetching customers from www.cleanjshipping.com...\n');

  const url = `${API_BASE_URL}/api/kcd/customers`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_TOKEN
      }
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length > 0) {
      console.log('\n--- Available Customers ---');
      data.forEach((c, i) => {
        console.log(`${i + 1}. UserCode: ${c.UserCode || c.userCode}, Email: ${c.Email || c.email}`);
      });
    } else if (data.customers && data.customers.length > 0) {
      console.log('\n--- Available Customers ---');
      data.customers.forEach((c, i) => {
        console.log(`${i + 1}. UserCode: ${c.userCode}, Mailbox: ${c.mailboxCode}, Email: ${c.email}`);
      });
    } else {
      console.log('\nNo customers found in response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCustomers();
