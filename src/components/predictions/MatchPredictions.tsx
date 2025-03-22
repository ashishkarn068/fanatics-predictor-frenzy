import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PredictionGame from "./PredictionGame";
import Leaderboard from "./Leaderboard";
import ScoringSystem from "./ScoringSystem";
import { Match, Team, Player } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { COLLECTIONS } from "@/utils/firestore-collections";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ServerCrash } from 'lucide-react';

// Interface for a team with squad data from Firestore
interface FirestoreTeam {
  id: string;
  name: string;
  shortName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  squad?: {
    [key: string]: {
      name: string;
      role: string;
      age?: string;
    }
  };
}

interface MatchPredictionsProps {
  match: Match;
  players: Player[];
  squad1?: Player[];
  squad2?: Player[];
}

export default function MatchPredictions({ match, players, squad1 = [], squad2 = [] }: MatchPredictionsProps) {
  const [activeTab, setActiveTab] = useState("predict");
  const [team1, setTeam1] = useState<FirestoreTeam | null>(null);
  const [team2, setTeam2] = useState<FirestoreTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamsAndSquads = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First, determine the team identifiers
        // Match can have either team1/team2 fields or team1Id/team2Id fields
        const team1Identifier = match.team1Id || '';
        const team2Identifier = match.team2Id || '';
        
        console.log('Raw team identifiers:', { team1Identifier, team2Identifier });
        
        // Normalize team identifiers (lowercase, remove spaces)
        const normalizedTeam1Id = team1Identifier.toLowerCase().replace(/\s+/g, '');
        const normalizedTeam2Id = team2Identifier.toLowerCase().replace(/\s+/g, '');
        
        console.log('Normalized team identifiers:', { normalizedTeam1Id, normalizedTeam2Id });
        
        if (!team1Identifier || !team2Identifier) {
          setError('Match data is missing team information');
          setLoading(false);
          return;
        }

        // Now fetch team details from the teams collection, not COLLECTIONS.TEAMS
        const team1Ref = doc(db, "teams", normalizedTeam1Id);
        const team2Ref = doc(db, "teams", normalizedTeam2Id);
        
        console.log('Firestore team references:', { 
          team1Path: `teams/${normalizedTeam1Id}`,
          team2Path: `teams/${normalizedTeam2Id}`
        });
        
        // Fetch both teams in parallel
        const [team1Doc, team2Doc] = await Promise.all([
          getDoc(team1Ref),
          getDoc(team2Ref)
        ]);
        
        console.log('Team documents exist:', { 
          team1Exists: team1Doc.exists(), 
          team2Exists: team2Doc.exists() 
        });
        
        // Process team 1
        if (team1Doc.exists()) {
          const teamData = team1Doc.data() as FirestoreTeam;
          setTeam1({
            id: team1Identifier,
            name: teamData.name || team1Identifier,
            shortName: teamData.shortName || team1Identifier.substring(0, 3).toUpperCase(),
            primaryColor: teamData.primaryColor || '#1E40AF',
            secondaryColor: teamData.secondaryColor || '#93C5FD',
            logo: teamData.logo || '',
            squad: teamData.squad || {}
          });
          
          const processedSquad = processSquad(teamData, team1Identifier);
          if (processedSquad.length > 0) {
            setTeam1Players(processedSquad);
          }
        } else {
          console.log(`Team 1 with ID ${team1Identifier} not found in Firestore`);
          setTeam1({
            id: team1Identifier,
            name: team1Identifier,
            shortName: team1Identifier.substring(0, 3).toUpperCase(),
            primaryColor: '#1E40AF',
            secondaryColor: '#93C5FD',
          });
        }
        
        // Process team 2
        if (team2Doc.exists()) {
          const teamData = team2Doc.data() as FirestoreTeam;
          setTeam2({
            id: team2Identifier,
            name: teamData.name || team2Identifier,
            shortName: teamData.shortName || team2Identifier.substring(0, 3).toUpperCase(),
            primaryColor: teamData.primaryColor || '#DC2626',
            secondaryColor: teamData.secondaryColor || '#FECACA',
            logo: teamData.logo || '',
            squad: teamData.squad || {}
          });
          
          const processedSquad = processSquad(teamData, team2Identifier);
          if (processedSquad.length > 0) {
            setTeam2Players(processedSquad);
          }
        } else {
          console.log(`Team 2 with ID ${team2Identifier} not found in Firestore`);
          setTeam2({
            id: team2Identifier,
            name: team2Identifier,
            shortName: team2Identifier.substring(0, 3).toUpperCase(),
            primaryColor: '#DC2626',
            secondaryColor: '#FECACA',
          });
        }
      } catch (err) {
        console.error('Error fetching match data:', err);
        setError('Failed to load prediction data');
      } finally {
        console.log('Processing squad data from team documents...');
        setLoading(false);
      }
    };

    // Process squad data from team document
    const processSquad = (teamData: FirestoreTeam, teamIdentifier: string): Player[] => {
      if (!teamData.squad || Object.keys(teamData.squad).length === 0) {
        console.log(`No squad found for team ${teamData.name || teamIdentifier}`);
        return [];
      }
      
      // Log the keys of the squad to understand its structure
      console.log(`Squad keys for ${teamData.name || teamIdentifier}:`, Object.keys(teamData.squad));
      console.log(`Squad data sample for ${teamData.name || teamIdentifier}:`, Object.values(teamData.squad)[0]);
      
      // Map numeric keys (0, 1, 2, etc.) to player objects
      const players: Player[] = Object.values(teamData.squad).map((playerData, index) => {
        // Create consistent player ID using normalized team ID
        const normalizedTeamId = teamIdentifier.toLowerCase().replace(/\s+/g, '');
        const normalizedPlayerName = playerData.name.toLowerCase().replace(/\s+/g, '-');
        const playerId = `${normalizedTeamId}-${normalizedPlayerName}`;
        
        const playerRole = convertPlayerRole(playerData.role);
        
        console.log(`Processing player: ${playerData.name} with role: ${playerData.role} → ${playerRole}`);
        
        return {
          id: playerId,
          name: playerData.name,
          teamId: teamIdentifier,
          role: playerRole,
          image: ''
        };
      });
      
      console.log(`Processed ${players.length} players for team ${teamData.name || teamIdentifier}`);
      return players;
    };

    // Convert player role to standardized format
    const convertPlayerRole = (role: string): 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper' => {
      if (!role) {
        console.log('Role is undefined, defaulting to Batsman');
        return 'Batsman';
      }
      
      // First, check for exact matches with the expected role formats
      if (role === 'Batter' || role === 'Batsman' || role.includes('Batter (')) {
        return 'Batsman';
      }
      
      if (role === 'Bowler' || role.includes('Bowler (')) {
        return 'Bowler';
      }
      
      if (role === 'All-rounder' || role.includes('All-rounder (')) {
        return 'All-rounder';
      }
      
      if (role === 'Wicket-keeper' || role.includes('Wicket-keeper (') || role.includes('Keeper')) {
        return 'Wicket-keeper';
      }
      
      // More general pattern matching as fallback
      const roleLower = role.toLowerCase();
      
      if (roleLower.includes('bat') || roleLower.includes('order') || roleLower.includes('opener')) {
        return 'Batsman';
      }
      
      if (roleLower.includes('bowl') || roleLower.includes('spin') || roleLower.includes('pace')) {
        return 'Bowler';
      }
      
      if (roleLower.includes('all') || roleLower.includes('rounder')) {
        return 'All-rounder';
      }
      
      if (roleLower.includes('keeper') || roleLower.includes('wicket')) {
        return 'Wicket-keeper';
      }
      
      // Default to batsman if unknown role
      console.log(`Unknown role format: "${role}", defaulting to Batsman`);
      return 'Batsman';
    };

    fetchTeamsAndSquads();
  }, [match, squad1, squad2]);

  const teamsLoaded = team1 !== null || team2 !== null;
  
  // Print summary of loaded teams and squads
  useEffect(() => {
    if (!loading) {
      let team1Summary = 'Squad 1: No players found';
      let team2Summary = 'Squad 2: No players found';
      
      if (team1Players.length > 0) {
        team1Summary = `Team 1 squad processed: ${team1Players.length} players`;
      } else if (squad1.length > 0) {
        team1Summary = 'Team 1 squad processed: No players found in team document, using provided squad1';
        setTeam1Players(squad1);
      }
      
      if (team2Players.length > 0) {
        team2Summary = `Team 2 squad processed: ${team2Players.length} players`;
      } else if (squad2.length > 0) {
        team2Summary = 'Team 2 squad processed: No players found in team document, using provided squad2';
        setTeam2Players(squad2);
      }
      
      console.log(team1Summary);
      console.log(team2Summary);
      console.log('Teams loaded for predictions:', {
        team1: team1?.name,
        team2: team2?.name,
        team1SquadSize: team1Players.length,
        team2SquadSize: team2Players.length
      });
    }
  }, [loading, team1, team2, team1Players, team2Players, squad1, squad2]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!teamsLoaded && team1Players.length === 0 && team2Players.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <ServerCrash className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Team Data Not Available</h3>
            <p className="text-sm text-muted-foreground mt-2">
              We couldn't load the team data for this match. Predictions are unavailable.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="predictions" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="predictions">Make Predictions</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="scoring">Scoring System</TabsTrigger>
      </TabsList>
      
      <TabsContent value="predictions">
        <PredictionGame 
          match={match} 
          teams={{ 
            team1: team1 ? {
              id: team1.id,
              name: team1.name,
              shortName: team1.shortName || team1.name.substring(0, 3).toUpperCase(),
              primaryColor: team1.primaryColor || '#1E40AF',
              secondaryColor: team1.secondaryColor || '#93C5FD',
              logo: team1.logo || ''
            } : null,
            team2: team2 ? {
              id: team2.id,
              name: team2.name,
              shortName: team2.shortName || team2.name.substring(0, 3).toUpperCase(),
              primaryColor: team2.primaryColor || '#DC2626',
              secondaryColor: team2.secondaryColor || '#FECACA',
              logo: team2.logo || ''
            } : null
          }}
          players={players}
          squad1={team1Players}
          squad2={team2Players}
          loading={loading}
        />
      </TabsContent>
      
      <TabsContent value="leaderboard">
        <Leaderboard matchId={match.id} />
      </TabsContent>
      
      <TabsContent value="scoring">
        <ScoringSystem />
      </TabsContent>
    </Tabs>
  );
}
