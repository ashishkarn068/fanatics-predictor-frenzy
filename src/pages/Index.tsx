import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Trophy, ArrowRight, Calendar, Users, Target, TrendingUp, Clock, ChevronRight, Flame, Award, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Match, COLLECTIONS } from "@/utils/firestore-collections";
import { Timestamp } from "firebase/firestore";
import { Countdown, CountdownCompact } from "@/components/ui/countdown";
import { getTeamLogoUrl, getTeamAbbreviation, getTeamDisplayName } from "@/utils/team-utils";

// Define interfaces
interface LeaderboardEntry {
  odUserId: string;
  displayName: string;
  photoURL?: string;
  totalPoints: number;
  correctPredictions?: number;
  totalPredictions?: number;
  accuracy?: number;
  rank?: number;
}

interface UserStats {
  totalPoints: number;
  rank: number;
  accuracy: number;
  matchesPlayed: number;
  correctPredictions: number;
  totalPredictions: number;
}

interface RecentPrediction {
  matchId: string;
  team1: string;
  team2: string;
  prediction: string;
  result: 'correct' | 'incorrect' | 'pending';
  points: number;
  date: string;
}

const Index = () => {
  const { currentUser, loading } = useAuth();
  const [featuredMatch, setFeaturedMatch] = useState<Match | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [recentPredictions, setRecentPredictions] = useState<RecentPrediction[]>([]);
  const [predictionsLoading, setPredictionsLoading] = useState(true);
  
  // Fetch upcoming matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setMatchesLoading(true);
        const matchesRef = collection(db, COLLECTIONS.MATCHES);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const q = query(
          matchesRef,
          where("date", ">=", today),
          orderBy("date", "asc"),
          limit(4)
        );
        
        const querySnapshot = await getDocs(q);
        const matches: Match[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date;
          matches.push({ id: doc.id, ...data, date } as Match);
        });
        
        if (matches.length > 0) {
          setFeaturedMatch(matches[0]);
          setUpcomingMatches(matches.slice(1));
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setMatchesLoading(false);
      }
    };
    
    fetchMatches();
  }, []);
  
  // Fetch leaderboard and user rank
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true);
        const globalLeaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
        const leaderboardQuery = query(globalLeaderboardRef, orderBy("totalPoints", "desc"), limit(10));
        const leaderboardSnapshot = await getDocs(leaderboardQuery);
        
        const entries: LeaderboardEntry[] = leaderboardSnapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            odUserId: data.odUserId || doc.id,
            displayName: data.displayName || "Anonymous",
            photoURL: data.photoURL,
            totalPoints: data.totalPoints || 0,
            correctPredictions: data.correctPredictions || 0,
            totalPredictions: data.totalPredictions || 0,
            accuracy: data.accuracy || 0,
            rank: index + 1,
          };
        });
        
        setLeaderboardEntries(entries);
        
        // Find current user's rank
        if (currentUser) {
          const userEntry = entries.find(e => e.odUserId === currentUser.odUserId);
          if (userEntry) {
            setUserRank(userEntry.rank || null);
            setUserStats({
              totalPoints: userEntry.totalPoints,
              rank: userEntry.rank || 0,
              accuracy: userEntry.accuracy || 0,
              matchesPlayed: userEntry.totalPredictions || 0,
              correctPredictions: userEntry.correctPredictions || 0,
              totalPredictions: userEntry.totalPredictions || 0,
            });
          } else {
            // Fetch user's stats separately if not in top 10
            const userRef = doc(db, COLLECTIONS.GLOBAL_LEADERBOARD, currentUser.odUserId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserStats({
                totalPoints: userData.totalPoints || 0,
                rank: 0, // Need to calculate
                accuracy: userData.accuracy || 0,
                matchesPlayed: userData.totalPredictions || 0,
                correctPredictions: userData.correctPredictions || 0,
                totalPredictions: userData.totalPredictions || 0,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [currentUser]);

  // Fetch recent predictions
  useEffect(() => {
    const fetchRecentPredictions = async () => {
      if (!currentUser) {
        setPredictionsLoading(false);
        return;
      }
      
      try {
        setPredictionsLoading(true);
        const predictionsRef = collection(db, COLLECTIONS.PREDICTIONS);
        const q = query(
          predictionsRef,
          where("odUserId", "==", currentUser.odUserId),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        
        const snapshot = await getDocs(q);
        const predictions: RecentPrediction[] = [];
        
        for (const predDoc of snapshot.docs) {
          const data = predDoc.data();
          // Fetch match details
          const matchRef = doc(db, COLLECTIONS.MATCHES, data.matchId);
          const matchDoc = await getDoc(matchRef);
          const matchData = matchDoc.exists() ? matchDoc.data() : null;
          
          predictions.push({
            matchId: data.matchId,
            team1: matchData?.team1 || data.team1 || "Team 1",
            team2: matchData?.team2 || data.team2 || "Team 2",
            prediction: data.predictions?.winner || "Unknown",
            result: data.isEvaluated ? (data.points > 0 ? 'correct' : 'incorrect') : 'pending',
            points: data.points || 0,
            date: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          });
        }
        
        setRecentPredictions(predictions);
      } catch (error) {
        console.error("Error fetching predictions:", error);
      } finally {
        setPredictionsLoading(false);
      }
    };
    
    fetchRecentPredictions();
  }, [currentUser]);

  // Get match date for display
  const getMatchDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <Layout>
      {/* Hero: Featured Match */}
      <div className="bg-gradient-to-br from-[#1a365d] via-[#2d4a7c] to-[#1a365d] text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          {matchesLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-white/20 rounded w-48 mb-4"></div>
              <div className="h-32 bg-white/10 rounded-xl"></div>
            </div>
          ) : featuredMatch ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-400" />
                <span className="text-sm font-medium text-orange-300 uppercase tracking-wider">Next Match</span>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Teams */}
                  <div className="flex items-center justify-center gap-6 lg:gap-10">
                    {/* Team 1 */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white rounded-full p-2 shadow-lg">
                        <img 
                          src={getTeamLogoUrl(featuredMatch.team1 || '')} 
                          alt={featuredMatch.team1} 
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.src = '/images/teams/default.png'; }}
                        />
                      </div>
                      <span className="mt-2 font-bold text-lg">{getTeamAbbreviation(featuredMatch.team1 || '')}</span>
                      <span className="text-xs text-white/70">{featuredMatch.team1}</span>
                    </div>
                    
                    {/* VS */}
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-bold text-white/30">VS</span>
                      <span className="text-xs text-white/50 mt-1">{getMatchDateDisplay(featuredMatch.date)}</span>
                    </div>
                    
                    {/* Team 2 */}
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white rounded-full p-2 shadow-lg">
                        <img 
                          src={getTeamLogoUrl(featuredMatch.team2 || '')} 
                          alt={featuredMatch.team2} 
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.src = '/images/teams/default.png'; }}
                        />
                      </div>
                      <span className="mt-2 font-bold text-lg">{getTeamAbbreviation(featuredMatch.team2 || '')}</span>
                      <span className="text-xs text-white/70">{featuredMatch.team2}</span>
                    </div>
                  </div>
                  
                  {/* Countdown & CTA */}
                  <div className="flex flex-col items-center lg:items-end gap-4">
                    <div className="text-center lg:text-right">
                      <p className="text-xs text-white/60 uppercase tracking-wider mb-2">Predictions close in</p>
                      <Countdown targetDate={featuredMatch.date} className="text-white" />
                    </div>
                    <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg w-full lg:w-auto">
                      <Link to={`/matches/${featuredMatch.id}`}>
                        Make Your Prediction <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </div>
                </div>
                
                {/* Venue */}
                <div className="mt-4 pt-4 border-t border-white/10 text-center lg:text-left">
                  <span className="text-sm text-white/60">📍 {featuredMatch.venue || 'Venue TBA'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60">No upcoming matches scheduled</p>
            </div>
          )}
        </div>
      </div>
      
      {/* User Stats Bar */}
      {currentUser && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 border-b border-slate-700">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold text-lg">
                  {currentUser.displayName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-medium">{currentUser.displayName || 'Player'}</p>
                  <p className="text-xs text-slate-400">Season 2026</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6 lg:gap-10">
                {/* Points */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-xl font-bold">{userStats?.totalPoints || 0}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase">Points</p>
                </div>
                
                {/* Rank */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-xl font-bold">#{userRank || '-'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase">Rank</p>
                </div>
                
                {/* Accuracy */}
                <div className="text-center hidden sm:block">
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4 text-blue-400" />
                    <span className="text-xl font-bold">{userStats?.accuracy || 0}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase">Accuracy</p>
                </div>
                
                {/* Matches */}
                <div className="text-center hidden md:block">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span className="text-xl font-bold">{userStats?.matchesPlayed || 0}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase">Played</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Upcoming Matches & Recent Predictions */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upcoming Matches */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Upcoming Matches
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/matches" className="flex items-center gap-1 text-blue-600">
                    View All <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              {matchesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-white rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingMatches.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMatches.map(match => (
                    <Link 
                      key={match.id} 
                      to={`/matches/${match.id}`}
                      className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div className="flex items-center gap-4">
                        <img 
                          src={getTeamLogoUrl(match.team1 || '')} 
                          alt={match.team1} 
                          className="w-12 h-12 object-contain"
                        />
                        <div className="flex-1 text-center">
                          <div className="font-semibold text-sm">
                            {getTeamAbbreviation(match.team1 || '')} vs {getTeamAbbreviation(match.team2 || '')}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            <CountdownCompact targetDate={match.date} className="font-medium" />
                          </div>
                        </div>
                        <img 
                          src={getTeamLogoUrl(match.team2 || '')} 
                          alt={match.team2} 
                          className="w-12 h-12 object-contain"
                        />
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <p className="text-gray-500">No more matches scheduled</p>
                </div>
              )}
            </section>
            
            {/* Recent Predictions */}
            {currentUser && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Your Recent Predictions
                  </h2>
                </div>
                
                {predictionsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse bg-white rounded-xl p-4 shadow-sm">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    ))}
                  </div>
                ) : recentPredictions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {recentPredictions.map((pred, idx) => (
                      <div 
                        key={idx}
                        className={`rounded-xl p-4 border ${
                          pred.result === 'correct' 
                            ? 'bg-green-50 border-green-200' 
                            : pred.result === 'incorrect' 
                              ? 'bg-red-50 border-red-200' 
                              : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">
                            {getTeamAbbreviation(pred.team1)} vs {getTeamAbbreviation(pred.team2)}
                          </span>
                          {pred.result === 'correct' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {pred.result === 'incorrect' && <XCircle className="h-4 w-4 text-red-600" />}
                          {pred.result === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div className="text-xs text-gray-600">
                          Picked: {getTeamDisplayName(pred.prediction)}
                        </div>
                        <div className={`text-sm font-bold mt-1 ${
                          pred.result === 'correct' ? 'text-green-600' : 
                          pred.result === 'incorrect' ? 'text-red-600' : 'text-gray-400'
                        }`}>
                          {pred.result === 'pending' ? 'Awaiting result' : `${pred.points > 0 ? '+' : ''}${pred.points} pts`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-6 text-center">
                    <p className="text-gray-500 mb-4">No predictions yet</p>
                    <Button asChild>
                      <Link to="/matches">Make Your First Prediction</Link>
                    </Button>
                  </div>
                )}
              </section>
            )}
          </div>
          
          {/* Right Column: Leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Leaderboard
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/leaderboard" className="flex items-center gap-1 text-blue-600">
                  Full Board <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {leaderboardLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                      <div className="w-12 h-4 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : leaderboardEntries.length > 0 ? (
                <>
                  {/* Top 3 */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
                    <div className="flex justify-center items-end gap-4">
                      {/* 2nd Place */}
                      {leaderboardEntries[1] && (
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-1 text-lg font-bold shadow-sm">
                            {leaderboardEntries[1].displayName.charAt(0)}
                          </div>
                          <div className="text-xs font-medium truncate max-w-[60px]">{leaderboardEntries[1].displayName.split(' ')[0]}</div>
                          <div className="text-xs text-gray-500">{leaderboardEntries[1].totalPoints} pts</div>
                          <Award className="h-4 w-4 text-gray-400 mx-auto mt-1" />
                        </div>
                      )}
                      
                      {/* 1st Place */}
                      {leaderboardEntries[0] && (
                        <div className="text-center -mt-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center mx-auto mb-1 text-xl font-bold shadow-lg ring-4 ring-yellow-200">
                            {leaderboardEntries[0].displayName.charAt(0)}
                          </div>
                          <div className="text-sm font-bold truncate max-w-[80px]">{leaderboardEntries[0].displayName.split(' ')[0]}</div>
                          <div className="text-xs text-yellow-700 font-semibold">{leaderboardEntries[0].totalPoints} pts</div>
                          <Trophy className="h-5 w-5 text-yellow-500 mx-auto mt-1" />
                        </div>
                      )}
                      
                      {/* 3rd Place */}
                      {leaderboardEntries[2] && (
                        <div className="text-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center mx-auto mb-1 text-lg font-bold shadow-sm">
                            {leaderboardEntries[2].displayName.charAt(0)}
                          </div>
                          <div className="text-xs font-medium truncate max-w-[60px]">{leaderboardEntries[2].displayName.split(' ')[0]}</div>
                          <div className="text-xs text-gray-500">{leaderboardEntries[2].totalPoints} pts</div>
                          <Award className="h-4 w-4 text-orange-400 mx-auto mt-1" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Rest of leaderboard */}
                  <div className="divide-y divide-gray-100">
                    {leaderboardEntries.slice(3, 8).map((entry, idx) => {
                      const isCurrentUser = currentUser && entry.odUserId === currentUser.odUserId;
                      return (
                        <div 
                          key={entry.odUserId} 
                          className={`flex items-center gap-3 px-4 py-3 ${isCurrentUser ? 'bg-blue-50' : ''}`}
                        >
                          <span className="w-6 text-center text-sm font-medium text-gray-400">{idx + 4}</span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isCurrentUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {entry.displayName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm truncate block ${isCurrentUser ? 'font-bold text-blue-600' : ''}`}>
                              {entry.displayName}
                              {isCurrentUser && <span className="text-xs text-blue-400 ml-1">(You)</span>}
                            </span>
                          </div>
                          <span className="font-semibold text-sm">{entry.totalPoints}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Show user position if not in top 8 */}
                  {currentUser && userRank && userRank > 8 && (
                    <div className="border-t-2 border-dashed border-gray-200">
                      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50">
                        <span className="w-6 text-center text-sm font-bold text-blue-600">{userRank}</span>
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                          {currentUser.displayName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-bold text-blue-600">{currentUser.displayName} (You)</span>
                        </div>
                        <span className="font-semibold text-sm">{userStats?.totalPoints || 0}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No leaderboard data yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
