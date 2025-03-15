import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { leaderboard } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Trophy, Calendar, CalendarClock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Leaderboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState<"match" | "weekly" | "season">("season");
  const { currentUser, loading } = useAuth();
  
  // Filter leaderboard entries based on search query - use useMemo to optimize performance
  const filteredEntries = useMemo(() => {
    return leaderboard.entries.filter(entry => 
      entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);
  
  // Create a filtered leaderboard object
  const filteredLeaderboard = {
    timeframe,
    entries: filteredEntries
  };

  // Loading skeleton component
  const LeaderboardSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded w-full"></div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <Tabs 
            defaultValue="season" 
            className="w-full md:w-auto"
            onValueChange={(value) => setTimeframe(value as "match" | "weekly" | "season")}
          >
            <TabsList className="grid w-full md:w-auto grid-cols-3">
              <TabsTrigger value="match" className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Match</span>
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Weekly</span>
              </TabsTrigger>
              <TabsTrigger value="season" className="flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                <span className="hidden sm:inline">Season</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="match">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-4">
                {loading ? (
                  <LeaderboardSkeleton />
                ) : (
                  <LeaderboardTable 
                    leaderboard={filteredLeaderboard} 
                    highlightUserId={currentUser?.uid}
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="weekly">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-4">
                {loading ? (
                  <LeaderboardSkeleton />
                ) : (
                  <LeaderboardTable 
                    leaderboard={filteredLeaderboard} 
                    highlightUserId={currentUser?.uid}
                  />
                )}
              </div>
            </TabsContent>
            <TabsContent value="season">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-4">
                {loading ? (
                  <LeaderboardSkeleton />
                ) : (
                  <LeaderboardTable 
                    leaderboard={filteredLeaderboard} 
                    highlightUserId={currentUser?.uid}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
          
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
    </Layout>
  );
};

export default Leaderboard;
