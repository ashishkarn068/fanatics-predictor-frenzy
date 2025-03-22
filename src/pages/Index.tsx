import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Trophy, ArrowRight, Calendar, Users } from "lucide-react";
import { teams } from "@/lib/mock-data";
import MatchCard from "@/components/matches/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match, COLLECTIONS } from "@/utils/firestore-collections";

// Define the LeaderboardEntry interface
interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  totalPoints: number;
  correctPredictions?: number;
  totalPredictions?: number;
  accuracy?: number;
}

const Index = () => {
  const { currentUser, loading } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  
  // Fetch upcoming matches from Firestore
  useEffect(() => {
    const fetchUpcomingMatches = async () => {
      try {
        setMatchesLoading(true);
        const matchesRef = collection(db, "matches");
        
        // Get the next 3 matches by date
        const q = query(
          matchesRef,
          orderBy("date", "asc"),
          limit(3)
        );
        
        const querySnapshot = await getDocs(q);
        const matches: Match[] = [];
        
        querySnapshot.forEach((doc) => {
          matches.push({ id: doc.id, ...doc.data() } as Match);
        });
        
        console.log("Fetched matches:", matches.length);
        setUpcomingMatches(matches);
      } catch (error) {
        console.error("Error fetching upcoming matches:", error);
      } finally {
        setMatchesLoading(false);
      }
    };
    
    fetchUpcomingMatches();
  }, []);
  
  // Fetch global leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true);
        // Query the global leaderboard collection
        const globalLeaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
        const leaderboardQuery = query(globalLeaderboardRef, orderBy("totalPoints", "desc"), limit(5));
        const leaderboardSnapshot = await getDocs(leaderboardQuery);
        
        // Convert to array
        const entries = leaderboardSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            userId: data.userId,
            displayName: data.displayName || "Anonymous User",
            photoURL: data.photoURL,
            totalPoints: data.totalPoints || 0,
            correctPredictions: data.correctPredictions || 0,
            totalPredictions: data.totalPredictions || 0,
            accuracy: data.accuracy || 0
          };
        });
        
        console.log("Fetched leaderboard entries:", entries.length);
        setLeaderboardEntries(entries);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, []);

  // Loading skeleton for matches
  const MatchesSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 bg-gray-200 rounded-full mb-2"></div>
              <div className="h-4 w-12 bg-gray-200 rounded"></div>
            </div>
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 bg-gray-200 rounded-full mb-2"></div>
              <div className="h-4 w-12 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );

  // Loading skeleton for leaderboard
  const LeaderboardSkeleton = () => (
    <div className="animate-pulse space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
          <div className="h-5 w-24 bg-gray-200 rounded"></div>
          <div className="ml-auto h-5 w-10 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      {/* Compact Hero Section with How It Works */}
      <div className="bg-gradient-to-r from-ipl-blue to-ipl-blue/80 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            {/* Left side - Hero content */}
            <div className="md:w-1/2 mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                IPL Predictor Mania
              </h1>
              <p className="text-base md:text-lg mb-4">
                Test your cricket prediction skills during IPL 2025
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-ipl-blue hover:bg-white/90 w-full sm:w-auto">
                  <Link to="/matches">Make Predictions</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                  <Link to="/example-match">Try Prediction System</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                  <Link to="/leaderboard">View Leaderboard</Link>
                </Button>
              </div>
            </div>
            
            {/* Right side - How It Works */}
            <div className="md:w-1/2 bg-white/10 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-3">How It Works</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Predict Matches</h3>
                    <p className="text-sm text-white/80">Make your predictions before each match starts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Earn Points</h3>
                    <p className="text-sm text-white/80">Get points for each correct prediction</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">Compete with Friends</h3>
                    <p className="text-sm text-white/80">See how you rank against other predictors</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Matches Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upcoming Matches</h2>
              <Button asChild variant="ghost" size="sm" className="flex items-center gap-1 text-sm">
                <Link to="/matches">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            {matchesLoading ? (
              <MatchesSkeleton />
            ) : upcomingMatches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingMatches.map(match => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-500">No upcoming matches found.</p>
                <p className="text-sm text-gray-400 mt-1">Check back later or view all matches.</p>
              </div>
            )}
          </div>
          
          {/* Leaderboard Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Top Predictors</h2>
              <Button asChild variant="ghost" size="sm" className="flex items-center gap-1 text-sm">
                <Link to="/leaderboard">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              {loading || leaderboardLoading ? (
                <LeaderboardSkeleton />
              ) : leaderboardEntries.length > 0 ? (
                <div className="space-y-1">
                  {leaderboardEntries.map((entry, index) => (
                    <div key={entry.userId} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-ipl-blue/10 text-ipl-blue text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="font-medium">{entry.displayName}</div>
                      </div>
                      <div className="ml-auto font-semibold">{entry.totalPoints}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No leaderboard data available yet.</p>
              )}
              
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to="/leaderboard">View Full Leaderboard</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
