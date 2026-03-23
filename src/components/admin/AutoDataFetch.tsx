import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Play,
  Square,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Globe,
  Users,
  Trophy,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getMatches } from '@/lib/firestore';
import { uploadTeamData, uploadMultipleTeams } from '@/utils/firestore-teams';
import {
  updateMatchWithResults,
  evaluateMatchPredictions,
  COLLECTIONS,
} from '@/utils/firestore-collections';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';

// Server API base URL — in dev it's the Vite proxy, in prod it's relative
const API_BASE = '/api';

interface SchedulerStatus {
  enabled: boolean;
  intervalMs: number;
  lastRun: string | null;
  lastRunStatus: string | null;
  pendingMatchCount: number;
  processedMatchCount: number;
  logs: LogEntry[];
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: string;
}

interface CricbuzzMatch {
  cricbuzzMatchId: string;
  team1: string;
  team2: string;
  team1Id: string;
  team2Id: string;
  title: string;
}

interface FetchedTeam {
  team: string;
  squad: { name: string; role: string; age: string }[];
}

interface MatchResult {
  matchCompleted: boolean;
  winner: string | null;
  winnerTeamId: string | null;
  team1: string | null;
  team1Id: string | null;
  team1Score: string | null;
  team2: string | null;
  team2Id: string | null;
  team2Score: string | null;
  topBatsman: string | null;
  topBatsmanRuns: number;
  topBowler: string | null;
  topBowlerWickets: number;
  totalSixes: number;
  moreSixes: string | null;
  moreSixesTeamId: string | null;
}

export default function AutoDataFetch() {
  const { toast } = useToast();

  // === State ===
  const [activeSection, setActiveSection] = useState<'teams' | 'results' | 'scheduler'>('teams');

  // Teams
  const [fetchingTeams, setFetchingTeams] = useState(false);
  const [fetchedTeams, setFetchedTeams] = useState<FetchedTeam[]>([]);
  const [uploadingTeams, setUploadingTeams] = useState(false);

  // Match Results
  const [cricbuzzMatches, setCricbuzzMatches] = useState<CricbuzzMatch[]>([]);
  const [fetchingMatches, setFetchingMatches] = useState(false);
  const [selectedCricbuzzMatch, setSelectedCricbuzzMatch] = useState('');
  const [fetchingScorecard, setFetchingScorecard] = useState(false);
  const [fetchedResult, setFetchedResult] = useState<MatchResult | null>(null);
  const [firestoreMatches, setFirestoreMatches] = useState<any[]>([]);
  const [selectedFirestoreMatch, setSelectedFirestoreMatch] = useState('');
  const [applyingResult, setApplyingResult] = useState(false);
  const [cricbuzzMatchIdInput, setCricbuzzMatchIdInput] = useState('');

  // Scheduler
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [schedulerInterval, setSchedulerInterval] = useState('5');
  const [loadingScheduler, setLoadingScheduler] = useState(false);

  // Config
  const [seriesId, setSeriesId] = useState('');

  // === Load Firestore matches ===
  useEffect(() => {
    (async () => {
      try {
        const matches = await getMatches();
        setFirestoreMatches(matches);
      } catch (err) {
        console.error('Failed to load Firestore matches:', err);
      }
    })();
  }, []);

  // === Load scheduler status on mount ===
  useEffect(() => {
    fetchSchedulerStatus();
    fetchConfig();
  }, []);

  // === API Helpers ===
  async function apiGet(path: string) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async function apiPost(path: string, body?: object) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // === Config ===
  async function fetchConfig() {
    try {
      const data = await apiGet('/cricket/config');
      setSeriesId(data.seriesId || '');
    } catch { /* ignore */ }
  }

  async function updateSeriesId() {
    try {
      await apiPost('/cricket/config', { seriesId });
      toast({ title: 'Config Updated', description: `Competition ID set to ${seriesId}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  // === Team Fetching ===
  const [teamSource, setTeamSource] = useState<'espn' | 'ipl' | null>(null);

  async function handleFetchTeams(source: 'espn' | 'ipl') {
    setFetchingTeams(true);
    setTeamSource(source);
    const endpoint = source === 'ipl' ? '/cricket/teams/ipl' : '/cricket/teams';
    const label = source === 'ipl' ? 'iplt20.com' : 'ESPNcricinfo';
    try {
      const data = await apiGet(endpoint);
      if (data.success && data.teams) {
        setFetchedTeams(data.teams);
        toast({
          title: 'Teams Fetched',
          description: `Found ${data.teams.length} teams from ${label}`,
        });
      } else {
        toast({ title: 'No Teams Found', description: `Could not parse team data from ${label}`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Fetch Failed', description: err.message, variant: 'destructive' });
    } finally {
      setFetchingTeams(false);
    }
  }

  async function handleUploadTeams() {
    if (fetchedTeams.length === 0) return;
    setUploadingTeams(true);
    try {
      await uploadMultipleTeams(fetchedTeams);
      toast({
        title: 'Teams Uploaded',
        description: `${fetchedTeams.length} teams saved to Firestore`,
      });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingTeams(false);
    }
  }

  // === Match List Fetching ===
  async function handleFetchCricbuzzMatches() {
    setFetchingMatches(true);
    try {
      const data = await apiGet('/cricket/matches');
      if (data.success && data.matches) {
        setCricbuzzMatches(data.matches);
        toast({
          title: 'Matches Fetched',
          description: `Found ${data.matches.length} matches from iplt20.com`,
        });
      }
    } catch (err: any) {
      toast({ title: 'Fetch Failed', description: err.message, variant: 'destructive' });
    } finally {
      setFetchingMatches(false);
    }
  }

  // === Scorecard Fetching ===
  async function handleFetchScorecard() {
    const matchId = selectedCricbuzzMatch || cricbuzzMatchIdInput;
    if (!matchId) {
      toast({ title: 'No Match Selected', description: 'Select or enter a match ID', variant: 'destructive' });
      return;
    }
    // Find team names for the selected match to help ESPN matching
    const selectedMatch = cricbuzzMatches.find(m => m.cricbuzzMatchId === matchId);
    const params = new URLSearchParams();
    if (selectedMatch?.team1) params.set('team1', selectedMatch.team1);
    if (selectedMatch?.team2) params.set('team2', selectedMatch.team2);
    const qs = params.toString() ? `?${params.toString()}` : '';
    setFetchingScorecard(true);
    try {
      const data = await apiGet(`/cricket/scorecard/${matchId}${qs}`);
      if (data.success && data.result) {
        setFetchedResult(data.result);
        toast({
          title: data.result.matchCompleted ? 'Match Completed' : 'Match In Progress',
          description: data.result.matchCompleted
            ? `Winner: ${data.result.winner || 'Unknown'}`
            : 'Match is still in progress',
        });
      }
    } catch (err: any) {
      toast({ title: 'Fetch Failed', description: err.message, variant: 'destructive' });
    } finally {
      setFetchingScorecard(false);
    }
  }

  // === Apply Result to Firestore ===
  async function handleApplyResult() {
    if (!fetchedResult || !selectedFirestoreMatch) {
      toast({ title: 'Missing Data', description: 'Fetch a scorecard and select a Firestore match first', variant: 'destructive' });
      return;
    }

    if (!fetchedResult.matchCompleted) {
      toast({ title: 'Match Not Completed', description: 'The match is still in progress', variant: 'destructive' });
      return;
    }

    setApplyingResult(true);
    try {
      const matchId = selectedFirestoreMatch;

      // Build the predictionResults object for evaluation
      const predictionResults: Record<string, string> = {};
      if (fetchedResult.winnerTeamId) predictionResults['winner'] = fetchedResult.winnerTeamId;
      if (fetchedResult.topBatsman) predictionResults['topBatsman'] = fetchedResult.topBatsman;
      if (fetchedResult.topBowler) predictionResults['topBowler'] = fetchedResult.topBowler;
      if (fetchedResult.moreSixesTeamId) predictionResults['moreSixes'] = fetchedResult.moreSixesTeamId;
      if (fetchedResult.totalSixes) predictionResults['totalSixes'] = fetchedResult.totalSixes.toString();

      // Determine if total exceeds 350
      if (fetchedResult.team1Score && fetchedResult.team2Score) {
        const team1Runs = parseInt(fetchedResult.team1Score.split('/')[0]) || 0;
        const team2Runs = parseInt(fetchedResult.team2Score.split('/')[0]) || 0;
        predictionResults['highestTotal'] = (team1Runs + team2Runs > 350) ? 'yes' : 'no';
      }

      // 1. Update match status to completed
      const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
      await updateDoc(matchRef, {
        status: 'completed',
        result: {
          winner: fetchedResult.winnerTeamId || fetchedResult.winner,
          team1Score: fetchedResult.team1Score || '',
          team2Score: fetchedResult.team2Score || '',
        },
        updatedAt: serverTimestamp(),
      });

      // 2. Save match result for evaluation
      const resultRef = doc(collection(db, COLLECTIONS.MATCH_RESULTS));
      await setDoc(resultRef, {
        id: resultRef.id,
        matchId,
        winner: fetchedResult.winnerTeamId || fetchedResult.winner,
        team1Score: fetchedResult.team1Score || '',
        team2Score: fetchedResult.team2Score || '',
        topBatsmanId: fetchedResult.topBatsman || '',
        topBowlerId: fetchedResult.topBowler || '',
        moreSixes: fetchedResult.moreSixesTeamId || '',
        totalSixes: fetchedResult.totalSixes || 0,
        predictionResults,
        isEvaluated: false,
        source: 'auto-fetch',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3. Evaluate predictions
      await evaluateMatchPredictions(matchId);

      toast({
        title: 'Result Applied & Evaluated',
        description: `Match result saved and predictions evaluated for match ${matchId}`,
      });

      setFetchedResult(null);
      setSelectedFirestoreMatch('');
    } catch (err: any) {
      toast({ title: 'Apply Failed', description: err.message, variant: 'destructive' });
    } finally {
      setApplyingResult(false);
    }
  }

  // === Scheduler ===
  async function fetchSchedulerStatus() {
    try {
      const data = await apiGet('/scheduler/status');
      setSchedulerStatus(data);
    } catch { /* ignore */ }
  }

  async function handleStartScheduler() {
    setLoadingScheduler(true);
    try {
      const intervalMs = parseInt(schedulerInterval) * 60 * 1000;
      await apiPost('/scheduler/start', { intervalMs });

      // Register current live/upcoming matches
      const liveMatches = firestoreMatches
        .filter(m => m.status === 'live' || m.status === 'upcoming')
        .map(m => ({
          firestoreMatchId: m.id,
          team1: m.team1 || m.team1Id,
          team2: m.team2 || m.team2Id,
          date: m.date,
          status: m.status,
        }));
      if (liveMatches.length > 0) {
        await apiPost('/scheduler/register-matches', { matches: liveMatches });
      }

      await fetchSchedulerStatus();
      toast({ title: 'Scheduler Started', description: `Checking every ${schedulerInterval} minutes` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingScheduler(false);
    }
  }

  async function handleStopScheduler() {
    setLoadingScheduler(true);
    try {
      await apiPost('/scheduler/stop');
      await fetchSchedulerStatus();
      toast({ title: 'Scheduler Stopped' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingScheduler(false);
    }
  }

  async function handleManualTrigger() {
    setLoadingScheduler(true);
    try {
      const result = await apiPost('/scheduler/trigger');
      await fetchSchedulerStatus();
      if (result.results && result.results.length > 0) {
        toast({
          title: 'Results Found!',
          description: `${result.results.length} completed match(es) detected. Review in the Results tab.`,
        });
      } else {
        toast({ title: 'Check Complete', description: 'No new completed matches found' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingScheduler(false);
    }
  }

  // === Render ===
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Auto Data Fetch (IPL Official + ESPN)
          </CardTitle>
          <CardDescription>
            Automatically fetch team squads from ESPNcricinfo and match schedule from iplt20.com. Match results from ESPNcricinfo. Results can be reviewed before applying.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Section Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeSection === 'teams' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('teams')}
            >
              <Users className="h-4 w-4 mr-1" /> Teams & Squads
            </Button>
            <Button
              variant={activeSection === 'results' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('results')}
            >
              <Trophy className="h-4 w-4 mr-1" /> Match Results
            </Button>
            <Button
              variant={activeSection === 'scheduler' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSection('scheduler')}
            >
              <Clock className="h-4 w-4 mr-1" /> Auto Scheduler
            </Button>
          </div>

          {/* Config Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="seriesId" className="text-xs text-gray-500">
                  IPL Competition ID (IPL 2026 = 284)
                </Label>
                <Input
                  id="seriesId"
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  placeholder="e.g., 284"
                  className="mt-1"
                />
              </div>
              <Button variant="outline" size="sm" onClick={updateSeriesId}>
                <Settings className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>

          {/* === Teams Section === */}
          {activeSection === 'teams' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <Button onClick={() => handleFetchTeams('ipl')} disabled={fetchingTeams} variant="default">
                  {fetchingTeams && teamSource === 'ipl' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Fetch Teams from iplt20.com
                </Button>
                <Button onClick={() => handleFetchTeams('espn')} disabled={fetchingTeams} variant="outline">
                  {fetchingTeams && teamSource === 'espn' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Fetch Teams from ESPNcricinfo
                </Button>
                {fetchedTeams.length > 0 && (
                  <Button onClick={handleUploadTeams} disabled={uploadingTeams} variant="outline">
                    {uploadingTeams ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Upload {fetchedTeams.length} Teams to Firestore
                  </Button>
                )}
              </div>

              {fetchedTeams.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {fetchedTeams.map((team, idx) => (
                    <Card key={idx} className="border">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">{team.team}</CardTitle>
                        <CardDescription className="text-xs">
                          {team.squad.length} players
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="flex flex-wrap gap-1">
                          {team.squad.slice(0, 8).map((player, pIdx) => (
                            <Badge key={pIdx} variant="secondary" className="text-xs">
                              {player.name}
                            </Badge>
                          ))}
                          {team.squad.length > 8 && (
                            <Badge variant="outline" className="text-xs">
                              +{team.squad.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === Match Results Section === */}
          {activeSection === 'results' && (
            <div className="space-y-4">
              {/* Step 1: Fetch Cricbuzz matches or enter ID directly */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Step 1: Get IPL Match</h3>
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={handleFetchCricbuzzMatches} disabled={fetchingMatches} variant="outline" size="sm">
                    {fetchingMatches ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    Load Match List from iplt20.com
                  </Button>
                </div>

                <div className="flex gap-3 items-end">
                  {cricbuzzMatches.length > 0 && (
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Select from list</Label>
                      <Select value={selectedCricbuzzMatch} onValueChange={setSelectedCricbuzzMatch}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a match..." />
                        </SelectTrigger>
                        <SelectContent>
                          {cricbuzzMatches.map((m) => (
                            <SelectItem key={m.cricbuzzMatchId} value={m.cricbuzzMatchId}>
                              {m.title} (#{m.cricbuzzMatchId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">Or enter match ID directly</Label>
                    <Input
                      value={cricbuzzMatchIdInput}
                      onChange={(e) => setCricbuzzMatchIdInput(e.target.value)}
                      placeholder="e.g., 89345"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Fetch scorecard */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Step 2: Fetch Match Result</h3>
                <Button
                  onClick={handleFetchScorecard}
                  disabled={fetchingScorecard || (!selectedCricbuzzMatch && !cricbuzzMatchIdInput)}
                  size="sm"
                >
                  {fetchingScorecard ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                  Fetch Scorecard
                </Button>
              </div>

              {/* Display fetched result */}
              {fetchedResult && (
                <Card className={`border-2 ${fetchedResult.matchCompleted ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {fetchedResult.matchCompleted ? (
                        <><CheckCircle className="h-4 w-4 text-green-600" /> Match Completed</>
                      ) : (
                        <><Clock className="h-4 w-4 text-yellow-600" /> Match In Progress</>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 space-y-2 text-sm">
                    {fetchedResult.winner && (
                      <div><strong>Winner:</strong> {fetchedResult.winner} ({fetchedResult.winnerTeamId})</div>
                    )}
                    {fetchedResult.team1Score && (
                      <div><strong>{fetchedResult.team1}:</strong> {fetchedResult.team1Score}</div>
                    )}
                    {fetchedResult.team2Score && (
                      <div><strong>{fetchedResult.team2}:</strong> {fetchedResult.team2Score}</div>
                    )}
                    {fetchedResult.topBatsman && (
                      <div><strong>Top Batsman:</strong> {fetchedResult.topBatsman} ({fetchedResult.topBatsmanRuns} runs)</div>
                    )}
                    {fetchedResult.topBowler && (
                      <div><strong>Top Bowler:</strong> {fetchedResult.topBowler} ({fetchedResult.topBowlerWickets} wickets)</div>
                    )}
                    {fetchedResult.totalSixes > 0 && (
                      <div><strong>Total Sixes:</strong> {fetchedResult.totalSixes}</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Apply to Firestore match */}
              {fetchedResult && fetchedResult.matchCompleted && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Step 3: Apply to Firestore Match</h3>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">Select Firestore match to update</Label>
                      <Select value={selectedFirestoreMatch} onValueChange={setSelectedFirestoreMatch}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose match..." />
                        </SelectTrigger>
                        <SelectContent>
                          {firestoreMatches
                            .filter(m => m.status !== 'completed')
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.team1 || m.team1Id} vs {m.team2 || m.team2Id} — {m.id}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleApplyResult}
                      disabled={applyingResult || !selectedFirestoreMatch}
                    >
                      {applyingResult ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Apply Result & Evaluate
                    </Button>
                  </div>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Review Before Applying</AlertTitle>
                    <AlertDescription>
                      This will update the match status to &quot;completed&quot;, save the result, and automatically evaluate all user predictions. Make sure the data is correct.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          {/* === Scheduler Section === */}
          {activeSection === 'scheduler' && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Auto-Evaluation Scheduler</AlertTitle>
                <AlertDescription>
                  When enabled, the server will periodically check for completed matches and fetch results from ESPNcricinfo.
                  Results are stored for admin review before being applied to the database.
                </AlertDescription>
              </Alert>

              {/* Status */}
              {schedulerStatus && (
                <Card className="border">
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={schedulerStatus.enabled ? 'default' : 'secondary'}>
                        {schedulerStatus.enabled ? 'Running' : 'Stopped'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Interval: {schedulerStatus.intervalMs / 60000} min
                      </span>
                      {schedulerStatus.lastRun && (
                        <span className="text-xs text-gray-400">
                          Last run: {new Date(schedulerStatus.lastRun).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Pending: {schedulerStatus.pendingMatchCount} matches | Processed: {schedulerStatus.processedMatchCount} matches
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Controls */}
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <Label className="text-xs text-gray-500">Check interval (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={schedulerInterval}
                    onChange={(e) => setSchedulerInterval(e.target.value)}
                    className="w-24 mt-1"
                  />
                </div>
                <Button
                  onClick={handleStartScheduler}
                  disabled={loadingScheduler}
                  size="sm"
                >
                  {loadingScheduler ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                  Start Scheduler
                </Button>
                <Button
                  onClick={handleStopScheduler}
                  disabled={loadingScheduler}
                  variant="outline"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-1" /> Stop
                </Button>
                <Button
                  onClick={handleManualTrigger}
                  disabled={loadingScheduler}
                  variant="outline"
                  size="sm"
                >
                  <Zap className="h-4 w-4 mr-1" /> Check Now
                </Button>
                <Button
                  onClick={fetchSchedulerStatus}
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Refresh Status
                </Button>
              </div>

              {/* Logs */}
              {schedulerStatus && schedulerStatus.logs.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-sm mb-2">Recent Logs</h3>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
                    {schedulerStatus.logs.slice().reverse().map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'
                        }>
                          [{log.level}]
                        </span>
                        <span>{log.message}</span>
                        {log.data && <span className="text-gray-400">{log.data}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
