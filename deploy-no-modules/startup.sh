#!/bin/bash
echo "Starting deployment script..."
cd /home/site/wwwroot
echo "Installing dependencies..."
npm install --omit=dev --legacy-peer-deps
echo "Starting server..."
node server.js