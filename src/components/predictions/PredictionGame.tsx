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
import { isMatchWithinPredictionWindow, isPredictionAllowed } from '@/lib/utils';
import { resetPredictions, canResetPredictions } from "@/utils/firestore-collections";
import { cn } from "@/lib/utils";

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
  const [isWithinPredictionWindow, setIsWithinPredictionWindow] = useState(false);
  const [hasPredicted, setHasPredicted] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [batchAnswers, setBatchAnswers] = useState<Array<{questionId: string, answer: string}>>([]);

  const team1 = teams.team1;
  const team2 = teams.team2;

  // Use ONLY squad1 and squad2 for team players - NO MORE combining with players array
  const team1Players = squad1;
  const team2Players = squad2;

  // Player combining function (now only using squad1 and squad2)
  const getAllPlayers = () => {
    // Combine team squads only (no general players array)
    const allPlayers = [...team1Players, ...team2Players];
    
    console.log(`Combined players for selection: ${allPlayers.length} total players`);
    console.log(`Team 1 players: ${team1Players.length}, Team 2 players: ${team2Players.length}`);
    
    // Log player details for debugging
    if (team1Players.length > 0) {
      console.log(`Team 1 first player:`, team1Players[0]);
    }
    if (team2Players.length > 0) {
      console.log(`Team 2 first player:`, team2Players[0]);
    }
    
    // Count players with defined roles
    const playersWithRoles = allPlayers.filter(p => p.role);
    console.log(`Players with defined roles: ${playersWithRoles.length} out of ${allPlayers.length}`);
    
    // Log all roles for debugging
    const roles = allPlayers.map(p => p.role || 'undefined').sort();
    const uniqueRoles = [...new Set(roles)];
    console.log('Unique player roles found:', uniqueRoles);
    
    return allPlayers;
  };

  // Improved batsmen filter to better handle role formats from Firestore
  const getBatsmen = () => {
    const allPlayers = getAllPlayers();
    return allPlayers.filter(p => {
      if (!p.role) return false;
      const role = p.role.toLowerCase();
      return role.includes('bat') || 
             role.includes('keeper') || 
             role.includes('all') || 
             role.includes('rounder') ||
             role.includes('wicket');
    });
  };

  // Improved bowlers filter to better handle role formats from Firestore
  const getBowlers = () => {
    const allPlayers = getAllPlayers();
    return allPlayers.filter(p => {
      if (!p.role) return false;
      const role = p.role.toLowerCase();
      return role.includes('bowl') || 
             role.includes('all') || 
             role.includes('rounder') ||
             role.includes('spin') ||
             role.includes('pace');
    });
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
    console.log('Squad 1 length:', squad1.length);
    console.log('Squad 2 length:', squad2.length);
    
    // No longer using general players array:
    // console.log('Players array:', players);
  }, [match, squad1, squad2, teams]);

  // Log the filtered players
  useEffect(() => {
    console.log('Filtered players:');
    console.log('Team 1 batsmen count:', getBatsmen().filter(p => p.teamId === match.team1Id).length);
    console.log('Team 2 batsmen count:', getBatsmen().filter(p => p.teamId === match.team2Id).length);
    console.log('Team 1 bowlers count:', getBowlers().filter(p => p.teamId === match.team1Id).length);
    console.log('Team 2 bowlers count:', getBowlers().filter(p => p.teamId === match.team2Id).length);
  }, [squad1, squad2, match.team1Id, match.team2Id]);

  // Check if the user is authenticated
  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (match) {
      // Update the isWithinPredictionWindow state using the new function
      setIsWithinPredictionWindow(isPredictionAllowed(match));
      
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
          const questionsQuery = query(questionsRef, where("isActive", "==", true));
          const questionsSnapshot = await getDocs(questionsQuery);
        const fetchedQuestions: Question[] = [];
        
          console.log('-------- DEBUG: Fetching questions --------');
          
          // Create a map to track question types to avoid duplicates
          const questionTypeMap: Record<string, boolean> = {};
          
          questionsSnapshot.forEach((doc) => {
            const questionData = doc.data();
            console.log(`Question ID: ${doc.id}`);
            console.log(`Question Text: ${questionData.text}`);
            console.log(`Question Type: ${questionData.type}`);
            console.log(`Question Active: ${questionData.isActive}`);
            
            // Skip questions with empty text or missing text field
            if (!questionData.text || questionData.text.trim() === '') {
              console.log(`Skipping question with empty text: ${doc.id}`);
              return;
            }
            
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
            
            // Special logging for totalSixes question
            if (questionData.type === 'totalSixes') {
              console.log('FOUND TOTALSIXES QUESTION:');
              console.log('  - ID:', doc.id);
              console.log('  - Text:', questionData.text);
              console.log('  - Options:', questionData.options ? JSON.stringify(questionData.options) : 'No options found');
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
    }
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
    
    // Explicitly check if match date has passed
    if (new Date(match.date) <= new Date()) {
      toast({
        title: "Game Has Ended",
        description: "This game has ended. You cannot make predictions.",
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
    
    if (!isWithinPredictionWindow) {
      toast({
        title: "Predictions Not Open Yet",
        description: "Predictions are only allowed within 24 hours of the match start time.",
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

  // Add function to handle resetting predictions
  const handleResetPredictions = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to reset your predictions.",
        variant: "destructive",
      });
      return;
    }
    
    if (!hasPredicted) {
      toast({
        title: "No Predictions Found",
        description: "You haven't made any predictions for this match yet.",
        variant: "destructive",
      });
      return;
    }
    
    // Confirm reset
    if (!window.confirm("Are you sure you want to reset your predictions? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check if we can reset (server-side will also validate this)
      const canReset = await canResetPredictions(match.id);
      if (!canReset) {
        toast({
          title: "Cannot Reset Predictions",
          description: "Predictions can only be reset until 5 minutes before the match starts.",
          variant: "destructive",
        });
        return;
      }
      
      // Attempt to reset predictions
      await resetPredictions(user.uid, match.id);
      
      // Update local state
      setUserAnswers([]);
      setHasPredicted(false);
      setAnswers({});
      
      toast({
        title: "Predictions Reset",
        description: "Your predictions have been reset. You can now make new predictions.",
      });
    } catch (error) {
      console.error("Error resetting predictions:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset your predictions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update this function to respect the isWithinPredictionWindow flag
  const renderQuestionInput = (question: Question) => {
    const isInputDisabled = isPredictionLocked || !user || hasPredicted || !isWithinPredictionWindow;
    const userAnswer = userAnswers.find(a => a.questionId === question.id)?.answer || '';

    if (question.type === 'topBatsman' || question.type === 'topBowler') {
      // Get filtered players based on question type
      const filteredPlayers = question.type === 'topBatsman' ? getBatsmen() : getBowlers();

      return (
        <Select 
          value={answers[question.id] || userAnswer} 
          onValueChange={(value) => handleAnswerChange(question.id, value)}
          disabled={isInputDisabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a player" />
          </SelectTrigger>
          <SelectContent>
            {/* Team 1 Players */}
            <SelectItem value="team1-header" disabled className="font-bold text-primary">
              {team1?.name || match.team1Id}
            </SelectItem>
            {filteredPlayers
              .filter(p => p.teamId === match.team1Id)
              .map(player => (
                <SelectItem key={player.id} value={player.name}>
                  {player.name}
                </SelectItem>
              ))
            }
            
            {/* Team 2 Players */}
            <SelectItem value="team2-header" disabled className="font-bold text-primary">
              {team2?.name || match.team2Id}
            </SelectItem>
            {filteredPlayers
              .filter(p => p.teamId === match.team2Id)
              .map(player => (
                <SelectItem key={player.id} value={player.name}>
                  {player.name}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      );
    }
    
    if (question.type === 'winner') {
      // ... existing winner radio group code but with modified disabled prop
      return (
        <RadioGroup 
          value={answers[question.id] || userAnswer}
          onValueChange={(value) => handleAnswerChange(question.id, value)}
          disabled={isInputDisabled}
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
        </RadioGroup>
      );
    } 
    
    if (question.type === 'totalSixes') {
      console.log('Rendering totalSixes question:', question);
      console.log('Has options?', !!question.options);
      console.log('Options:', question.options);
      
      return (
        <RadioGroup 
          value={answers[question.id] || userAnswer}
          onValueChange={(value) => handleAnswerChange(question.id, value)}
          disabled={isInputDisabled}
          className="flex flex-col space-y-3"
        >
          {/* Always use hardcoded options for totalSixes to ensure reliability */}
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="12-17" id={`${question.id}-range1`} />
            <Label htmlFor={`${question.id}-range1`}>12-17 sixes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="17-22" id={`${question.id}-range2`} />
            <Label htmlFor={`${question.id}-range2`}>17-22 sixes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="22-37" id={`${question.id}-range3`} />
            <Label htmlFor={`${question.id}-range3`}>22-37 sixes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="37-42" id={`${question.id}-range4`} />
            <Label htmlFor={`${question.id}-range4`}>37-42 sixes</Label>
          </div>
        </RadioGroup>
      );
    }
    
    if (['highestTotal', 'totalRuns', 'numberOfSixes'].includes(question.type as string)) {
      // Special handling for highestTotal
      if (question.type === 'highestTotal') {
        return (
          <RadioGroup 
            value={answers[question.id] || userAnswer}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            disabled={isInputDisabled}
            className="flex flex-col space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
              <Label htmlFor={`${question.id}-yes`}>
                Yes, the total will exceed 350 runs
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id={`${question.id}-no`} />
              <Label htmlFor={`${question.id}-no`}>
                No, the total will be 350 runs or less
              </Label>
            </div>
          </RadioGroup>
        );
      }
      
      // For other numeric inputs
      return (
        <Input
          type="number"
          min="0"
          placeholder="Enter your prediction"
          value={answers[question.id] || userAnswer}
          onChange={(e) => validateNumericAnswer(question.id, e.target.value)}
          disabled={isInputDisabled}
          className="w-full"
        />
      );
    }
    
    if (question.type === 'moreSixes') {
      // Update moreSixes radio group
      return (
        <RadioGroup 
          value={answers[question.id] || userAnswer}
          onValueChange={(value) => handleAnswerChange(question.id, value)}
          disabled={isInputDisabled}
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
      );
    }
    
    if (question.options) {
      // Update options radio group
      return (
        <RadioGroup 
          value={answers[question.id] || userAnswer}
          onValueChange={(value) => handleAnswerChange(question.id, value)}
          disabled={isInputDisabled}
          className="flex flex-col space-y-3"
        >
          {question.options.map(option => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`${question.id}-${option.id}`} />
              <Label htmlFor={`${question.id}-${option.id}`}>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    }
    
    return (
      <div className="text-gray-500">No options available for this question.</div>
    );
  };

  // Log squad players specifically
  useEffect(() => {
    console.log('Squad player details:');
    
    // Print detailed information about squad1 players
    if (squad1.length > 0) {
      console.log('Team 1 squad players:');
      squad1.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.name} (${player.role}), ID: ${player.id}, TeamID: ${player.teamId}`);
      });
    } else {
      console.log('Team 1 has no squad players');
    }
    
    // Print detailed information about squad2 players
    if (squad2.length > 0) {
      console.log('Team 2 squad players:');
      squad2.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.name} (${player.role}), ID: ${player.id}, TeamID: ${player.teamId}`);
      });
    } else {
      console.log('Team 2 has no squad players');
    }
  }, [squad1, squad2]);

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
        
        {match.status === 'completed' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-lg text-gray-600">This game has ended. You cannot make predictions.</p>
          </div>
        )}
        {match.status === 'live' && (
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <p className="text-lg text-red-600">Match is currently in progress. Predictions are closed.</p>
          </div>
        )}
        
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
                <CardDescription>
                  Worth {question.points} points
                  {question.negativePoints ? ` | -${question.negativePoints} points for incorrect answers` : ''}
                </CardDescription>
                </CardHeader>
                <CardContent>
                {renderQuestionInput(question)}
                {question.type === 'totalSixes' && !userAnswer && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      If no options appear above, please try refreshing the page.
                    </p>
                        </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>
      
      {!isPredictionLocked && isWithinPredictionWindow && !hasPredicted && user && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || Object.keys(answers).length === 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Predictions
          </Button>
        </div>
      )}
      
      {userAnswers.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Your Predictions</h3>
          {hasPredicted && (
            <>
              <ul className="space-y-2 mb-4">
            {userAnswers.map(answer => {
              const question = questions.find(q => q.id === answer.questionId);
              if (!question) return null;
              
              let displayAnswer = answer.answer;
              
              // Format the answer for display
              if (question.type === 'winner') {
                displayAnswer = answer.answer === match.team1Id 
                      ? (team1?.name || match.team1Id) 
                      : (team2?.name || match.team2Id);
                  } else if (question.type === 'topBatsman' || question.type === 'topBowler') {
                if (answer.answer === 'any-team1') {
                      displayAnswer = `Any ${team1?.name || match.team1Id} Player`;
                } else if (answer.answer === 'any-team2') {
                      displayAnswer = `Any ${team2?.name || match.team2Id} Player`;
                } else {
                      // Just display the player name without team name
                      displayAnswer = answer.answer;
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
                          {answer.isCorrect 
                            ? `Correct (+${answer.pointsEarned || question.points} points)`
                            : answer.pointsEarned < 0
                              ? `Incorrect (${answer.pointsEarned} points)`
                              : 'Incorrect'
                          }
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
              
              {/* Add Reset Button */}
              <div className="mt-4">
                {!isPredictionLocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPredictions}
                    disabled={isSubmitting}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" /> 
                    Reset Predictions
                  </Button>
                )}
                {!isPredictionLocked && (
                  <p className="text-xs text-gray-500 mt-1">
                    You can reset your predictions until 5 minutes before the match starts.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {!hasPredicted && user && (
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 mb-2">Having trouble with the questions?</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleEmergencyRefresh}
            disabled={isSubmitting}
            className="text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" /> 
            Refresh Questions Database
          </Button>
        </div>
      )}
    </div>
  );
}
