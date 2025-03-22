import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, Timestamp, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/utils/firestore-collections";
import { COLLECTIONS as LIB_COLLECTIONS } from "@/lib/firestore";
import { ChevronLeft, Trophy, ChevronDown, ChevronUp, Search, AlertTriangle, RefreshCw } from "lucide-react";
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
  
  // Filter leaderboard entries based on search query
  const filteredLeaderboard = leaderboard.filter(entry => 
    entry.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          const matchingQuestion = questionsList.find(q => 
            q.id === questionId || 
            q.type === questionId || 
            q.id.toLowerCase() === questionId.toLowerCase()
          );
          
          const questionText = matchingQuestion 
            ? matchingQuestion.text 
            : questionId.includes('batsman') ? 'Top Batsman'
            : questionId.includes('bowler') ? 'Top Bowler'
            : questionId.includes('highest') ? 'Highest Total'
            : questionId.includes('sixes') ? 'More Sixes'
            : questionId.includes('winner') ? 'Match Winner'
            : `Question ${questionId}`;
          
          // Check if this prediction has been evaluated
          if (prediction.isCorrect === true) {
            entry.correctPredictions++;
            const pointsEarned = prediction.pointsEarned || 0;
            entry.totalPoints += pointsEarned;
            
            console.log(`Correct prediction for user ${userId}, question ${questionId}: ${pointsEarned} points`);
          } else if (prediction.isCorrect === undefined && matchData.status === 'completed') {
            pendingCount++;
            console.log(`Pending evaluation for user ${userId}, question ${questionId}`);
          }
          
          // Add question point with all the details
          entry.questionsPoints.push({
            questionId: prediction.questionId,
            questionText: questionText,
            points: prediction.pointsEarned || 0,
            isCorrect: prediction.isCorrect,
            answer: prediction.answer || 'No answer'
          });
        });
        
        // Set the flag for pending evaluations if needed
        const hasPending = pendingCount > 0 && matchData.status === 'completed';
        console.log(`Setting hasPendingEvaluations: ${hasPending} (pendingCount: ${pendingCount}, matchStatus: ${matchData.status})`);
        setHasPendingEvaluations(hasPending);
        
        // Convert map to array and sort by total points
        const entries = Array.from(userEntries.values())
          .sort((a, b) => b.totalPoints - a.totalPoints);
        
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
          </h1>
          
          {/* Match details */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {match.team1} vs {match.team2}
                </h2>
                <p className="text-gray-600">{match.venue}</p>
                <p className="text-gray-600">{formatMatchDate(match.date)}</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 flex items-center justify-center">
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
                </div>
                
                <div className="text-2xl font-bold">VS</div>
                
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 flex items-center justify-center">
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
                </div>
              </div>
              
              <div>
                {match.status === 'completed' ? (
                  <Badge variant="default" className="bg-green-600">Completed</Badge>
                ) : match.status === 'live' ? (
                  <Badge variant="default" className="bg-red-600 animate-pulse">Live</Badge>
                ) : (
                  <Badge variant="outline">Upcoming</Badge>
                )}
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
                <h2 className="text-xl font-semibold">{leaderboard.length === 0 ? 'No predictions yet' : 'Player Rankings'}</h2>
                
                <div className="flex items-center gap-2">
                  {isAdmin && match.status === 'completed' && (
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
                  <tbody>
                    {filteredLeaderboard.map((entry, index) => (
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
                            {index === 0 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full">
                                <Trophy className="h-4 w-4" />
                              </span>
                            ) : index === 1 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded-full">
                                2
                              </span>
                            ) : index === 2 ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-800 rounded-full">
                                3
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-50 text-gray-600 rounded-full">
                                {index + 1}
                              </span>
                            )}
                          </td>
                          <td className="p-4 w-5/12">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={entry.photoURL || undefined} />
                                <AvatarFallback>{getAvatarFallback(entry.displayName)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{entry.displayName}</span>
                              {currentUser?.uid === entry.userId && (
                                <Badge variant="outline" className="ml-2">You</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-4 w-3/12 text-right whitespace-nowrap">
                            {entry.totalPoints > 0 ? (
                              <span className="text-green-600 font-medium">{entry.totalPoints}</span>
                            ) : match.status !== 'completed' ? (
                              <span className="text-gray-500 font-medium">Pending</span>
                            ) : hasPendingEvaluations ? (
                              <span className="text-amber-600 font-medium">Evaluating</span>
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
                                            {entry.totalPoints > 0 ? (
                                              <span className="text-green-600">{entry.totalPoints}</span>
                                            ) : match.status !== 'completed' ? (
                                              <span className="text-gray-500">Pending</span>
                                            ) : hasPendingEvaluations ? (
                                              <span className="text-amber-600">Evaluating</span>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MatchLeaderboard; 