import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ChevronLeft, RefreshCw, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime, getTeamById, getMatchStatus } from "@/lib/utils";
import { Match, Team, Player } from "@/lib/types";
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
        
        // Convert team names to squad IDs (lowercase, no spaces)
        const team1SquadId = matchData.team1.toLowerCase().replace(/\s+/g, '');
        const team2SquadId = matchData.team2.toLowerCase().replace(/\s+/g, '');

        console.log('Team names from match data:', {
          team1Name: matchData.team1,
          team2Name: matchData.team2
        });
        
        console.log('Fetching squads with IDs:', {
          team1SquadId,
          team2SquadId
        });

        // Fetch squads for both teams
        let squad1Data, squad2Data;
        try {
          [squad1Data, squad2Data] = await Promise.all([
            getSquad(team1SquadId),
            getSquad(team2SquadId)
          ]);

          console.log('Squad 1 data received:', squad1Data);
          console.log('Squad 2 data received:', squad2Data);
          
          if (!squad1Data) {
            console.warn(`No squad found for team "${matchData.team1}" (ID: ${team1SquadId})`);
          }
          
          if (!squad2Data) {
            console.warn(`No squad found for team "${matchData.team2}" (ID: ${team2SquadId})`);
          }
        } catch (squadError) {
          console.error('Error fetching squad data:', squadError);
          squad1Data = null;
          squad2Data = null;
        }

        // Convert squad data to Player array - only use Firestore data
        const squad1Players = squad1Data?.squad?.map(player => ({
          id: `${team1SquadId}-${player.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: player.name,
          role: convertToPlayerRole(player.role),
          teamId: matchData.team1,
          image: ''
        })) || [];

        const squad2Players = squad2Data?.squad?.map(player => ({
          id: `${team2SquadId}-${player.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: player.name,
          role: convertToPlayerRole(player.role),
          teamId: matchData.team2,
          image: ''
        })) || [];

        console.log('Processed squad players:', {
          squad1Players: squad1Players.length > 0 ? squad1Players : 'No players found',
          squad2Players: squad2Players.length > 0 ? squad2Players : 'No players found',
          squad1Bowlers: squad1Players.filter(p => p.role === 'Bowler' || p.role === 'All-rounder').length,
          squad2Bowlers: squad2Players.filter(p => p.role === 'Bowler' || p.role === 'All-rounder').length
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
          result: matchData.result?.winner || ''
        };

        // Update state with fetched data
        setMatch(convertedMatch);
        setSquad1(squad1Players);
        setSquad2(squad2Players);
        setPlayers([...squad1Players, ...squad2Players]);

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
              {match.status === 'completed' && match.result && (
                <Alert className="mt-4">
                  <AlertDescription>{match.result}</AlertDescription>
                </Alert>
              )}
              
              {/* Match Leaderboard Button */}
              <Button 
                variant="outline"
                className="mt-4"
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
