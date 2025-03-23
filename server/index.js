import express from 'express';
import cors from 'cors';
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const keyVaultName = process.env.AZURE_KEY_VAULT_NAME || "myFirebaseKeyVault";
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;

console.log('Initializing server with Key Vault:', keyVaultName);

// Create Azure credential and client
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

app.get('/api/config/firebase', async (req, res) => {
  try {
    console.log('Fetching Firebase config from Azure Key Vault...');
    
    // Get the Firebase Web Config secret
    const secret = await client.getSecret('clientSideFirebaseKeyVault');
    
    if (!secret.value) {
      throw new Error('No value found in secret');
    }

    let configValue = secret.value;
    try {
      // If the value is base64 encoded, decode it
      if (/^[A-Za-z0-9+/=]+$/.test(configValue)) {
        console.log('Value appears to be base64 encoded, attempting to decode...');
        configValue = Buffer.from(configValue, 'base64').toString('utf8');
      }

      // Parse the web configuration
      const config = JSON.parse(configValue);
      
      // Validate required fields
      const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields in Firebase config: ${missingFields.join(', ')}`);
      }

      // Log the keys we found (but not their values for security)
      console.log('Successfully retrieved Firebase config with keys:', Object.keys(config));
      
      res.json(config);
    } catch (parseError) {
      console.error('Error parsing config:', parseError);
      res.status(500).json({ 
        error: 'Invalid configuration format', 
        details: parseError.message,
        hint: 'Make sure the Firebase Web configuration in Azure Key Vault is properly formatted'
      });
    }
  } catch (error) {
    console.error('Error fetching Firebase config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch configuration', 
      details: error.message,
      hint: 'Make sure the clientSideFirebaseKeyVault secret exists in Azure Key Vault'
    });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the server by visiting: http://localhost:${PORT}/api/config/firebase`);
}); 