/**
 * Match Auto-Evaluation Scheduler
 * Periodically checks for recently completed matches and auto-populates results.
 * Runs as part of the Express server.
 */

import { fetchMatchList, fetchMatchScorecard, resolveTeamId, TEAM_ID_TO_NAME } from './cricket-data-service.js';

// In-memory state
let schedulerState = {
  enabled: false,
  intervalMs: 5 * 60 * 1000, // 5 minutes
  intervalId: null,
  lastRun: null,
  lastRunStatus: null,
  pendingMatches: [],      // Matches we're watching for completion
  processedMatches: [],    // Cricbuzz match IDs we've already processed
  cricbuzzMatchMap: {},    // Maps our Firestore match IDs → Cricbuzz match IDs
  readyResults: [],        // Results ready to be applied to Firestore (not yet applied)
  logs: [],                // Recent log entries (circular buffer)
};

const MAX_LOGS = 100;

function addLog(level, message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
  schedulerState.logs.push(entry);
  if (schedulerState.logs.length > MAX_LOGS) {
    schedulerState.logs.shift();
  }
  console[level === 'error' ? 'error' : 'log'](`[MatchScheduler] ${message}`, data || '');
}

/**
 * Try to match our Firestore matches with Cricbuzz matches based on team names and dates.
 * This mapping is needed because Cricbuzz has its own match IDs.
 */
function matchFirestoreWithCricbuzz(firestoreMatch, cricbuzzMatches) {
  // First: Try to extract match ID from firestore match ID (e.g., "ipl_2428" -> "2428")
  const matchIdMatch = firestoreMatch.firestoreMatchId?.match(/(\d+)$/);
  if (matchIdMatch) {
    const extractedId = matchIdMatch[1];
    const directMatch = cricbuzzMatches.find(cm => 
      cm.cricbuzzMatchId === extractedId || cm.iplMatchId === extractedId
    );
    if (directMatch) {
      addLog('info', `Matched by ID: ${firestoreMatch.firestoreMatchId} → ${directMatch.cricbuzzMatchId}`);
      return directMatch;
    }
  }

  // Second: Match by team IDs
  const match = cricbuzzMatches.find(cm => {
    const cmTeam1Id = resolveTeamId(cm.team1);
    const cmTeam2Id = resolveTeamId(cm.team2);
    const fsTeam1 = resolveTeamId(firestoreMatch.team1);
    const fsTeam2 = resolveTeamId(firestoreMatch.team2);
    return (
      (cmTeam1Id === fsTeam1 && cmTeam2Id === fsTeam2) ||
      (cmTeam1Id === fsTeam2 && cmTeam2Id === fsTeam1)
    );
  });

  return match || null;
}

/**
 * Core scheduler tick: check for completed matches and fetch results.
 * This function is called by the server — the actual Firestore writes happen
 * on the client side via the returned data, since the server may not have
 * firebase-admin configured for writes.
 *
 * Instead, we store the fetched results and expose them via API for the client
 * to consume and write to Firestore.
 */
async function schedulerTick() {
  schedulerState.lastRun = new Date().toISOString();

  try {
    addLog('info', 'Scheduler tick started');

    // 1. Fetch the current match list from Cricbuzz
    let cricbuzzMatches;
    try {
      cricbuzzMatches = await fetchMatchList();
      addLog('info', `Fetched ${cricbuzzMatches.length} matches from Cricbuzz`);
    } catch (err) {
      addLog('error', 'Failed to fetch match list from Cricbuzz', err.message);
      schedulerState.lastRunStatus = 'error';
      return { success: false, error: err.message };
    }

    // 2. For each pending match, check if it's completed
    const results = [];
    for (const pending of schedulerState.pendingMatches) {
      // Find the corresponding Cricbuzz match
      const cricbuzzMapEntry = schedulerState.cricbuzzMatchMap[pending.firestoreMatchId];
      let cricbuzzMatchId = cricbuzzMapEntry?.cricbuzzMatchId;

      if (!cricbuzzMatchId) {
        // Try auto-matching
        const matched = matchFirestoreWithCricbuzz(pending, cricbuzzMatches);
        if (matched) {
          cricbuzzMatchId = matched.cricbuzzMatchId;
          // Extract match number from matchOrder (e.g., "Match 12" -> 12)
          let matchOrder = null;
          if (matched.matchOrder) {
            const orderMatch = String(matched.matchOrder).match(/(\d+)/);
            if (orderMatch) matchOrder = parseInt(orderMatch[1]);
          }
          schedulerState.cricbuzzMatchMap[pending.firestoreMatchId] = {
            cricbuzzMatchId,
            team1: matched.team1,
            team2: matched.team2,
            matchOrder,
            startDate: matched.startDate,
          };
          addLog('info', `Auto-matched Firestore match ${pending.firestoreMatchId} → Cricbuzz ${cricbuzzMatchId}`);
        } else {
          addLog('warn', `Could not find Cricbuzz match for ${pending.firestoreMatchId} (${pending.team1} vs ${pending.team2})`);
          continue;
        }
      }

      // Get the full match mapping with team names
      const matchMapping = schedulerState.cricbuzzMatchMap[pending.firestoreMatchId];

      // Skip already processed matches
      if (schedulerState.processedMatches.includes(cricbuzzMatchId)) {
        continue;
      }

      // 3. Fetch the scorecard with team names and match order for better ESPN matching
      try {
        const scorecard = await fetchMatchScorecard(
          cricbuzzMatchId,
          matchMapping?.team1 || pending.team1,
          matchMapping?.team2 || pending.team2,
          matchMapping?.matchOrder || null,
          matchMapping?.startDate || pending.date
        );

        if (scorecard.matchCompleted) {
          addLog('info', `Match ${pending.firestoreMatchId} completed! Winner: ${scorecard.winner}`);

          results.push({
            firestoreMatchId: pending.firestoreMatchId,
            cricbuzzMatchId,
            result: scorecard,
            fetchedAt: new Date().toISOString(),
          });

          // Also add to readyResults for auto-apply
          schedulerState.readyResults.push({
            firestoreMatchId: pending.firestoreMatchId,
            cricbuzzMatchId,
            result: scorecard,
            fetchedAt: new Date().toISOString(),
          });

          schedulerState.processedMatches.push(cricbuzzMatchId);
        } else {
          addLog('info', `Match ${pending.firestoreMatchId} (Cricbuzz: ${cricbuzzMatchId}) not yet completed`);
        }
      } catch (err) {
        addLog('error', `Failed to fetch scorecard for Cricbuzz match ${cricbuzzMatchId}`, err.message);
      }

      // Rate limit: wait 2 seconds between scorecard requests
      await new Promise(r => setTimeout(r, 2000));
    }

    schedulerState.lastRunStatus = results.length > 0 ? 'results_found' : 'no_new_results';
    addLog('info', `Scheduler tick completed. ${results.length} new results found.`);

    return { success: true, results };

  } catch (err) {
    addLog('error', 'Scheduler tick failed', err.message);
    schedulerState.lastRunStatus = 'error';
    return { success: false, error: err.message };
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Start the auto-evaluation scheduler
 */
export function startScheduler(intervalMs = 5 * 60 * 1000) {
  if (schedulerState.intervalId) {
    addLog('info', 'Scheduler already running, restarting with new interval');
    stopScheduler();
  }

  schedulerState.enabled = true;
  schedulerState.intervalMs = intervalMs;
  schedulerState.intervalId = setInterval(schedulerTick, intervalMs);

  addLog('info', `Scheduler started with ${intervalMs / 1000}s interval`);
  return getSchedulerStatus();
}

/**
 * Stop the auto-evaluation scheduler
 */
export function stopScheduler() {
  if (schedulerState.intervalId) {
    clearInterval(schedulerState.intervalId);
    schedulerState.intervalId = null;
  }
  schedulerState.enabled = false;
  addLog('info', 'Scheduler stopped');
  return getSchedulerStatus();
}

/**
 * Get current scheduler status
 */
export function getSchedulerStatus() {
  return {
    enabled: schedulerState.enabled,
    intervalMs: schedulerState.intervalMs,
    lastRun: schedulerState.lastRun,
    lastRunStatus: schedulerState.lastRunStatus,
    pendingMatchCount: schedulerState.pendingMatches.length,
    processedMatchCount: schedulerState.processedMatches.length,
    logs: schedulerState.logs.slice(-20), // Last 20 log entries
  };
}

/**
 * Register matches to watch for completion.
 * Called by the client when it knows which matches are live/upcoming.
 * @param {Array} matches - Array of {firestoreMatchId, team1, team2, date, status, hasResults}
 */
export function registerPendingMatches(matches) {
  const now = new Date();
  const filtered = matches.filter(m => {
    const matchDate = new Date(m.date);
    const hoursSinceStart = (now - matchDate) / (1000 * 60 * 60);
    
    // Include matches that need results processing:
    // 1. Match has started (past start time)
    // 2. Either: match is not marked completed, OR match doesn't have results yet
    const hasStarted = hoursSinceStart >= -0.5; // Started or about to start
    const needsResults = m.status !== 'completed' || m.hasResults === false;
    
    // Include any match that has started and needs results
    // Up to 30 days old to catch any missed matches
    return hasStarted && needsResults && hoursSinceStart <= 24 * 30;
  });

  schedulerState.pendingMatches = filtered;
  addLog('info', `Registered ${filtered.length} pending matches to watch`);
  return filtered.length;
}

/**
 * Manually set a Cricbuzz match ID mapping for a Firestore match
 */
export function setCricbuzzMatchMapping(firestoreMatchId, cricbuzzMatchId) {
  schedulerState.cricbuzzMatchMap[firestoreMatchId] = { cricbuzzMatchId };
  addLog('info', `Mapped Firestore match ${firestoreMatchId} → Cricbuzz ${cricbuzzMatchId}`);
}

/**
 * Manually trigger a scheduler tick (for admin use)
 */
export async function triggerManualCheck() {
  addLog('info', 'Manual check triggered by admin');
  return schedulerTick();
}

/**
 * Get the Cricbuzz match ID mapping
 */
export function getMatchMappings() {
  return schedulerState.cricbuzzMatchMap;
}

/**
 * Clear processed matches list (to re-evaluate)
 */
export function clearProcessedMatches() {
  schedulerState.processedMatches = [];
  addLog('info', 'Cleared processed matches list');
}

/**
 * Get scheduler logs
 */
export function getSchedulerLogs() {
  return schedulerState.logs;
}

/**
 * Get results that are ready to be applied to Firestore
 */
export function getReadyResults() {
  return schedulerState.readyResults;
}

/**
 * Mark a result as applied (remove from ready queue)
 */
export function markResultApplied(firestoreMatchId) {
  const idx = schedulerState.readyResults.findIndex(r => r.firestoreMatchId === firestoreMatchId);
  if (idx !== -1) {
    schedulerState.readyResults.splice(idx, 1);
    addLog('info', `Marked result as applied for match ${firestoreMatchId}`);
    return true;
  }
  return false;
}
