import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getMatches, getQuestions } from '@/lib/firestore';
import { 
  updateMatch, 
  Match as CollectionMatch,
  updateMatchWithResults, 
  getMatchResult,
  MatchResult,
  evaluateMatchPredictions,
  resetMatchResult,
  resetMatchPredictions,
  COLLECTIONS,
  standardizePlayerName,
  updateGlobalLeaderboard
} from '@/utils/firestore-collections';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { isAdmin } from '@/utils/admin-auth';
import { useAuth } from '@/contexts/AuthContext';
import { Question } from '@/lib/types';
import { doc, updateDoc, deleteField, serverTimestamp, collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Local interfaces for component use
interface LocalPlayer {
  name: string;
  role: string;
  age?: string;
}

interface Squad {
  [key: string]: LocalPlayer;
}

interface LocalTeam {
  id: string;
  name: string;
  squad?: Squad;
}

// Modified interface that combines fields from both the Match and FirestoreMatch types
interface MatchData {
  id: string;
  // Include both naming conventions to handle data from different sources
  team1Id: string;      // From FirestoreMatch/lib/types.ts
  team2Id: string;      // From FirestoreMatch/lib/types.ts
  team1: string;        // From Match/firestore-collections.ts
  team2: string;        // From Match/firestore-collections.ts
  venue: string;
  date: string | Timestamp;
  status: 'upcoming' | 'live' | 'completed';
  result?: {
    winner: string;
    team1Score?: string;
    team2Score?: string;
  };
  isPlayoff?: boolean;
  playoffOrder?: number | null;
  playoffRound?: string | null;
}

// Use our interface for our component
type AppMatch = MatchData;

interface PredictionData {
  userId: string;
  matchId: string;
  [key: string]: any;
}

export default function MatchResultUpdater() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [matches, setMatches] = useState<AppMatch[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [teams, setTeams] = useState<LocalTeam[]>([]);
  const [team1Players, setTeam1Players] = useState<LocalPlayer[]>([]);
  const [team2Players, setTeam2Players] = useState<LocalPlayer[]>([]);
  
  // Basic match result fields
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  
  // Standard prediction question fields
  const [winnerTeamId, setWinnerTeamId] = useState(''); // winner-question
  const [topBatsmanId, setTopBatsmanId] = useState(''); // top-batsman
  const [topBowlerId, setTopBowlerId] = useState(''); // top-bowler
  const [highestTotal, setHighestTotal] = useState(''); // highest-total
  const [moreSixes, setMoreSixes] = useState(''); // more-sixes
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        // Fetch matches
        const fetchedMatches = await getMatches();
        
        // Sort by date, most recent first
        const sortedMatches = fetchedMatches.sort((a, b) => {
          const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date.toDate();
          const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date.toDate();
          return dateB.getTime() - dateA.getTime();
        });
        
        // Fetch prediction questions
        const fetchedQuestions = await getQuestions();
        
        // Fetch teams data
        const teamsSnapshot = await getDocs(collection(db, COLLECTIONS.TEAMS));
        const teamsData: LocalTeam[] = [];
        teamsSnapshot.forEach((doc) => {
          const teamData = doc.data();
          console.log('Loaded team data:', { id: doc.id, ...teamData });
          teamsData.push({ 
            id: doc.id, 
            name: teamData.name,
            squad: teamData.squad
          });
        });
        
        // Handle different data models by normalizing the match objects
        // to contain both team1/team2 and team1Id/team2Id properties
        const normalizedMatches = sortedMatches.map(m => {
          // First cast to any to bypass type checking, then build a normalized object
          const match = m as any;
          return {
            ...match,
            // If team1/team2 properties exist, keep them; otherwise use team1Id/team2Id values
            team1: match.team1 || match.team1Id,
            team2: match.team2 || match.team2Id,
            // If team1Id/team2Id properties exist, keep them; otherwise use team1/team2 values
            team1Id: match.team1Id || match.team1,
            team2Id: match.team2Id || match.team2
          };
        });
        
        console.log('Normalized matches:', normalizedMatches.map(m => ({ 
          id: m.id, 
          team1: m.team1,
          team2: m.team2,
          team1Id: m.team1Id,
          team2Id: m.team2Id
        })));
        
        setMatches(normalizedMatches as AppMatch[]);
        setQuestions(fetchedQuestions);
        setTeams(teamsData);
        
        console.log('Loaded teams with squads:', teamsData.map(t => ({
          id: t.id,
          name: t.name,
          hasSquad: !!t.squad,
          squadSize: t.squad ? Object.keys(t.squad).length : 0
        })));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Failed to fetch data',
          description: 'An error occurred while fetching matches and questions.',
          variant: 'destructive'
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [toast]);

  // Update selected team players when winner is selected
  useEffect(() => {
    // Remove this effect as it's overwriting the player lists loaded when a match is selected
    // This was causing the player lists to be replaced with only the winning team's players
    
    // We don't need to change team1Players and team2Players when winner is selected
    // Those should only be set when a match is selected
    
    // For reference, this was the previous code:
    /*
    if (winnerTeamId) {
      const winningTeam = teams.find(team => team.id === winnerTeamId);
      if (winningTeam?.squad) {
        const squadArray = Object.values(winningTeam.squad) as LocalPlayer[];
        setTeam1Players(squadArray);
        setTeam2Players(squadArray);
      } else {
        setTeam1Players([]);
        setTeam2Players([]);
      }
    }
    */
    
    // Just add some logging when winner changes
    if (winnerTeamId) {
      console.log(`Winner selected: ${winnerTeamId}`);
      console.log(`Current team1Players: ${team1Players.length} players`);
      console.log(`Current team2Players: ${team2Players.length} players`);
    }
  }, [winnerTeamId]);

  useEffect(() => {
    // Load match list when component mounts
    fetchMatches();
  }, []);

  // Add function to fetch matches
  const fetchMatches = async () => {
    try {
      const fetchedMatches = await getMatches();
      
      // Handle different data models by normalizing the match objects
      // to contain both team1/team2 and team1Id/team2Id properties
      const normalizedMatches = fetchedMatches.map(m => {
        // First cast to any to bypass type checking, then build a normalized object
        const match = m as any;
        return {
          ...match,
          // If team1/team2 properties exist, keep them; otherwise use team1Id/team2Id values
          team1: match.team1 || match.team1Id,
          team2: match.team2 || match.team2Id,
          // If team1Id/team2Id properties exist, keep them; otherwise use team1/team2 values
          team1Id: match.team1Id || match.team1,
          team2Id: match.team2Id || match.team2
        };
      });
      
      setMatches(normalizedMatches as AppMatch[]);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load matches. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const resetPredictionFields = () => {
    setWinnerTeamId('');
    setTopBatsmanId('');
    setTopBowlerId('');
    setHighestTotal('');
    setMoreSixes('');
  };

  const resetForm = () => {
    setTeam1Score('');
    setTeam2Score('');
    resetPredictionFields();
  };

  const handleMatchSelect = async (matchId: string) => {
    setSelectedMatchId(matchId);
    const selectedMatch = matches.find(match => match.id === matchId);
    
    if (selectedMatch) {
      // Log the full match object to debug
      console.log('Full selected match:', selectedMatch);
      
      // Extract team identifiers from the match - handle both naming conventions
      const team1Identifier = selectedMatch.team1 || selectedMatch.team1Id;
      const team2Identifier = selectedMatch.team2 || selectedMatch.team2Id;
      
      console.log('Team identifiers from match:', {
        team1Identifier,
        team2Identifier
      });
      
      // More flexible team finding logic
      const findTeam = (teamIdentifier: string) => {
        if (!teamIdentifier) return null;
        
        // Try exact match on ID first
        let team = teams.find(t => t.id.toLowerCase() === teamIdentifier.toLowerCase());
        
        // If not found, try exact match on name
        if (!team) {
          team = teams.find(t => t.name.toLowerCase() === teamIdentifier.toLowerCase());
        }
        
        // If still not found, try partial match on name
        if (!team) {
          team = teams.find(t => 
            t.name.toLowerCase().includes(teamIdentifier.toLowerCase()) || 
            teamIdentifier.toLowerCase().includes(t.name.toLowerCase())
          );
        }
        
        return team;
      };
      
      const team1Data = findTeam(team1Identifier);
      const team2Data = findTeam(team2Identifier);
      
      console.log('Selected match details:', {
        team1Identifier,
        team2Identifier,
        foundTeam1: !!team1Data,
        foundTeam2: !!team2Data,
        team1Data: team1Data?.name,
        team2Data: team2Data?.name
      });
      
      // Helper to safely handle squad transformation
      const processSquad = (teamData: LocalTeam | null) => {
        if (!teamData?.squad) return [];
        
        try {
          return Object.values(teamData.squad).map(player => ({
            name: player.name,
            role: player.role,
            age: player.age
          }));
        } catch (error) {
          console.error('Error processing squad:', error);
          return [];
        }
      };
      
      // Process Team 1 squad
      const team1Squad = processSquad(team1Data);
      setTeam1Players(team1Squad);
      console.log('Team 1 squad loaded:', team1Squad);
      console.log('Team 1 roles:', team1Squad.map(p => p.role));
      
      // Process Team 2 squad  
      const team2Squad = processSquad(team2Data);
      setTeam2Players(team2Squad);
      console.log('Team 2 squad loaded:', team2Squad);
      console.log('Team 2 roles:', team2Squad.map(p => p.role));
    }
    
    try {
      // Try to fetch existing match result
      const existingResult = await getMatchResult(matchId);
      
      if (existingResult) {
        // If we have a saved result, populate fields from it
        setWinnerTeamId(existingResult.winner || '');
        setTeam1Score(existingResult.team1Score || '');
        setTeam2Score(existingResult.team2Score || '');
        setHighestTotal(existingResult.highestTotal?.toString() || '');
        setTopBatsmanId(existingResult.topBatsmanId || '');
        setTopBowlerId(existingResult.topBowlerId || '');
        setMoreSixes(existingResult.moreSixes || '');
        
        setHasResult(true);
        
        toast({
          title: 'Existing Results Loaded',
          description: `Loaded previous results for match ${getMatchDisplayName(selectedMatch)}.${existingResult.isEvaluated ? ' Results have been evaluated.' : ' Results have not been evaluated yet.'}`
        });
      } else if (selectedMatch && selectedMatch.result) {
        // Fall back to basic result data from the match object if no detailed result exists
        setWinnerTeamId(selectedMatch.result.winner || '');
        setTeam1Score(selectedMatch.result.team1Score || '');
        setTeam2Score(selectedMatch.result.team2Score || '');
        
        setHasResult(true);
        
        // Reset other fields
        resetPredictionFields();
      } else {
        setHasResult(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error fetching match result:', error);
      setHasResult(false);
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMatchId) {
      toast({
        title: 'No Match Selected',
        description: 'Please select a match to update its results.',
        variant: 'destructive'
      });
      return;
    }

    if (!winnerTeamId) {
      toast({
        title: 'Missing Winner',
        description: 'Please select the winner of the match.',
        variant: 'destructive'
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'You must be signed in to update match results.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user is admin
      const adminStatus = await isAdmin(currentUser.uid);
      
      if (!adminStatus) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to update match results',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Create match result data for the basic Match object
      const matchData = {
        status: 'completed' as const,
        result: {
          winner: winnerTeamId,
          team1Score,
          team2Score
        }
      };
      
      // Create detailed match result data
      const selectedMatch = matches.find(match => match.id === selectedMatchId);
      
      if (!selectedMatch) {
        throw new Error('Selected match not found');
      }
      
      // Process prediction results for all question types
      const predictionResults: Record<string, string> = {};
      
      // Winner question (10 points)
      predictionResults['winner'] = winnerTeamId;
      predictionResults['winner-question'] = winnerTeamId;
      predictionResults[`${selectedMatchId}-winner`] = winnerTeamId;
      
      // Top Batsman (15 points)
      if (topBatsmanId) {
        const standardizedBatsman = standardizePlayerName(topBatsmanId);
        console.log(`Setting top batsman: Original="${topBatsmanId}", Standardized="${standardizedBatsman}"`);
        predictionResults['top-batsman'] = standardizedBatsman;
        predictionResults[`${selectedMatchId}-top-batsman`] = standardizedBatsman;
      }
      
      // Top Bowler (15 points)
      if (topBowlerId) {
        const standardizedBowler = standardizePlayerName(topBowlerId);
        console.log(`Setting top bowler: Original="${topBowlerId}", Standardized="${standardizedBowler}"`);
        predictionResults['top-bowler'] = standardizedBowler;
        predictionResults[`${selectedMatchId}-top-bowler`] = standardizedBowler;
      }
      
      // Highest Total (10 points)
      if (highestTotal) {
        predictionResults['highest-total'] = highestTotal;
        predictionResults[`${selectedMatchId}-highest-total`] = highestTotal;
      }
      
      // More Sixes (5 points)
      if (moreSixes) {
        predictionResults['more-sixes'] = moreSixes;
        predictionResults[`${selectedMatchId}-more-sixes`] = moreSixes;
      }
      
      // Create the comprehensive result object
      const resultData: Omit<MatchResult, 'id' | 'matchId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        winner: winnerTeamId,
        team1Score,
        team2Score,
        highestTotal: highestTotal ? parseInt(highestTotal) : undefined,
        topBatsmanId: topBatsmanId ? standardizePlayerName(topBatsmanId) : undefined,
        topBowlerId: topBowlerId ? standardizePlayerName(topBowlerId) : undefined,
        moreSixes,
        predictionResults,
        isEvaluated: false // Will be set to true after evaluation completes
      };
      
      console.log('Submitting match data:', matchData);
      console.log('Submitting result data:', resultData);
      console.log('Prediction results:', predictionResults);
      
      // Update match and save results in one operation
      await updateMatchWithResults(selectedMatchId, currentUser.uid, matchData, resultData);
      
      toast({
        title: 'Results Updated',
        description: 'Match results have been updated and stored successfully.',
      });
      
      // Automatically evaluate predictions after saving results
      try {
        setIsEvaluating(true);
        
        // Fetch predictions for this match
        const predictionsRef = collection(db, COLLECTIONS.ANSWERS);
        const predictionsQuery = query(predictionsRef, where("matchId", "==", selectedMatch.id));
        const predictionsSnapshot = await getDocs(predictionsQuery);
        const predictions: PredictionData[] = predictionsSnapshot.docs.map(doc => ({
          userId: doc.data().userId,
          matchId: doc.data().matchId,
          ...doc.data()
        }));
        
        console.log(`Found ${predictions.length} predictions to evaluate for match ${selectedMatch.id}`);
        
        // Evaluate predictions
        await evaluateMatchPredictions(selectedMatch.id);
        console.log(`Successfully evaluated predictions for match ${selectedMatch.id}`);
        
        // After evaluating all predictions, update the global leaderboard for each user
        const uniqueUserIds = new Set(predictions.map(p => p.userId));
        console.log(`Updating global leaderboard for ${uniqueUserIds.size} users`);
        
        const updatePromises = Array.from(uniqueUserIds).map(userId => {
          console.log(`Updating global leaderboard for user: ${userId}`);
          return updateGlobalLeaderboard(userId, selectedMatch.id);
        });
        await Promise.all(updatePromises);

        toast({
          title: "Success",
          description: `Evaluated ${predictions.length} predictions and updated leaderboards for ${uniqueUserIds.size} users.`,
        });
      } catch (evalError) {
        console.error('Error during automatic prediction evaluation:', evalError);
        toast({
          title: 'Evaluation Note',
          description: 'Results saved, but automatic prediction evaluation failed. Please try manual evaluation.',
          variant: 'destructive'
        });
      } finally {
        setIsEvaluating(false);
      }
      
    } catch (error) {
      console.error('Error updating match results:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedMatch) return;

    try {
      setIsEvaluating(true);

      // Fetch predictions for the selected match
      const predictionsRef = collection(db, COLLECTIONS.ANSWERS);
      const predictionsQuery = query(predictionsRef, where("matchId", "==", selectedMatch.id));
      const predictionsSnapshot = await getDocs(predictionsQuery);

      // Map predictions to an array
      const predictions: PredictionData[] = predictionsSnapshot.docs.map(doc => doc.data() as PredictionData);
      
      // Log number of predictions found
      console.log(`Found ${predictions.length} predictions to evaluate for match ${selectedMatch.id}`);

      // Evaluate predictions
      await evaluateMatchPredictions(selectedMatch.id);
      console.log(`Successfully evaluated predictions for match ${selectedMatch.id}`);

      // After evaluating all predictions, update the global leaderboard for each user
      const uniqueUserIds = new Set(predictions.map(p => p.userId));
      console.log(`Updating global leaderboard for ${uniqueUserIds.size} users`);
      
      const updatePromises = Array.from(uniqueUserIds).map(userId => {
        console.log(`Updating global leaderboard for user: ${userId}`);
        return updateGlobalLeaderboard(userId, selectedMatch.id);
      });
      await Promise.all(updatePromises);

      toast({
        title: "Success",
        description: `Evaluated ${predictions.length} predictions and updated leaderboards for ${uniqueUserIds.size} users.`,
      });

      // Refresh the match data
      await fetchMatches();
    } catch (error) {
      console.error("Error saving match results:", error);
      toast({
        title: "Error",
        description: "Failed to save match results. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const evaluatePredictions = async () => {
    setIsEvaluating(true);
    try {
      // Get all predictions for this match
      const predictionsRef = collection(db, COLLECTIONS.ANSWERS);
      const predictionsQuery = query(predictionsRef, where("matchId", "==", selectedMatch.id));
      const predictionsSnapshot = await getDocs(predictionsQuery);
      const predictions: PredictionData[] = predictionsSnapshot.docs.map(doc => ({
        userId: doc.data().userId,
        matchId: doc.data().matchId,
        ...doc.data()
      }));

      console.log(`Found ${predictions.length} predictions to evaluate for match ${selectedMatch.id}`);

      // Evaluate predictions
      await evaluateMatchPredictions(selectedMatch.id);
      console.log(`Successfully evaluated predictions for match ${selectedMatch.id}`);
      
      // After evaluating all predictions, update the global leaderboard for each user
      const uniqueUserIds = new Set(predictions.map(p => p.userId));
      console.log(`Updating global leaderboard for ${uniqueUserIds.size} users`);
      
      const updatePromises = Array.from(uniqueUserIds).map(userId => {
        console.log(`Updating global leaderboard for user: ${userId}`);
        return updateGlobalLeaderboard(userId, selectedMatch.id);
      });
      await Promise.all(updatePromises);

      toast({
        title: "Success",
        description: `Evaluated ${predictions.length} predictions and updated leaderboards for ${uniqueUserIds.size} users.`,
      });
    } catch (error) {
      console.error("Error evaluating predictions:", error);
      toast({
        title: "Error",
        description: "Failed to evaluate predictions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  /**
   * Resets a match from "completed" to "upcoming" status
   * 
   * This function performs the following actions:
   * 1. Checks user has admin permissions
   * 2. Confirms the action with the user
   * 3. Updates the match status to "upcoming" and removes the result field
   * 4. Deletes the match result document
   * 5. Deletes all user predictions for this match and updates user point totals
   * 6. Removes the match leaderboard
   * 
   * This is used to correct mistakes or to reset a match that was completed in error.
   */
  const handleResetMatch = async () => {
    setIsResetting(true);
    
    try {
      if (!currentUser) {
        toast({
          title: 'Authentication Required',
          description: 'You must be logged in to reset match results',
          variant: 'destructive'
        });
      return;
    }
      
      // Check admin permissions
      const adminStatus = await isAdmin(currentUser.uid);
      
      if (!adminStatus) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to reset match results',
          variant: 'destructive'
        });
        return;
      }

      // Confirm before proceeding
      const confirmReset = window.confirm(
        'Are you sure you want to reset this match? This will:\n\n' +
        '• Change match status from "completed" to "upcoming"\n' +
        '• Delete all prediction results\n' +
        '• Reset all user predictions\n\n' +
        'This action cannot be undone.'
      );

      if (!confirmReset) {
        return;
      }

      // Create match data to reset status
      const matchData = {
        status: 'upcoming' as const
      };

      // Use updateDoc directly with field removal instead of passing through updateMatch
      const matchRef = doc(db, COLLECTIONS.MATCHES, selectedMatchId);
      await updateDoc(matchRef, {
        ...matchData,
        result: deleteField(), // Use deleteField() to remove the result field entirely
        updatedAt: serverTimestamp()
      });

      // Reset the result data (delete the match result document)
      await resetMatchResult(selectedMatchId);
      
      // Reset user predictions for this match
      await resetMatchPredictions(selectedMatchId);

      // Reset the form
      resetForm();

      toast({
        title: 'Match Reset',
        description: 'Match has been reset to upcoming status and all predictions have been cleared.',
      });

      // Refresh match list
      fetchMatches();
      
    } catch (error) {
      console.error('Error resetting match:', error);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const getMatchDisplayName = (match: any) => {
    // First try to use team1/team2 (which is what our UI uses)
    if (match.team1 && match.team2) {
      return `${match.team1} vs ${match.team2}`;
    }
    
    // Fall back to team1Id/team2Id (which is what FirestoreMatch uses)
    if (match.team1Id && match.team2Id) {
      return `${match.team1Id} vs ${match.team2Id}`;
    }
    
    // Last resort: use the match ID
    return `Match ${match.id}`;
  };

  const getMatchDate = (match: any) => {
    try {
      if (!match.date) return 'Date not available';
      
      const date = typeof match.date === 'string' 
        ? new Date(match.date) 
        : match.date.toDate ? match.date.toDate() : new Date();
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  const selectedMatch = matches.find(match => match.id === selectedMatchId);

  // Add this helper function before the return statement but after all other functions are defined
  const getAllPlayers = () => {
    // Combine players from both teams for selection
    const allPlayers = [...(team1Players || []), ...(team2Players || [])];
    
    // Count how many players have roles defined
    const playersWithRoles = allPlayers.filter(p => p && p.role);
    
    console.log(`getAllPlayers: combined ${team1Players?.length || 0} team 1 players and ${team2Players?.length || 0} team 2 players`);
    console.log(`Total ${allPlayers.length} players, ${playersWithRoles.length} have roles defined`);
    
    return allPlayers;
  };

  if (loadingData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Update Match Results</CardTitle>
          <CardDescription>
            Loading match data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading matches and prediction questions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Update Match Results</CardTitle>
        <CardDescription>
          Enter match results and evaluate predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="match">Select Match ({matches.length} available)</Label>
            <Select value={selectedMatchId} onValueChange={handleMatchSelect}>
              <SelectTrigger id="match">
                <SelectValue placeholder="Select a match" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    {getMatchDisplayName(match)} ({getMatchDate(match)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedMatch && (
            <>
              {/* Basic match details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team1Score">
                    {selectedMatch.team1 || selectedMatch.team1Id} Score
                  </Label>
                  <Input 
                    id="team1Score" 
                    placeholder="e.g. 186/4" 
                    value={team1Score}
                    onChange={(e) => setTeam1Score(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team2Score">
                    {selectedMatch.team2 || selectedMatch.team2Id} Score
                  </Label>
                  <Input 
                    id="team2Score" 
                    placeholder="e.g. 172/8" 
                    value={team2Score}
                    onChange={(e) => setTeam2Score(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Standard prediction questions */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="font-medium text-lg mb-4">Prediction Results</h3>
                <div className="space-y-4">
                  {/* Winner (10 points) */}
                  <div className="space-y-2">
                    <Label htmlFor="winner">Match Winner (10 points)</Label>
                    <Select value={winnerTeamId} onValueChange={setWinnerTeamId}>
                      <SelectTrigger id="winner">
                        <SelectValue placeholder="Select winner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={selectedMatch.team1Id}>
                          {selectedMatch.team1 || selectedMatch.team1Id}
                        </SelectItem>
                        <SelectItem value={selectedMatch.team2Id}>
                          {selectedMatch.team2 || selectedMatch.team2Id}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Top Batsman */}
                  <div className="space-y-2">
                    <Label htmlFor="topBatsmanId">Top Batsman</Label>
                    <div className="relative">
                      <Select
                        value={topBatsmanId}
                        onValueChange={(value) => setTopBatsmanId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select top batsman" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            // Debug log to see how many players we have
                            console.log("Total players for batsman selection:", 
                              getAllPlayers().length);
                              
                            // Get all batters based on role keywords
                            const batters = getAllPlayers()
                              .filter((player) => {
                                if (!player || !player.role) {
                                  return false;
                                }
                                
                                const role = player.role.toLowerCase();
                                
                                // More comprehensive check for batters
                                const isBatter = 
                                  role.includes('bat') || 
                                  role.includes('order') || 
                                  role.includes('wicket') ||
                                  role.includes('keeper') || 
                                  role.includes('captain') ||
                                  // Common designations in cricket
                                  role === 'opener' ||
                                  role.startsWith('top') ||
                                  role.startsWith('middle') ||
                                  // Check for specific words
                                  role === 'batter' ||
                                  role === 'batsman';
                                
                                // Debug which players are being filtered and why
                                if (isBatter) {
                                  console.log(`Included batsman: ${player.name} (${player.role})`);
                                } else {
                                  console.log(`Excluded from batsman: ${player.name} (${player.role})`);
                                }
                                
                                return isBatter;
                              });
                              
                            console.log(`Found ${batters.length} batters after filtering`);
                            
                            // If no batters match our filter, just show all players as fallback
                            const playersToShow = batters.length > 0 ? batters : getAllPlayers();
                            
                            // Add this check to log how many players have roles defined
                            if (getAllPlayers().length > 0 && getAllPlayers().filter(p => p.role).length === 0) {
                              console.log("No players with roles defined, showing all players");
                              return getAllPlayers().map((player) => (
                                <SelectItem key={player.name} value={player.name}>
                                  {player.name} ({player.role || 'Unknown role'})
                                </SelectItem>
                              ));
                            }
                            
                            return playersToShow.length > 0 ? (
                              playersToShow.map((player) => (
                                <SelectItem key={player.name} value={player.name}>
                                  {player.name} ({player.role || 'Unknown role'})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No players available
                              </SelectItem>
                            );
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Top Bowler */}
                  <div className="space-y-2">
                    <Label htmlFor="topBowlerId">Top Bowler</Label>
                    <div className="relative">
                      <Select
                        value={topBowlerId}
                        onValueChange={(value) => setTopBowlerId(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select top bowler" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            // Debug log to see how many players we have
                            console.log("Total players for bowler selection:", 
                              getAllPlayers().length);
                              
                            // Get all bowlers based on role keywords
                            const bowlers = getAllPlayers()
                              .filter((player) => {
                                if (!player || !player.role) {
                                  return false;
                                }
                                
                                const role = player.role.toLowerCase();
                                
                                // More comprehensive check for bowlers
                                const isBowler = 
                                  role.includes('bowl') || 
                                  role.includes('all') ||
                                  // Check exact role
                                  role === 'bowler' ||
                                  // Specific types of bowlers
                                  role.includes('spinner') ||
                                  role.includes('pacer') ||
                                  role.includes('fast') ||
                                  role.includes('medium');
                                
                                // Debug which players are being filtered and why
                                if (isBowler) {
                                  console.log(`Included bowler: ${player.name} (${player.role})`);
                                } else {
                                  console.log(`Excluded from bowler: ${player.name} (${player.role})`);
                                }
                                
                                return isBowler;
                              });
                              
                            console.log(`Found ${bowlers.length} bowlers after filtering`);
                            
                            // If no bowlers match our filter, just show all players as fallback
                            const playersToShow = bowlers.length > 0 ? bowlers : getAllPlayers();
                            
                            // Add this check to log how many players have roles defined
                            if (getAllPlayers().length > 0 && getAllPlayers().filter(p => p.role).length === 0) {
                              console.log("No players with roles defined, showing all players");
                              return getAllPlayers().map((player) => (
                                <SelectItem key={player.name} value={player.name}>
                                  {player.name} ({player.role || 'Unknown role'})
                                </SelectItem>
                              ));
                            }
                            
                            return playersToShow.length > 0 ? (
                              playersToShow.map((player) => (
                                <SelectItem key={player.name} value={player.name}>
                                  {player.name} ({player.role || 'Unknown role'})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No players available
                              </SelectItem>
                            );
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Highest Total (10 points) */}
                  <div className="space-y-2">
                    <Label htmlFor="highestTotal">Highest Total (10 points)</Label>
                    <Input 
                      id="highestTotal" 
                      type="number"
                      placeholder="Enter the highest team total" 
                      value={highestTotal}
                      onChange={(e) => setHighestTotal(e.target.value)}
                    />
                  </div>
                  
                  {/* More Sixes (5 points) */}
                  <div className="space-y-2">
                    <Label htmlFor="moreSixes">Team with More Sixes (5 points)</Label>
                    <Select value={moreSixes} onValueChange={setMoreSixes}>
                      <SelectTrigger id="moreSixes">
                        <SelectValue placeholder="Which team hit more sixes?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={selectedMatch.team1Id}>
                          {selectedMatch.team1 || selectedMatch.team1Id}
                        </SelectItem>
                        <SelectItem value={selectedMatch.team2Id}>
                          {selectedMatch.team2 || selectedMatch.team2Id}
                        </SelectItem>
                        <SelectItem value="tie">Tie (Equal Sixes)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  disabled={isLoading || isEvaluating || isResetting}
                >
                  Reset Form
                </Button>
                
                {hasResult && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleEvaluate}
                      disabled={isLoading || isEvaluating || isResetting || !selectedMatchId}
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        'Evaluate Predictions'
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleResetMatch}
                      disabled={isLoading || isEvaluating || isResetting || !selectedMatchId}
                    >
                      {isResetting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset Match
                        </>
                      )}
                    </Button>
                  </>
                )}
                
                <Button 
                  type="submit" 
                  disabled={isLoading || isEvaluating || isResetting || !selectedMatchId}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Results
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}