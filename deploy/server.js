import express from 'express';
import cors from 'cors';
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

// ES Module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
app.use(cors());

// Trust Azure's reverse proxy
app.set('trust proxy', 1);

// Azure Key Vault setup
const keyVaultName = process.env.AZURE_KEY_VAULT_NAME || "myFirebaseKeyVault";
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;

console.log('Initializing server with environment:', process.env.NODE_ENV);
console.log('Server running on port:', process.env.PORT || 8080);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    websitesPort: process.env.WEBSITES_PORT,
    nodeVersion: process.version,
    time: new Date().toISOString()
  });
});

// API endpoint to fetch Firebase config
app.get('/api/config/firebase', async (req, res) => {
  try {
    console.log('Request for Firebase config received');
    
    // Check if all Firebase config values are available in environment variables
    const firebaseConfigFromEnv = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };
    
    // Check if essential Firebase config values are available in env vars
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !firebaseConfigFromEnv[field]);
    
    // If we have all required fields in environment variables, use those
    if (missingFields.length === 0) {
      console.log('Using Firebase config from environment variables');
      return res.json(firebaseConfigFromEnv);
    }
    
    console.log('Firebase config not found in environment variables, trying Azure Key Vault...');
    
    // Create Azure credential and client
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);
    
    // Get the Firebase Web Config secret
    const secret = await client.getSecret('clientSideFirebaseKeyVault');
    
    if (!secret.value) {
      throw new Error('No value found in secret');
    }

    let configValue = secret.value;
    
    // If the value is base64 encoded, decode it
    if (/^[A-Za-z0-9+/=]+$/.test(configValue)) {
      console.log('Value appears to be base64 encoded, attempting to decode...');
      configValue = Buffer.from(configValue, 'base64').toString('utf8');
    }

    // Parse the web configuration
    const config = JSON.parse(configValue);
    
    // Validate required fields
    const keyVaultMissingFields = requiredFields.filter(field => !config[field]);
    
    if (keyVaultMissingFields.length > 0) {
      throw new Error(`Missing required fields in Firebase config: ${keyVaultMissingFields.join(', ')}`);
    }

    // Log the keys we found (but not their values for security)
    console.log('Successfully retrieved Firebase config with keys:', Object.keys(config));
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching Firebase config:', error);
    
    // Fallback to hardcoded config if available (for development/testing only)
    // In production, you should set environment variables or fix Key Vault access
    const fallbackConfig = {
      apiKey: "AIzaSyC8ee2OBNfvdvRnTnatdqXC6EN7yflqmbs",
      authDomain: "fanatics-predictor.firebaseapp.com",
      projectId: "fanatics-predictor",
      storageBucket: "fanatics-predictor.firebasestorage.app",
      messagingSenderId: "882421015273",
      appId: "1:882421015273:web:ee00904e7a7bb0c0b50678",
      measurementId: "G-EH6FM2JFG0"
    };
    
    console.log('Using fallback Firebase config');
    return res.json(fallbackConfig);
  }
});

// Serve static files from the dist directory (after build)
app.use(express.static(path.join(__dirname, 'dist')));

// Return the index.html for all other routes (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api/config/firebase`);
  console.log(`App available at: http://localhost:${PORT}`);
}); 