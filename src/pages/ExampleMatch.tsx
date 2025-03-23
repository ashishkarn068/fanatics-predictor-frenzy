import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";
import { Match, Team, Player } from "@/lib/types";
import MatchPredictions from "@/components/predictions/MatchPredictions";
import { useNavigate } from "react-router-dom";

// Example match data
const exampleMatch: Match = {
  id: "example-match",
  team1Id: "1", // MI
  team2Id: "2", // CSK
  venue: "Wankhede Stadium, Mumbai",
  date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  status: "upcoming"
};

// Example team data
const team1: Team = {
  id: "1",
  name: "Mumbai Indians",
  shortName: "MI",
  primaryColor: "#004BA0",
  secondaryColor: "#D1AB3E",
  logo: "/images/teams/mi.png"
};

const team2: Team = {
  id: "2",
  name: "Chennai Super Kings",
  shortName: "CSK",
  primaryColor: "#FFFF3C",
  secondaryColor: "#0081E9",
  logo: "/images/teams/csk.png"
};

// Example players data
const examplePlayers: Player[] = [
  // Mumbai Indians players
  { id: 'p1-mi', name: 'Rohit Sharma', teamId: '1', role: 'Batsman', image: '' },
  { id: 'p2-mi', name: 'Jasprit Bumrah', teamId: '1', role: 'Bowler', image: '' },
  { id: 'p3-mi', name: 'Hardik Pandya', teamId: '1', role: 'All-rounder', image: '' },
  { id: 'p4-mi', name: 'Ishan Kishan', teamId: '1', role: 'Wicket-keeper', image: '' },
  
  // Chennai Super Kings players
  { id: 'p1-csk', name: 'MS Dhoni', teamId: '2', role: 'Wicket-keeper', image: '' },
  { id: 'p2-csk', name: 'Ravindra Jadeja', teamId: '2', role: 'All-rounder', image: '' },
  { id: 'p3-csk', name: 'Ruturaj Gaikwad', teamId: '2', role: 'Batsman', image: '' },
  { id: 'p4-csk', name: 'Deepak Chahar', teamId: '2', role: 'Bowler', image: '' },
];

const ExampleMatch = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Matches
        </Button>

        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
              <h1 className="text-2xl font-bold mb-1">{team1.name} vs {team2.name}</h1>
              <p className="text-gray-600">{exampleMatch.venue}</p>
              <p className="text-gray-600">{formatDateTime(exampleMatch.date)}</p>
            </div>
            
            <div>
              <Badge variant="outline" className="text-gray-500">Upcoming</Badge>
            </div>
          </div>

          {/* Teams */}
          <div className="flex flex-col md:flex-row items-center justify-center mt-8 space-y-6 md:space-y-0">
            <div className="flex flex-col items-center text-center md:w-1/3">
              <img src={team1.logo} alt={team1.name} className="h-24 w-24 mb-4 object-contain" />
              <h2 className="text-xl font-bold" style={{ color: team1.primaryColor }}>{team1.name}</h2>
            </div>

            <div className="flex flex-col items-center justify-center md:w-1/3">
              <div className="text-3xl font-bold mb-2">VS</div>
            </div>

            <div className="flex flex-col items-center text-center md:w-1/3">
              <img src={team2.logo} alt={team2.name} className="h-24 w-24 mb-4 object-contain" />
              <h2 className="text-xl font-bold" style={{ color: team2.primaryColor }}>{team2.name}</h2>
            </div>
          </div>
        </div>

        {/* Integrated Prediction System */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Match Predictions</h2>
          <MatchPredictions match={exampleMatch} players={examplePlayers} />
        </div>
      </div>
    </Layout>
  );
};

export default ExampleMatch;
