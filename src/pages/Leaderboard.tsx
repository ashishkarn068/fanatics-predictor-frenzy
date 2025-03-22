import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Trophy, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getMatches, COLLECTIONS } from "@/utils/firestore-collections";
import { Match as FirestoreMatch } from "@/utils/firestore-collections";
import { Timestamp, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Define LeaderboardEntry interface
interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  points: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracy?: number;
}

const Leaderboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState<"match" | "season">("season");
  const [matches, setMatches] = useState<FirestoreMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  
  // Fetch matches for the dropdown
  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoadingMatches(true);
      try {
        const fetchedMatches = await getMatches();
        // Sort matches by date (most recent first)
        fetchedMatches.sort((a, b) => {
          const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date as string);
          const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date as string);
          return dateB.getTime() - dateA.getTime();
        });
        setMatches(fetchedMatches);
        if (fetchedMatches.length > 0) {
          setSelectedMatchId(fetchedMatches[0].id);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setIsLoadingMatches(false);
      }
    };

    fetchMatches();
  }, []);

  // Fetch season leaderboard
  useEffect(() => {
    const fetchSeasonLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      try {
        // Query the global leaderboard collection
        const globalLeaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
        const leaderboardSnapshot = await getDocs(globalLeaderboardRef);
        
        // Convert to array and sort by points
        const entries = leaderboardSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            userId: data.userId,
            displayName: data.displayName,
            photoURL: data.photoURL,
            points: data.totalPoints || 0,
            correctPredictions: data.correctPredictions || 0,
            totalPredictions: data.totalPredictions || 0,
            accuracy: data.accuracy || 0,
            matchesPlayed: data.matchesPlayed || 0
          };
        });
        
        // Sort by points (highest first)
        entries.sort((a, b) => b.points - a.points);
        
        setLeaderboardEntries(entries);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };
    
    fetchSeasonLeaderboard();
  }, []);
  
  // Filter leaderboard entries based on search query
  const filteredEntries = useMemo(() => {
    return leaderboardEntries.filter(entry => 
      entry.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, leaderboardEntries]);

  // Navigate to match-specific leaderboard
  const handleViewMatchLeaderboard = () => {
    if (selectedMatchId) {
      navigate(`/matches/${selectedMatchId}/leaderboard`);
    }
  };

  // Loading skeleton component
  const LeaderboardSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded w-full"></div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 min-h-[calc(100vh-64px)]">
        <div className="flex flex-col h-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <Input
                type="text"
                placeholder="Search players..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Tabs 
            defaultValue="season" 
            className="flex-1 flex flex-col"
            onValueChange={(value) => setTimeframe(value as "match" | "season")}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="match" className="flex items-center gap-1 py-3">
                <Trophy className="h-4 w-4" />
                <span>Match</span>
              </TabsTrigger>
              <TabsTrigger value="season" className="flex items-center gap-1 py-3">
                <Calendar className="h-4 w-4" />
                <span>Season</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 flex flex-col">
              <TabsContent value="match" className="flex-1 flex flex-col">
                {/* Match selector */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="w-full md:w-72">
                    <Select
                      value={selectedMatchId}
                      onValueChange={setSelectedMatchId}
                      disabled={isLoadingMatches}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a match" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingMatches ? (
                          <SelectItem value="loading" disabled>
                            Loading matches...
                          </SelectItem>
                        ) : matches.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No matches available
                          </SelectItem>
                        ) : (
                          matches.map((match) => (
                            <SelectItem key={match.id} value={match.id}>
                              {match.team1} vs {match.team2}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleViewMatchLeaderboard}
                    disabled={!selectedMatchId || isLoadingMatches}
                    className="shrink-0"
                  >
                    View Match Leaderboard
                  </Button>
                </div>

                <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1">
                  {loading ? (
                    <LeaderboardSkeleton />
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-600">Select a match and click "View Match Leaderboard" to see detailed match-specific leaderboard.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="season" className="flex-1 flex flex-col">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-1">
                  {loading || isLoadingLeaderboard ? (
                    <LeaderboardSkeleton />
                  ) : (
                    <div className="p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="px-4 py-3 text-left w-24">Rank</th>
                            <th className="px-4 py-3 text-left">Player</th>
                            <th className="px-4 py-3 text-right">Points</th>
                            <th className="px-4 py-3 text-right hidden md:table-cell">Accuracy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEntries.map((entry, index) => (
                            <tr 
                              key={entry.userId}
                              className={`border-b hover:bg-gray-50 ${
                                currentUser?.uid === entry.userId ? 'bg-blue-50' : ''
                              }`}
                            >
                              <td className="px-4 py-4 font-medium whitespace-nowrap">
                                {index < 3 ? (
                                  <div className="flex justify-center items-center w-8 h-8 rounded-full text-white font-bold text-sm"
                                       style={{
                                         backgroundColor: 
                                           index === 0 ? '#FFD700' : // Gold
                                           index === 1 ? '#C0C0C0' : // Silver
                                                        '#CD7F32'    // Bronze
                                       }}>
                                    {index + 1}
                                  </div>
                                ) : (
                                  <div className="flex justify-center items-center">{index + 1}</div>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 flex-shrink-0 mr-3">
                                    {entry.photoURL ? (
                                      <img 
                                        src={entry.photoURL} 
                                        alt={entry.displayName} 
                                        className="h-8 w-8 rounded-full" 
                                      />
                                    ) : (
                                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center uppercase text-gray-600">
                                        {entry.displayName.substring(0, 2)}
                                      </div>
                                    )}
                                  </div>
                                  <div>{entry.displayName}</div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right font-semibold">
                                {entry.points}
                              </td>
                              <td className="px-4 py-4 text-right hidden md:table-cell">
                                {entry.accuracy ? `${Math.round(entry.accuracy)}%` : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <div className="mt-8 bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Scoring System</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded shadow-sm">
                <h3 className="font-medium text-sm">Match Winner</h3>
                <p className="text-sm text-gray-600">10 points</p>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <h3 className="font-medium text-sm">Top Batsman/Bowler</h3>
                <p className="text-sm text-gray-600">15 points each</p>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <h3 className="font-medium text-sm">Total Runs/Wickets</h3>
                <p className="text-sm text-gray-600">15 points</p>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <h3 className="font-medium text-sm">Special Events</h3>
                <p className="text-sm text-gray-600">5-20 points</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;
