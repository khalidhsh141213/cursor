import WebSocket from "ws";

// Create WebSocket connection
const socket = new WebSocket("ws://0.0.0.0:5000/ws");

// Connection opened
socket.addEventListener("open", (event) => {
  console.log("Connected to WebSocket server");

  // Register for notifications with user ID 1
  socket.send(
    JSON.stringify({
      type: "notifications_register",
      userId: 1,
    }),
  );

  // Request unseen notifications after registration
  setTimeout(() => {
    socket.send(
      JSON.stringify({
        type: "notifications_get",
        userId: 1,
      }),
    );
  }, 1000);

  // Every 5 seconds, send a ping to keep connection alive
  setInterval(() => {
    socket.send(
      JSON.stringify({
        type: "ping",
      }),
    );
  }, 5000);
});

// Listen for messages
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("Message from server:", data.type);

  // Pretty print the data
  console.log(JSON.stringify(data, null, 2));

  // If we received notifications, mark them as seen
  if (data.type === "notifications" && data.data && data.data.length > 0) {
    console.log(`Received ${data.data.length} notifications`);

    // Get notification IDs
    const notificationIds = data.data.map((n) => n.id);

    // Mark as seen
    socket.send(
      JSON.stringify({
        type: "notifications_mark_seen",
        userId: 1,
        notificationIds,
      }),
    );
  }
});

// Handle errors
socket.addEventListener("error", (event) => {
  console.error("WebSocket error:", event);
});

// Connection closed
socket.addEventListener("close", (event) => {
  console.log("Connection closed:", event.code, event.reason);
  process.exit(0);
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Closing connection...");
  socket.close();
  setTimeout(() => process.exit(0), 500);
});

console.log("Test client started. Press Ctrl+C to exit.");
