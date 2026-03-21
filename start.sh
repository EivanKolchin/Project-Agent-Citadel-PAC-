#!/bin/bash

echo "Starting Internet of Agents..."

# Check if node_modules exists, if not, install dependencies first
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Installing dependencies..."
    npm install
fi

echo "Attempting to start the application..."
# Try to run the project
npm run dev

# If the above command fails (exit code is not 0), try completely reinstalling
if [ $? -ne 0 ]; then
    echo ""
    echo "Application crashed or failed to start. It might be due to missing dependencies."
    echo "Running a clean 'npm install' to fix dependencies..."
    npm install
    
    echo "Retrying application start..."
    npm run dev
fi
