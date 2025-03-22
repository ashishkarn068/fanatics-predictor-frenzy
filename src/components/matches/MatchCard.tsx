import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Trophy } from "lucide-react";
import { format } from "date-fns";
import { Match } from "@/utils/firestore-collections";
import { getTeamLogoUrl, getTeamAbbreviation } from "@/utils/team-utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

interface MatchCardProps {
  match: Match;
}

const MatchCard = ({ match }: MatchCardProps) => {
  // Format the match date
  const formatMatchDate = () => {
    try {
      // Handle both string and Timestamp date formats
      let matchDate;
      if (typeof match.date === 'string') {
        matchDate = new Date(match.date);
      } else if (match.date) {
        matchDate = match.date.toDate();
      } else {
        return "Date not available";
      }
      return format(matchDate, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date not available";
    }
  };

  // Get the status badge color based on match status
  const getStatusBadge = () => {
    switch (match.status) {
      case "upcoming":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
      case "live":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">Live</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Get team logo URL - safely handle undefined team names
  const getTeam1Logo = () => {
    if (match.team1 === 'TBD' || !match.team1) {
      return "/images/teams/default.png"; // Use default placeholder for TBD
    }
    return getTeamLogoUrl(match.team1);
  };
  
  const getTeam2Logo = () => {
    if (match.team2 === 'TBD' || !match.team2) {
      return "/images/teams/default.png"; // Use default placeholder for TBD
    }
    return getTeamLogoUrl(match.team2);
  };

  // Get team abbreviations - safely handle undefined team names
  const team1Abbr = getTeamAbbreviation(match.team1 || '');
  const team2Abbr = getTeamAbbreviation(match.team2 || '');

  // Display match result for completed matches
  const renderMatchResult = () => {
    if (match.status === "completed" && match.result) {
      // Format the result as a string
      let resultText = `${match.result.winner} won`;
      
      // Add scores if available
      if (match.result.team1Score && match.result.team2Score) {
        resultText += ` (${match.result.team1Score} - ${match.result.team2Score})`;
      }
      
      return (
        <div className="text-sm text-center font-medium mt-2 text-gray-700">
          {resultText}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 py-3 px-4 flex justify-between items-center">
          <h3 className="text-white font-semibold truncate">
            {match.isPlayoff && match.name ? (
              <span className="font-bold">{match.name}</span>
            ) : (
              `${team1Abbr} vs ${team2Abbr}`
            )}
          </h3>
          {getStatusBadge()}
        </div>
        
        <div className="p-4">
          {match.isPlayoff && match.name && (
            <div className="mb-3 text-center">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold px-3 py-1">
                {match.name}
              </Badge>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 flex items-center justify-center">
                {match.team1 === 'TBD' ? (
                  <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded-full border-2 border-dashed border-gray-300">
                    <span className="text-gray-500 font-bold">TBD</span>
                  </div>
                ) : (
                  <img 
                    src={getTeam1Logo()} 
                    alt={match.team1 || 'Team 1'} 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/images/teams/default.png";
                    }}
                  />
                )}
              </div>
              <span className="text-sm font-medium mt-2">{match.team1 || 'TBD'}</span>
            </div>
            
            <div className="text-xl font-bold text-gray-500">VS</div>
            
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 flex items-center justify-center">
                {match.team2 === 'TBD' ? (
                  <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded-full border-2 border-dashed border-gray-300">
                    <span className="text-gray-500 font-bold">TBD</span>
                  </div>
                ) : (
                  <img 
                    src={getTeam2Logo()} 
                    alt={match.team2 || 'Team 2'} 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/images/teams/default.png";
                    }}
                  />
                )}
              </div>
              <span className="text-sm font-medium mt-2">{match.team2 || 'TBD'}</span>
            </div>
          </div>
          
          {renderMatchResult()}
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <CalendarDays className="h-4 w-4 mr-2 text-indigo-500" />
              <span>{formatMatchDate()}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
              <span>{match.venue || 'Venue TBD'}</span>
            </div>
            
            <div className="mt-4">
              {match.status === 'completed' ? (
                <ButtonGroup>
                  <Link to={`/matches/${match.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Link to={`/matches/${match.id}/leaderboard`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Trophy className="h-4 w-4 mr-2" />
                      Leaderboard
                    </Button>
                  </Link>
                </ButtonGroup>
              ) : (
                <Link to={`/matches/${match.id}`}>
                  <Button variant="outline" className="w-full">
                    {match.status === 'upcoming' ? 'Make Predictions' : 'View Match Details'}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
