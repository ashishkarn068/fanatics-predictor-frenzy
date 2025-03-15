import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Trophy, ArrowRight, Calendar, Users } from "lucide-react";
import { matches, teams, leaderboard } from "@/lib/mock-data";
import MatchCard from "@/components/matches/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { currentUser, loading } = useAuth();
  
  // Get next 3 upcoming matches
  const upcomingMatches = matches
    .filter(match => match.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  
  // Get top 5 from leaderboard
  const topPlayers = leaderboard.entries.slice(0, 5);

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
              <div className="flex gap-3">
                <Button asChild size="sm" className="bg-white text-ipl-blue hover:bg-white/90">
                  <Link to="/matches">Make Predictions</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Link to="/leaderboard">View Leaderboard</Link>
                </Button>
              </div>
            </div>
            
            {/* Right side - How It Works */}
            <div className="md:w-1/2">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h2 className="text-xl font-bold mb-3 text-center">How It Works</h2>
                <div className="flex justify-between">
                  <div className="text-center px-2">
                    <div className="bg-white/20 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold">Predict</h3>
                  </div>
                  <div className="text-center px-2">
                    <div className="bg-white/20 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold">Score</h3>
                  </div>
                  <div className="text-center px-2">
                    <div className="bg-white/20 h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold">Compete</h3>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
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
              {loading ? (
                <LeaderboardSkeleton />
              ) : (
                <div className="space-y-2">
                  {topPlayers.map((player, index) => (
                    <div 
                      key={player.userId} 
                      className={`flex items-center gap-3 py-2 ${
                        player.userId === currentUser?.uid ? "bg-blue-50 -mx-2 px-2 rounded" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center h-6 w-6 bg-ipl-blue text-white rounded-full text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="font-medium truncate">{player.userName}</div>
                      <div className="ml-auto font-semibold text-ipl-blue">{player.points} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Teams Section */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">IPL 2025 Teams</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {teams.map(team => (
              <div 
                key={team.id} 
                className="bg-white rounded-lg shadow-sm p-3 flex flex-col items-center"
                style={{ borderTop: `4px solid ${team.primaryColor}` }}
              >
                <div className="h-16 w-16 flex items-center justify-center mb-2">
                  <img 
                    src={team.logo} 
                    alt={team.name} 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <h3 className="font-semibold text-center">{team.name}</h3>
                <p className="text-xs text-gray-500 text-center">{team.shortName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
