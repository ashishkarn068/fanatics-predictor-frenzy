/**
 * Cricket Data Service — Hybrid Approach
 *
 * Data sources:
 *  - Teams & Match Schedule: iplt20.com official JSONP feeds
 *  - Player Squads:          ESPNcricinfo __NEXT_DATA__ in squad pages
 *  - Match Results/Scorecards: ESPNcricinfo __NEXT_DATA__ in scorecard pages
 */

// ─── Constants & Config ─────────────────────────────────────

const TEAM_NAME_MAP = {
  'Mumbai Indians': 'mumbaiindians',
  'Chennai Super Kings': 'chennaisuperkings',
  'Royal Challengers Bengaluru': 'royalchallengersbengaluru',
  'Royal Challengers Bangalore': 'royalchallengersbengaluru',
  'Kolkata Knight Riders': 'kolkataknightriders',
  'Delhi Capitals': 'delhicapitals',
  'Rajasthan Royals': 'rajasthanroyals',
  'Sunrisers Hyderabad': 'sunrisershyderabad',
  'Punjab Kings': 'punjabkings',
  'Gujarat Titans': 'gujarattitans',
  'Lucknow Super Giants': 'lucknowsupergiants',
  'MI': 'mumbaiindians',
  'CSK': 'chennaisuperkings',
  'RCB': 'royalchallengersbengaluru',
  'KKR': 'kolkataknightriders',
  'DC': 'delhicapitals',
  'RR': 'rajasthanroyals',
  'SRH': 'sunrisershyderabad',
  'PBKS': 'punjabkings',
  'GT': 'gujarattitans',
  'LSG': 'lucknowsupergiants',
  'KOLKATA KNIGHT RIDERS': 'kolkataknightriders',
  'MUMBAI INDIANS': 'mumbaiindians',
  'CHENNAI SUPER KINGS': 'chennaisuperkings',
  'ROYAL CHALLENGERS BENGALURU': 'royalchallengersbengaluru',
  'DELHI CAPITALS': 'delhicapitals',
  'RAJASTHAN ROYALS': 'rajasthanroyals',
  'SUNRISERS HYDERABAD': 'sunrisershyderabad',
  'PUNJAB KINGS': 'punjabkings',
  'GUJARAT TITANS': 'gujarattitans',
  'LUCKNOW SUPER GIANTS': 'lucknowsupergiants',
};

const TEAM_ID_TO_NAME = {
  'mumbaiindians': 'Mumbai Indians',
  'chennaisuperkings': 'Chennai Super Kings',
  'royalchallengersbengaluru': 'Royal Challengers Bengaluru',
  'kolkataknightriders': 'Kolkata Knight Riders',
  'delhicapitals': 'Delhi Capitals',
  'rajasthanroyals': 'Rajasthan Royals',
  'sunrisershyderabad': 'Sunrisers Hyderabad',
  'punjabkings': 'Punjab Kings',
  'gujarattitans': 'Gujarat Titans',
  'lucknowsupergiants': 'Lucknow Super Giants',
};

const ESPN_SHORT_TO_FULL = {
  'CSK': 'Chennai Super Kings',
  'DC': 'Delhi Capitals',
  'GT': 'Gujarat Titans',
  'KKR': 'Kolkata Knight Riders',
  'LSG': 'Lucknow Super Giants',
  'MI': 'Mumbai Indians',
  'PBKS': 'Punjab Kings',
  'RR': 'Rajasthan Royals',
  'RCB': 'Royal Challengers Bengaluru',
  'SRH': 'Sunrisers Hyderabad',
};

/** IPL official website feed config */
const IPLT20_CONFIG = {
  competitionId: '284',           // IPL 2026
  feedBase: 'https://scores.iplt20.com/ipl/feeds',
  siteBase: 'https://www.iplt20.com',
};

/** ESPN config */
const ESPN_CONFIG = {
  seriesSlug: 'ipl-2026-1510719',
  baseUrl: 'https://www.espncricinfo.com',
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Kept for backward compat with server.js / match-scheduler.js
const CRICBUZZ_CONFIG = { seriesId: IPLT20_CONFIG.competitionId };

// ─── Helpers ────────────────────────────────────────────────

function resolveTeamId(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (TEAM_NAME_MAP[trimmed]) return TEAM_NAME_MAP[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(TEAM_NAME_MAP)) {
    if (key.toLowerCase() === lower) return value;
  }
  for (const [key, value] of Object.entries(TEAM_NAME_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }
  return trimmed.replace(/\s+/g, '').toLowerCase();
}

function standardizeRole(playingRoles) {
  if (!playingRoles || !playingRoles.length) return 'All-rounder';
  const role = playingRoles[0].toLowerCase();
  if (role.includes('wicketkeeper') || role.includes('keeper')) return 'Wicket-keeper';
  if (role.includes('allrounder') || role.includes('all-rounder')) return 'All-rounder';
  if (role.includes('batter') || role.includes('bat') || role.includes('opener') || role.includes('order')) return 'Batsman';
  if (role.includes('bowler') || role.includes('bowl')) return 'Bowler';
  return 'All-rounder';
}

async function fetchPage(url, headers = {}) {
  console.log(`[CricketDataService] Fetching: ${url}`);
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.5', ...headers },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  return resp.text();
}

// ─── Helpers ────────────────────────────────────────────────

function extractNextData(html) {
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  return JSON.parse(match[1]);
}

// ─── SQUADS: ESPNcricinfo ───────────────────────────────────

async function fetchSquadIndex() {
  const url = `${ESPN_CONFIG.baseUrl}/series/${ESPN_CONFIG.seriesSlug}/squads`;
  const html = await fetchPage(url, { 'Accept': 'text/html' });
  const data = extractNextData(html);
  if (!data) throw new Error('Could not extract __NEXT_DATA__ from ESPN squads page');

  const appData = data.props?.appPageProps?.data;
  if (!appData?.content?.squads) throw new Error('No squads data in ESPN response');

  const seriesObjId = appData.series?.objectId;
  return appData.content.squads.map(s => ({
    teamName: ESPN_SHORT_TO_FULL[s.squad.teamName] || s.squad.teamName,
    teamShort: s.squad.teamName,
    squadUrl: `/series/${s.squad.seriesSlug}-${seriesObjId}/${s.squad.teamSlug}-squad-${s.squad.objectId}/series-squads`,
  }));
}

async function fetchTeamSquadFromEspn(squadUrl) {
  const url = `${ESPN_CONFIG.baseUrl}${squadUrl}`;
  const html = await fetchPage(url, { 'Accept': 'text/html' });
  const data = extractNextData(html);
  if (!data) return null;

  const sd = data.props?.appPageProps?.data?.content?.squadDetails;
  if (!sd?.players) return null;

  const teamName = sd.squad?.title?.replace(/\s*Squad.*$/i, '') ||
    ESPN_SHORT_TO_FULL[sd.squad?.teamName] || sd.squad?.teamName;

  const players = sd.players.map(p => ({
    name: p.player.longName || p.player.name,
    role: standardizeRole(p.player.playingRoles),
    age: '',
    isOverseas: p.isOverseas || false,
    isCaptain: p.playerRoleType === 'C' || p.playerRoleType === 'CWK',
    playingRoles: p.player.playingRoles || [],
    battingStyle: p.player.longBattingStyles?.[0] || '',
    bowlingStyle: p.player.longBowlingStyles?.[0] || '',
  }));

  return { team: teamName, squad: players };
}

/**
 * Fetch all IPL team squads from ESPNcricinfo.
 */
export async function fetchTeamSquads() {
  console.log('[CricketDataService] Fetching team squads from ESPNcricinfo');
  const teamIndex = await fetchSquadIndex();
  console.log(`[CricketDataService] Found ${teamIndex.length} teams`);

  const teams = [];
  for (const entry of teamIndex) {
    try {
      const teamData = await fetchTeamSquadFromEspn(entry.squadUrl);
      if (teamData && teamData.squad.length > 0) {
        teams.push(teamData);
        console.log(`[CricketDataService] ${teamData.team}: ${teamData.squad.length} players`);
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[CricketDataService] Error fetching ${entry.teamName}:`, err.message);
    }
  }

  console.log(`[CricketDataService] Successfully fetched ${teams.length} teams`);
  return teams;
}

// ─── SQUADS: iplt20.com (official IPL website) ──────────────

const IPL_TEAM_SLUGS = [
  'chennai-super-kings', 'delhi-capitals', 'gujarat-titans',
  'kolkata-knight-riders', 'lucknow-super-giants', 'mumbai-indians',
  'punjab-kings', 'rajasthan-royals', 'royal-challengers-bengaluru',
  'sunrisers-hyderabad',
];

function parseIplt20Squad(html) {
  const playerRegex = /data-player_name="([^"]+)"[\s\S]*?<\/li>/g;
  const players = [];
  let m;
  while ((m = playerRegex.exec(html)) !== null) {
    const block = m[0];
    const name = m[1];
    const roleMatch = block.match(/text-center">([^<]+)<\/span>/);
    const role = roleMatch ? roleMatch[1].trim() : 'Unknown';
    const isCaptain = block.includes('captain-icon');
    const isOverseas = block.includes('foreign-player-icon');
    players.push({ name, role: standardizeRole([role]), isCaptain, isOverseas, age: '' });
  }
  return players;
}

function parseIplt20TeamName(html) {
  const m = html.match(/data-team_name="([^"]+)"/);
  if (m) return m[1];
  const m2 = html.match(/og:title[^>]*content="([^|"]+)/);
  if (m2) return m2[1].trim();
  return null;
}

/**
 * Fetch all IPL team squads from the official iplt20.com website.
 */
export async function fetchTeamSquadsFromIplt20() {
  console.log('[CricketDataService] Fetching team squads from iplt20.com');
  const teams = [];

  for (const slug of IPL_TEAM_SLUGS) {
    try {
      const url = `${IPLT20_CONFIG.siteBase}/teams/${slug}/squad`;
      const html = await fetchPage(url, { 'Accept': 'text/html' });
      const teamName = parseIplt20TeamName(html) || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const players = parseIplt20Squad(html);

      if (players.length > 0) {
        teams.push({ team: teamName, squad: players });
        console.log(`[CricketDataService] ${teamName}: ${players.length} players (iplt20.com)`);
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`[CricketDataService] Error fetching ${slug} from iplt20.com:`, err.message);
    }
  }

  console.log(`[CricketDataService] Successfully fetched ${teams.length} teams from iplt20.com`);
  return teams;
}

// ─── MATCH SCHEDULE: iplt20.com official feeds ──────────────

/**
 * Parse JSONP response: strips callback wrapper and returns parsed JSON.
 */
function parseJsonp(text) {
  const m = text.match(/^\w+\(([\s\S]*)\);?\s*$/);
  if (m) return JSON.parse(m[1]);
  return JSON.parse(text);
}

/**
 * Fetch list of IPL matches from iplt20.com official feeds.
 */
export async function fetchMatchList() {
  const url = `${IPLT20_CONFIG.feedBase}/${IPLT20_CONFIG.competitionId}-matchschedule.js`;
  console.log('[CricketDataService] Fetching match schedule from iplt20.com');

  const text = await fetchPage(url);
  const data = parseJsonp(text);
  const rawMatches = data.Matchsummary || [];

  console.log(`[CricketDataService] Found ${rawMatches.length} matches from iplt20.com`);

  return rawMatches.map(m => {
    const team1Name = m.FirstBattingTeamName || m.HomeTeamName || '';
    const team2Name = m.SecondBattingTeamName || m.AwayTeamName || '';

    const stateMap = { 'Post': 'complete', 'Live': 'live', 'UpComing': 'upcoming' };
    const state = stateMap[m.MatchStatus] || m.MatchStatus?.toLowerCase() || 'upcoming';

    let status = m.Comments || '';
    if (!status && state === 'upcoming') {
      status = `Match starts at ${m.GMTMatchTime || m.MatchTime}`;
    }

    return {
      iplMatchId: String(m.MatchID),
      cricbuzzMatchId: String(m.MatchID),
      matchDesc: m.MatchName || `${m.FirstBattingTeamCode} vs ${m.SecondBattingTeamCode}`,
      matchFormat: 'T20',
      matchOrder: m.MatchOrder || m.MatchRow || null,
      startDate: new Date(m.GMTMatchDate + 'T' + (m.GMTMatchTime?.replace(' GMT', ':00Z') || '14:00:00Z')),
      endDate: m.GMTMatchEndDate
        ? new Date(m.GMTMatchEndDate + 'T' + (m.GMTMatchEndTime?.replace(' GMT', ':00Z') || '18:00:00Z'))
        : null,
      state,
      status,
      team1: team1Name.trim(),
      team1Short: m.FirstBattingTeamCode || '',
      team1Id: resolveTeamId(team1Name.trim()),
      team2: team2Name.trim(),
      team2Short: m.SecondBattingTeamCode || '',
      team2Id: resolveTeamId(team2Name.trim()),
      venue: m.GroundName ? `${m.GroundName}${m.city ? ', ' + m.city : ''}` : '',
      winnerTeamId: m.WinningTeamID ? resolveTeamId(
        m.WinningTeamID === m.FirstBattingTeamID ? team1Name : team2Name
      ) : null,
      _raw: {
        MatchID: m.MatchID,
        CompetitionID: m.CompetitionID,
        HomeTeamID: m.HomeTeamID,
        AwayTeamID: m.AwayTeamID,
        MOM: m.MOM,
        MOMPlayerId: m.MOMPlayerId,
        MatchOrder: m.MatchOrder,
      },
    };
  });
}

// ─── MATCH RESULTS & SCORECARDS: ESPNcricinfo ───────────────

let espnMatchCache = null;
let espnMatchCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getEspnMatches() {
  if (espnMatchCache && Date.now() - espnMatchCacheTime < CACHE_TTL) {
    return espnMatchCache;
  }
  const url = `${ESPN_CONFIG.baseUrl}/series/${ESPN_CONFIG.seriesSlug}/match-results`;
  const html = await fetchPage(url, { 'Accept': 'text/html' });
  const data = extractNextData(html);
  if (!data) throw new Error('Could not extract ESPN match data');

  espnMatchCache = data.props?.appPageProps?.data?.content?.matches || [];
  espnMatchCacheTime = Date.now();
  console.log(`[CricketDataService] Cached ${espnMatchCache.length} ESPN matches`);
  return espnMatchCache;
}

function findEspnMatch(espnMatches, team1Name, team2Name, matchOrder = null, matchDate = null) {
  const reqT1 = resolveTeamId(team1Name);
  const reqT2 = resolveTeamId(team2Name);
  
  // First try: match by team names AND match order (most accurate)
  if (matchOrder) {
    for (const em of espnMatches) {
      if (!em.teams || em.teams.length < 2) continue;
      const tid1 = resolveTeamId(em.teams[0].team.longName);
      const tid2 = resolveTeamId(em.teams[1].team.longName);
      const teamsMatch = (tid1 === reqT1 && tid2 === reqT2) || (tid1 === reqT2 && tid2 === reqT1);
      
      // Check if the slug contains the match number
      if (teamsMatch && em.slug) {
        const orderMatch = em.slug.match(/(\d+)(?:st|nd|rd|th)-match/);
        if (orderMatch && parseInt(orderMatch[1]) === parseInt(matchOrder)) {
          console.log(`[CricketDataService] Found ESPN match by order: ${em.slug}`);
          return em;
        }
      }
    }
  }
  
  // Second try: match by team names AND closest date
  if (matchDate) {
    const targetDate = new Date(matchDate);
    let bestMatch = null;
    let bestDiff = Infinity;
    
    for (const em of espnMatches) {
      if (!em.teams || em.teams.length < 2) continue;
      const tid1 = resolveTeamId(em.teams[0].team.longName);
      const tid2 = resolveTeamId(em.teams[1].team.longName);
      const teamsMatch = (tid1 === reqT1 && tid2 === reqT2) || (tid1 === reqT2 && tid2 === reqT1);
      
      if (teamsMatch && em.startDate) {
        const espnDate = new Date(em.startDate);
        const diff = Math.abs(espnDate - targetDate);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = em;
        }
      }
    }
    
    // Only use if date is within 2 days
    if (bestMatch && bestDiff < 2 * 24 * 60 * 60 * 1000) {
      console.log(`[CricketDataService] Found ESPN match by date: ${bestMatch.slug} (diff: ${Math.round(bestDiff / 1000 / 60)} min)`);
      return bestMatch;
    }
  }
  
  // Fallback: first match of these teams (might be wrong if they play multiple times)
  for (const em of espnMatches) {
    if (!em.teams || em.teams.length < 2) continue;
    const tid1 = resolveTeamId(em.teams[0].team.longName);
    const tid2 = resolveTeamId(em.teams[1].team.longName);
    if ((tid1 === reqT1 && tid2 === reqT2) || (tid1 === reqT2 && tid2 === reqT1)) {
      console.log(`[CricketDataService] Found ESPN match by teams only (fallback): ${em.slug}`);
      return em;
    }
  }
  return null;
}

/**
 * Fetch match scorecard from ESPNcricinfo.
 * @param {string} matchId — The IPL match ID
 * @param {string} [team1] — team1 name for matching
 * @param {string} [team2] — team2 name for matching
 * @param {number} [matchOrder] — match number in the series (e.g., 12 for "12th match")
 * @param {string} [matchDate] — ISO date string for the match
 */
export async function fetchMatchScorecard(matchId, team1, team2, matchOrder = null, matchDate = null) {
  console.log(`[CricketDataService] Fetching scorecard for match ${matchId} from ESPNcricinfo (order: ${matchOrder}, date: ${matchDate})`);

  const espnMatches = await getEspnMatches();
  let espnMatch = null;

  if (team1 && team2) {
    espnMatch = findEspnMatch(espnMatches, team1, team2, matchOrder, matchDate);
  }
  if (!espnMatch) {
    for (const em of espnMatches) {
      if (em.title === matchId || String(em.id) === String(matchId) || String(em.objectId) === String(matchId)) {
        espnMatch = em;
        break;
      }
    }
  }

  if (!espnMatch) {
    console.log(`[CricketDataService] Could not find ESPN match for ID ${matchId}`);
    return { matchCompleted: false, error: 'Match not found on ESPNcricinfo' };
  }
  
  console.log(`[CricketDataService] Using ESPN match: ${espnMatch.slug}-${espnMatch.objectId}`);

  if (espnMatch.state !== 'POST' && espnMatch.stage !== 'FINISHED') {
    console.log(`[CricketDataService] Match not completed yet (state: ${espnMatch.state})`);
    return { matchCompleted: false, state: espnMatch.state };
  }

  const scUrl = `${ESPN_CONFIG.baseUrl}/series/${ESPN_CONFIG.seriesSlug}/${espnMatch.slug}-${espnMatch.objectId}/full-scorecard`;
  const html = await fetchPage(scUrl, { 'Accept': 'text/html' });
  const data = extractNextData(html);

  if (!data) return { matchCompleted: false, error: 'Could not parse ESPN scorecard page' };

  const match = data.props?.appPageProps?.data?.match;
  const content = data.props?.appPageProps?.data?.content;

  if (!match || !content?.innings) return { matchCompleted: false, error: 'No scorecard data' };

  return parseEspnScorecard(match, content);
}

function parseEspnScorecard(match, content) {
  const result = {
    matchCompleted: match.state === 'POST' || match.stage === 'FINISHED',
    winner: null,
    winnerTeamId: null,
    status: match.statusText || '',
    team1: null,
    team1Id: null,
    team1Score: null,
    team2: null,
    team2Id: null,
    team2Score: null,
    topBatsman: null,
    topBatsmanRuns: 0,
    topBowler: null,
    topBowlerWickets: 0,
    totalSixes: 0,
    team1Sixes: 0,
    team2Sixes: 0,
    moreSixes: null,
    moreSixesTeamId: null,
    highestTotal: null,
    highestTotalTeamId: null,
    playerOfMatch: null,
  };

  // Winner
  if (match.winnerTeamId && match.teams) {
    const winnerTeam = match.teams.find(t => t.team.id === match.winnerTeamId);
    if (winnerTeam) {
      result.winner = winnerTeam.team.longName;
      result.winnerTeamId = resolveTeamId(winnerTeam.team.longName);
    }
  }

  // Player of the Match
  if (content.matchPlayerAwards) {
    const mom = content.matchPlayerAwards.find(a =>
      a.name === 'PLAYER_OF_MATCH' || a.type === 'PLAYER_OF_MATCH');
    if (mom?.player) {
      result.playerOfMatch = mom.player.longName || mom.player.name;
    }
  }

  // Innings data
  const teamData = {};
  let topBowlerEco = Infinity;

  for (const inn of content.innings) {
    if (!inn.team) continue;
    const teamName = inn.team.longName;
    const teamId = resolveTeamId(teamName);
    const score = `${inn.runs}/${inn.wickets}`;

    if (!teamData[teamId]) {
      teamData[teamId] = { name: teamName, score, runs: inn.runs, sixes: 0 };
    }
    teamData[teamId].sixes += inn.sixes || 0;

    if (inn.inningBatsmen) {
      for (const bat of inn.inningBatsmen) {
        if (bat.runs != null && bat.runs > result.topBatsmanRuns) {
          result.topBatsmanRuns = bat.runs;
          result.topBatsman = bat.player?.longName || bat.player?.name;
        }
      }
    }

    if (inn.inningBowlers) {
      for (const bowl of inn.inningBowlers) {
        if (bowl.wickets != null &&
            (bowl.wickets > result.topBowlerWickets ||
             (bowl.wickets === result.topBowlerWickets && (bowl.economy || Infinity) < topBowlerEco))) {
          result.topBowlerWickets = bowl.wickets;
          topBowlerEco = bowl.economy || Infinity;
          result.topBowler = bowl.player?.longName || bowl.player?.name;
        }
      }
    }
  }

  const teamIds = Object.keys(teamData);
  if (teamIds.length >= 2) {
    result.team1 = teamData[teamIds[0]].name;
    result.team1Id = teamIds[0];
    result.team1Score = teamData[teamIds[0]].score;
    result.team2 = teamData[teamIds[1]].name;
    result.team2Id = teamIds[1];
    result.team2Score = teamData[teamIds[1]].score;

    if (teamData[teamIds[0]].runs >= teamData[teamIds[1]].runs) {
      result.highestTotal = result.team1Score;
      result.highestTotalTeamId = result.team1Id;
    } else {
      result.highestTotal = result.team2Score;
      result.highestTotalTeamId = result.team2Id;
    }
  }

  result.team1Sixes = teamData[result.team1Id]?.sixes || 0;
  result.team2Sixes = teamData[result.team2Id]?.sixes || 0;
  result.totalSixes = result.team1Sixes + result.team2Sixes;

  if (result.team1Sixes > result.team2Sixes) {
    result.moreSixes = result.team1;
    result.moreSixesTeamId = result.team1Id;
  } else if (result.team2Sixes > result.team1Sixes) {
    result.moreSixes = result.team2;
    result.moreSixesTeamId = result.team2Id;
  }

  return result;
}

/**
 * Fetch match summary (alias — ESPN always returns full scorecard data).
 */
export async function fetchMatchSummary(matchId, team1, team2) {
  return fetchMatchScorecard(matchId, team1, team2);
}

// ─── Exports ────────────────────────────────────────────────

export {
  resolveTeamId,
  standardizeRole,
  TEAM_NAME_MAP,
  TEAM_ID_TO_NAME,
  CRICBUZZ_CONFIG,
  IPLT20_CONFIG,
  ESPN_CONFIG,
  IPL_TEAM_SLUGS,
};
