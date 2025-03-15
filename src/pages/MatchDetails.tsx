
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDateTime, getTeamById, getMatchStatus } from "@/lib/utils";
import { Match } from "@/lib/types";
import { matches, predictionPolls } from "@/lib/mock-data";
import PredictionCard from "@/components/predictions/PredictionCard";
import { useToast } from "@/hooks/use-toast";

const MatchDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [matchPolls, setMatchPolls] = useState([]);
  const [userPredictions, setUserPredictions] = useState({});

  useEffect(() => {
    // Get match details
    const foundMatch = matches.find(m => m.id === id);
    if (foundMatch) {
      setMatch(foundMatch);
    }

    // Get match polls
    const polls = predictionPolls.filter(poll => poll.matchId === id);
    setMatchPolls(polls);

    // This would be an API call in a real app
    // Mock user predictions for now
    const mockPredictions = {};
    setUserPredictions(mockPredictions);
  }, [id]);

  if (!match) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">Match not found</div>
        </div>
      </Layout>
    );
  }

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  if (!team1 || !team2) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">Team information not found</div>
        </div>
      </Layout>
    );
  }

  const handleSubmitPrediction = (pollId, optionId) => {
    console.log("Prediction submitted:", { pollId, optionId });
    
    // In a real app, this would save to an API
    setUserPredictions(prev => ({
      ...prev,
      [pollId]: optionId
    }));
    
    toast({
      title: "Prediction Submitted",
      description: "Your prediction has been recorded successfully!",
    });
  };

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
              <p className="text-gray-600">{match.venue}</p>
              <p className="text-gray-600">{formatDateTime(match.date)}</p>
            </div>
            
            <div>
              {match.status === 'live' ? (
                <Badge className="bg-red-500 animate-pulse-subtle">LIVE</Badge>
              ) : match.status === 'completed' ? (
                <Badge variant="outline" className="text-gray-500">Completed</Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">{getMatchStatus(match)}</Badge>
              )}
            </div>
          </div>

          {/* Teams */}
          <div className="flex flex-col md:flex-row items-center justify-center mt-8 space-y-6 md:space-y-0">
            <div className="flex flex-col items-center text-center md:w-1/3">
              <img src={team1.logo} alt={team1.name} className="h-24 w-24 mb-4" />
              <h2 className="text-xl font-bold" style={{ color: team1.primaryColor }}>{team1.name}</h2>
            </div>

            <div className="flex flex-col items-center justify-center md:w-1/3">
              <div className="text-3xl font-bold mb-2">VS</div>
              {match.status === 'completed' && match.result && (
                <Alert className="mt-4">
                  <AlertDescription>{match.result}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex flex-col items-center text-center md:w-1/3">
              <img src={team2.logo} alt={team2.name} className="h-24 w-24 mb-4" />
              <h2 className="text-xl font-bold" style={{ color: team2.primaryColor }}>{team2.name}</h2>
            </div>
          </div>
        </div>

        {/* Prediction Polls */}
        <h2 className="text-2xl font-bold mb-6">Match Predictions</h2>
        
        {match.status === 'completed' ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-lg text-gray-600">This match has ended. No more predictions can be made.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchPolls.map(poll => (
              <PredictionCard
                key={poll.id}
                poll={poll}
                onSubmit={handleSubmitPrediction}
                userPredictionId={userPredictions[poll.id]}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MatchDetails;
