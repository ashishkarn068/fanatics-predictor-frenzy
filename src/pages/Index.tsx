
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Trophy, ArrowRight, Calendar, Users } from "lucide-react";
import { matches, teams, leaderboard } from "@/lib/mock-data";
import MatchCard from "@/components/matches/MatchCard";

const Index = () => {
  // Get next 3 upcoming matches
  const upcomingMatches = matches
    .filter(match => match.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  
  // Get top 5 from leaderboard
  const topPlayers = leaderboard.entries.slice(0, 5);

  return (
    <Layout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-ipl-blue to-ipl-blue/80 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              IPL Predictor Mania
            </h1>
            <p className="text-lg md:text-xl mb-8">
              Test your cricket prediction skills during IPL 2023 and compete with fans from around the world
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-ipl-blue hover:bg-white/90">
                <Link to="/matches">Make Predictions</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link to="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-ipl-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Make Predictions</h3>
              <p className="text-gray-600">
                Predict various aspects of upcoming IPL matches, from match winners to player performances
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-ipl-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn Points</h3>
              <p className="text-gray-600">
                Score points for each correct prediction and claim bonus points for streaks and perfect matches
              </p>
            </div>
            <div className="text-center">
              <div className="bg-blue-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-ipl-blue" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Climb Leaderboard</h3>
              <p className="text-gray-600">
                Compete against other cricket fans and rise through the ranks to become the ultimate champion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Section */}
      <div className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Participating Teams</h2>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            {teams.map((team) => (
              <div key={team.id} className="flex flex-col items-center p-2">
                <img
                  src={team.logo}
                  alt={team.name}
                  className="h-16 w-16 object-contain mb-2"
                />
                <span className="text-sm font-medium">{team.shortName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Matches Section */}
      <div className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Upcoming Matches</h2>
            <Link to="/matches" className="text-ipl-blue hover:underline flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Leaderboard</h2>
            <Link to="/leaderboard" className="text-ipl-blue hover:underline flex items-center">
              View Full Leaderboard <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Rank</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topPlayers.map((player) => (
                  <tr key={player.userId}>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.position}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.userName}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">{player.points}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-ipl-blue py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Test Your Cricket Knowledge?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of IPL fans and start making your predictions today!
          </p>
          <Button asChild size="lg" className="bg-white text-ipl-blue hover:bg-white/90">
            <Link to="/register">Create Free Account</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
