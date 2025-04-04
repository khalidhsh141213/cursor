#!/bin/bash

# Add color to output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Use absolute paths for logs in Replit
WORKSPACE_DIR="/home/runner/workspace"
LOGS_DIR="${WORKSPACE_DIR}/logs"
mkdir -p "$LOGS_DIR"

echo -e "${GREEN}==== Starting Trading Platform Services ====${NC}"
echo -e "${GREEN}$(date)${NC}"

# Set default ports
export PORT=${PORT:-8080}
export FLASK_PORT=${FLASK_PORT:-5000}
echo -e "${GREEN}Environment: PORT=$PORT, FLASK_PORT=$FLASK_PORT${NC}"

# Safely stop any existing processes without disrupting SSH
echo -e "${YELLOW}Stopping any existing project processes...${NC}"
pgrep -f "node.*server" | xargs kill 2>/dev/null || true
pgrep -f "python.*mock_ai_server" | xargs kill 2>/dev/null || true
pgrep -f "python.*arabic_ai_server" | xargs kill 2>/dev/null || true
pgrep -f "node.*market-update" | xargs kill 2>/dev/null || true
sleep 2

# Start main server
echo -e "\n${YELLOW}Starting main web server on port $PORT...${NC}"
cd "$WORKSPACE_DIR/server" 2>/dev/null && npm run dev > "${LOGS_DIR}/main-server.log" 2>&1 &
MAIN_PID=$!
cd "$WORKSPACE_DIR"

# Start AI service if enabled
if [ "$USE_MOCK_AI" = "true" ]; then
    echo -e "\n${YELLOW}Starting mock AI server on port $FLASK_PORT...${NC}"
    export LOGS_DIR="$LOGS_DIR"  # Export for Python script to use
    cd "$WORKSPACE_DIR" && python3 scripts/ai/mock_ai_server.py > "${LOGS_DIR}/mock-ai.log" 2>&1 &
    AI_PID=$!
    echo -e "${GREEN}Mock AI server started with PID: $AI_PID${NC}"
fi

# Start market data service with debug logging
echo -e "\n${YELLOW}Starting market data service with enhanced logging...${NC}"
cd "$WORKSPACE_DIR" && NODE_ENV=debug node scripts/market-update.js > "${LOGS_DIR}/market-data.log" 2>&1 &
MARKET_PID=$!
echo -e "${GREEN}Market data service started with PID: $MARKET_PID${NC}"

# Create a separate debug log file for WebSocket diagnostics
echo -e "\n${YELLOW}Setting up WebSocket diagnostic logs...${NC}"
touch "${LOGS_DIR}/websocket-debug.log"
# Quick check of market-update.js to verify our changes
grep -A 5 "===== WEBSOCKET DEBUG =====" "$WORKSPACE_DIR/scripts/market-update.js" >> "${LOGS_DIR}/websocket-debug.log" 2>&1

# Display service status
echo -e "\n${GREEN}==== Service Status ====${NC}"
echo -e "${GREEN}Main Server: on port $PORT (PID: $MAIN_PID)${NC}"
if [ -n "$AI_PID" ]; then
    echo -e "${GREEN}AI Server: on port $FLASK_PORT (PID: $AI_PID)${NC}"
fi
echo -e "${GREEN}Market Data Service (PID: $MARKET_PID)${NC}"

# Verify log files were created
if [ ! -f "${LOGS_DIR}/main-server.log" ]; then
    echo -e "${RED}Warning: Main server log file was not created${NC}"
    touch "${LOGS_DIR}/main-server.log"
fi

if [ "$USE_MOCK_AI" = "true" ] && [ ! -f "${LOGS_DIR}/mock-ai.log" ]; then
    echo -e "${RED}Warning: Mock AI log file was not created${NC}"
    touch "${LOGS_DIR}/mock-ai.log"
fi

if [ ! -f "${LOGS_DIR}/market-data.log" ]; then
    echo -e "${RED}Warning: Market data log file was not created${NC}"
    touch "${LOGS_DIR}/market-data.log"
fi

echo -e "\n${GREEN}All services started. Logs available in $LOGS_DIR${NC}"
echo -e "${YELLOW}To view logs: cat $LOGS_DIR/*.log${NC}" 