import express from 'express';
import cors from 'cors';
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  fetchTeamSquads,
  fetchTeamSquadsFromIplt20,
  fetchMatchScorecard,
  fetchMatchList,
  fetchMatchSummary,
  resolveTeamId,
  CRICBUZZ_CONFIG,
  IPLT20_CONFIG,
  ESPN_CONFIG,
} from './server/cricket-data-service.js';
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  registerPendingMatches,
  setCricbuzzMatchMapping,
  triggerManualCheck,
  getMatchMappings,
  clearProcessedMatches,
  getSchedulerLogs,
} from './server/match-scheduler.js';

// Initialize environment variables
dotenv.config();

// ES Module replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

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

// ─── Cricket Data API Endpoints ────────────────────────────────

// Fetch team squads from ESPNcricinfo
app.get('/api/cricket/teams', async (req, res) => {
  try {
    console.log('Fetching team squads from ESPNcricinfo...');
    const teams = await fetchTeamSquads();
    res.json({ success: true, teams, source: 'espncricinfo', fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching team squads from ESPN:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch team squads from iplt20.com
app.get('/api/cricket/teams/ipl', async (req, res) => {
  try {
    console.log('Fetching team squads from iplt20.com...');
    const teams = await fetchTeamSquadsFromIplt20();
    res.json({ success: true, teams, source: 'iplt20', fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching team squads from iplt20.com:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch match list from iplt20.com
app.get('/api/cricket/matches', async (req, res) => {
  try {
    console.log('Fetching match list from iplt20.com...');
    const matches = await fetchMatchList();
    res.json({ success: true, matches, source: 'iplt20', fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching match list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch a specific match scorecard from ESPNcricinfo
app.get('/api/cricket/scorecard/:cricbuzzMatchId', async (req, res) => {
  try {
    const { cricbuzzMatchId } = req.params;
    if (!/^\d+$/.test(cricbuzzMatchId)) {
      return res.status(400).json({ success: false, error: 'Invalid match ID format' });
    }
    const { team1, team2 } = req.query;
    console.log(`Fetching scorecard for match ${cricbuzzMatchId} from ESPN...`);
    const scorecard = await fetchMatchScorecard(cricbuzzMatchId, team1, team2);
    res.json({ success: true, result: scorecard, source: 'espncricinfo', fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching match scorecard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch match summary from ESPNcricinfo
app.get('/api/cricket/summary/:cricbuzzMatchId', async (req, res) => {
  try {
    const { cricbuzzMatchId } = req.params;
    if (!/^\d+$/.test(cricbuzzMatchId)) {
      return res.status(400).json({ success: false, error: 'Invalid match ID format' });
    }
    const { team1, team2 } = req.query;
    console.log(`Fetching match summary for match ${cricbuzzMatchId} from ESPN...`);
    const summary = await fetchMatchSummary(cricbuzzMatchId, team1, team2);
    res.json({ success: true, result: summary, source: 'espncricinfo', fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching match summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update competition/series ID configuration
app.post('/api/cricket/config', (req, res) => {
  const { seriesId } = req.body;
  if (seriesId && /^\d+$/.test(seriesId)) {
    IPLT20_CONFIG.competitionId = seriesId;
    CRICBUZZ_CONFIG.seriesId = seriesId;
    res.json({ success: true, seriesId: IPLT20_CONFIG.competitionId });
  } else {
    res.status(400).json({ success: false, error: 'Invalid competition ID' });
  }
});

// Get current config
app.get('/api/cricket/config', (req, res) => {
  res.json({
    seriesId: IPLT20_CONFIG.competitionId,
    iplt20FeedBase: IPLT20_CONFIG.feedBase,
    espnSeriesSlug: ESPN_CONFIG.seriesSlug,
  });
});

// ─── Auto-Evaluation Scheduler Endpoints ──────────────────────

// Get scheduler status
app.get('/api/scheduler/status', (req, res) => {
  res.json(getSchedulerStatus());
});

// Start the scheduler
app.post('/api/scheduler/start', (req, res) => {
  const intervalMs = req.body.intervalMs || 5 * 60 * 1000;
  if (intervalMs < 60000) { // minimum 1 minute
    return res.status(400).json({ success: false, error: 'Interval must be at least 60 seconds' });
  }
  const status = startScheduler(intervalMs);
  res.json({ success: true, ...status });
});

// Stop the scheduler
app.post('/api/scheduler/stop', (req, res) => {
  const status = stopScheduler();
  res.json({ success: true, ...status });
});

// Register pending matches to watch
app.post('/api/scheduler/register-matches', (req, res) => {
  const { matches } = req.body;
  if (!Array.isArray(matches)) {
    return res.status(400).json({ success: false, error: 'matches must be an array' });
  }
  const count = registerPendingMatches(matches);
  res.json({ success: true, registeredCount: count });
});

// Map a Firestore match to a Cricbuzz match
app.post('/api/scheduler/map-match', (req, res) => {
  const { firestoreMatchId, cricbuzzMatchId } = req.body;
  if (!firestoreMatchId || !cricbuzzMatchId) {
    return res.status(400).json({ success: false, error: 'Both firestoreMatchId and cricbuzzMatchId are required' });
  }
  if (!/^\d+$/.test(cricbuzzMatchId)) {
    return res.status(400).json({ success: false, error: 'Invalid Cricbuzz match ID format' });
  }
  setCricbuzzMatchMapping(firestoreMatchId, cricbuzzMatchId);
  res.json({ success: true, mappings: getMatchMappings() });
});

// Manually trigger a check
app.post('/api/scheduler/trigger', async (req, res) => {
  try {
    const result = await triggerManualCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get match ID mappings
app.get('/api/scheduler/mappings', (req, res) => {
  res.json(getMatchMappings());
});

// Clear processed matches
app.post('/api/scheduler/clear-processed', (req, res) => {
  clearProcessedMatches();
  res.json({ success: true });
});

// Get scheduler logs
app.get('/api/scheduler/logs', (req, res) => {
  res.json(getSchedulerLogs());
});

// Serve static files from the dist directory (after build)
app.use(express.static(path.join(__dirname, 'dist')));

// Return the index.html for all other routes (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || (process.env.NODE_ENV === 'development' ? 3001 : 8080);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api/config/firebase`);
  console.log(`Cricket data API at: http://localhost:${PORT}/api/cricket/teams`);
  console.log(`Scheduler API at: http://localhost:${PORT}/api/scheduler/status`);
  console.log(`App available at: http://localhost:${PORT}`);
}); 