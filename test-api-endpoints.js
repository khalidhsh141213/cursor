
/**
 * API Endpoint Test Script
 * Tests all API endpoints with and without authentication
 */

import fetch from 'node-fetch';
const baseUrl = process.env.API_URL || 'https://e90ebeb2-9e6f-4f59-9fa4-a91d31143877-00-2lpww91saph8p.kirk.replit.dev';

// Test health endpoint
async function testHealthEndpoint() {
  console.log('\nTesting Health Endpoint...');
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    console.log(`GET /api/health: ${response.status}`);
    const data = await response.json();
    console.log('Health check response:', data);
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
}

async function login() {
  try {
    console.log('Logging in...');
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      return null;
    }
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, received cookies');
    
    return cookies;
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

// Test authentication endpoints
async function testAuthEndpoints() {
  console.log('\nTesting Authentication Endpoints...');
  
  const endpoints = [
    { method: 'POST', path: '/api/auth/login', body: { username: 'admin', password: 'admin123' }},
    { method: 'POST', path: '/api/auth/register', body: { username: `testuser_${Date.now()}`, password: 'test12345', email: `test${Date.now()}@example.com` }},
    { method: 'POST', path: '/api/auth/change-password', body: { userId: 13, currentPassword: 'admin123', newPassword: '87654321' }},
    { method: 'GET', path: '/api/auth/logout' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }

  return await login(); // Return cookies for authenticated requests
}

// Test user endpoints
async function testUserEndpoints(cookies) {
  console.log('\nTesting User Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/user' },
    { method: 'GET', path: '/api/user/13' },
    { method: 'PATCH', path: '/api/user/13', body: { name: 'Updated Name' }},
    { method: 'GET', path: '/api/user-settings' },
    { method: 'POST', path: '/api/user-settings', body: {
      languagePreference: 'en',
      themePreference: 'dark'
    }},
    { method: 'GET', path: '/api/user-settings/13' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Response data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }
}

// Test portfolio endpoints
async function testPortfolioEndpoints(cookies) {
  console.log('\nTesting Portfolio Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/portfolio' },
    { method: 'GET', path: '/api/portfolio-details' },
    { method: 'GET', path: '/api/portfolio/holdings' },
    { method: 'GET', path: '/api/portfolio-summary' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        headers: {
          'Cookie': cookies
        }
      });
      console.log(`GET ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Portfolio data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing GET ${endpoint.path}:`, error.message);
    }
  }
}

// Test market data endpoints
async function testMarketDataEndpoints(cookies) {
  console.log('\nTesting Market Data Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/market-data' },
    { method: 'GET', path: '/api/assets' },
    { method: 'GET', path: '/api/assets/trending' },
    { method: 'GET', path: '/api/assets/featured' },
    { method: 'GET', path: '/api/assets/movers' },
    { method: 'GET', path: '/api/assets/live' },
    { method: 'GET', path: '/api/assets/AAPL' },
    { method: 'GET', path: '/api/price-history/AAPL' },
    { method: 'GET', path: '/api/price-history/AAPL/range?from=2025-01-01&to=2025-12-31' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        headers: {
          'Cookie': cookies
        }
      });
      console.log(`GET ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Market data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing GET ${endpoint.path}:`, error.message);
    }
  }
}

// Test economic calendar endpoints
async function testEconomicCalendarEndpoints(cookies) {
  console.log('\nTesting Economic Calendar Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/economic-events' },
    { method: 'POST', path: '/api/sync-economic-calendar' },
    { method: 'GET', path: '/api/economic-events/upcoming' },
    { method: 'GET', path: '/api/economic-events/asset/AAPL' },
    { method: 'GET', path: '/api/economic-events/portfolio' },
    { method: 'GET', path: '/api/economic-events/range?from=2025-01-01&to=2025-12-31' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        }
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Economic events data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }
}

// Test admin endpoints
async function testAdminEndpoints(cookies) {
  console.log('\nTesting Admin Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/admin/metrics' },
    { method: 'GET', path: '/api/admin/users' },
    { method: 'GET', path: '/api/admin/users/minimal' },
    { method: 'GET', path: '/api/admin/assets' },
    { method: 'GET', path: '/api/admin/trades' },
    { method: 'GET', path: '/api/admin/kyc-requests' },
    { method: 'GET', path: '/api/admin/activity-logs' },
    { method: 'GET', path: '/api/admin/security/logs' },
    { method: 'GET', path: '/api/admin/economic-events' },
    { method: 'POST', path: '/api/admin/trigger-notifications' },
    { method: 'GET', path: '/api/admin/error-stats' },
    { method: 'GET', path: '/api/admin/cache-stats' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        }
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Admin data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }
}

// Test bonus system endpoints
async function testBonusEndpoints(cookies) {
  console.log('\nTesting Bonus System Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/bonuses' },
    { method: 'GET', path: '/api/bonuses/history' },
    { method: 'GET', path: '/api/bonuses/1' },
    { method: 'POST', path: '/api/bonuses', body: { type: 'welcome', amount: 100 } },
    { method: 'POST', path: '/api/bonuses/referral-code', body: { code: 'TEST' + Date.now() } },
    { method: 'POST', path: '/api/bonuses/use-referral', body: { code: 'TEST123' } }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Bonus data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }
}

// Test AI analysis endpoints
async function testAiEndpoints(cookies) {
  console.log('\nTesting AI Analysis Endpoints...');
  
  const endpoints = [
    { method: 'GET', path: '/api/ai/health' },
    { method: 'POST', path: '/api/ai/generate', body: { prompt: 'Analyze AAPL stock performance' } },
    { method: 'GET', path: '/api/analysis/AAPL' },
    { method: 'POST', path: '/api/analysis/refresh/AAPL' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`AI analysis data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }
}

// Test trading endpoints
async function testTradingEndpoints(cookies) {
  console.log('\nTesting Trading Endpoints...');
  
  const endpoints = [
    { method: 'POST', path: '/api/trade/open', body: { symbol: 'AAPL', type: 'buy', amount: 100 } },
    { method: 'POST', path: '/api/trade/close', body: { tradeId: 1 } },
    { method: 'GET', path: '/api/trades' },
    { method: 'GET', path: '/api/trades/recent' },
    { method: 'GET', path: '/api/trades/user/13' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
      });
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`Trading data for ${endpoint.path}:`, data);
      }
    } catch (error) {
      console.error(`Failed testing ${endpoint.method} ${endpoint.path}:`, error.message);
    }
  }
}

// Run all tests
async function runTests() {
  console.log('Starting API endpoint tests...\n');
  
  // Test health endpoint first (no auth required)
  await testHealthEndpoint();
  
  // Get authentication cookies
  const cookies = await testAuthEndpoints();
  
  if (cookies) {
    // Run tests that require authentication
    await testUserEndpoints(cookies);
    await testPortfolioEndpoints(cookies);
    await testTradingEndpoints(cookies);
    await testMarketDataEndpoints(cookies);
    await testEconomicCalendarEndpoints(cookies);
    await testAdminEndpoints(cookies);
    await testBonusEndpoints(cookies);
    await testAiEndpoints(cookies);
  } else {
    console.log('Skipping authenticated tests as login failed');
  }
  
  console.log('\nTests completed.');
}

// Run the tests
runTests();
