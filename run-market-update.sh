#!/bin/bash

# This script runs the market update service
# It can be used to start the service in a separate process

# Set environment variables for market update configuration
export MARKET_UPDATE_INTERVAL=5000  # 5 seconds for real-time assets
export OTHER_ASSETS_UPDATE_INTERVAL=300000  # 5 minutes for other assets

# Log the start time
echo "Starting market update service at $(date)"
echo "Real-time assets update interval: ${MARKET_UPDATE_INTERVAL}ms"
echo "Other assets update interval: ${OTHER_ASSETS_UPDATE_INTERVAL}ms"

# Create logs directory if it doesn't exist
mkdir -p logs

# Run the market update script and redirect output to log file
# Use explicit path to ensure the correct module is found
node ./scripts/market-update.js > logs/market-update.log 2>&1 &

# Save the process ID
echo $! > logs/market-update.pid

echo "Market update service started with PID $(cat logs/market-update.pid)"
echo "Log file: logs/market-update.log"