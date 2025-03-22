import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const keyVaultName = import.meta.env.VITE_AZURE_KEY_VAULT_NAME || "myFirebaseKeyVault";
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;

// Create Azure credential and client
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

/**
 * Decodes a base64 string
 */
function decodeBase64(base64String: string): string {
  try {
    return atob(base64String);
  } catch (error) {
    console.error('Error decoding base64 string:', error);
    return base64String; // Return original string if decoding fails
  }
}

/**
 * Retrieves a secret from Azure Key Vault and decodes it if it's base64 encoded
 */
export async function getSecret(secretName: string): Promise<string> {
  try {
    const secret = await client.getSecret(secretName);
    const value = secret.value || "";
    
    // Check if the value appears to be base64 encoded
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (base64Regex.test(value) && value.length % 4 === 0) {
      return decodeBase64(value);
    }
    
    return value;
  } catch (error) {
    console.error(`Error retrieving secret '${secretName}' from Key Vault:`, error);
    throw error;
  }
}

/**
 * Firebase configuration interface
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Retrieves Firebase configuration from Azure Key Vault
 * 
 * This function retrieves the Firebase configuration from a single secret
 * that contains all the necessary configuration values.
 * 
 * @returns Firebase configuration object
 */
export async function getFirebaseConfig(): Promise<FirebaseConfig> {
  try {
    console.log('Retrieving Firebase configuration from Azure Key Vault...');
    const secretValue = await getSecret('iplPredictionFirebaseKeys');
    
    try {
      // Try to parse the secret value as JSON
      const config = JSON.parse(secretValue) as FirebaseConfig;
      console.log('Successfully retrieved and parsed Firebase configuration');
      return config;
    } catch (parseError) {
      console.error('Error parsing Firebase configuration:', parseError);
      throw new Error('Invalid Firebase configuration format');
    }
  } catch (error) {
    console.error('Failed to retrieve Firebase configuration from Azure Key Vault:', error);
    throw new Error('Failed to retrieve Firebase configuration');
  }
}

/**
 * Retrieves Firebase service account credentials from Azure Key Vault
 */
export async function getFirebaseServiceAccount(): Promise<Record<string, any>> {
  try {
    const secretValue = await getSecret("iplPredictionFirebaseKeys");
    return JSON.parse(secretValue);
  } catch (error) {
    console.error("Failed to retrieve Firebase service account from Key Vault:", error);
    throw new Error("Failed to retrieve Firebase service account credentials");
  }
} 