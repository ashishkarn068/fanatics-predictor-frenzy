#!/usr/bin/env node

/**
 * This script uploads Firebase client configuration to Azure Key Vault
 * Run it with: node scripts/upload-firebase-config.js
 */

import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Get Azure Key Vault name from environment or use default
const keyVaultName = process.env.AZURE_KEY_VAULT_NAME || 'myFirebaseKeyVault';
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;

// Firebase client configuration — load from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Validate that required fields are set
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missing = requiredFields.filter(f => !firebaseConfig[f]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.map(f => 'FIREBASE_' + f.replace(/([A-Z])/g, '_$1').toUpperCase()).join(', ')}`);
  console.error('Set these in a .env file or export them before running this script.');
  process.exit(1);
}

async function uploadFirebaseConfig() {
  try {
    console.log(`Connecting to Azure Key Vault: ${keyVaultName}`);
    
    // Create Azure credential and client
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);
    
    // Convert the configuration to JSON string
    const configString = JSON.stringify(firebaseConfig, null, 2);
    
    // Upload the configuration to Key Vault
    console.log('Uploading Firebase client configuration to Azure Key Vault...');
    await client.setSecret('clientSideFirebaseKeyVault', configString);
    
    console.log('✅ Firebase client configuration uploaded successfully!');
    console.log(`Secret name: clientSideFirebaseKeyVault`);
    
    // Log the keys (but not values) that were uploaded
    console.log('\nUploaded configuration contains these keys:');
    Object.keys(firebaseConfig).forEach(key => console.log(`- ${key}`));
    
    console.log('\nTo verify the configuration, run:');
    console.log('curl http://localhost:8000/api/config/firebase');
    
  } catch (error) {
    console.error('❌ Error uploading Firebase configuration to Azure Key Vault:', error.message);
    console.error(error);
    process.exit(1);
  }
}

uploadFirebaseConfig(); 