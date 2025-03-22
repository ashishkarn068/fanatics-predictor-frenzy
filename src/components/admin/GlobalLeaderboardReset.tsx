import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Trophy, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, deleteDoc, query, limit } from 'firebase/firestore';
import { COLLECTIONS } from '@/utils/firestore-collections';

export default function GlobalLeaderboardReset() {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const handleResetGlobalLeaderboard = async () => {
    // Ask for confirmation
    const confirmReset = window.confirm(
      'Are you sure you want to reset the global leaderboard?\n\n' +
      'This will delete ALL user entries from the global leaderboard.\n' +
      'This action cannot be undone.'
    );

    if (!confirmReset) {
      return;
    }

    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      // Get all documents from the global leaderboard collection
      const leaderboardRef = collection(db, COLLECTIONS.GLOBAL_LEADERBOARD);
      const leaderboardSnapshot = await getDocs(leaderboardRef);

      if (leaderboardSnapshot.empty) {
        setSuccess('No entries found in the global leaderboard.');
        toast({
          title: 'No Entries Found',
          description: 'The global leaderboard is already empty.',
        });
        return;
      }

      // Delete all documents in batches (Firestore batch limit is 500)
      const totalEntries = leaderboardSnapshot.size;
      const batch = writeBatch(db);
      let count = 0;
      let batchCount = 0;

      for (const doc of leaderboardSnapshot.docs) {
        batch.delete(doc.ref);
        count++;

        // Commit batch when it reaches 500 operations
        if (count === 500) {
          await batch.commit();
          batchCount++;
          count = 0;
        }
      }

      // Commit any remaining operations
      if (count > 0) {
        await batch.commit();
        batchCount++;
      }

      setSuccess(`Successfully reset the global leaderboard. Deleted ${totalEntries} entries.`);
      toast({
        title: 'Global Leaderboard Reset',
        description: `Successfully deleted ${totalEntries} entries from the global leaderboard.`,
      });
    } catch (err) {
      console.error('Error resetting global leaderboard:', err);
      setError('Failed to reset the global leaderboard. Check console for details.');
      toast({
        title: 'Error',
        description: 'Failed to reset the global leaderboard.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Global Leaderboard Reset
        </CardTitle>
        <CardDescription>
          Reset the global leaderboard by removing all user entries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mb-4 bg-green-50">
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Use this utility to reset the global leaderboard. This will remove all user entries 
            from the global leaderboard, effectively resetting all user scores to zero.
          </p>

          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-amber-700 text-sm font-medium">Warning</p>
            <p className="text-amber-600 text-xs mt-1">
              This action will permanently delete all global leaderboard data and cannot be undone. 
              User prediction data will remain intact, but all points in the global leaderboard will be lost.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 flex justify-end">
        <Button
          variant="destructive"
          onClick={handleResetGlobalLeaderboard}
          disabled={isResetting}
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Leaderboard...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Global Leaderboard
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 