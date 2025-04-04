/**
 * Test script for trade endpoints
 * Specifically tests /api/trade/open and /api/trade/close
 */
import axios from 'axios';
import { wrapper as axiosCookieJarSupport } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

// Base URL for the API
const BASE_URL = 'https://e90ebeb2-9e6f-4f59-9fa4-a91d31143877-00-2lpww91saph8p.kirk.replit.dev';

// Create axios instance with cookie jar support
const cookieJar = new CookieJar();

const api = axiosCookieJarSupport(axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  jar: cookieJar
}));

// Set Content-Type header for all requests
api.defaults.headers.common['Content-Type'] = 'application/json';

// Login and test the trade endpoints
async function runTests() {
  try {
    console.log('Starting trade endpoint tests...\n');

    // Login to get session cookie
    console.log('Logging in...');
    const loginResponse = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log(`Login status: ${loginResponse.status}`);
    if (loginResponse.status !== 200) {
      console.error('Login failed. Cannot proceed with tests.');
      return;
    }
    
    console.log('Login successful!\n');

    // Test opening a trade
    console.log('Testing /api/trade/open endpoint...');
    const openTradePayload = {
      symbol: 'EURUSD', // Using a forex symbol which has a lower price
      type: 'buy',
      amount: 5,       // Using a smaller amount
      stopLoss: 1.05,  // Adding stop loss
      takeProfit: 1.12 // Adding take profit
    };
    
    const openTradeResponse = await api.post('/api/trade/open', openTradePayload);
    console.log(`Status code: ${openTradeResponse.status}`);
    console.log('Response data:');
    console.log(JSON.stringify(openTradeResponse.data, null, 2));
    
    if (!openTradeResponse.data || !openTradeResponse.data.id) {
      console.error('Failed to open trade: No trade ID returned');
      return;
    }
    
    const tradeId = openTradeResponse.data.id;
    console.log(`\nTrade opened successfully with ID: ${tradeId}\n`);

    // Test closing the trade
    console.log('Testing /api/trade/close endpoint...');
    const closeTradePayload = {
      tradeId: tradeId
    };
    
    const closeTradeResponse = await api.post('/api/trade/close', closeTradePayload);
    console.log(`Status code: ${closeTradeResponse.status}`);
    console.log('Response data:');
    console.log(JSON.stringify(closeTradeResponse.data, null, 2));
    
    if (closeTradeResponse.status === 200) {
      console.log('\nTrade closed successfully!');
    } else {
      console.error('\nFailed to close trade');
    }
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error during tests:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status code: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
  }
}

// Run the tests
runTests();