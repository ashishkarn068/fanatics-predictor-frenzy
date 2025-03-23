// Simple script to run the initialization directly
import { initializeFirestore } from '../src/scripts/initializeFirestore.js';

async function run() {
  try {
    console.log('Starting Firestore initialization...');
    const success = await initializeFirestore();
    console.log('Initialization ' + (success ? 'completed successfully!' : 'failed.'));
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
}

run();
