import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSquads } from '@/hooks/useFirestore';
import { PlayerData, Squad } from '@/utils/firestore-collections';

const TeamCard = ({ team, players }: { team: string; players: PlayerData[] }) => {
  // Convert team name to code for image path (e.g. "Mumbai Indians" -> "mi")
  const teamCode = team.toLowerCase().split(' ')[0].substring(0, 2);
  const logoPath = `/images/teams/${teamCode}.png`;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="h-16 w-16">
          <AvatarImage src={logoPath} alt={team} />
          <AvatarFallback>{team.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{team}</CardTitle>
          <CardDescription>{players.length} players</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Key Players</h3>
          <ul className="space-y-1">
            {players.slice(0, 5).map((player, index) => (
              <li key={index} className="text-sm">
                <span className="font-medium">{player.name}</span>
                <span className="text-gray-500 ml-2">({player.role})</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const TeamsPage = () => {
  const { squads, loading, error } = useSquads();
  const [activeTab, setActiveTab] = useState<string>('all');

  // Group teams by first letter for the alphabet filter
  const teamsByLetter: Record<string, Squad[]> = {};
  
  if (squads.length > 0) {
    squads.forEach((squad) => {
      const firstLetter = squad.team.charAt(0).toUpperCase();
      
      if (!teamsByLetter[firstLetter]) {
        teamsByLetter[firstLetter] = [];
      }
      
      teamsByLetter[firstLetter].push(squad);
    });
  }
  
  // Get unique first letters for tabs
  const letters = Object.keys(teamsByLetter).sort();

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">IPL Teams</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            Error loading teams: {error.message}
          </div>
        )}
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap">
            <TabsTrigger value="all">All Teams</TabsTrigger>
            {letters.map((letter) => (
              <TabsTrigger key={letter} value={letter}>
                {letter}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="all">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="h-[250px]">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-28 mb-4" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {squads.map((squad) => (
                  <TeamCard 
                    key={squad.id} 
                    team={squad.team} 
                    players={squad.squad} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          {letters.map((letter) => (
            <TabsContent key={letter} value={letter}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamsByLetter[letter].map((squad) => (
                  <TeamCard 
                    key={squad.id} 
                    team={squad.team} 
                    players={squad.squad} 
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
};

export default TeamsPage;
