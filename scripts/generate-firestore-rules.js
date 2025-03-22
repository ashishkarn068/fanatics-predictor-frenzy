#!/usr/bin/env node

/**
 * This script generates Firestore security rules for the IPL 2025 prediction app.
 * It can be run directly from the command line using Node.js.
 * 
 * Usage:
 *   node scripts/generate-firestore-rules.js
 */

// Import required modules
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Generating Firestore security rules...');

// Create a temporary TypeScript file to run the rule generation
const tempFile = path.join(__dirname, 'temp-rules.ts');
const scriptContent = `
// ESM style imports
import { generateFirestoreRules } from '../src/scripts/generateFirestoreRules.js';

async function run() {
  try {
    console.log('Starting Firestore rules generation...');
    const success = generateFirestoreRules();
    console.log('Rules generation ' + (success ? 'completed successfully!' : 'failed.'));
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error during rules generation:', error);
    process.exit(1);
  }
}

run();
`;

try {
  // Write the temporary file
  fs.writeFileSync(tempFile, scriptContent);
  console.log('Running rules generation script...');
  
  // Execute the script using ts-node with esm flag
  execSync(`npx ts-node --esm ${tempFile}`, { stdio: 'inherit' });
  
  console.log('Firestore rules generation completed!');
} catch (error) {
  console.error('Error running rules generation script:', error);
  process.exit(1);
} finally {
  // Clean up the temporary file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
