#!/usr/bin/env node

/**
 * This script initializes the Firestore database with sample data for the IPL 2025 prediction app.
 * It can be run directly from the command line using Node.js.
 * 
 * Usage:
 *   node scripts/init-firestore.js
 */

// Import required modules
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Initializing Firestore database with sample data...');

// Create a temporary TypeScript file to run the initialization
const tempFile = path.join(__dirname, 'temp-init.ts');
const scriptContent = `
// ESM style imports
import initializeFirestore from '../src/scripts/initializeFirestore.js';

async function run() {
  try {
    console.log('Starting Firestore initialization...');
    const success = await initializeFirestore();
    console.log('Initialization ' + (success ? 'completed successfully!' : 'failed.'));
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
}

run();
`;

try {
  // Write the temporary file
  fs.writeFileSync(tempFile, scriptContent);
  console.log('Running initialization script...');
  
  // Execute the script using ts-node with esm flag
  execSync(`npx ts-node --esm ${tempFile}`, { stdio: 'inherit' });
  
  console.log('Firestore initialization completed!');
} catch (error) {
  console.error('Error running initialization script:', error);
  process.exit(1);
} finally {
  // Clean up the temporary file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
