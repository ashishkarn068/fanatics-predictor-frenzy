import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Team, Player } from '@/lib/types';
import { teams as mockTeams, players as mockPlayers } from '@/lib/mock-data';
import { COLLECTIONS } from '@/utils/firestore-collections';

// Interface for player data from Firestore
interface PlayerData {
  name: string;
  role: string;
  age: string;
}

const TeamsList = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedMockData, setUsedMockData] = useState(false);

  useEffect(() => {
    const fetchTeamsAndPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        setUsedMockData(false);
        
        // Fetch teams
        const teamsRef = collection(db, 'teams');
        const teamsSnapshot = await getDocs(teamsRef);
        let teamsData: Team[] = [];
        let playersData: Player[] = [];
        
        // Process each team document
        for (const teamDoc of teamsSnapshot.docs) {
          const teamData = teamDoc.data();
          const teamId = teamDoc.id;
          
          // Get the correct shortName based on team name
          let shortName = teamData.shortName || '';
          if (!shortName) {
            // Map team names to their correct abbreviations if not provided
            if (teamData.name?.includes('Mumbai Indians')) shortName = 'MI';
            else if (teamData.name?.includes('Chennai Super Kings')) shortName = 'CSK';
            else if (teamData.name?.includes('Royal Challengers')) shortName = 'RCB';
            else if (teamData.name?.includes('Kolkata Knight Riders')) shortName = 'KKR';
            else if (teamData.name?.includes('Delhi Capitals')) shortName = 'DC';
            else if (teamData.name?.includes('Punjab Kings')) shortName = 'PBKS';
            else if (teamData.name?.includes('Rajasthan Royals')) shortName = 'RR';
            else if (teamData.name?.includes('Sunrisers Hyderabad')) shortName = 'SRH';
            else if (teamData.name?.includes('Gujarat Titans')) shortName = 'GT';
            else if (teamData.name?.includes('Lucknow Super Giants')) shortName = 'LSG';
            else shortName = teamId.toUpperCase().substring(0, 3);
          }
          
          // Add team to teams array
          teamsData.push({
            id: teamId,
            name: teamData.name || '',
            shortName: shortName,
            primaryColor: teamData.primaryColor || '#1E40AF',
            secondaryColor: teamData.secondaryColor || '#FFFFFF',
            logo: teamData.logo || `/images/teams/${shortName.toLowerCase()}.png`
          });
          
          // Check if squad is directly in the team document
          if (teamData.squad && Array.isArray(teamData.squad)) {
            // Process players from the squad array
            teamData.squad.forEach((playerData: PlayerData, index: number) => {
              playersData.push({
                id: `${teamId}_player_${index}`,
                name: playerData.name,
                teamId: teamId,
                role: mapRoleToStandardFormat(playerData.role)
              });
            });
          }
        }
        
        console.log("Fetched from Firestore:", { 
          teams: teamsData.length, 
          players: playersData.length,
          teamsData,
          playersData
        });
        
        // Only use mock data if absolutely no data found
        if (teamsData.length === 0 && playersData.length === 0) {
          console.log("No data found in Firestore, using mock data");
          teamsData = mockTeams;
          playersData = mockPlayers;
          setUsedMockData(true);
        }
        
        setTeams(teamsData);
        setPlayers(playersData);
      } catch (err) {
        console.error('Error fetching teams and players:', err);
        // Fallback to mock data on error
        setTeams(mockTeams);
        setPlayers(mockPlayers);
        setUsedMockData(true);
        setError('Error loading from Firestore. Using mock data instead.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeamsAndPlayers();
  }, []);
  
  // Map role string to one of the standard formats
  const mapRoleToStandardFormat = (role: string): 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper' => {
    const normalizedRole = role.toLowerCase();
    
    if (normalizedRole.includes('bat')) return 'Batsman';
    if (normalizedRole.includes('bowl')) return 'Bowler';
    if (normalizedRole.includes('all') || normalizedRole.includes('round')) return 'All-rounder';
    if (normalizedRole.includes('keep') || normalizedRole.includes('wicket')) return 'Wicket-keeper';
    
    // Default to Batsman if unknown
    return 'Batsman';
  };
  
  // Group players by team
  const playersByTeam = players.reduce((acc, player) => {
    // Skip players without a teamId
    if (!player.teamId) return acc;
    
    // Create an array for this team if it doesn't exist
    if (!acc[player.teamId]) {
      acc[player.teamId] = [];
    }
    
    acc[player.teamId].push(player);
    return acc;
  }, {} as Record<string, Player[]>);
  
  // Get role counts for a team
  const getRoleCounts = (teamPlayers: Player[] = []) => {
    const counts = {
      'Batsman': 0,
      'Bowler': 0,
      'All-rounder': 0,
      'Wicket-keeper': 0
    };
    
    teamPlayers?.forEach(player => {
      if (player.role && counts.hasOwnProperty(player.role)) {
        counts[player.role as keyof typeof counts]++;
      }
    });
    
    return counts;
  };
  
  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <Skeleton className="h-8 w-40" />
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <span><Skeleton className="h-4 w-60 inline-block" /></span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <div className="pl-6 space-y-2">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Error Loading Teams</CardTitle>
          <div className="text-sm text-muted-foreground">{error}</div>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Teams & Squad Members
          <Badge variant="outline" className="ml-2">
            {teams.length} Teams
          </Badge>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          View all teams and their squad members in the IPL 2025 season
          {usedMockData && (
            <span className="ml-1 text-amber-600">(Using mock data)</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="accordion">Detailed View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((team) => {
                // Get the correct logo filename based on team shortName
                const logoFilename = `${team.shortName.toLowerCase()}.png`;
                
                return (
                  <div key={team.id} className="border rounded-md p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-12 w-12 flex items-center justify-center">
                        <img 
                          src={`/images/teams/${logoFilename}`}
                          alt={team.name} 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-base truncate">{team.name}</h3>
                        <p className="text-xs text-gray-500">{team.shortName}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(getRoleCounts(playersByTeam[team.id] || [])).map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-gray-50">
                          <span className="font-medium">{role}s</span>
                          <span className="ml-1 bg-gray-200 text-gray-800 rounded-full h-5 w-5 flex items-center justify-center">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="accordion">
            <Accordion type="single" collapsible className="w-full">
              {teams.map((team) => {
                // Get the correct logo filename based on team shortName
                const logoFilename = `${team.shortName.toLowerCase()}.png`;
                
                const teamPlayers = playersByTeam[team.id] || [];
                
                // Group players by role for better organization
                const playersByRole: Record<string, Player[]> = {
                  'Batsman': [],
                  'Bowler': [],
                  'All-rounder': [],
                  'Wicket-keeper': []
                };
                
                teamPlayers.forEach(player => {
                  if (player.role && playersByRole.hasOwnProperty(player.role)) {
                    playersByRole[player.role].push(player);
                  }
                });
                
                return (
                  <AccordionItem key={team.id} value={team.id}>
                    <AccordionTrigger className="hover:bg-gray-50 px-2 rounded-md">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-10 w-10 flex items-center justify-center">
                          <img 
                            src={`/images/teams/${logoFilename}`}
                            alt={team.name} 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{team.name}</span>
                          <Badge variant="outline" className="ml-1 text-xs">
                            {teamPlayers.length} Players
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-12 pr-3 pt-2 pb-3">
                        {/* Show players grouped by role */}
                        {Object.entries(playersByRole).map(([role, players]) => (
                          <div key={role} className="mb-3">
                            <h4 className="text-xs font-semibold mb-1 text-gray-500 uppercase tracking-wider">
                              {role}s ({players.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                              {players.map((player) => {
                                // Determine badge style based on role - more minimalistic
                                let badgeStyle = "";
                                if (role === 'Batsman') badgeStyle = "bg-blue-50 text-blue-700 text-xs";
                                if (role === 'Bowler') badgeStyle = "bg-green-50 text-green-700 text-xs";
                                if (role === 'All-rounder') badgeStyle = "bg-purple-50 text-purple-700 text-xs";
                                if (role === 'Wicket-keeper') badgeStyle = "bg-amber-50 text-amber-700 text-xs";
                                
                                return (
                                  <div 
                                    key={player.id} 
                                    className="flex items-center justify-between border rounded-md p-1.5 hover:bg-gray-50 transition-colors"
                                  >
                                    <span className="font-medium text-sm truncate mr-1">{player.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded whitespace-nowrap ${badgeStyle}`}>
                                      {player.role}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        
                        {teamPlayers.length === 0 && (
                          <p className="text-gray-500 italic text-sm">No players found for this team</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TeamsList;
