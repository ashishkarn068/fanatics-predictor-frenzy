import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, startAfter, getDocs, onSnapshot, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, updateAllWeeklyLeaderboards, getAvailableWeeks } from "@/utils/firestore-collections";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FirebaseError } from "firebase/app";
import { isUserAdmin } from "@/utils/admin-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeeklyLeaderboardEntry {
  position: number;
  userId: string;
  userName: string;
  userAvatar: string;
  weeklyPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number;
  weekStartDate: Date;
  weekEndDate: Date;
}

interface WeeklyLeaderboardProps {
  pageSize?: number;
}

export default function WeeklyLeaderboard({ pageSize = 10 }: WeeklyLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalEntries, setTotalEntries] = useState(0);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const { currentUser } = useAuth();
  const [weekRange, setWeekRange] = useState<{ start: Date; end: Date } | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<{ start: Date; end: Date }[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('current');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (currentUser) {
        try {
          const adminStatus = await isUserAdmin(currentUser.uid);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
  }, [currentUser]);

  // Get available weeks
  useEffect(() => {
    const loadWeeks = async () => {
      const weeks = await getAvailableWeeks();
      setAvailableWeeks(weeks);
      if (weeks.length > 0 && !weekRange) {
        setWeekRange(weeks[0]); // Set most recent week as default
      }
    };
    loadWeeks();
  }, []);

  // Get total count of entries for the selected week
  useEffect(() => {
    if (!weekRange) return;

    const weeklyLeaderboardRef = collection(db, COLLECTIONS.WEEKLY_LEADERBOARD);
    const getTotalCount = async () => {
      try {
        const q = query(
          weeklyLeaderboardRef,
          where('weekStartDate', '==', Timestamp.fromDate(weekRange.start)),
          where('weekEndDate', '==', Timestamp.fromDate(weekRange.end)),
          orderBy("weeklyPoints", "desc")
        );
        const snapshot = await getDocs(q);
        setTotalEntries(snapshot.size);
      } catch (error) {
        console.error("Error getting total count:", error);
        // Check if the error is due to missing index
        if (error instanceof FirebaseError && error.code === 'failed-precondition') {
          toast("The leaderboard index is currently being built. This may take a few minutes. Please try again shortly.");
        }
        setTotalEntries(0);
      }
    };
    getTotalCount();
  }, [weekRange]);

  // Get leaderboard data for the selected week
  useEffect(() => {
    if (!weekRange) return;

    const weeklyLeaderboardRef = collection(db, COLLECTIONS.WEEKLY_LEADERBOARD);
    let leaderboardQuery = query(
      weeklyLeaderboardRef,
      where('weekStartDate', '==', Timestamp.fromDate(weekRange.start)),
      where('weekEndDate', '==', Timestamp.fromDate(weekRange.end)),
      orderBy("weeklyPoints", "desc"),
      limit(pageSize)
    );

    if (lastVisible && currentPage > 1) {
      leaderboardQuery = query(
        weeklyLeaderboardRef,
        where('weekStartDate', '==', Timestamp.fromDate(weekRange.start)),
        where('weekEndDate', '==', Timestamp.fromDate(weekRange.end)),
        orderBy("weeklyPoints", "desc"),
        startAfter(lastVisible),
        limit(pageSize)
      );
    }

    const unsubscribe = onSnapshot(leaderboardQuery, 
      (snapshot) => {
        if (!snapshot.empty) {
          const entries: WeeklyLeaderboardEntry[] = [];
          let position = (currentPage - 1) * pageSize + 1;

          snapshot.forEach((doc) => {
            const data = doc.data();
            entries.push({
              position: position++,
              userId: data.userId,
              userName: data.displayName || "Anonymous User",
              userAvatar: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'A')}&background=random`,
              weeklyPoints: data.weeklyPoints || 0,
              correctPredictions: data.correctPredictions || 0,
              totalPredictions: data.totalPredictions || 0,
              accuracy: data.totalPredictions > 0 ? Math.round((data.correctPredictions / data.totalPredictions) * 100) : 0,
              weekStartDate: data.weekStartDate.toDate(),
              weekEndDate: data.weekEndDate.toDate()
            });
          });

          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(entries.length === pageSize);
          setLeaderboard(entries);
        } else {
          setLeaderboard([]);
          setHasMore(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leaderboard:", error);
        // Check if the error is due to missing index
        if (error instanceof FirebaseError && error.code === 'failed-precondition') {
          toast("The leaderboard index is currently being built. This may take a few minutes. Please try again shortly.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentPage, pageSize, weekRange]);

  const handleWeekChange = (weekId: string) => {
    setSelectedWeekId(weekId);
    setCurrentPage(1);
    setLastVisible(null);
    
    if (weekId === 'current') {
      const currentWeek = availableWeeks[0]; // Most recent week
      setWeekRange(currentWeek);
    } else {
      const selectedWeek = availableWeeks[parseInt(weekId)];
      setWeekRange(selectedWeek);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return "bg-green-100 text-green-800";
    if (accuracy >= 50) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const handleManualUpdate = async () => {
    if (!currentUser) return;
    
    try {
      setUpdating(true);
      await updateAllWeeklyLeaderboards();
      toast.success("Weekly leaderboard updated successfully");
    } catch (error) {
      console.error("Error updating weekly leaderboard:", error);
      toast.error("Failed to update weekly leaderboard");
    } finally {
      setUpdating(false);
    }
  };

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

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={selectedWeekId} onValueChange={handleWeekChange}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {availableWeeks.map((week, index) => (
                <SelectItem key={index} value={index.toString()}>
                  Week of {format(week.start, "MMM d")} - {format(week.end, "MMM d, yyyy")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {weekRange && (
            <div className="text-sm text-gray-500">
              Showing leaderboard for week of {format(weekRange.start, "MMM d")} - {format(weekRange.end, "MMM d, yyyy")}
            </div>
          )}
        </div>
        {isAdmin && (
          <Button 
            onClick={handleManualUpdate} 
            disabled={updating}
            variant="outline"
            size="sm"
          >
            {updating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Weekly Leaderboard'
            )}
          </Button>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Accuracy
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry) => (
              <tr 
                key={entry.userId}
                className={`hover:bg-gray-50 ${
                  currentUser?.uid === entry.userId ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.position <= 3 ? (
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                      entry.position === 1 ? 'bg-yellow-100 text-yellow-800' :
                      entry.position === 2 ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {entry.position}
                    </span>
                  ) : (
                    entry.position
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
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
                    <div className="ml-3 flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.userName}
                      </div>
                      {currentUser?.uid === entry.userId && (
                        <Badge variant="outline" className="ml-2">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold">
                  {entry.weeklyPoints}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-right hidden md:table-cell">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccuracyColor(entry.accuracy)}`}>
                    {entry.accuracy}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={!hasMore}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            {leaderboard.length > 0 ? (
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                <span className="font-medium">{((currentPage - 1) * pageSize) + leaderboard.length}</span> of{' '}
                <span className="font-medium">{totalEntries}</span> results
              </p>
            ) : (
              <p className="text-sm text-gray-700">No results found</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="inline-flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-gray-700">
              Page {currentPage}
            </span>
            <Button
              onClick={handleNextPage}
              disabled={!hasMore}
              variant="outline"
              size="sm"
              className="inline-flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 