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

// Firebase client configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8ee2OBNfvdvRnTnatdqXC6EN7yflqmbs",
  authDomain: "fanatics-predictor.firebaseapp.com",
  projectId: "fanatics-predictor",
  storageBucket: "fanatics-predictor.firebasestorage.app",
  messagingSenderId: "882421015273",
  appId: "1:882421015273:web:ee00904e7a7bb0c0b50678",
  measurementId: "G-EH6FM2JFG0"
};

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