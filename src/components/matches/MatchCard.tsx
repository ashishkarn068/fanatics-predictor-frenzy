
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Match } from "@/lib/types";
import { getTeamById, getTimeUntilMatch, getMatchStatus } from "@/lib/utils";
import { Trophy, Calendar, MapPin } from "lucide-react";

interface MatchCardProps {
  match: Match;
}

const MatchCard = ({ match }: MatchCardProps) => {
  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  if (!team1 || !team2) return null;

  return (
    <Link to={`/matches/${match.id}`}>
      <Card className="hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-4">
          <div className="flex flex-col">
            {/* Match Status */}
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-500 flex items-center">
                <MapPin className="h-4 w-4 mr-1" /> {match.venue}
              </div>
              {match.status === 'live' ? (
                <Badge className="bg-red-500 animate-pulse-subtle">LIVE</Badge>
              ) : match.status === 'completed' ? (
                <Badge variant="outline" className="text-gray-500 flex items-center">
                  <Trophy className="h-3 w-3 mr-1" /> Completed
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> {getTimeUntilMatch(match.date)}
                </Badge>
              )}
            </div>

            {/* Teams */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col items-center text-center w-2/5">
                <div className="h-16 w-16 mb-1 flex items-center justify-center">
                  <img 
                    src={team1.logo} 
                    alt={team1.name} 
                    className="max-h-16 max-w-16 object-contain" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <span className="font-semibold text-sm" style={{ color: team1.primaryColor }}>{team1.shortName}</span>
              </div>

              <div className="flex flex-col items-center w-1/5">
                <span className="text-lg font-bold">VS</span>
              </div>

              <div className="flex flex-col items-center text-center w-2/5">
                <div className="h-16 w-16 mb-1 flex items-center justify-center">
                  <img 
                    src={team2.logo} 
                    alt={team2.name} 
                    className="max-h-16 max-w-16 object-contain" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <span className="font-semibold text-sm" style={{ color: team2.primaryColor }}>{team2.shortName}</span>
              </div>
            </div>

            {/* Match Result or Time */}
            <div className="text-center text-sm mt-2">
              {match.status === 'completed' ? (
                <div className="font-medium text-gray-800">{match.result}</div>
              ) : (
                <div className="font-medium text-gray-800">{getMatchStatus(match)}</div>
              )}
            </div>

            {/* CTA for upcoming matches */}
            {match.status === 'upcoming' && (
              <div className="mt-3 text-center">
                <span className="text-sm font-medium text-ipl-blue">
                  Make Predictions
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default MatchCard;
