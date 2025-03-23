
// ESM style imports
import { generateFirestoreRules } from '../src/scripts/generateFirestoreRules.js';

async function run() {
  try {
    console.log('Starting Firestore rules generation...');
    const success = generateFirestoreRules();
    console.log('Rules generation ' + (success ? 'completed successfully!' : 'failed.'));
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error during rules generation:', error);
    process.exit(1);
  }
}

run();
