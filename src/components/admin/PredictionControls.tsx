import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { isUserAdmin } from "@/utils/admin-auth";
import { formatDateTime } from "@/lib/utils";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  orderBy,
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";

interface Match {
  id: string;
  team1: string;
  team2: string;
  venue: string;
  date: string | Timestamp;
  status?: 'upcoming' | 'live' | 'completed';
  name?: string;
  isPredictionEnabledByAdmin?: boolean;
}

export function PredictionControls() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Verify user is an admin
      const admin = await isUserAdmin(currentUser.uid);
      if (!admin) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to manage predictions.",
          variant: "destructive",
        });
        return;
      }
      
      // Get all matches
      const matchesRef = collection(db, "matches");
      const matchesQuery = query(
        matchesRef,
        where("status", "==", "upcoming"),
        orderBy("date")
      );
      
      const matchesSnapshot = await getDocs(matchesQuery);
      const fetchedMatches: Match[] = [];
      
      matchesSnapshot.forEach((doc) => {
        const match = { id: doc.id, ...doc.data() } as Match;
        fetchedMatches.push(match);
      });
      
      setMatches(fetchedMatches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to load matches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isWithin24Hours = (dateString: string | Timestamp): boolean => {
    let matchDate: Date;
    
    if (typeof dateString === 'string') {
      matchDate = new Date(dateString);
    } else {
      matchDate = dateString.toDate();
    }
    
    const now = new Date();
    const timeDifference = matchDate.getTime() - now.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);
    
    return hoursDifference > 0 && hoursDifference <= 24;
  };

  const togglePredictionAccess = async (matchId: string, currentValue: boolean) => {
    if (!currentUser) return;
    
    try {
      // Set this specific match as updating
      setIsUpdating(prev => ({ ...prev, [matchId]: true }));
      
      // Verify user is an admin
      const admin = await isUserAdmin(currentUser.uid);
      if (!admin) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to manage predictions.",
          variant: "destructive",
        });
        return;
      }
      
      // Update the match document
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, {
        isPredictionEnabledByAdmin: !currentValue,
        updatedAt: serverTimestamp(),
      });
      
      // Update local state
      setMatches(prev => 
        prev.map(match => 
          match.id === matchId
            ? { ...match, isPredictionEnabledByAdmin: !currentValue }
            : match
        )
      );
      
      toast({
        title: "Success",
        description: `Predictions ${!currentValue ? 'enabled' : 'disabled'} for this match.`,
      });
    } catch (error) {
      console.error("Error updating match prediction access:", error);
      toast({
        title: "Error",
        description: "Failed to update prediction settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear the updating state for this match
      setIsUpdating(prev => ({ ...prev, [matchId]: false }));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prediction Management</CardTitle>
          <CardDescription>
            Control which matches are open for predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prediction Management</CardTitle>
        <CardDescription>
          Control which matches are open for predictions. By default, predictions are only allowed within 24 hours of a match.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No upcoming matches found. Matches will appear here when scheduled.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Prediction Status</TableHead>
                <TableHead>Admin Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => {
                const matchDate = typeof match.date === 'string' 
                  ? new Date(match.date) 
                  : match.date.toDate();
                const within24Hours = isWithin24Hours(match.date);
                const isEnabled = match.isPredictionEnabledByAdmin === true || within24Hours;
                
                return (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">
                      {match.team1} vs {match.team2}
                    </TableCell>
                    <TableCell>{formatDateTime(matchDate)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isEnabled ? 'Predictions Open' : 'Predictions Closed'}
                      </span>
                      {within24Hours && (
                        <span className="ml-2 text-xs text-blue-600">
                          (Within 24h Window)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`admin-toggle-${match.id}`}
                          checked={match.isPredictionEnabledByAdmin === true}
                          onCheckedChange={() => togglePredictionAccess(match.id, match.isPredictionEnabledByAdmin === true)}
                          disabled={isUpdating[match.id]}
                        />
                        <Label htmlFor={`admin-toggle-${match.id}`} className="cursor-pointer">
                          {match.isPredictionEnabledByAdmin === true ? 'Enabled by Admin' : 'Not Enabled'}
                        </Label>
                        {isUpdating[match.id] && (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-md flex items-start space-x-2">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p><strong>How this works:</strong></p>
            <p>• By default, predictions are only allowed within 24 hours of match start.</p>
            <p>• Toggle the switch to enable predictions for a match outside the 24-hour window.</p>
            <p>• This override persists until you disable it or the match starts.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 