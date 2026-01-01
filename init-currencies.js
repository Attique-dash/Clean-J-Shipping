// Simple script to initialize currencies
// Run this with: node init-currencies.js

async function initializeCurrencies() {
  try {
    console.log('Initializing currencies...');
    const response = await fetch('http://localhost:3000/api/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Currencies initialized successfully:', data);
    } else {
      const error = await response.json();
      console.error('Failed to initialize currencies:', error);
    }
  } catch (error) {
    console.error('Error initializing currencies:', error);
  }
}

// For now, let's just log that this script exists
console.log('Currency initialization script created.');
console.log('To initialize currencies, make a POST request to /api/init or visit the endpoint in your browser.');
