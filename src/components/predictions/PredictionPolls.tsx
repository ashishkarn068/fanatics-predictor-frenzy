import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Match, Player, Team, Prediction } from "@/lib/types";
import { getTeamById } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface PredictionPollsProps {
  match: Match;
  players: Player[];
  loading?: boolean;
}

export default function PredictionPolls({ match, players, loading = false }: PredictionPollsProps) {
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);
  const [predictions, setPredictions] = useState<Prediction | null>(null);
  const [winnerTeam, setWinnerTeam] = useState<string>("");
  const [topBatsman, setTopBatsman] = useState<string>("");
  const [topBowler, setTopBowler] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPredictionLocked, setIsPredictionLocked] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [hasPredicted, setHasPredicted] = useState(false);

  const team1 = getTeamById(match.team1Id)?.name || match.team1Id;
  const team2 = getTeamById(match.team2Id)?.name || match.team2Id;

  // Filter players by team
  const team1Players = players.filter(p => p.teamId === match.team1Id);
  const team2Players = players.filter(p => p.teamId === match.team2Id);

  // Filter players by role
  const batsmen = players.filter(p => p.role === 'Batsman' || p.role === 'All-rounder' || p.role === 'Wicket-keeper');
  const bowlers = players.filter(p => p.role === 'Bowler' || p.role === 'All-rounder');

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check if match has started or ended to lock predictions
    const matchDate = new Date(match.date);
    const now = new Date();
    
    if (matchDate <= now || match.status === "completed") {
      setIsPredictionLocked(true);
    }
    
    // Fetch user's existing predictions for this match
    const fetchUserPredictions = async () => {
      if (!user) {
        setLoadingPredictions(false);
        return;
      }
      
      try {
        setLoadingPredictions(true);
        
        const predictionsRef = collection(db, "predictions");
        const q = query(
          predictionsRef,
          where("userId", "==", user.uid),
          where("matchId", "==", match.id)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const predictionData = querySnapshot.docs[0].data() as Prediction;
          setPredictions(predictionData);
          setHasPredicted(true);
          
          // Set form values from existing predictions
          setWinnerTeam(predictionData.winnerTeamId || "");
          setTopBatsman(predictionData.topBatsmanId || "");
          setTopBowler(predictionData.topBowlerId || "");
        }
      } catch (error) {
        console.error("Error fetching predictions:", error);
        toast({
          title: "Error",
          description: "Failed to load your predictions. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingPredictions(false);
      }
    };
    
    fetchUserPredictions();
  }, [match, user, toast]);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to make predictions.",
        variant: "destructive",
      });
      return;
    }
    
    if (isPredictionLocked) {
      toast({
        title: "Predictions Locked",
        description: "You cannot make predictions after the match has started.",
        variant: "destructive",
      });
      return;
    }
    
    if (hasPredicted) {
      toast({
        title: "Predictions Already Submitted",
        description: "You've already submitted predictions for this match and cannot modify them.",
        variant: "destructive",
      });
      return;
    }
    
    if (!winnerTeam) {
      toast({
        title: "Incomplete Prediction",
        description: "Please select a winner team.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check if the user already has submitted predictions for this match
      const predictionsRef = collection(db, "predictions");
      const existingPredictionsQuery = query(
        predictionsRef,
        where("userId", "==", user.uid),
        where("matchId", "==", match.id)
      );
      
      const existingPredictionsSnapshot = await getDocs(existingPredictionsQuery);
      
      if (!existingPredictionsSnapshot.empty) {
        setHasPredicted(true);
        toast({
          title: "Predictions Already Submitted",
          description: "You've already submitted predictions for this match and cannot modify them.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      const predictionData: Prediction = {
        userId: user.uid,
        matchId: match.id,
        winnerTeamId: winnerTeam,
        topBatsmanId: topBatsman,
        topBowlerId: topBowler,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Create a unique ID for the prediction
      const predictionId = `${user.uid}_${match.id}`;
      const predictionRef = doc(db, "predictions", predictionId);
      
      await setDoc(predictionRef, predictionData);
      
      setPredictions(predictionData);
      setHasPredicted(true);
      
      toast({
        title: "Prediction Submitted",
        description: "Your prediction has been saved successfully! You cannot modify it anymore.",
      });
    } catch (error) {
      console.error("Error submitting prediction:", error);
      toast({
        title: "Error",
        description: "Failed to submit your prediction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingPredictions) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Make Your Predictions</h2>
        
        {isPredictionLocked ? (
          <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Predictions are locked as the match has {match.status === "completed" ? "ended" : "started"}.
              {predictions ? " Your predictions are displayed below." : ""}
            </p>
          </div>
        ) : hasPredicted ? (
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-md mb-6">
            <p className="text-blue-800 dark:text-blue-200">
              You've already submitted predictions for this match. Your predictions are displayed below and cannot be modified.
            </p>
          </div>
        ) : null}
        
        {!user ? (
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-md mb-6">
            <p className="text-blue-800 dark:text-blue-200">
              Please sign in to make predictions for this match.
            </p>
          </div>
        ) : null}
        
        <Card>
          <CardHeader>
            <CardTitle>Match Winner</CardTitle>
            <CardDescription>Who do you think will win this match?</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={winnerTeam} 
              onValueChange={setWinnerTeam}
              disabled={isPredictionLocked || !user || hasPredicted}
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={match.team1Id} id="team1" />
                <Label htmlFor="team1">{team1}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={match.team2Id} id="team2" />
                <Label htmlFor="team2">{team2}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Top Batsman</CardTitle>
            <CardDescription>Who will score the most runs in this match?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="batsman">Select Batsman</Label>
                <Select 
                  value={topBatsman} 
                  onValueChange={setTopBatsman}
                  disabled={isPredictionLocked || !user || hasPredicted}
                >
                  <SelectTrigger id="batsman">
                    <SelectValue placeholder="Select a batsman" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-team1">Any {team1} Player</SelectItem>
                    <SelectItem value="any-team2">Any {team2} Player</SelectItem>
                    
                    {/* Team 1 Batsmen */}
                    <SelectItem value="team1-header" disabled className="font-bold text-primary">
                      {team1} Batsmen
                    </SelectItem>
                    {team1Players
                      .filter(p => p.role === 'Batsman' || p.role === 'All-rounder' || p.role === 'Wicket-keeper')
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))
                    }
                    
                    {/* Team 2 Batsmen */}
                    <SelectItem value="team2-header" disabled className="font-bold text-primary">
                      {team2} Batsmen
                    </SelectItem>
                    {team2Players
                      .filter(p => p.role === 'Batsman' || p.role === 'All-rounder' || p.role === 'Wicket-keeper')
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Top Bowler</CardTitle>
            <CardDescription>Who will take the most wickets in this match?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="bowler">Select Bowler</Label>
                <Select 
                  value={topBowler} 
                  onValueChange={setTopBowler}
                  disabled={isPredictionLocked || !user || hasPredicted}
                >
                  <SelectTrigger id="bowler">
                    <SelectValue placeholder="Select a bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any-team1">Any {team1} Player</SelectItem>
                    <SelectItem value="any-team2">Any {team2} Player</SelectItem>
                    
                    {/* Team 1 Bowlers */}
                    <SelectItem value="team1-bowlers-header" disabled className="font-bold text-primary">
                      {team1} Bowlers
                    </SelectItem>
                    {team1Players
                      .filter(p => p.role === 'Bowler' || p.role === 'All-rounder')
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))
                    }
                    
                    {/* Team 2 Bowlers */}
                    <SelectItem value="team2-bowlers-header" disabled className="font-bold text-primary">
                      {team2} Bowlers
                    </SelectItem>
                    {team2Players
                      .filter(p => p.role === 'Bowler' || p.role === 'All-rounder')
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {!isPredictionLocked && user && !hasPredicted && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !winnerTeam}
          >
            {isSubmitting ? "Submitting..." : "Submit Predictions"}
          </Button>
        </div>
      )}
      
      {predictions && (
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Your Predictions</h3>
          {hasPredicted && (
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Predictions are final and cannot be changed after submission.
            </p>
          )}
          <ul className="space-y-1 text-green-700 dark:text-green-300">
            <li>Winner: {predictions.winnerTeamId === match.team1Id ? team1 : team2}</li>
            <li>Top Batsman: {
              predictions.topBatsmanId === "any-team1" 
                ? `Any ${team1} Player` 
                : predictions.topBatsmanId === "any-team2" 
                  ? `Any ${team2} Player` 
                  : batsmen.find(p => p.id === predictions.topBatsmanId)?.name || "Not selected"
            }</li>
            <li>Top Bowler: {
              predictions.topBowlerId === "any-team1" 
                ? `Any ${team1} Player` 
                : predictions.topBowlerId === "any-team2" 
                  ? `Any ${team2} Player` 
                  : bowlers.find(p => p.id === predictions.topBowlerId)?.name || "Not selected"
            }</li>
          </ul>
        </div>
      )}
    </div>
  );
}
