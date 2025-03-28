import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, Timestamp, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/utils/firestore-collections";
import { COLLECTIONS as LIB_COLLECTIONS } from "@/lib/firestore";
import { ChevronLeft, Trophy, ChevronDown, ChevronUp, Search, AlertTriangle, RefreshCw, Loader2, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateTime, getAvatarFallback } from "@/lib/utils";
import { getTeamLogoUrl } from "@/utils/team-utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuestionPoint {
  questionId: string;
  questionText: string;
  points: number;
  isCorrect?: boolean;
  answer?: string;
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  questionsPoints: QuestionPoint[];
}

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  negativePoints?: number;
}

interface MatchData {
  id: string;
  team1: string;
  team2: string;
  venue: string;
  date: Timestamp | string;
  status?: 'upcoming' | 'live' | 'completed';
  result?: {
    winner: string;
    team1Score?: string;
    team2Score?: string;
  };
}

const PAGE_SIZE = 10;

const MatchLeaderboard = () => {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [match, setMatch] = useState<MatchData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [hasPendingEvaluations, setHasPendingEvaluations] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter leaderboard entries based on search query and pagination
  const filteredLeaderboard = leaderboard.filter(entry => {
    // Always show the current user's entry
    if (currentUser && entry.userId === currentUser.uid) {
      return true;
    }

    // For other users' entries:
    // 1. Must match search query if one exists
    const matchesSearch = entry.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Only show if:
    //    - User is admin, OR
    //    - Match is completed and results are updated
    const canViewOtherPredictions = isAdmin || (match?.status === 'completed' && !hasPendingEvaluations);

    return matchesSearch && canViewOtherPredictions;
  });

  // Get paginated entries
  const paginatedEntries = filteredLeaderboard.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Update hasMore based on filtered results
  useEffect(() => {
    setHasMore((currentPage * PAGE_SIZE) < filteredLeaderboard.length);
  }, [currentPage, filteredLeaderboard.length]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (!matchId) {
      setError("Match ID is missing");
      setLoading(false);
      return;
    }
    
    // Function to fetch match and leaderboard data
    const fetchMatchAndLeaderboard = async () => {
      setLoading(true);
      try {
        // Fetch match data
        const matchDoc = await getDoc(doc(db, COLLECTIONS.MATCHES, matchId));
        if (!matchDoc.exists()) {
          setError("Match not found");
          return;
        }
        
        const matchData = matchDoc.data() as MatchData;
        matchData.id = matchDoc.id;
        setMatch(matchData);
        
        // Also check if the match has been evaluated by looking at the match result document
        const matchResultDoc = await getDoc(doc(db, COLLECTIONS.MATCH_RESULTS, matchId));
        const isMatchEvaluated = matchResultDoc.exists() && matchResultDoc.data().isEvaluated === true;
        
        console.log(`Match status: ${matchData.status}, isEvaluated: ${isMatchEvaluated}`);
        
        // First fetch questions and wait for them to load
        const questionsSnapshot = await getDocs(collection(db, COLLECTIONS.QUESTIONS));
        const questionsList: Question[] = [];
        
        questionsSnapshot.forEach((doc) => {
          const questionData = doc.data() as Question;
          questionsList.push({
            ...questionData,
            id: doc.id
          });
        });
        
        console.log(`Loaded ${questionsList.length} questions:`, questionsList.map(q => q.id).join(', '));
        setQuestions(questionsList);
        
        // Create a map of question types to question text for easier lookup
        const questionMap = new Map<string, string>();
        questionsList.forEach(q => {
          // Map both by ID and by type
          questionMap.set(q.id, q.text);
          if (q.type) {
            questionMap.set(q.type, q.text);
            // Also map lowercase versions for case-insensitive matching
            questionMap.set(q.type.toLowerCase(), q.text);
          }
        });
        
        console.log('Question map created with entries:', Array.from(questionMap.entries()).map(([k, v]) => `${k} -> ${v}`).join(', '));
        
        // Now fetch leaderboard data with the loaded questions
        const predictionsRef = collection(db, LIB_COLLECTIONS.PREDICTION_ANSWERS);
        const predictionsQuery = query(
          predictionsRef,
          where("matchId", "==", matchId)
        );
        
        const predictionsSnapshot = await getDocs(predictionsQuery);
        console.log(`Found ${predictionsSnapshot.size} prediction answers for this match`);
        
        // Track unique users and their predictions
        const userEntries = new Map<string, {
          userId: string,
          displayName: string,
          photoURL: string | null,
          totalPoints: number,
          correctPredictions: number,
          totalPredictions: number,
          questionsPoints: Array<{
            questionId: string;
            questionText: string;
            points: number;
            isCorrect?: boolean;
            answer: string;
          }>
        }>();

        // First, collect all unique userIds from predictions
        const userIds = new Set<string>();
        predictionsSnapshot.forEach(doc => {
          const prediction = doc.data();
          if (prediction.userId) {
            userIds.add(prediction.userId);
          }
        });

        console.log(`Found ${userIds.size} unique users with predictions`);

        // Fetch all user data in one batch
        const userDataMap = new Map<string, { displayName: string; photoURL: string | null }>();
        const userPromises = Array.from(userIds).map(async (userId) => {
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.uid === userId) {
              userDataMap.set(userId, {
                displayName: userData.displayName || "Anonymous User",
                photoURL: userData.photoURL || null
              });
            }
          }
        });
        
        await Promise.all(userPromises);
        console.log(`Loaded user data for ${userDataMap.size} users`);

        // Process each prediction answer
        let pendingCount = 0;
        
        predictionsSnapshot.forEach((doc) => {
          const prediction = doc.data();
          const userId = prediction.userId;
          
          if (!userId) return;
          
          // Get or create user entry
          if (!userEntries.has(userId)) {
            const userData = userDataMap.get(userId) || {
              displayName: "Anonymous User",
              photoURL: null
            };
            
            userEntries.set(userId, {
              userId,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              totalPoints: 0,
              correctPredictions: 0,
              totalPredictions: 0,
              questionsPoints: []
            });
          }
          
          const entry = userEntries.get(userId)!;
          
          // Update prediction statistics
          entry.totalPredictions++;
          
          // Find the matching question
          const questionId = prediction.questionId;
          
          // First try to find the exact question text from our map
          let questionText = questionMap.get(questionId);
          
          // If not found directly, try lowercase version
          if (!questionText && questionId) {
            questionText = questionMap.get(questionId.toLowerCase());
          }
          
          // If still not found, use our fallbacks
          if (!questionText) {
            questionText = 
              questionId?.includes('batsman') ? 'Who will be the top batsman in this match?' :
              questionId?.includes('bowler') ? 'Who will be the top bowler in this match?' :
              questionId?.includes('highest') ? 'Will the match total exceed 350 runs?' :
              questionId?.includes('moreSixes') || questionId?.includes('more-sixes') ? 'Which team will hit more sixes?' :
              questionId?.includes('totalSixes') || questionId?.includes('total-sixes') ? 'How many sixes will be hit in this match?' :
              questionId?.includes('winner') ? 'Which team will win this match?' :
              `Unknown Question (${questionId})`;
          }
          
          // Check if this prediction has been evaluated
          if (prediction.isCorrect !== undefined) {
            if (prediction.isCorrect) {
              entry.correctPredictions++;
            }
            const pointsEarned = prediction.pointsEarned || 0;
            entry.totalPoints += pointsEarned; // This will add positive points and subtract negative points
            
            console.log(`Prediction for user ${userId}, question ${questionId}: IsCorrect: ${prediction.isCorrect}, Points: ${pointsEarned}`);
          } else if (matchData.status === 'completed') {
            pendingCount++;
            console.log(`Pending evaluation for user ${userId}, question ${questionId}`);
          }
          
          // Add question point with all the details
          entry.questionsPoints.push({
            questionId: prediction.questionId,
            questionText: questionText || `Unknown Question (${questionId})`,
            points: prediction.pointsEarned || 0,
            isCorrect: prediction.isCorrect,
            answer: prediction.answer || 'No answer'
          });
        });
        
        // Set the flag for pending evaluations if needed
        const hasPending = pendingCount > 0 && matchData.status === 'completed';
        console.log(`Setting hasPendingEvaluations: ${hasPending} (pendingCount: ${pendingCount}, matchStatus: ${matchData.status})`);
        setHasPendingEvaluations(hasPending);
        
        // Convert map to array and sort by total points, accuracy, and name
        const entries = Array.from(userEntries.values())
          .sort((a, b) => {
            // First, compare by total points
            if (b.totalPoints !== a.totalPoints) {
              return b.totalPoints - a.totalPoints;
            }
            
            // If points are equal, compare by accuracy
            const aAccuracy = a.totalPredictions > 0 ? (a.correctPredictions / a.totalPredictions) * 100 : 0;
            const bAccuracy = b.totalPredictions > 0 ? (b.correctPredictions / b.totalPredictions) * 100 : 0;
            if (bAccuracy !== aAccuracy) {
              return bAccuracy - aAccuracy;
            }
            
            // If both points and accuracy are equal, sort by name alphabetically
            return a.displayName.localeCompare(b.displayName);
          });
        
        setLeaderboard(entries);
        
        // Check if current user is admin
        if (currentUser) {
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsAdmin(userData.role === 'admin');
          }
        }
        
      } catch (error) {
        console.error("Error fetching match and leaderboard:", error);
        setError("Failed to load match leaderboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchAndLeaderboard();
  }, [matchId, currentUser]);
  
  // Toggle expanded user display
  const toggleUserExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
    }
  };
  
  const handleReEvaluate = async () => {
    if (matchId) {
      try {
        setLoading(true);
        setEvaluating(true);
        const { evaluateMatchPredictions } = await import('@/utils/firestore-collections');
        await evaluateMatchPredictions(matchId);
        toast({
          title: "Predictions Re-evaluated",
          description: "Match predictions have been re-evaluated. Refresh the page to see the updated results.",
        });
        // Refresh the page to show updated results
        window.location.reload();
      } catch (error) {
        console.error("Error evaluating predictions:", error);
        toast({
          title: "Evaluation Failed",
          description: "Failed to re-evaluate predictions. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
        setEvaluating(false);
      }
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate(-1)}
            disabled
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex flex-col gap-6">
            <Skeleton className="h-12 w-3/4 max-w-md" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (error || !match) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error || "Failed to load match leaderboard"}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const formatMatchDate = (date: Timestamp | string) => {
    if (date instanceof Timestamp) {
      return formatDateTime(date.toDate());
    } else if (typeof date === 'string') {
      return formatDateTime(date);
    }
    return 'Date not available';
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
          Back
        </Button>
        
        <div className="flex flex-col gap-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6" /> 
            Match Leaderboard
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">How Rankings are Determined</h4>
                  <p className="text-sm text-muted-foreground">
                    Players are ranked based on the following criteria in order:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>Total points earned (highest first)</li>
                    <li>Prediction accuracy percentage (highest first)</li>
                    <li>Player name (alphabetically) if points and accuracy are equal</li>
                  </ol>
                </div>
              </PopoverContent>
            </Popover>
          </h1>
          
          {/* Match Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
                <h1 className="text-2xl font-bold mb-1">{match.team1} vs {match.team2}</h1>
                <p className="text-gray-600">{match.venue}</p>
                <p className="text-gray-600">{formatMatchDate(match.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-gray-500">
                  {match.status || 'Status not available'}
                </Badge>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">How Rankings are Determined</h4>
                      <p className="text-sm text-muted-foreground">
                        Players are ranked based on the following criteria in order:
                      </p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>Total points earned (highest first)</li>
                        <li>Prediction accuracy percentage (highest first)</li>
                        <li>Player name (alphabetically) if points and accuracy are equal</li>
                      </ol>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Teams and Score Display */}
            <div className="flex flex-col md:flex-row items-center justify-center mt-8 space-y-6 md:space-y-0">
              <div className="flex flex-col items-center text-center md:w-1/3">
                <div className="h-24 w-24 flex items-center justify-center">
                  <img 
                    src={getTeamLogoUrl(match.team1)} 
                    alt={match.team1} 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/images/teams/default.png";
                    }}
                  />
                </div>
                <h2 className="text-xl font-bold">{match.team1}</h2>
              </div>

              <div className="flex flex-col items-center justify-center md:w-1/3">
                <div className="text-3xl font-bold mb-2">VS</div>
                {match.status === 'completed' && match.result && (
                  <div className="flex flex-col items-center space-y-4 mt-8">
                    {/* Score Display with Trophy */}
                    <div className="relative w-full max-w-xl">
                      {/* Trophy Container - Positioned above scores */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                        <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
                      </div>
                      
                      {/* Score Container */}
                      <div className="flex items-center justify-between w-full bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-lg p-6 shadow-md">
                        {/* Team 1 Score */}
                        <div className={`text-2xl font-bold ${match.result.winner === match.team1 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {match.result.team1Score || '0'}
                        </div>
                        
                        {/* VS Separator */}
                        <div className="text-xl font-medium text-gray-500 mx-4">
                          vs
                        </div>
                        
                        {/* Team 2 Score */}
                        <div className={`text-2xl font-bold ${match.result.winner === match.team2 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {match.result.team2Score || '0'}
                        </div>
                      </div>
                    </div>

                    {/* Winner Announcement */}
                    <div className="bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100 px-6 py-3 rounded-full border border-yellow-200 shadow-sm">
                      <span className="text-lg font-semibold text-yellow-800">
                        {match.result.winner} won the match!
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center text-center md:w-1/3">
                <div className="h-24 w-24 flex items-center justify-center">
                  <img 
                    src={getTeamLogoUrl(match.team2)} 
                    alt={match.team2} 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = "/images/teams/default.png";
                    }}
                  />
                </div>
                <h2 className="text-xl font-bold">{match.team2}</h2>
              </div>
            </div>
          </div>
          
          {/* Evaluation Status Messages */}
          {match.status === 'completed' && hasPendingEvaluations && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Pending Evaluation</AlertTitle>
              <AlertDescription>
                Some predictions for this match have not been evaluated yet. 
                {isAdmin 
                  ? ' As an admin, you can click the "Re-evaluate Predictions" button below to evaluate all predictions.' 
                  : ' An admin needs to evaluate the match results for your predictions to be scored correctly.'}
              </AlertDescription>
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="mt-2 bg-amber-100 hover:bg-amber-200 border-amber-300"
                  onClick={handleReEvaluate}
                  disabled={evaluating}
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-evaluate Predictions
                    </>
                  )}
                </Button>
              )}
            </Alert>
          )}
          
          {/* Leaderboard */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <h2 className="text-xl font-semibold">
                  {leaderboard.length === 0 ? 'No predictions yet' : 'Player Rankings'}
                </h2>
                
                <div className="flex items-center gap-2">
                  {isAdmin && match?.status === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleReEvaluate}
                      disabled={evaluating}
                    >
                      {evaluating ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Re-evaluate Predictions
                        </>
                      )}
                    </Button>
                  )}
                  
                  <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-4 w-4 text-gray-500" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search players..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add visibility notice */}
            {!isAdmin && match?.status !== 'completed' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800 text-sm">
                  Other players' predictions will be visible once the match is completed and results are updated.
                </p>
              </div>
            )}
            {!isAdmin && match?.status === 'completed' && hasPendingEvaluations && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-yellow-800 text-sm">
                  Other players' predictions will be visible once the match results are evaluated.
                </p>
              </div>
            )}
            
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                {match.status === 'completed' ? (
                  <p>No data available for this match leaderboard.</p>
                ) : (
                  <p>Leaderboard will be available once predictions are made and the match is completed.</p>
                )}
              </div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <p>No players found matching your search.</p>
              </div>
            ) : (
              <div className="relative overflow-x-auto w-full">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="p-4 text-left w-1/12 text-sm font-medium text-gray-700">Rank</th>
                      <th className="p-4 text-left w-5/12 text-sm font-medium text-gray-700">Player</th>
                      <th className="p-4 text-right w-3/12 text-sm font-medium text-gray-700">Points</th>
                      <th className="p-4 text-right w-2/12 text-sm font-medium text-gray-700">Accuracy</th>
                      <th className="w-1/12 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedEntries.map((entry, index) => (
                      <>
                        <tr 
                          key={`row-${entry.userId}`}
                          className={`
                            border-b border-gray-100 cursor-pointer
                            ${expandedUser === entry.userId ? 'bg-gray-100' : 'hover:bg-gray-50'}
                            ${currentUser?.uid === entry.userId ? 'bg-blue-50 hover:bg-blue-100' : ''}
                          `}
                          onClick={() => toggleUserExpand(entry.userId)}
                        >
                          <td className="p-4 w-1/12 whitespace-nowrap">
                            {((currentPage - 1) * PAGE_SIZE + index) === 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full">
                                <Trophy className="h-4 w-4" />
                              </span>
                            ) : ((currentPage - 1) * PAGE_SIZE + index) === 1 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded-full">
                                2
                              </span>
                            ) : ((currentPage - 1) * PAGE_SIZE + index) === 2 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-800 rounded-full">
                                3
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 text-gray-600 rounded-full">
                                {(currentPage - 1) * PAGE_SIZE + index + 1}
                              </span>
                            )}
                          </td>
                          <td className="p-4 w-5/12">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage 
                                  src={entry.photoURL || undefined} 
                                  alt={entry.displayName}
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>
                                  {getAvatarFallback(entry.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{entry.displayName}</span>
                              {currentUser?.uid === entry.userId && (
                                <Badge variant="outline" className="ml-2">You</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 w-3/12 text-right whitespace-nowrap">
                            {match.status !== 'completed' ? (
                              <span className="text-gray-500 font-medium">Pending</span>
                            ) : hasPendingEvaluations ? (
                              <span className="text-amber-600 font-medium">Evaluating</span>
                            ) : entry.totalPoints > 0 ? (
                              <span className="text-green-600 font-medium">+{entry.totalPoints}</span>
                            ) : entry.totalPoints < 0 ? (
                              <span className="text-red-600 font-medium">{entry.totalPoints}</span>
                            ) : (
                              <span className="text-gray-500 font-medium">0</span>
                            )}
                          </td>
                          <td className="p-4 w-2/12 text-right whitespace-nowrap">
                            {entry.totalPredictions > 0 && entry.correctPredictions > 0
                              ? <span>{Math.round((entry.correctPredictions / entry.totalPredictions) * 100)}%</span>
                              : match.status !== 'completed'
                                ? <span className="text-gray-500">Pending</span>
                                : hasPendingEvaluations
                                  ? <span className="text-amber-600">—</span>
                                  : <span className="text-gray-500">0%</span>
                            }
                          </td>
                          <td className="px-2 w-1/12">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleUserExpand(entry.userId);
                              }}
                            >
                              {expandedUser === entry.userId ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                        {expandedUser === entry.userId && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="p-0">
                              <div className="p-4 border-t border-gray-200">
                                <h3 className="font-semibold mb-4 text-gray-700">Prediction Breakdown</h3>
                                {entry.questionsPoints.length === 0 ? (
                                  <p className="text-gray-600 text-sm">No predictions made for this match</p>
                                ) : (
                                  <div className="rounded border border-gray-200 overflow-hidden">
                                    <table className="w-full table-fixed">
                                      <thead>
                                        <tr className="border-b border-gray-200 bg-gray-100">
                                          <th className="p-3 text-left w-5/12 text-sm font-medium text-gray-700">Question</th>
                                          <th className="p-3 text-left w-5/12 text-sm font-medium text-gray-700">Prediction</th>
                                          <th className="p-3 text-center w-1/12 text-sm font-medium text-gray-700">Status</th>
                                          <th className="p-3 text-right w-1/12 text-sm font-medium text-gray-700">Points</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {entry.questionsPoints.map((qp) => (
                                          <tr key={qp.questionId} className="border-b border-gray-100">
                                            <td className="p-3 font-medium w-5/12">{qp.questionText}</td>
                                            <td className="p-3 w-5/12">{qp.answer}</td>
                                            <td className="p-3 text-center w-1/12">
                                              {qp.isCorrect === true ? (
                                                <Badge className="bg-green-50 text-green-700 border-green-200">Correct</Badge>
                                              ) : qp.isCorrect === false ? (
                                                <Badge className="bg-red-50 text-red-700 border-red-200">Incorrect</Badge>
                                              ) : (
                                                <Badge variant="outline" className="text-amber-600">
                                                  {match.status === 'completed' ? 'Pending Evaluation' : 'Awaiting Result'}
                                                </Badge>
                                              )}
                                            </td>
                                            <td className="p-3 text-right w-1/12">
                                              {qp.points > 0 ? (
                                                <span className="text-green-600 font-medium">+{qp.points}</span>
                                              ) : qp.points < 0 ? (
                                                <span className="text-red-500 font-medium">{qp.points}</span>
                                              ) : qp.isCorrect === false ? (
                                                <span className="text-red-500 font-medium">0</span>
                                              ) : (
                                                <span className="text-gray-500 font-medium">
                                                  {match.status === 'completed' ? '0' : '—'}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr className="bg-gray-50 border-t border-gray-200">
                                          <td colSpan={3} className="p-3 text-right font-bold">Total Points</td>
                                          <td className="p-3 text-right font-bold w-1/12">
                                            {match.status !== 'completed' ? (
                                              <span className="text-gray-500 font-medium">Pending</span>
                                            ) : hasPendingEvaluations ? (
                                              <span className="text-amber-600 font-medium">Evaluating</span>
                                            ) : entry.totalPoints > 0 ? (
                                              <span className="text-green-600">{entry.totalPoints}</span>
                                            ) : entry.totalPoints < 0 ? (
                                              <span className="text-red-600">{entry.totalPoints}</span>
                                            ) : (
                                              <span className="text-gray-500">0</span>
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>

                {/* Add pagination controls */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, filteredLeaderboard.length)} of {filteredLeaderboard.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!hasMore}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MatchLeaderboard; 