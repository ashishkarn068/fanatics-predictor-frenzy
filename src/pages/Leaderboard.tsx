import { useState, useMemo, useEffect } from "react";
import Layout from "@/components/Layout";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Trophy, Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react";
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
import { Timestamp, collection, getDocs, query, where, orderBy, limit, startAfter, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import WeeklyLeaderboard from "@/components/predictions/WeeklyLeaderboard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const PAGE_SIZE = 10;

const Leaderboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState<"match" | "season" | "week">("season");
  const [matches, setMatches] = useState<FirestoreMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalEntries, setTotalEntries] = useState(0);
  const [lastVisible, setLastVisible] = useState<any>(null);
  
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

  // Get total count of entries
  useEffect(() => {
    const leaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
    const getTotalCount = async () => {
      try {
        const q = query(leaderboardRef, orderBy("totalPoints", "desc"));
        const snapshot = await getDocs(q);
        setTotalEntries(snapshot.size);
      } catch (error) {
        console.error("Error getting total count:", error);
        setTotalEntries(0);
      }
    };
    getTotalCount();
  }, []);

  // Fetch season leaderboard
  useEffect(() => {
    const fetchSeasonLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      try {
        // Query the global leaderboard collection
        const leaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
        let leaderboardQuery = query(
          leaderboardRef,
          orderBy("totalPoints", "desc"),
          limit(PAGE_SIZE)
        );

        if (lastVisible && currentPage > 1) {
          leaderboardQuery = query(
            leaderboardRef,
            orderBy("totalPoints", "desc"),
            startAfter(lastVisible),
            limit(PAGE_SIZE)
          );
        }

        const unsubscribe = onSnapshot(leaderboardQuery, (snapshot) => {
          if (!snapshot.empty) {
            const newEntries = snapshot.docs.map((doc) => {
              const data = doc.data();
              const totalAnswered = data.totalAnsweredQuestions || data.totalPredictions || 0;
              const correctPreds = data.correctPredictions || 0;
              return {
                userId: data.userId,
                displayName: data.displayName,
                photoURL: data.photoURL,
                points: data.totalPoints || 0,
                correctPredictions: correctPreds,
                totalPredictions: totalAnswered,
                accuracy: totalAnswered > 0 ? Math.round((correctPreds / totalAnswered) * 100) : 0,
                matchesPlayed: data.matchesPlayed || 0
              };
            });

            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(newEntries.length === PAGE_SIZE);
            setLeaderboardEntries(newEntries);
          } else {
            setLeaderboardEntries([]);
            setHasMore(false);
          }
          setIsLoadingLeaderboard(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }
    };
    
    fetchSeasonLeaderboard();
  }, [currentPage]);
  
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

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Loading skeleton component
  const LeaderboardSkeleton = () => (
    <div className="animate-pulse">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">How Rankings are Determined</h4>
                  <p className="text-sm text-muted-foreground">
                    Players are ranked based on the following criteria in order:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Total points earned (highest first)</li>
                    <li>Prediction accuracy percentage (highest first)</li>
                    <li>Player name (alphabetically) if points and accuracy are equal</li>
                  </ol>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full sm:w-auto">
            <Input
              type="search"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <Tabs defaultValue={timeframe} onValueChange={(value) => setTimeframe(value as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-12 rounded-lg mb-6">
            <TabsTrigger 
              value="match" 
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              <span>Match</span>
            </TabsTrigger>
            <TabsTrigger 
              value="season" 
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Season</span>
            </TabsTrigger>
            <TabsTrigger 
              value="week" 
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              <span>This Week</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            {/* Match selector */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-full sm:w-72">
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

              <div className="text-center py-4">
                <p className="text-gray-600">Select a match from the dropdown and click "View Match Leaderboard" to see detailed predictions and rankings.</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="season">
            {/* Render global season leaderboard */}
            {isLoadingLeaderboard ? (
              <div className="space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Player
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                            Accuracy
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredEntries.map((entry, index) => (
                          <tr 
                            key={entry.userId}
                            className={`hover:bg-gray-50 ${
                              currentUser?.uid === entry.userId ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {((currentPage - 1) * PAGE_SIZE) + index + 1}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={entry.photoURL}
                                    alt={entry.displayName}
                                    referrerPolicy="no-referrer"
                                  />
                                  <AvatarFallback>
                                    {entry.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-3 flex items-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {entry.displayName}
                                  </div>
                                  {currentUser?.uid === entry.userId && (
                                    <Badge variant="outline" className="ml-2">
                                      You
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold">
                              {entry.points}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-right hidden md:table-cell">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entry.accuracy >= 70 ? 'bg-green-100 text-green-800' :
                                entry.accuracy >= 50 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.accuracy}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="week">
            <WeeklyLeaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leaderboard;
