import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Trophy } from "lucide-react";
import { format } from "date-fns";
import { Match } from "@/utils/firestore-collections";
import { getTeamLogoUrl, getTeamAbbreviation } from "@/utils/team-utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { isPredictionAllowed } from "@/lib/utils";

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
    // Parse the match date, handling both string and Timestamp formats
    let matchDate: Date;
    if (typeof match.date === 'string') {
      matchDate = new Date(match.date);
    } else if (match.date && typeof match.date.toDate === 'function') {
      matchDate = match.date.toDate();
    } else {
      console.error('Invalid match date format:', match.date);
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 font-medium">Unknown</Badge>;
    }

    const now = new Date();
    const hasMatchDatePassed = matchDate <= now;
    const timeDiff = matchDate.getTime() - now.getTime();
    const hoursDifference = timeDiff / (1000 * 60 * 60);
    const isLessThan24Hours = hoursDifference > 0 && hoursDifference <= 24;

    // Debug the badge determination
    console.log(`Match ${match.id} badge determination:`, {
      status: match.status,
      hasMatchDatePassed, 
      hoursDifference,
      isLessThan24Hours,
      predictionsAllowed: isPredictionAllowed(match)
    });

    // For matches officially marked as completed or live
    if (match.status === "completed") {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 font-medium">Completed</Badge>;
    } else if (match.status === "live") {
      return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 animate-pulse font-medium">LIVE</Badge>;
    } 
    
    // For upcoming matches with passed dates (data inconsistency)
    if (hasMatchDatePassed) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 font-medium">Completed</Badge>;
    }

    // For matches less than 24 hours away
    if (isLessThan24Hours && isPredictionAllowed(match)) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">Predictions Closing Soon</Badge>;
    }
    
    // Regular upcoming match handling
    const isAllowed = isPredictionAllowed(match);
    return isAllowed ? 
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 font-medium">Predictions Open</Badge> :
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
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
    if (match.status === "completed") {
      if (match.result) {
        const isTeam1Winner = match.result.winner === match.team1;
        const isTeam2Winner = match.result.winner === match.team2;
        
        return (
          <div className="relative mt-2">
            {/* Winner Trophy Animation */}
            <div className="absolute top-0 left-0 right-0 flex justify-center">
              <div className={`transform -translate-y-1/2 ${isTeam1Winner ? 'left-16' : isTeam2Winner ? 'right-16' : ''}`}>
                <div className="animate-bounce">
                  <Trophy className="h-6 w-6 text-yellow-500 filter drop-shadow" />
                </div>
              </div>
            </div>
            
            {/* Score Display */}
            <div className="flex justify-center items-center gap-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg p-3">
              <div className={`text-sm font-semibold ${isTeam1Winner ? 'text-yellow-600' : 'text-gray-600'}`}>
                {match.result.team1Score || '0'}
              </div>
              <div className="text-xs text-gray-500">vs</div>
              <div className={`text-sm font-semibold ${isTeam2Winner ? 'text-yellow-600' : 'text-gray-600'}`}>
                {match.result.team2Score || '0'}
              </div>
            </div>
            
            {/* Winner Text */}
            <div className="text-center mt-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200">
                {match.result.winner} won
              </span>
            </div>
          </div>
        );
      } else {
        // Show "Results awaiting" message for completed matches without results
        return (
          <div className="mt-2">
            <div className="flex justify-center items-center gap-3 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-600">Results awaiting</div>
            </div>
            <div className="text-center mt-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200">
                Match completed
              </span>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  // Check if predictions are allowed for this match
  const predictionsAllowed = isPredictionAllowed(match);

  // Render appropriate buttons based on match status
  const renderActionButtons = () => {
    // Parse the match date, handling both string and Timestamp formats
    let matchDate: Date;
    if (typeof match.date === 'string') {
      matchDate = new Date(match.date);
    } else if (match.date && typeof match.date.toDate === 'function') {
      matchDate = match.date.toDate();
    } else {
      console.error('Invalid match date format when rendering buttons:', match.date);
      // Default fallback
      return (
        <ButtonGroup>
          <Link to={`/matches/${match.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </ButtonGroup>
      );
    }

    const now = new Date();
    const hasMatchDatePassed = matchDate <= now;

    // If match is officially completed
    if (match.status === 'completed') {
      return (
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
      );
    } 
    // If match is live
    else if (match.status === 'live') {
      return (
        <ButtonGroup>
          <Link to={`/matches/${match.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </ButtonGroup>
      );
    } 
    // If match time has passed but status hasn't been updated
    else if (hasMatchDatePassed) {
      return (
        <ButtonGroup>
          <Link to={`/matches/${match.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </ButtonGroup>
      );
    }
    // For upcoming matches with predictions allowed
    else if (predictionsAllowed) {
      console.log(`Match ${match.id}: Showing Make Predictions button (predictionsAllowed=${predictionsAllowed})`);
      return (
        <ButtonGroup>
          <Link to={`/matches/${match.id}`} className="flex-1">
            <Button variant="default" className="w-full bg-indigo-600 hover:bg-indigo-700">
              Make Predictions
            </Button>
          </Link>
        </ButtonGroup>
      );
    } 
    // For all other cases (upcoming matches with predictions not allowed)
    else {
      console.log(`Match ${match.id}: Showing View Details button (predictions not allowed, predictionsAllowed=${predictionsAllowed})`);
      return (
        <ButtonGroup>
          <Link to={`/matches/${match.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </ButtonGroup>
      );
    }
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
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
