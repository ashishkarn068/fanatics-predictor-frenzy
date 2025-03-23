#!/usr/bin/env node

/**
 * This script uploads Firebase credentials to Azure Key Vault
 * Run it with: node scripts/upload-secrets-to-azure.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import dotenv from 'dotenv';
import { dirname } from 'path';

// Initialize dotenv
dotenv.config();

// Get current file's directory (ES modules replacement for __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Azure Key Vault name from environment or use default
const keyVaultName = process.env.AZURE_KEY_VAULT_NAME || 'myFirebaseKeyVault';
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;

// Create Azure credential and client
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

async function uploadSecrets() {
  try {
    console.log(`Connecting to Azure Key Vault: ${keyVaultName}`);
    
    // Extract Firebase config from .env file
    if (fs.existsSync('.env')) {
      console.log('Reading Firebase configuration from .env file');
      
      const envVars = {
        'FIREBASE_API_KEY': process.env.VITE_FIREBASE_API_KEY,
        'FIREBASE_AUTH_DOMAIN': process.env.VITE_FIREBASE_AUTH_DOMAIN,
        'FIREBASE_PROJECT_ID': process.env.VITE_FIREBASE_PROJECT_ID,
        'FIREBASE_STORAGE_BUCKET': process.env.VITE_FIREBASE_STORAGE_BUCKET,
        'FIREBASE_MESSAGING_SENDER_ID': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        'FIREBASE_APP_ID': process.env.VITE_FIREBASE_APP_ID,
        'FIREBASE_MEASUREMENT_ID': process.env.VITE_FIREBASE_MEASUREMENT_ID
      };
      
      // Check for missing required values
      const missingValues = Object.entries(envVars)
        .filter(([key, value]) => !value && key !== 'FIREBASE_MEASUREMENT_ID')
        .map(([key]) => key);
      
      if (missingValues.length > 0) {
        console.error('❌ Missing required Firebase configuration values in .env file:');
        missingValues.forEach(key => console.error(`  - ${key}`));
        process.exit(1);
      }
      
      // Upload each configuration value to Key Vault
      console.log('Uploading Firebase configuration values to Azure Key Vault...');
      for (const [key, value] of Object.entries(envVars)) {
        if (value) {
          console.log(`Uploading ${key}...`);
          await client.setSecret(key, value);
          console.log(`✅ ${key} uploaded successfully`);
        } else {
          console.warn(`⚠️ Skipping ${key} (no value provided)`);
        }
      }
      
      console.log('\n✅ All Firebase configuration values uploaded to Azure Key Vault successfully!');
      console.log('\nTo verify the configuration, run:');
      console.log('npm run test-vault');
      
    } else {
      console.error('❌ .env file not found');
      console.log('Please create a .env file with your Firebase configuration values:');
      console.log(`
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id  # Optional
`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error uploading secrets to Azure Key Vault:', error.message);
    console.error(error);
    process.exit(1);
  }
}

uploadSecrets(); 