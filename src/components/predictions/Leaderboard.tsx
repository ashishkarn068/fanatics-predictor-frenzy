import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardEntry } from "@/lib/types";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  getDoc,
  doc,
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COLLECTIONS } from "@/utils/firestore-collections";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardProps {
  matchId?: string;
  limit?: number;
}

// Enhanced interface to include per-question breakdown
interface EnhancedLeaderboardEntry extends LeaderboardEntry {
  questionPoints?: Array<{
    questionId: string;
    questionText: string;
    points: number;
    isCorrect: boolean;
    answer: string;
  }>;
  expanded?: boolean;
}

export default function Leaderboard({ matchId, limit = 10 }: LeaderboardProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(matchId ? "match" : "season");
  const [leaderboard, setLeaderboard] = useState<EnhancedLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Map<string, {text: string, points: number}>>(new Map());
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Add debug logging for currentUser
  useEffect(() => {
    console.log('Current User:', {
      uid: currentUser?.uid,
      displayName: currentUser?.displayName,
      isAuthenticated: !!currentUser
    });
  }, [currentUser]);

  useEffect(() => {
      setLoading(true);
      setError(null);
      
    let unsubscribe: Unsubscribe | null = null;
    
    const setupListeners = async () => {
      try {
        // First fetch all questions to have their text available
        await fetchQuestions();
        
        if (activeTab === "match" && matchId) {
          unsubscribe = await setupMatchLeaderboardListener(matchId);
        } else {
          unsubscribe = setupGlobalLeaderboardListener();
        }
      } catch (err) {
        console.error("Error setting up leaderboard listener:", err);
        setError("Failed to load leaderboard. Please try again later.");
        setLoading(false);
      }
    };
    
    // Call the async function
    setupListeners();
    
    // Clean up function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeTab, matchId]);
  
  // Fetch all questions to get their text
  const fetchQuestions = async () => {
    try {
      const questionsRef = collection(db, "questions");
      const questionsSnapshot = await getDocs(questionsRef);
      
      const questionMap = new Map<string, {text: string, points: number}>();
      
      questionsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Store by both ID and type for better matching
        questionMap.set(doc.id, {
          text: data.text,
          points: data.points || 0
        });
        
        // Also store by type if available
        if (data.type) {
          questionMap.set(data.type, {
            text: data.text,
            points: data.points || 0
          });
          
          // Store lowercase versions for case-insensitive matching
          questionMap.set(data.type.toLowerCase(), {
            text: data.text,
            points: data.points || 0
          });
        }
      });
      
      console.log('Question map created with entries:', Array.from(questionMap.keys()).join(', '));
      setQuestions(questionMap);
      
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };
  
  // Set up real-time listener for match leaderboard
  const setupMatchLeaderboardListener = async (matchId: string): Promise<Unsubscribe> => {
    try {
      // First, find the leaderboard document for this match
      const leaderboardsRef = collection(db, "leaderboards");
      const leaderboardQuery = query(
        leaderboardsRef,
        where("matchId", "==", matchId),
        where("type", "==", "match")
      );
      
      // Check if the leaderboard exists
      const leaderboardSnapshot = await getDocs(leaderboardQuery);
      
      if (leaderboardSnapshot.empty) {
        console.log(`No leaderboard found for match ${matchId}, falling back to old method`);
        // Fall back to old method if no leaderboard document exists yet
        const oldEntries = await fetchMatchLeaderboardLegacy(matchId);
        setLeaderboard(oldEntries);
        setLoading(false);
        return () => {}; // Return empty unsubscribe function
      }
      
      // Get the leaderboard document
      const leaderboardDoc = leaderboardSnapshot.docs[0];
      const leaderboardId = leaderboardDoc.id;
      
      // Now set up listener for the entries subcollection
      const entriesRef = collection(db, "leaderboards", leaderboardId, "entries");
      const entriesQuery = query(
        entriesRef,
        orderBy("points", "desc"),
        firestoreLimit(limit)
      );
      
      // Get user predictions for the match to show per-question breakdown
      return onSnapshot(entriesQuery, async (entriesSnapshot) => {
        if (entriesSnapshot.empty) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }
        
        const entries: EnhancedLeaderboardEntry[] = [];
        const userIds: string[] = [];
        
        entriesSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          const position = entries.length + 1;
          userIds.push(data.userId);
          
          entries.push({
            position,
            userId: data.userId,
            userName: data.displayName || "Anonymous User",
            userAvatar: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'A')}&background=random`,
            points: data.points || 0,
            correctPredictions: data.correctPredictions || 0,
            totalPredictions: data.totalPredictions || 0,
            accuracy: data.accuracy || 0,
            streak: 0, // Not tracked in new system yet
            trend: "neutral",
            questionPoints: [] // Will be populated below
          });
        });
        
        // Get per-question breakdown for each user
        for (const entry of entries) {
          const predictionsRef = collection(db, "predictionAnswers");
          const predictionsQuery = query(
            predictionsRef,
            where("userId", "==", entry.userId),
            where("matchId", "==", matchId)
          );
          
          const predictionsSnapshot = await getDocs(predictionsQuery);
          const questionPoints: Array<{
            questionId: string;
            questionText: string;
            points: number;
            isCorrect: boolean;
            answer: string;
          }> = [];
          
          predictionsSnapshot.forEach((doc) => {
            const prediction = doc.data();
            // Try to get question by ID first
            let question = questions.get(prediction.questionId);
            
            // If not found, try lowercase
            if (!question && prediction.questionId) {
              question = questions.get(prediction.questionId.toLowerCase());
            }
            
            // Determine question text with fallbacks for specific question types
            let questionText = question?.text;
            if (!questionText && prediction.questionId) {
              const questionId = prediction.questionId;
              questionText = 
                questionId.includes('batsman') ? 'Who will be the top batsman in this match?' :
                questionId.includes('bowler') ? 'Who will be the top bowler in this match?' :
                questionId.includes('highest') ? 'Will the match total exceed 350 runs?' :
                questionId.includes('moreSixes') || questionId.includes('more-sixes') ? 'Which team will hit more sixes?' :
                questionId.includes('totalSixes') || questionId.includes('total-sixes') ? 'How many sixes will be hit in this match?' :
                questionId.includes('winner') ? 'Which team will win this match?' :
                `Unknown Question (${questionId})`;
            }
            
            questionPoints.push({
              questionId: prediction.questionId,
              questionText: questionText || `Unknown Question (${prediction.questionId})`,
              points: prediction.pointsEarned || 0,
              isCorrect: prediction.isCorrect || false,
              answer: prediction.answer || ''
            });
          });
          
          // Sort by question text for consistent order
          questionPoints.sort((a, b) => a.questionText.localeCompare(b.questionText));
          entry.questionPoints = questionPoints;
        }
        
        setLeaderboard(entries);
        setLoading(false);
      });
    } catch (error) {
      console.error("Error setting up match leaderboard listener:", error);
      setLoading(false);
      throw error;
    }
  };
  
  // Legacy method for fetching match leaderboard (used as fallback)
  const fetchMatchLeaderboardLegacy = async (matchId: string): Promise<EnhancedLeaderboardEntry[]> => {
    try {
      const predictionsRef = collection(db, "predictionAnswers");
      const predictionsQuery = query(
        predictionsRef,
        where("matchId", "==", matchId),
        where("isCorrect", "==", true)
      );
      
      const predictionsSnapshot = await getDocs(predictionsQuery);
      
      const userPoints: Record<string, number> = {};
      const userStats: Record<string, { correct: number, total: number }> = {};
      const userQuestionPoints: Record<string, Array<{
        questionId: string;
        questionText: string;
        points: number;
        isCorrect: boolean;
        answer: string;
      }>> = {};
      const userIds: string[] = [];
      
      predictionsSnapshot.forEach((doc) => {
        const prediction = doc.data();
        const userId = prediction.userId;
        
        if (!userPoints[userId]) {
          userPoints[userId] = 0;
          userStats[userId] = { correct: 0, total: 0 };
          userQuestionPoints[userId] = [];
          userIds.push(userId);
        }
        
        userPoints[userId] += prediction.pointsEarned || 0;
        userStats[userId].correct += 1;
        
        // Try to get question by ID first
        let question = questions.get(prediction.questionId);
        
        // If not found, try lowercase
        if (!question && prediction.questionId) {
          question = questions.get(prediction.questionId.toLowerCase());
        }
        
        // Determine question text with fallbacks for specific question types
        let questionText = question?.text;
        if (!questionText && prediction.questionId) {
          const questionId = prediction.questionId;
          questionText = 
            questionId.includes('batsman') ? 'Who will be the top batsman in this match?' :
            questionId.includes('bowler') ? 'Who will be the top bowler in this match?' :
            questionId.includes('highest') ? 'Will the match total exceed 350 runs?' :
            questionId.includes('moreSixes') || questionId.includes('more-sixes') ? 'Which team will hit more sixes?' :
            questionId.includes('totalSixes') || questionId.includes('total-sixes') ? 'How many sixes will be hit in this match?' :
            questionId.includes('winner') ? 'Which team will win this match?' :
            `Unknown Question (${questionId})`;
        }
        
        userQuestionPoints[userId].push({
          questionId: prediction.questionId,
          questionText: questionText || `Unknown Question (${prediction.questionId})`,
          points: prediction.pointsEarned || 0,
          isCorrect: true,
          answer: prediction.answer || ''
        });
      });
      
      // Also get total predictions to calculate accuracy
      const allPredictionsQuery = query(
        predictionsRef,
        where("matchId", "==", matchId)
      );
      
      const allPredictionsSnapshot = await getDocs(allPredictionsQuery);
      
      allPredictionsSnapshot.forEach((doc) => {
        const prediction = doc.data();
        const userId = prediction.userId;
        
        if (userStats[userId]) {
          userStats[userId].total += 1;
        }
        
        // Add incorrect predictions to the breakdown
        if (!prediction.isCorrect && userQuestionPoints[userId]) {
          // Try to get question by ID first
          let question = questions.get(prediction.questionId);
          
          // If not found, try lowercase
          if (!question && prediction.questionId) {
            question = questions.get(prediction.questionId.toLowerCase());
          }
          
          // Determine question text with fallbacks for specific question types
          let questionText = question?.text;
          if (!questionText && prediction.questionId) {
            const questionId = prediction.questionId;
            questionText = 
              questionId.includes('batsman') ? 'Who will be the top batsman in this match?' :
              questionId.includes('bowler') ? 'Who will be the top bowler in this match?' :
              questionId.includes('highest') ? 'Will the match total exceed 350 runs?' :
              questionId.includes('moreSixes') || questionId.includes('more-sixes') ? 'Which team will hit more sixes?' :
              questionId.includes('totalSixes') || questionId.includes('total-sixes') ? 'How many sixes will be hit in this match?' :
              questionId.includes('winner') ? 'Which team will win this match?' :
              `Unknown Question (${questionId})`;
          }
          
          // Only add if not already in the array
          const exists = userQuestionPoints[userId].some(q => q.questionId === prediction.questionId);
          if (!exists) {
            userQuestionPoints[userId].push({
              questionId: prediction.questionId,
              questionText: questionText || `Unknown Question (${prediction.questionId})`,
              points: 0,
              isCorrect: false,
              answer: prediction.answer || ''
            });
          }
        }
      });
      
      const leaderboardEntries: EnhancedLeaderboardEntry[] = [];
      
      for (let i = 0; i < userIds.length; i += 10) {
        const batch = userIds.slice(i, i + 10);
        
        if (batch.length > 0) {
          for (const userId of batch) {
            // Get user data
            const userDoc = await getDoc(doc(db, "users", userId));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Sort question points by question text
              const sortedQuestionPoints = userQuestionPoints[userId]
                .slice()
                .sort((a, b) => a.questionText.localeCompare(b.questionText));
              
              leaderboardEntries.push({
                position: 0,
                userId: userId,
                userName: userData.displayName || "Anonymous User",
                userAvatar: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'A')}&background=random`,
                points: userPoints[userId],
                correctPredictions: userStats[userId].correct,
                totalPredictions: userStats[userId].total,
                accuracy: getAccuracyPercentage(userStats[userId].correct, userStats[userId].total),
                streak: 0,
                trend: "neutral",
                questionPoints: sortedQuestionPoints
              });
            }
          }
        }
      }
      
      leaderboardEntries.sort((a, b) => b.points - a.points);
      leaderboardEntries.forEach((entry, index) => {
        entry.position = index + 1;
      });
      
      return leaderboardEntries.slice(0, limit);
    } catch (error) {
      console.error("Error fetching match leaderboard:", error);
      return [];
    }
  };
  
  // Replace the season leaderboard with global leaderboard
  const setupGlobalLeaderboardListener = (): Unsubscribe => {
    try {
      const globalLeaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
      const leaderboardQuery = query(
        globalLeaderboardRef,
        orderBy("totalPoints", "desc"),
        firestoreLimit(limit)
      );
      
      return onSnapshot(leaderboardQuery, (snapshot) => {
        const entries: EnhancedLeaderboardEntry[] = [];
        
        let position = 1;
        snapshot.forEach((docSnapshot) => {
          const userData = docSnapshot.data();
          
          // Debug log for each entry
          console.log('Leaderboard Entry:', {
            userId: userData.userId,
            displayName: userData.displayName,
            matchesCurrentUser: currentUser?.uid === userData.userId
          });
          
          entries.push({
            position: position++,
            userId: userData.userId,
            userName: userData.displayName || "Anonymous User",
            userAvatar: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'A')}&background=random`,
            points: userData.totalPoints || 0,
            correctPredictions: userData.correctPredictions || 0,
            totalPredictions: userData.totalPredictions || 0,
            accuracy: userData.accuracy || 0,
            streak: 0,
            trend: "neutral"
          });
        });

        // Debug log for final entries
        console.log('Final Leaderboard:', {
          totalEntries: entries.length,
          currentUserEntry: entries.find(e => e.userId === currentUser?.uid),
          allUserIds: entries.map(e => e.userId)
        });
        
        setLeaderboard(entries);
        setLoading(false);
      });
    } catch (error) {
      console.error("Error setting up global leaderboard listener:", error);
      setLoading(false);
      
      // Fallback to users collection if global leaderboard fails
      try {
        const usersRef = collection(db, "users");
        const usersQuery = query(
          usersRef,
          orderBy("totalPoints", "desc"),
          firestoreLimit(limit)
        );
        
        return onSnapshot(usersQuery, (snapshot) => {
          const entries: EnhancedLeaderboardEntry[] = [];
          
          snapshot.forEach((docSnapshot) => {
            const userData = docSnapshot.data();
            const position = entries.length + 1;
            
            // Debug log for fallback entries
            console.log('Fallback Entry:', {
              userId: userData.uid,
              displayName: userData.displayName,
              matchesCurrentUser: currentUser?.uid === userData.uid
            });
            
            entries.push({
              position,
              userId: userData.uid,
              userName: userData.displayName || "Anonymous User",
              userAvatar: userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'A')}&background=random`,
              points: userData.totalPoints || 0,
              correctPredictions: userData.correctPredictions || 0,
              totalPredictions: userData.totalPredictions || 0,
              accuracy: userData.overallAccuracy || 0,
              streak: userData.longestStreak || 0,
              trend: "neutral"
            });
          });
          
          // Debug log for final fallback entries
          console.log('Final Fallback Leaderboard:', {
            totalEntries: entries.length,
            currentUserEntry: entries.find(e => e.userId === currentUser?.uid),
            allUserIds: entries.map(e => e.userId)
          });
          
          setLeaderboard(entries);
          setLoading(false);
        });
      } catch (fallbackError) {
        console.error("Error setting up fallback leaderboard listener:", fallbackError);
        setLoading(false);
        return () => {}; // Return empty unsubscribe function
      }
    }
  };
  
  const getAccuracyPercentage = (correct: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Prediction Leaderboard</CardTitle>
        <CardDescription>
          See who's leading in the prediction challenge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            {matchId && <TabsTrigger value="match">This Match</TabsTrigger>}
            <TabsTrigger value="season">Global</TabsTrigger>
          </TabsList>
          
          <TabsContent value="match" className="space-y-4">
            {renderMatchLeaderboard()}
          </TabsContent>
          
          <TabsContent value="season" className="space-y-4">
            {renderStandardLeaderboard()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
  
  function renderMatchLeaderboard() {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
      ));
    }
    
    if (error) {
      return <p className="text-red-500">{error}</p>;
    }
    
    if (leaderboard.length === 0) {
      return <p className="text-gray-500 py-4">No leaderboard data available yet. Once users submit predictions and match results are updated, the leaderboard will appear here.</p>;
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-12 text-sm font-medium text-gray-500 border-b pb-2">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-right">Points</div>
          <div className="col-span-2 text-right">Correct</div>
          <div className="col-span-2 text-right">Accuracy</div>
        </div>
        
        {leaderboard.map((entry) => (
          <div key={entry.userId}>
            <Collapsible 
              open={expandedUser === entry.userId} 
              onOpenChange={() => toggleUserExpanded(entry.userId)}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <div 
                  className="grid grid-cols-12 items-center py-2 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                >
                  <div className="col-span-1 font-semibold">
                    {entry.position <= 3 ? (
                      <span className={`
                        inline-flex items-center justify-center w-6 h-6 rounded-full 
                        ${entry.position === 1 ? 'bg-yellow-100 text-yellow-800' : 
                          entry.position === 2 ? 'bg-gray-100 text-gray-800' : 
                          'bg-amber-100 text-amber-800'}
                      `}>
                        {entry.position === 1 ? <Trophy className="h-3 w-3" /> : entry.position}
                      </span>
                    ) : (
                      entry.position
                    )}
                  </div>
                  
                  <div className="col-span-5 flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage 
                        src={entry.userAvatar} 
                        alt={entry.userName} 
                        referrerPolicy="no-referrer"
                      />
                      <AvatarFallback>
                        {entry.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{entry.userName}</span>
                    {currentUser?.uid === entry.userId && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedUser === entry.userId ? 'transform rotate-180' : ''}`} />
                  </div>
                  
                  <div className="col-span-2 text-right font-semibold">
                    {entry.points}
                  </div>
                  
                  <div className="col-span-2 text-right">
                    {entry.correctPredictions}/{entry.totalPredictions}
                  </div>
                  
                  <div className="col-span-2 text-right">
                    <Badge variant="outline" className={`
                      ${entry.accuracy >= 70 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : entry.accuracy >= 50
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }
                    `}>
                      {Math.round(entry.accuracy)}%
                    </Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-2 mb-4 pl-10 pr-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead className="text-right">Result</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.questionPoints && entry.questionPoints.map((qp) => (
                        <TableRow key={qp.questionId}>
                          <TableCell className="font-medium">{qp.questionText}</TableCell>
                          <TableCell>{qp.answer.length > 25 ? qp.answer.substring(0, 25) + '...' : qp.answer}</TableCell>
                          <TableCell className="text-right">
                            {qp.isCorrect ? (
                              <Badge className="bg-green-50 text-green-700 border-green-200">Correct</Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border-red-200">Incorrect</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {qp.points > 0 ? (
                              <span className="text-green-600">+{qp.points}</span>
                            ) : qp.points < 0 ? (
                              <span className="text-red-600">{qp.points}</span>
                            ) : (
                              <span className="text-gray-500">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">Total Points</TableCell>
                        <TableCell className="text-right font-bold">{entry.points}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ))}
      </div>
    );
  }
  
  function renderStandardLeaderboard() {
    if (loading) {
      return Array(5).fill(0).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
      ));
    }
    
    if (error) {
      return <p className="text-red-500">{error}</p>;
    }
    
    if (leaderboard.length === 0) {
      return <p className="text-gray-500 py-4">No leaderboard data available yet. Once users submit predictions and match results are updated, the leaderboard will appear here.</p>;
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-12 text-sm font-medium text-gray-500 border-b pb-2">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-right">Points</div>
          <div className="col-span-2 text-right">Correct</div>
          <div className="col-span-2 text-right">Accuracy</div>
        </div>
        
        {leaderboard.map((entry) => (
          <div 
            key={entry.userId} 
            className="grid grid-cols-12 items-center py-2 hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="col-span-1 font-semibold">
              {entry.position <= 3 ? (
                <span className={`
                  inline-flex items-center justify-center w-6 h-6 rounded-full 
                  ${entry.position === 1 ? 'bg-yellow-100 text-yellow-800' : 
                    entry.position === 2 ? 'bg-gray-100 text-gray-800' : 
                    'bg-amber-100 text-amber-800'}
                `}>
                  {entry.position === 1 ? <Trophy className="h-3 w-3" /> : entry.position}
                </span>
              ) : (
                entry.position
              )}
            </div>
            
            <div className="col-span-5 flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={entry.userAvatar} 
                  alt={entry.userName} 
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback>
                  {entry.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium truncate">{entry.userName}</span>
              {currentUser?.uid === entry.userId && (
                <Badge variant="outline" className="ml-2">You</Badge>
              )}
            </div>
            
            <div className="col-span-2 text-right font-semibold">
              {entry.points}
            </div>
            
            <div className="col-span-2 text-right">
              {entry.correctPredictions}/{entry.totalPredictions}
            </div>
            
            <div className="col-span-2 text-right">
              <Badge variant="outline" className={`
                ${entry.accuracy >= 70 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : entry.accuracy >= 50
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }
              `}>
                {Math.round(entry.accuracy)}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }
}
