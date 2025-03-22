import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Match, Team, Player, Question, PredictionAnswer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  onSnapshot
} from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forceRefreshQuestions } from '@/utils/refresh-questions';
import { RefreshCw } from "lucide-react";
import { standardizePlayerName } from '@/utils/firestore-collections';

interface PredictionGameProps {
  match: Match;
  teams: { team1: any | null; team2: any | null }; // Using 'any' to accommodate both Team and FirestoreTeam
  players: Player[];
  squad1?: Player[];
  squad2?: Player[];
  loading?: boolean;
}

export default function PredictionGame({ 
  match, 
  teams, 
  players, 
  squad1 = [], 
  squad2 = [], 
  loading = false 
}: PredictionGameProps) {
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userAnswers, setUserAnswers] = useState<PredictionAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPredictionLocked, setIsPredictionLocked] = useState(false);
  const [hasPredicted, setHasPredicted] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [batchAnswers, setBatchAnswers] = useState<Array<{questionId: string, answer: string}>>([]);

  const team1 = teams.team1;
  const team2 = teams.team2;

  // Filter players by team - combine both sources for maximum coverage
  const team1Players = [...players.filter(p => p.teamId === match.team1Id), ...squad1].filter((p, i, self) =>
    i === self.findIndex(t => t.id === p.id || t.name === p.name)
  );
  const team2Players = [...players.filter(p => p.teamId === match.team2Id), ...squad2].filter((p, i, self) =>
    i === self.findIndex(t => t.id === p.id || t.name === p.name)
  );

  // Improved player combining function
  const getAllPlayers = () => {
    // Combine all player sources
    const allPlayers = [...team1Players, ...team2Players];
    
    // Remove duplicates based on ID or name
    const uniquePlayers = allPlayers.filter((player, index, self) =>
      index === self.findIndex(p => p.id === player.id || p.name === player.name)
    );
    
    console.log(`Combined players for selection: ${uniquePlayers.length} total unique players`);
    
    // Count players with defined roles
    const playersWithRoles = uniquePlayers.filter(p => p.role);
    console.log(`Players with defined roles: ${playersWithRoles.length} out of ${uniquePlayers.length}`);
    
    // Log all roles for debugging
    const roles = uniquePlayers.map(p => p.role || 'undefined').sort();
    const uniqueRoles = [...new Set(roles)];
    console.log('Unique player roles found:', uniqueRoles);
    
    return uniquePlayers;
  };

  // Improved batsmen filter to better handle role formats from Firestore
  const getBatsmen = () => {
    const allPlayers = getAllPlayers();
    
    console.log('Filtering for batsmen...');
    const batsmen = allPlayers.filter(p => {
      // If role is undefined, log and skip
      if (!p.role) {
        console.log(`Player ${p.name} has no defined role`);
        return false;
      }
      
      const role = p.role.toLowerCase();
      
      // Match exact role formats from Firestore
      if (
        role === 'batsman' || 
        role === 'batter' ||
        role.includes('batter (') ||
        role.includes('batsman (') ||
        role.includes('opener') ||
        role.includes('captain') && !role.includes('bowler')
      ) {
        console.log(`Including batsman (direct match): ${p.name} (${p.role})`);
        return true;
      }
      
      // Check for general batting indicators
      if (
        role.includes('bat') || 
        role.includes('order') || 
        role.includes('wicket') || 
        role.includes('keeper')
      ) {
        console.log(`Including batsman (keyword match): ${p.name} (${p.role})`);
        return true;
      }
      
      // Include all-rounders as they can bat
      if (role.includes('all') || role.includes('rounder')) {
        console.log(`Including batsman (all-rounder): ${p.name} (${p.role})`);
        return true;
      }
      
      console.log(`Excluding from batsmen: ${p.name} (${p.role})`);
      return false;
    });
    
    console.log(`Found ${batsmen.length} batsmen out of ${allPlayers.length} total players`);
    
    // If no batsmen found, return all players as fallback
    if (batsmen.length === 0) {
      console.log('No batsmen found with matching roles, showing all players as fallback');
      return allPlayers;
    }
    
    return batsmen;
  };

  // Improved bowlers filter to better handle role formats from Firestore
  const getBowlers = () => {
    const allPlayers = getAllPlayers();
    
    console.log('Filtering for bowlers...');
    const bowlers = allPlayers.filter(p => {
      // If role is undefined, log and skip
      if (!p.role) {
        console.log(`Player ${p.name} has no defined role`);
        return false;
      }
      
      const role = p.role.toLowerCase();
      
      // Match exact role formats from Firestore
      if (
        role === 'bowler' || 
        role.includes('bowler (') ||
        role === 'spinner' ||
        role === 'pacer' ||
        role.includes('fast') ||
        role.includes('medium')
      ) {
        console.log(`Including bowler (direct match): ${p.name} (${p.role})`);
        return true;
      }
      
      // Check for general bowling indicators
      if (
        role.includes('bowl') || 
        role.includes('spin') ||
        role.includes('pace')
      ) {
        console.log(`Including bowler (keyword match): ${p.name} (${p.role})`);
        return true;
      }
      
      // Include all-rounders as they can bowl
      if (role.includes('all') || role.includes('rounder')) {
        console.log(`Including bowler (all-rounder): ${p.name} (${p.role})`);
        return true;
      }
      
      console.log(`Excluding from bowlers: ${p.name} (${p.role})`);
      return false;
    });
    
    console.log(`Found ${bowlers.length} bowlers out of ${allPlayers.length} total players`);
    
    // If no bowlers found, return all players as fallback
    if (bowlers.length === 0) {
      console.log('No bowlers found with matching roles, showing all players as fallback');
      return allPlayers;
    }
    
    return bowlers;
  };

  // Log the input data
  useEffect(() => {
    console.log('PredictionGame component - input data:');
    console.log('Match:', match);
    console.log('Match Team1Id:', match.team1Id);
    console.log('Match Team2Id:', match.team2Id);
    console.log('Teams object:', teams);
    console.log('Team1 from teams:', teams.team1);
    console.log('Team2 from teams:', teams.team2);
    console.log('Squad 1:', squad1);
    console.log('Squad 2:', squad2);
    console.log('Players array:', players);
  }, [match, squad1, squad2, players, teams]);

  // Log the filtered players
  useEffect(() => {
    console.log('Filtered players:');
    console.log('Team 1 batsmen count:', getBatsmen().filter(p => p.teamId === match.team1Id).length);
    console.log('Team 2 batsmen count:', getBatsmen().filter(p => p.teamId === match.team2Id).length);
    console.log('Team 1 bowlers count:', getBowlers().filter(p => p.teamId === match.team1Id).length);
    console.log('Team 2 bowlers count:', getBowlers().filter(p => p.teamId === match.team2Id).length);
  }, [match.team1Id, match.team2Id, team1Players, team2Players, squad1, squad2]);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
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
    
    // Fetch questions and user's existing answers
    const fetchQuestionsAndAnswers = async () => {
      if (!match.id) {
        setLoadingQuestions(false);
        return;
      }
      
      try {
        setLoadingQuestions(true);
        
        // Fetch standard questions from Firestore
        const questionsRef = collection(db, "questions");
        const questionsSnapshot = await getDocs(questionsRef);
        const fetchedQuestions: Question[] = [];
        
        console.log('-------- DEBUG: Fetching questions --------');
        
        // Create a map to track question types to avoid duplicates
        const questionTypeMap: Record<string, boolean> = {};
        
        questionsSnapshot.forEach((doc) => {
          const questionData = doc.data();
          console.log(`Question ID: ${doc.id}`);
          console.log(`Question Text: ${questionData.text}`);
          console.log(`Question Type: ${questionData.type}`);
          
          // Skip questions of the same type that we've already added
          if (questionTypeMap[questionData.type]) {
            console.log(`Skipping duplicate question type: ${questionData.type} (ID: ${doc.id})`);
            return;
          }
          
          // Mark this question type as seen
          questionTypeMap[questionData.type] = true;
          
          // Build the question object and add it to our array
          const question = { id: doc.id, ...questionData } as Question;
          fetchedQuestions.push(question);
          
          // Special logging for moreSixes question
          if (questionData.type === 'moreSixes') {
            console.log('FOUND MORESIXES QUESTION:');
            console.log('  - ID:', doc.id);
            console.log('  - Text:', questionData.text);
            console.log('  - Full data:', JSON.stringify(questionData));
          }
        });
        
        console.log('All Fetched questions:', fetchedQuestions);
        console.log('moreSixes question:', fetchedQuestions.find(q => q.type === 'moreSixes'));
        
        // Log team information too
        console.log('Teams data when loading questions:');
        console.log('Match:', match);
        console.log('Team1:', team1);
        console.log('Team2:', team2);
        
        setQuestions(fetchedQuestions);
        
        // If user is logged in, set up real-time listener for answers
        if (user) {
          setupAnswersListener(match.id, fetchedQuestions);
        } else {
          setLoadingQuestions(false);
        }
      } catch (error) {
        console.error("Error fetching questions and answers:", error);
        toast({
          title: "Error",
          description: "Failed to load prediction questions. Please try again.",
          variant: "destructive",
        });
        setLoadingQuestions(false);
      }
    };
    
    fetchQuestionsAndAnswers();
  }, [match, user, toast]);

  // Set up real-time listener for user's answers
  const setupAnswersListener = (matchId: string, questionsList: Question[]) => {
    if (!user) return;
    
    try {
      const answersRef = collection(db, "predictionAnswers");
      const q = query(
        answersRef,
        where("userId", "==", user.uid),
        where("matchId", "==", matchId)
      );
      
      // Create a real-time listener for answers
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAnswers: PredictionAnswer[] = [];
        const answerMap: Record<string, string> = {};
        
        snapshot.forEach((doc) => {
          const answerData = doc.data();
          const answer = { 
            id: doc.id, 
            ...answerData 
          } as PredictionAnswer;
          
          fetchedAnswers.push(answer);
          answerMap[answer.questionId] = answer.answer;
        });
        
        setUserAnswers(fetchedAnswers);
        setAnswers(answerMap);
        
        // Set hasPredicted flag if answers exist
        setHasPredicted(fetchedAnswers.length > 0);
        
        setLoadingQuestions(false);
      }, (error) => {
        console.error("Error in answers listener:", error);
        setLoadingQuestions(false);
      });
      
      // Return the unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up answers listener:", error);
      setLoadingQuestions(false);
    }
  };

  // Cleanup the listener when component unmounts
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (user && match.id) {
      unsubscribe = setupAnswersListener(match.id, questions);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid, match.id]); // Only re-run if user ID or match ID changes

  // Update the handleAnswerChange function to standardize player names and update the batch
  const handleAnswerChange = (questionId: string, value: string) => {
    // Find question type
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    // Process the answer if needed
    let finalValue = value;
    
    // For player-based questions (topBatsman, topBowler), standardize the player name format
    if (question.type === 'topBatsman' || question.type === 'topBowler') {
      // Don't standardize special values
      if (!value.startsWith('any-') && !value.startsWith('no-')) {
        const originalAnswer = value;
        const standardizedAnswer = standardizePlayerName(value);
        console.log(`Storing standardized player for ${question.type}:`);
        console.log(`  Original: "${originalAnswer}"`);
        console.log(`  Standardized: "${standardizedAnswer}"`);
        finalValue = standardizedAnswer; // Use the standardized name
      } else {
        console.log(`Storing special answer for ${question.type}: "${value}"`);
      }
    }
    
    // Update local state
    setAnswers(prev => ({
      ...prev,
      [questionId]: finalValue
    }));
    
    // Add to batch for saving
    setBatchAnswers(prev => [...prev, { questionId, answer: finalValue }]);
  };

  // Validate numeric input for highest total
  const validateNumericAnswer = (questionId: string, value: string) => {
    // Always update the answer to allow typing in the field
    handleAnswerChange(questionId, value);
    
    // Allow empty input (for clearing)
    if (!value) {
      // Clear any validation errors for this question
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
      return;
    }

    // Check if input is a number
    const numValue = Number(value);
    if (isNaN(numValue)) {
      setValidationErrors(prev => ({
        ...prev,
        [questionId]: 'Please enter a valid number'
      }));
      return;
    }

    // Validate range (30-400)
    if (numValue < 30 || numValue > 400) {
      setValidationErrors(prev => ({
        ...prev,
        [questionId]: 'Please enter a number between 30 and 400'
      }));
      return;
    }

    // Valid input, clear error
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
  };

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
    
    // Validate that at least one question is answered
    const answeredQuestions = Object.keys(answers).length;
    if (answeredQuestions === 0) {
      toast({
        title: "No Predictions Made",
        description: "Please answer at least one question.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check if the user already has submitted predictions for this match
      const checkExistingPredictionsRef = collection(db, "predictionAnswers");
      const existingAnswersQuery = query(
        checkExistingPredictionsRef,
        where("userId", "==", user.uid),
        where("matchId", "==", match.id)
      );
      
      const existingAnswersSnapshot = await getDocs(existingAnswersQuery);
      
      if (!existingAnswersSnapshot.empty) {
        setHasPredicted(true);
        toast({
          title: "Predictions Already Submitted",
          description: "You've already submitted predictions for this match and cannot modify them.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // First, check if the user already has a prediction game for this match
      let predictionGameId = '';
      const predictionGamesRef = collection(db, "predictionGames");
      const q = query(
        predictionGamesRef,
        where("userId", "==", user.uid),
        where("matchId", "==", match.id)
      );
      
      const predictionGamesSnapshot = await getDocs(q);
      
      if (predictionGamesSnapshot.empty) {
        // Create a new prediction game
        const newGameRef = doc(predictionGamesRef);
        predictionGameId = newGameRef.id;
        
        await setDoc(newGameRef, {
          id: predictionGameId,
          userId: user.uid,
          matchId: match.id,
          title: `${team1?.name || match.team1Id} vs ${team2?.name || match.team2Id} Predictions`,
          description: `Predictions for the match on ${new Date(match.date).toLocaleDateString()}`,
          isActive: true,
          questionIds: questions.map(q => q.id),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Use existing prediction game
        const predictionGame = predictionGamesSnapshot.docs[0];
        predictionGameId = predictionGame.id;
      }
      
      // Now save all answers
      const createAnswersRef = collection(db, "predictionAnswers");
      const batch = [];
      
      for (const [questionId, answer] of Object.entries(answers)) {
        if (!answer) continue; // Skip empty answers
        
        const question = questions.find(q => q.id === questionId);
        if (!question) continue;
        
          // Create new answer
        const newAnswerRef = doc(createAnswersRef);
          const newAnswer = {
            id: newAnswerRef.id,
            userId: user.uid,
            matchId: match.id,
            predictionGameId: predictionGameId,
            questionId: questionId,
            answer: answer,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await setDoc(newAnswerRef, newAnswer);
          batch.push(newAnswer);
      }
      
      // Update local state
      setUserAnswers(prev => [...prev, ...batch]);
      setHasPredicted(true);
      
      toast({
        title: "Predictions Submitted",
        description: "Your predictions have been saved successfully! You cannot modify them anymore.",
      });
    } catch (error) {
      console.error("Error submitting predictions:", error);
      toast({
        title: "Error",
        description: "Failed to submit your predictions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add emergency refresh function
  const handleEmergencyRefresh = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to refresh the database.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      await forceRefreshQuestions();
      toast({
        title: "Database Refreshed",
        description: "The questions database has been refreshed. The page will now reload.",
      });
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error refreshing database:", error);
      toast({
        title: "Error",
        description: "Failed to refresh the database. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingQuestions) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-gray-500">Loading prediction questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
        <h3 className="text-amber-800 font-semibold">No Questions Available</h3>
        <p className="text-amber-700 mt-1">
          There are no prediction questions available for this match yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Make Your Predictions</h2>
      
      {/* Remove entire debug info section */}
        
        {isPredictionLocked ? (
          <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-md mb-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Predictions are locked as the match has {match.status === "completed" ? "ended" : "started"}.
              {userAnswers.length > 0 ? " Your predictions are displayed below." : ""}
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
        
        {/* Questions */}
        <div className="space-y-6">
          {questions.map(question => {
            // Find user's answer for this question
            const userAnswer = userAnswers.find(a => a.questionId === question.id)?.answer || '';
            
            return (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle>{question.text}</CardTitle>
                  <CardDescription>Worth {question.points} points</CardDescription>
                </CardHeader>
                <CardContent>
                  {question.type === 'winner' ? (
                    <RadioGroup 
                      value={answers[question.id] || userAnswer}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    disabled={isPredictionLocked || !user || hasPredicted}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={match.team1Id} id={`${question.id}-team1`} />
                      <Label htmlFor={`${question.id}-team1`}>{team1?.name || match.team1Id}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={match.team2Id} id={`${question.id}-team2`} />
                      <Label htmlFor={`${question.id}-team2`}>{team2?.name || match.team2Id}</Label>
                      </div>
                    </RadioGroup>
                  ) : question.type === 'topBatsman' ? (
                    <div className="grid w-full items-center gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor={`${question.id}-batsman`}>Select Batsman</Label>
                        <Select 
                          value={answers[question.id] || userAnswer}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        disabled={isPredictionLocked || !user || hasPredicted}
                        >
                          <SelectTrigger id={`${question.id}-batsman`}>
                            <SelectValue placeholder="Select a batsman" />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="any-team1">Any {team1?.name || match.team1Id} Player</SelectItem>
                          <SelectItem value="any-team2">Any {team2?.name || match.team2Id} Player</SelectItem>
                            
                            {/* Team 1 Batsmen */}
                            <SelectItem value="team1-header" disabled className="font-bold text-primary">
                            {team1?.name || match.team1Id} Batsmen
                            </SelectItem>
                          
                          {/* Team 1 Batsmen List */}
                          {(() => {
                            // Get batsmen and filter by team
                            const allBatsmen = getBatsmen();
                            const team1Batsmen = allBatsmen.filter(p => p.teamId === match.team1Id);
                            
                            if (team1Batsmen.length === 0) {
                              return (
                                <SelectItem value="no-batsmen-team1" disabled>
                                  No batsmen available
                                </SelectItem>
                              );
                            }
                            
                            return team1Batsmen.map(player => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} {player.role ? `(${player.role})` : '(Unknown role)'}
                              </SelectItem>
                            ));
                          })()}
                            
                            {/* Team 2 Batsmen */}
                            <SelectItem value="team2-header" disabled className="font-bold text-primary">
                            {team2?.name || match.team2Id} Batsmen
                            </SelectItem>
                          
                          {/* Team 2 Batsmen List */}
                          {(() => {
                            // Get batsmen and filter by team
                            const allBatsmen = getBatsmen();
                            const team2Batsmen = allBatsmen.filter(p => p.teamId === match.team2Id);
                            
                            if (team2Batsmen.length === 0) {
                              return (
                                <SelectItem value="no-batsmen-team2" disabled>
                                  No batsmen available
                                </SelectItem>
                              );
                            }
                            
                            return team2Batsmen.map(player => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} {player.role ? `(${player.role})` : '(Unknown role)'}
                              </SelectItem>
                            ));
                          })()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : question.type === 'topBowler' ? (
                    <div className="grid w-full items-center gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <Label htmlFor={`${question.id}-bowler`}>Select Bowler</Label>
                        <Select 
                          value={answers[question.id] || userAnswer}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        disabled={isPredictionLocked || !user || hasPredicted}
                        >
                          <SelectTrigger id={`${question.id}-bowler`}>
                            <SelectValue placeholder="Select a bowler" />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="any-team1">Any {team1?.name || match.team1Id} Player</SelectItem>
                          <SelectItem value="any-team2">Any {team2?.name || match.team2Id} Player</SelectItem>
                          
                          {/* Divider */}
                          <div className="h-px bg-gray-200 my-2" />
                          
                          {/* Team 1 Bowlers */}
                          <SelectItem value="team1-bowlers-header" disabled className="font-bold text-primary bg-gray-50">
                            {team1?.name || match.team1Id} Bowlers
                          </SelectItem>
                          
                          {/* Team 1 Bowlers List */}
                          {(() => {
                            // Get bowlers and filter by team
                            const allBowlers = getBowlers();
                            const team1Bowlers = allBowlers.filter(p => p.teamId === match.team1Id);
                            
                            if (team1Bowlers.length === 0) {
                              return (
                                <SelectItem value="no-bowlers-team1" disabled>
                                  No bowlers available
                                </SelectItem>
                              );
                            }
                            
                            return team1Bowlers.map(player => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} {player.role ? `(${player.role})` : '(Unknown role)'}
                              </SelectItem>
                            ));
                          })()}
                          
                          {/* Divider */}
                          <div className="h-px bg-gray-200 my-2" />
                            
                            {/* Team 2 Bowlers */}
                          <SelectItem value="team2-bowlers-header" disabled className="font-bold text-primary bg-gray-50">
                            {team2?.name || match.team2Id} Bowlers
                            </SelectItem>
                          
                          {/* Team 2 Bowlers List */}
                          {(() => {
                            // Get bowlers and filter by team
                            const allBowlers = getBowlers();
                            const team2Bowlers = allBowlers.filter(p => p.teamId === match.team2Id);
                            
                            if (team2Bowlers.length === 0) {
                              return (
                                <SelectItem value="no-bowlers-team2" disabled>
                                  No bowlers available
                                </SelectItem>
                              );
                            }
                            
                            return team2Bowlers.map(player => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} {player.role ? `(${player.role})` : '(Unknown role)'}
                              </SelectItem>
                            ));
                          })()}
                          </SelectContent>
                        </Select>
                    </div>
                    {team1Players.length === 0 && team2Players.length === 0 && (
                      <div className="text-amber-500 text-sm mt-2">
                        No players data available for this match. Please try again later.
                      </div>
                    )}
                  </div>
                ) : question.type === 'highestTotal' ? (
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor={`${question.id}-total`}>Enter your prediction (30-400 runs)</Label>
                      <Input 
                        id={`${question.id}-total`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter a number between 30-400"
                        value={answers[question.id] || userAnswer}
                        onChange={(e) => validateNumericAnswer(question.id, e.target.value)}
                        disabled={isPredictionLocked || !user || hasPredicted}
                      />
                      {validationErrors[question.id] && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {validationErrors[question.id]}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                ) : question.type === 'moreSixes' ? (
                  <RadioGroup 
                    value={answers[question.id] || userAnswer}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    disabled={isPredictionLocked || !user || hasPredicted}
                    className="flex flex-col space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={match.team1Id} id={`${question.id}-team1`} />
                      <Label htmlFor={`${question.id}-team1`}>
                        {team1?.name || match.team1Id}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={match.team2Id} id={`${question.id}-team2`} />
                      <Label htmlFor={`${question.id}-team2`}>
                        {team2?.name || match.team2Id}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="tie" id={`${question.id}-tie`} />
                      <Label htmlFor={`${question.id}-tie`}>Tie (Equal Sixes)</Label>
                    </div>
                  </RadioGroup>
                  ) : question.options ? (
                    <RadioGroup 
                      value={answers[question.id] || userAnswer}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    disabled={isPredictionLocked || !user || hasPredicted}
                      className="flex flex-col space-y-3"
                    >
                      {question.options.map(option => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={`${question.id}-${option.id}`} />
                          <Label htmlFor={`${question.id}-${option.id}`}>{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-gray-500">No options available for this question.</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>
      
      {!isPredictionLocked && user && !hasPredicted ? (
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || Object.keys(answers).length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Predictions'
            )}
          </Button>
        </div>
      ) : null}
      
      {userAnswers.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Your Predictions</h3>
          {hasPredicted && (
            <p className="text-sm text-green-700 dark:text-green-300 mb-4">
              Predictions are final and cannot be changed after submission.
            </p>
          )}
          <ul className="space-y-2 text-green-700 dark:text-green-300">
            {userAnswers.map(answer => {
              const question = questions.find(q => q.id === answer.questionId);
              if (!question) return null;
              
              let displayAnswer = answer.answer;
              
              // Helper function to find a player by ID across all sources
              const findPlayerById = (playerId: string) => {
                return getAllPlayers().find(p => p.id === playerId) || 
                       team1Players.find(p => p.id === playerId) || 
                       team2Players.find(p => p.id === playerId) || 
                       squad1.find(p => p.id === playerId) || 
                       squad2.find(p => p.id === playerId) || 
                       players.find(p => p.id === playerId);
              };
              
              // Format the answer for display
              if (question.type === 'winner') {
                displayAnswer = answer.answer === match.team1Id 
                  ? (team1?.name || match.team1Id) 
                  : (team2?.name || match.team2Id);
              } else if (question.type === 'topBatsman') {
                if (answer.answer === 'any-team1') {
                  displayAnswer = `Any ${team1?.name || match.team1Id} Player`;
                } else if (answer.answer === 'any-team2') {
                  displayAnswer = `Any ${team2?.name || match.team2Id} Player`;
                } else {
                  // Just display the player name directly since we're now storing names not IDs
                  displayAnswer = answer.answer;
                  console.log(`Showing prediction for top batsman: "${displayAnswer}"`);
                }
              } else if (question.type === 'topBowler') {
                if (answer.answer === 'any-team1') {
                  displayAnswer = `Any ${team1?.name || match.team1Id} Player`;
                } else if (answer.answer === 'any-team2') {
                  displayAnswer = `Any ${team2?.name || match.team2Id} Player`;
                } else {
                  // Just display the player name directly since we're now storing names not IDs
                  displayAnswer = answer.answer;
                  console.log(`Showing prediction for top bowler: "${displayAnswer}"`);
                }
              } else if (question.type === 'highestTotal') {
                displayAnswer = answer.answer ? `${answer.answer} runs` : 'No prediction';
              } else if (question.type === 'moreSixes') {
                if (answer.answer === 'tie') {
                  displayAnswer = 'Tie (Equal Sixes)';
                } else if (answer.answer === match.team1Id) {
                  displayAnswer = team1?.name || match.team1Id;
                } else if (answer.answer === match.team2Id) {
                  displayAnswer = team2?.name || match.team2Id;
                }
              } else if (question.options) {
                const option = question.options.find(o => o.value === answer.answer);
                if (option) {
                  displayAnswer = option.label;
                }
              }
              
              return (
                <li key={answer.id} className="flex flex-col">
                  <span className="font-medium">{question.text}</span>
                  <span className="text-sm">Your answer: {displayAnswer}</span>
                  {answer.isCorrect !== undefined && (
                    <span className={`text-sm ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {answer.isCorrect ? `Correct (+${answer.pointsEarned || question.points} points)` : 'Incorrect'}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
