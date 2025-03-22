#!/usr/bin/env node

import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testKeyVaultConnection() {
  try {
    console.log('Testing Azure Key Vault Connection...');
    
    const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
    if (!keyVaultName) {
      throw new Error('AZURE_KEY_VAULT_NAME not found in .env file');
    }
    
    console.log(`Using Key Vault: ${keyVaultName}`);
    const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
    
    console.log('Initializing Azure credentials...');
    const credential = new DefaultAzureCredential();
    
    console.log('Creating Secret Client...');
    const client = new SecretClient(vaultUrl, credential);
    
    console.log('Attempting to list secrets...');
    const secrets = client.listPropertiesOfSecrets();
    
    console.log('\nAvailable secrets in Key Vault:');
    for await (const secret of secrets) {
      console.log(`- ${secret.name}`);
    }
    
    // Try to get the Firebase config secret
    console.log('\nTesting retrieval of Firebase config...');
    try {
      const firebaseConfig = await client.getSecret('iplPredictionFirebaseKeys');
      console.log('✅ Successfully retrieved Firebase config');
      
      // Log the first few characters of the raw value
      const rawValue = firebaseConfig.value || '';
      console.log('Raw value starts with:', rawValue.substring(0, 50) + '...');
      
      // Clean the value - remove any PowerShell formatting
      let cleanValue = rawValue.trim();
      if (cleanValue.startsWith('$')) {
        cleanValue = cleanValue.substring(1);
      }
      
      // Try to decode base64 first
      try {
        const decodedValue = Buffer.from(cleanValue, 'base64').toString('utf8');
        console.log('✅ Successfully decoded from base64');
        console.log('Decoded value starts with:', decodedValue.substring(0, 50) + '...');
        
        // Try to parse as JSON
        const config = JSON.parse(decodedValue);
        console.log('✅ Successfully parsed JSON after base64 decode');
        console.log('Config contains keys:', Object.keys(config));
      } catch (decodeError) {
        console.log('⚠️ Failed to decode as base64 or parse JSON:', decodeError.message);
        
        // Try to parse the raw value as JSON
        try {
          const config = JSON.parse(cleanValue);
          console.log('✅ Successfully parsed raw value as JSON');
          console.log('Config contains keys:', Object.keys(config));
        } catch (parseError) {
          console.log('❌ Failed to parse as JSON:', parseError.message);
        }
      }
    } catch (error) {
      console.error('❌ Error retrieving Firebase config:', error.message);
    }
    
    console.log('\n✅ Azure Key Vault connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing Azure Key Vault connection:', error.message);
    if (error.message.includes('AZURE_KEY_VAULT_NAME')) {
      console.log('\nMake sure your .env file contains:');
      console.log('AZURE_KEY_VAULT_NAME=myFirebaseKeyVault');
    } else if (error.message.includes('authentication failed')) {
      console.log('\nAuthentication failed. Please run:');
      console.log('az login');
    }
    process.exit(1);
  }
}

testKeyVaultConnection(); 