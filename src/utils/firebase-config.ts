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
 * Gets Firebase configuration from Azure Key Vault through our API
 */
export async function getFirebaseConfig(): Promise<FirebaseConfig> {
  try {
    // In development, use localhost, in production use relative URL
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8000' : '';
    console.log('Fetching Firebase config from:', `${baseUrl}/api/config/firebase`);
    
    const response = await fetch(`${baseUrl}/api/config/firebase`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch config: ${response.statusText}. ${errorData.details || ''}`);
    }

    const config = await response.json();
    console.log('Received Firebase config with keys:', Object.keys(config));
    
    // Validate the config has required fields
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Firebase config is missing required fields: ${missingFields.join(', ')}`);
    }
    
    return config;
  } catch (error) {
    console.error('Error fetching Firebase config:', error);
    throw error;
  }
} 