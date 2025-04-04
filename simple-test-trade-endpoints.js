/**
 * Simple test script for trade endpoints using node-fetch
 */
import fetch from 'node-fetch';

// Base URL for the API
const BASE_URL = 'https://e90ebeb2-9e6f-4f59-9fa4-a91d31143877-00-2lpww91saph8p.kirk.replit.dev';

// Test the trade endpoints
async function runTests() {
  try {
    console.log('Starting simple trade endpoint tests...\n');

    // Login to get session cookie
    console.log('Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      console.error(`Login failed with status: ${loginResponse.status}`);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful!');
    console.log('Login response:', loginData);
    
    // Get the cookies from the response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies:', cookies);
    
    // Test opening a trade
    console.log('\nTesting /api/trade/open endpoint...');
    // First, let's test EURUSD which exists in the database
    console.log('Attempting with a forex symbol: EURUSD');
    const openTradeResponse = await fetch(`${BASE_URL}/api/trade/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        symbol: 'EURUSD',
        type: 'buy',
        amount: 10,
        stopLoss: 1.05,
        takeProfit: 1.12
      }),
      credentials: 'include'
    });
    
    if (!openTradeResponse.ok) {
      console.error(`Open trade failed with status: ${openTradeResponse.status}`);
      const errorText = await openTradeResponse.text();
      console.error('Error response:', errorText);
      
      // Try getting the list of available assets
      console.log('Fetching available assets to check what symbols are available...');
      const assetsResponse = await fetch(`${BASE_URL}/api/assets`, {
        method: 'GET',
        headers: {
          'Cookie': cookies
        },
        credentials: 'include'
      });
      
      if (assetsResponse.ok) {
        const assetsData = await assetsResponse.json();
        console.log(`Found ${assetsData.length} available assets:`);
        assetsData.slice(0, 10).forEach(asset => {
          console.log(`- Symbol: ${asset.symbol}, Name: ${asset.name}, Type: ${asset.type}`);
        });
        
        // Try again with an available symbol
        if (assetsData.length > 0) {
          const testSymbol = assetsData[0].symbol;
          console.log(`\nRetrying with available symbol: ${testSymbol}`);
          const retryResponse = await fetch(`${BASE_URL}/api/trade/open`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookies
            },
            body: JSON.stringify({
              symbol: testSymbol,
              type: 'buy',
              amount: 10,
              stopLoss: parseFloat(assetsData[0].price) * 0.95, // 5% below current price
              takeProfit: parseFloat(assetsData[0].price) * 1.05 // 5% above current price
            }),
            credentials: 'include'
          });
          
          if (!retryResponse.ok) {
            console.error(`Retry also failed with status: ${retryResponse.status}`);
            const retryErrorText = await retryResponse.text();
            console.error('Retry error response:', retryErrorText);
          } else {
            const retryData = await retryResponse.json();
            console.log('Retry successful! Response:', retryData);
            return retryData;
          }
        }
      } else {
        console.error('Failed to fetch assets list');
      }
      
      return;
    }
    
    const openTradeData = await openTradeResponse.json();
    console.log('Open trade response:', openTradeData);
    
    if (!openTradeData.id) {
      console.error('No trade ID returned');
      return;
    }
    
    const tradeId = openTradeData.id;
    console.log(`Trade opened successfully with ID: ${tradeId}`);
    
    // Test closing the trade
    console.log('\nTesting /api/trade/close endpoint...');
    const closeTradeResponse = await fetch(`${BASE_URL}/api/trade/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        tradeId: tradeId
      }),
      credentials: 'include'
    });
    
    if (!closeTradeResponse.ok) {
      console.error(`Close trade failed with status: ${closeTradeResponse.status}`);
      const errorText = await closeTradeResponse.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const closeTradeData = await closeTradeResponse.json();
    console.log('Close trade response:', closeTradeData);
    console.log('Trade closed successfully!');
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error.message);
  }
}

// Run the tests
runTests();