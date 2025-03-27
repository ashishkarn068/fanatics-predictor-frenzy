import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ChevronLeft, RefreshCw, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime, getTeamById, getMatchStatus } from "@/lib/utils";
import { Match, Team, Player, MatchResult } from "@/lib/types";
import MatchPredictions from "@/components/predictions/MatchPredictions";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { getMatch, seedInitialData, getSquad, seedQuestionsIfNeeded } from "@/utils/firestore-collections";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamLogoUrl } from "@/utils/team-utils";
import { forceRefreshQuestions } from '@/utils/refresh-questions';
import { useAuth } from "@/contexts/AuthContext";
import PredictionGame from "@/components/predictions/PredictionGame";
import { isUserAdmin } from "@/utils/admin-auth";

// Helper function to convert role string to proper Player role type
const convertToPlayerRole = (role: string): "Batsman" | "Bowler" | "All-rounder" | "Wicket-keeper" => {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole.includes('bowl')) return "Bowler";
  if (normalizedRole.includes('bat')) return "Batsman";
  if (normalizedRole.includes('all')) return "All-rounder";
  if (normalizedRole.includes('keeper') || normalizedRole.includes('wicket')) return "Wicket-keeper";
  return "Batsman"; // Default to batsman if role is unclear
};

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [squad1, setSquad1] = useState<Player[]>([]);
  const [squad2, setSquad2] = useState<Player[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchMatchAndPlayers = async () => {
      if (!id) {
        setError("Match ID not provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching match and players...");
        
        // Check if user is authenticated
        const isAuthenticated = currentUser !== null;
        console.log("Auth status:", isAuthenticated);
        
        // Seed initial data and questions if needed
        await seedInitialData();
        await seedQuestionsIfNeeded();
        
        // Try to fetch match data
        let matchData;
        try {
          console.log('Attempting to fetch match data for ID:', id);
          matchData = await getMatch(id);
          console.log('Received match data:', matchData);
        } catch (fetchError: any) {
          console.error('Error fetching match:', fetchError);
          
          // If permission denied, show auth error
          if (fetchError.code === 'permission-denied' || fetchError.message?.includes('permission')) {
            console.warn('Permission denied when fetching match.');
            setNeedsAuth(true);
            
            if (!isAuthenticated) {
              toast({
                title: "Authentication Required",
                description: "Please sign in to view match details.",
                variant: "destructive"
              });
            }
            throw fetchError;
          } else {
            throw fetchError;
          }
        }
        
        if (!matchData) {
          setError("Match not found");
          setLoading(false);
          return;
        }
        
        // Normalize team names to IDs (lowercase, no spaces)
        const team1Identifier = matchData.team1 || '';
        const team2Identifier = matchData.team2 || '';
        const team1SquadId = team1Identifier.toLowerCase().replace(/\s+/g, '');
        const team2SquadId = team2Identifier.toLowerCase().replace(/\s+/g, '');

        console.log('Team names from match data:', {
          team1Name: team1Identifier,
          team2Name: team2Identifier
        });
        
        // List of known outdated players to filter out
        const knownOutdatedPlayers = ['Shreyas Iyer'];

        // FIRST ATTEMPT: Try to load player data from teams collection
        let team1Players: Player[] = [];
        let team2Players: Player[] = [];
        let teamsLoaded = false;
        
        try {
          console.log('First attempting to fetch team data from "teams" collection');
          
          const teamsCollection = collection(db, "teams");
          const team1Ref = doc(teamsCollection, team1SquadId);
          const team2Ref = doc(teamsCollection, team2SquadId);
          
          // Fetch both teams in parallel
          const [team1Doc, team2Doc] = await Promise.all([
            getDoc(team1Ref),
            getDoc(team2Ref)
          ]);
          
          console.log('Teams collection check:', { 
            team1Exists: team1Doc.exists(), 
            team2Exists: team2Doc.exists() 
          });
          
          // Process team 1 squad if it exists
          if (team1Doc.exists()) {
            const teamData = team1Doc.data() as { 
              name: string; 
              squad?: Record<string, { name: string; role: string; age?: string }>
            };
            console.log(`Team 1 "${teamData.name}" found in teams collection`);
            
            if (teamData.squad && Object.keys(teamData.squad).length > 0) {
              team1Players = Object.values(teamData.squad)
                .filter(player => !knownOutdatedPlayers.includes(player.name))
                .map(player => ({
                  id: `${team1SquadId}-${player.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: player.name,
                  role: convertToPlayerRole(player.role),
                  teamId: team1Identifier,
                  image: ''
                }));
              
              console.log(`Loaded ${team1Players.length} players for ${team1Identifier} from teams collection`);
              teamsLoaded = true;
            } else {
              console.log(`Team 1 found but has no squad in teams collection`);
            }
          } else {
            console.log(`Team 1 with ID ${team1SquadId} not found in teams collection`);
          }
          
          // Process team 2 squad if it exists
          if (team2Doc.exists()) {
            const teamData = team2Doc.data() as { 
              name: string; 
              squad?: Record<string, { name: string; role: string; age?: string }>
            };
            console.log(`Team 2 "${teamData.name}" found in teams collection`);
            
            if (teamData.squad && Object.keys(teamData.squad).length > 0) {
              team2Players = Object.values(teamData.squad)
                .filter(player => !knownOutdatedPlayers.includes(player.name))
                .map(player => ({
                  id: `${team2SquadId}-${player.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: player.name,
                  role: convertToPlayerRole(player.role),
                  teamId: team2Identifier,
                  image: ''
                }));
              
              console.log(`Loaded ${team2Players.length} players for ${team2Identifier} from teams collection`);
              teamsLoaded = true;
            } else {
              console.log(`Team 2 found but has no squad in teams collection`);
            }
          } else {
            console.log(`Team 2 with ID ${team2SquadId} not found in teams collection`);
          }
        } catch (teamsError) {
          console.error('Error fetching from teams collection:', teamsError);
        }

        // FALLBACK: If teams collection didn't provide player data, use the squads collection
        if (!teamsLoaded || team1Players.length === 0 || team2Players.length === 0) {
          console.log('Falling back to squads collection...');
          
          try {
            let squad1Data, squad2Data;
            [squad1Data, squad2Data] = await Promise.all([
              getSquad(team1SquadId),
              getSquad(team2SquadId)
            ]);
  
            console.log('Squad 1 data:', squad1Data ? 'Found' : 'Not found');
            console.log('Squad 2 data:', squad2Data ? 'Found' : 'Not found');
            
            // Only process squad1 if we don't already have team1Players
            if (team1Players.length === 0 && squad1Data?.squad) {
              team1Players = squad1Data.squad
                .filter((player: any) => !knownOutdatedPlayers.includes(player.name))
                .map((player: any) => ({
                  id: `${team1SquadId}-${player.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: player.name,
                  role: convertToPlayerRole(player.role),
                  teamId: team1Identifier,
                  image: ''
                }));
              
              console.log(`Loaded ${team1Players.length} players for ${team1Identifier} from squads collection`);
            }
  
            // Only process squad2 if we don't already have team2Players
            if (team2Players.length === 0 && squad2Data?.squad) {
              team2Players = squad2Data.squad
                .filter((player: any) => !knownOutdatedPlayers.includes(player.name))
                .map((player: any) => ({
                  id: `${team2SquadId}-${player.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: player.name,
                  role: convertToPlayerRole(player.role),
                  teamId: team2Identifier,
                  image: ''
                }));
              
              console.log(`Loaded ${team2Players.length} players for ${team2Identifier} from squads collection`);
            }
          } catch (squadError) {
            console.error('Error fetching squad data:', squadError);
          }
        }

        console.log('Final player counts:', {
          team1Players: team1Players.length,
          team2Players: team2Players.length
        });

        // Create a compatible Match object from Firestore data
        const convertedMatch: Match = {
          id: matchData.id,
          team1Id: matchData.team1 || "Unknown Team",
          team2Id: matchData.team2 || "Unknown Team",
          venue: matchData.venue,
          date: typeof matchData.date === 'string' 
            ? matchData.date 
            : matchData.date instanceof Timestamp 
              ? matchData.date.toDate().toISOString() 
              : new Date().toISOString(),
          status: matchData.status || 'upcoming',
          result: matchData.result as MatchResult | null
        };

        // Update state with fetched data
        setMatch(convertedMatch);
        setSquad1(team1Players);
        setSquad2(team2Players);
        setPlayers([...team1Players, ...team2Players]);

      } catch (err) {
        console.error('Error fetching match data:', err);
        setError('Failed to load match data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchAndPlayers();
  }, [id, currentUser, toast]);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        try {
          const adminStatus = await isUserAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  // Handler for refreshing questions
  const handleRefreshQuestions = async () => {
    setIsRefreshing(true);
    try {
      await forceRefreshQuestions();
      toast({
        title: "Questions Refreshed",
        description: "The prediction questions have been refreshed successfully."
      });
      // Force reload of the page
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing questions:", error);
      toast({
        title: "Error",
        description: "Failed to refresh questions database",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-10 w-10" />
            <div className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !match) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Matches
          </Button>
          
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Error Loading Match</h3>
            <p>{error || "Failed to load match details"}</p>
          </div>
          
          {needsAuth && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-lg mt-4">
              <h3 className="font-medium mb-2">Authentication Required</h3>
              <p className="mb-4">Sign in to view match details and make predictions.</p>
              <Button 
                onClick={() => navigate('/signin')} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Format match date
  const formatMatchDate = () => {
    try {
      let matchDate: Date;
      
      if (typeof match.date === 'string') {
        matchDate = new Date(match.date);
      } else {
        // This should not happen as we've converted date to string
        // in the convertedMatch object, but adding as fallback
        return "Date not available";
      }
      
      return matchDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date not available";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Matches
        </Button>

        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
              <h1 className="text-2xl font-bold mb-1">{match.team1Id} vs {match.team2Id}</h1>
              <p className="text-gray-600">{match.venue || "Venue not specified"}</p>
              <p className="text-gray-600">{formatMatchDate()}</p>
            </div>
            
            <div>
              {match.status === 'live' ? (
                <Badge className="bg-red-500 animate-pulse-subtle">LIVE</Badge>
              ) : match.status === 'completed' ? (
                <Badge variant="outline" className="text-gray-500">Completed</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">{getMatchStatus(match)}</Badge>
              )}
            </div>
          </div>

          {/* Teams */}
          <div className="flex flex-col md:flex-row items-center justify-center mt-8 space-y-6 md:space-y-0">
            <div className="flex flex-col items-center text-center md:w-1/3">
              <div className="h-24 w-24 flex items-center justify-center">
                <img 
                  src={getTeamLogoUrl(match.team1Id)} 
                  alt={match.team1Id} 
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/images/teams/default.png";
                  }}
                />
              </div>
              <h2 className="text-xl font-bold" style={{ color: team1?.primaryColor }}>{match.team1Id}</h2>
            </div>

            <div className="flex flex-col items-center justify-center md:w-1/3">
              <div className="text-3xl font-bold mb-2">VS</div>
              {match.status === 'completed' && match.result && 'winner' in match.result && (
                <div className="flex flex-col items-center space-y-4 mt-8">
                  {/* Score Display with Trophy */}
                  <div className="relative w-full max-w-xl">
                    {/* Trophy Container - Positioned above scores */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                      <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
                    </div>
                    
                    {/* Score Container */}
                    <div className="flex items-center justify-between w-full bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-lg p-6 shadow-md">
                      {/* Team 1 Score */}
                      <div className={`text-2xl font-bold ${match.result.winner === match.team1Id ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {match.result.team1Score || '0'}
                      </div>
                      
                      {/* VS Separator */}
                      <div className="text-xl font-medium text-gray-500 mx-4">
                        vs
                      </div>
                      
                      {/* Team 2 Score */}
                      <div className={`text-2xl font-bold ${match.result.winner === match.team2Id ? 'text-yellow-600' : 'text-gray-600'}`}>
                        {match.result.team2Score || '0'}
                      </div>
                    </div>
                  </div>

                  {/* Winner Announcement */}
                  <div className="bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 px-6 py-3 rounded-full border border-yellow-200 shadow-sm">
                    <span className="text-lg font-semibold text-yellow-800">
                      {match.result.winner} won the match!
                    </span>
                  </div>
                </div>
              )}
              
              {/* Match Leaderboard Button */}
              <Button 
                variant="outline"
                className="mt-6"
                onClick={() => navigate(`/matches/${id}/leaderboard`)}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Match Leaderboard
              </Button>
            </div>

            <div className="flex flex-col items-center text-center md:w-1/3">
              <div className="h-24 w-24 flex items-center justify-center">
                <img 
                  src={getTeamLogoUrl(match.team2Id)} 
                  alt={match.team2Id} 
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = "/images/teams/default.png";
                  }}
                />
              </div>
              <h2 className="text-xl font-bold" style={{ color: team2?.primaryColor }}>{match.team2Id}</h2>
            </div>
          </div>
        </div>

        {/* Integrated Prediction System */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Match Predictions</h2>
          
          {match.status === 'completed' ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center mb-6">
              <p className="text-lg text-gray-600">This match has ended. No more predictions can be made.</p>
              <p className="text-gray-500 mt-2">You can still view the leaderboard and scoring system below.</p>
            </div>
          ) : match.status === 'live' ? (
            <div className="bg-yellow-50 rounded-lg p-6 text-center mb-6">
              <p className="text-lg text-yellow-600">Match is in progress. Predictions are now closed.</p>
              <p className="text-yellow-500 mt-2">Stay tuned for results and check the leaderboard once the match ends.</p>
            </div>
          ) : null}
          
          <MatchPredictions 
            match={match} 
            players={players} 
            squad1={squad1}
            squad2={squad2}
          />
        </div>

        {/* Admin Controls - Only visible to admin users */}
        {isAdmin && (
          <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm mt-8">
            <h3 className="text-xl font-semibold mb-4">Admin Controls</h3>
            <div className="flex flex-col space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Use these controls to manage the database for this match.
                  Changes will affect all users' experiences.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshQuestions} 
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing Questions...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Prediction Questions
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Note: Refreshing questions will update the database to include the latest question types. After refreshing, users may need to reload the page to see changes.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MatchDetails;
