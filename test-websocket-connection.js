/**
 * WebSocket Connection Tester
 *
 * This script tests the WebSocket connection and subscription functionality.
 * Run with: node test-websocket-connection.js
 */

const WebSocket = require("ws");

// Configuration
const WS_URL = "ws://localhost:3000/api/market-data";
const SUBSCRIPTION_SYMBOLS = ["BTC/USD", "ETH/USD", "EUR/USD"];
const CONNECTION_TIMEOUT = 5000; // 5 seconds
const TEST_DURATION = 30000; // 30 seconds

console.log(`WebSocket Connection Test for ${WS_URL}`);
console.log(
  `Testing subscription to symbols: ${SUBSCRIPTION_SYMBOLS.join(", ")}`,
);
console.log("----------------------------------------");

// Create a new WebSocket connection
console.log(`Connecting to WebSocket at ${WS_URL}...`);
const connectionStartTime = Date.now();
const ws = new WebSocket(WS_URL);

// Message statistics
let messageStats = {
  received: 0,
  priceUpdates: 0,
  errors: 0,
  heartbeats: 0,
};

// Track connection status
let connectionStatus = "CONNECTING";
let connectionTime = null;

// Set connection timeout
const connectionTimeout = setTimeout(() => {
  if (connectionStatus === "CONNECTING") {
    console.error(
      `❌ ERROR: Connection timed out after ${CONNECTION_TIMEOUT}ms`,
    );
    process.exit(1);
  }
}, CONNECTION_TIMEOUT);

// Handle connection open
ws.on("open", () => {
  connectionStatus = "CONNECTED";
  connectionTime = Date.now() - connectionStartTime;
  clearTimeout(connectionTimeout);

  console.log(`✅ Connected in ${connectionTime}ms`);

  // Subscribe to symbols
  console.log(`Subscribing to symbols: ${SUBSCRIPTION_SYMBOLS.join(", ")}`);
  ws.send(
    JSON.stringify({
      type: "subscribe",
      symbols: SUBSCRIPTION_SYMBOLS,
    }),
  );

  // Also test asset type subscription
  console.log("Subscribing to asset types: crypto, forex");
  ws.send(
    JSON.stringify({
      type: "subscribe",
      assetTypes: ["crypto", "forex"],
    }),
  );

  // Set test duration timer
  setTimeout(() => {
    console.log("----------------------------------------");
    console.log("Test complete. Statistics:");
    console.log(`- Connection time: ${connectionTime}ms`);
    console.log(`- Total messages received: ${messageStats.received}`);
    console.log(`- Price updates: ${messageStats.priceUpdates}`);
    console.log(`- Heartbeats: ${messageStats.heartbeats}`);
    console.log(`- Errors: ${messageStats.errors}`);
    console.log(
      `- Average messages per second: ${(messageStats.received / (TEST_DURATION / 1000)).toFixed(2)}`,
    );

    // Close the connection
    console.log("Closing connection...");
    ws.close();
    process.exit(0);
  }, TEST_DURATION);
});

// Handle incoming messages
ws.on("message", (data) => {
  try {
    messageStats.received++;
    const message = JSON.parse(data);

    // Log different message types differently
    if (message.type === "priceUpdate") {
      messageStats.priceUpdates++;
      console.log(
        `📊 Price update for ${message.data.symbol}: ${message.data.price} (${message.data.changePercent}%)`,
      );
    } else if (message.type === "heartbeat") {
      messageStats.heartbeats++;
      console.log("💓 Heartbeat received");
    } else {
      console.log(`📩 Message received: ${JSON.stringify(message)}`);
    }
  } catch (error) {
    messageStats.errors++;
    console.error(`❌ Error parsing message: ${error.message}`);
  }
});

// Handle errors
ws.on("error", (error) => {
  messageStats.errors++;
  console.error(`❌ WebSocket error: ${error.message}`);
});

// Handle close
ws.on("close", (code, reason) => {
  if (connectionStatus === "CONNECTED") {
    console.log(
      `🔌 Connection closed with code ${code}${reason ? ": " + reason : ""}`,
    );
  } else {
    console.error(
      `❌ Connection failed with code ${code}${reason ? ": " + reason : ""}`,
    );
  }
});

// Listen for termination signals
process.on("SIGINT", () => {
  console.log("\n🛑 Test interrupted by user");
  ws.close();
  process.exit(0);
});
