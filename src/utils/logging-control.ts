import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { COLLECTIONS } from './firestore-collections';

// Add system settings collection to your COLLECTIONS constant if not already there
// This should be added to your firestore-collections.ts file
// export const COLLECTIONS = {
//   ...
//   SYSTEM_SETTINGS: 'systemSettings',
// };

// Default settings
const DEFAULT_SETTINGS = {
  enableLogging: true,
  lastUpdated: new Date().toISOString()
};

// Cache the settings to avoid excessive Firestore reads
let cachedSettings = { ...DEFAULT_SETTINGS };
let isInitialized = false;

// Replace the native console methods with controlled versions
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Initialize the logging system
export const initLoggingControl = async () => {
  if (isInitialized) return;
  
  try {
    // Get current settings
    const settingsRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'loggingConfig');
    const settingsDoc = await getDoc(settingsRef);
    
    // If settings don't exist, create them with default values
    if (!settingsDoc.exists()) {
      await setDoc(settingsRef, DEFAULT_SETTINGS);
      cachedSettings = { ...DEFAULT_SETTINGS };
    } else {
      cachedSettings = settingsDoc.data() as typeof DEFAULT_SETTINGS;
    }
    
    // Set up real-time listener for settings changes
    onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const newSettings = snapshot.data() as typeof DEFAULT_SETTINGS;
        cachedSettings = newSettings;
        applyLoggingSettings(newSettings.enableLogging);
      }
    });
    
    // Override console methods
    applyLoggingSettings(cachedSettings.enableLogging);
    isInitialized = true;
    
    // Log confirmation but respect the current setting
    if (cachedSettings.enableLogging) {
      originalConsole.info('Logging control system initialized');
    }
  } catch (error) {
    // Always log initialization errors, regardless of settings
    originalConsole.error('Error initializing logging control:', error);
  }
};

// Update the logging settings
export const setLoggingEnabled = async (enabled: boolean) => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'loggingConfig');
    await setDoc(settingsRef, {
      enableLogging: enabled,
      lastUpdated: new Date().toISOString()
    });
    return true;
  } catch (error) {
    originalConsole.error('Error updating logging settings:', error);
    return false;
  }
};

// Apply the current logging settings
const applyLoggingSettings = (enabled: boolean) => {
  if (enabled) {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  } else {
    // Replace with no-op functions
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
    // Keep error logging for critical issues
    console.error = originalConsole.error;
  }
};

// Get current logging state
export const isLoggingEnabled = () => cachedSettings.enableLogging;

// Controlled logger that respects the global setting
export const logger = {
  log: (...args: any[]) => {
    if (cachedSettings.enableLogging) {
      originalConsole.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (cachedSettings.enableLogging) {
      originalConsole.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, they're important
    originalConsole.error(...args);
  },
  info: (...args: any[]) => {
    if (cachedSettings.enableLogging) {
      originalConsole.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (cachedSettings.enableLogging) {
      originalConsole.debug(...args);
    }
  },
}; 