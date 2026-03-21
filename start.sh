#!/bin/bash

echo "Starting Internet of Agents..."

if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing dependencies..."
    npm install
fi

echo "Cleaning up old processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:8545 | xargs kill -9 2>/dev/null

echo "Starting local blockchain..."
npm run node --workspace=contracts > hardhat_node.log 2>&1 &
NODE_PID=$!

echo "Waiting for blockchain to initialize..."
sleep 5

echo "Deploying smart contracts..."
npm run deploy:local --workspace=contracts

echo "Starting backend and frontend..."
npm run dev --workspace=backend &
BACKEND_PID=$!

npm run dev --workspace=frontend &
FRONTEND_PID=$!

# Trap to ensure all processes stop when the script exits
trap "kill -9 $NODE_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID

