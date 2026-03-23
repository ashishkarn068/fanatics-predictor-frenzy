import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Loader2, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, query } from 'firebase/firestore';
import { COLLECTIONS } from '@/utils/firestore-collections';

const BATCH_LIMIT = 450; // stay under Firestore's 500 limit

async function deleteCollection(collectionName: string): Promise<number> {
  const ref = collection(db, collectionName);
  const snapshot = await getDocs(query(ref));
  if (snapshot.empty) return 0;

  let deleted = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount++;
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      deleted += batchCount;
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
    deleted += batchCount;
  }
  return deleted;
}

interface ResetTarget {
  key: string;
  label: string;
  collection: string;
  description: string;
  defaultChecked: boolean;
}

const RESET_TARGETS: ResetTarget[] = [
  {
    key: 'globalLeaderboard',
    label: 'Global Leaderboard',
    collection: COLLECTIONS.GLOBAL_LEADERBOARD,
    description: 'Season-wide points & rankings for all users',
    defaultChecked: true,
  },
  {
    key: 'weeklyLeaderboard',
    label: 'Weekly Leaderboard',
    collection: COLLECTIONS.WEEKLY_LEADERBOARD,
    description: 'Week-by-week leaderboard entries',
    defaultChecked: true,
  },
  {
    key: 'predictionAnswers',
    label: 'Prediction Answers',
    collection: COLLECTIONS.ANSWERS,
    description: 'All user predictions and their evaluations',
    defaultChecked: true,
  },
  {
    key: 'matchResults',
    label: 'Match Results',
    collection: COLLECTIONS.MATCH_RESULTS,
    description: 'Stored answer keys / result data for matches',
    defaultChecked: true,
  },
  {
    key: 'matchLeaderboards',
    label: 'Match Leaderboards',
    collection: COLLECTIONS.MATCH_LEADERBOARDS,
    description: 'Per-match leaderboard entries',
    defaultChecked: true,
  },
  {
    key: 'matches',
    label: 'Matches',
    collection: COLLECTIONS.MATCHES,
    description: 'All match schedule data (uncheck to keep matches)',
    defaultChecked: true,
  },
];

export default function SeasonReset() {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(RESET_TARGETS.map(t => [t.key, t.defaultChecked]))
  );
  const { toast } = useToast();

  const selectedCount = Object.values(checked).filter(Boolean).length;

  const toggleCheck = (key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = async () => {
    const targets = RESET_TARGETS.filter(t => checked[t.key]);
    if (targets.length === 0) return;

    const names = targets.map(t => t.label).join(', ');
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL data from:\n\n${names}\n\nThis cannot be undone!`
    );
    if (!confirmed) return;

    setIsResetting(true);
    setError(null);
    setResults([]);

    const newResults: string[] = [];
    try {
      for (const target of targets) {
        const count = await deleteCollection(target.collection);
        newResults.push(`${target.label}: deleted ${count} documents`);
      }
      setResults(newResults);
      toast({
        title: 'Season Reset Complete',
        description: `Cleared ${targets.length} collection(s).`,
      });
    } catch (err) {
      console.error('Season reset error:', err);
      setError('Failed to complete reset. Check console for details.');
      if (newResults.length > 0) {
        setResults([...newResults, '⚠️ Error occurred — some collections may not have been cleared']);
      }
      toast({
        title: 'Error',
        description: 'Season reset failed partway through.',
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
          <RotateCcw className="h-5 w-5" />
          New Season Reset
        </CardTitle>
        <CardDescription>
          Clear old season data to start fresh for a new IPL season
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

        {results.length > 0 && (
          <Alert className="mb-4 bg-green-50">
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle>Reset Complete</AlertTitle>
            <AlertDescription>
              <ul className="mt-1 space-y-1 text-xs">
                {results.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select which collections to clear. This is typically done at the start of a new season
            to remove all old leaderboard, prediction, and match data.
          </p>

          <div className="space-y-3">
            {RESET_TARGETS.map(target => (
              <div key={target.key} className="flex items-start space-x-3">
                <Checkbox
                  id={target.key}
                  checked={checked[target.key]}
                  onCheckedChange={() => toggleCheck(target.key)}
                  disabled={isResetting}
                />
                <div className="grid gap-0.5 leading-none">
                  <Label htmlFor={target.key} className="text-sm font-medium cursor-pointer">
                    {target.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{target.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <p className="text-amber-700 text-sm font-medium">⚠️ Warning</p>
            <p className="text-amber-600 text-xs mt-1">
              This permanently deletes the selected data and cannot be undone.
              User accounts and team data are never affected.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 flex justify-end">
        <Button
          variant="destructive"
          onClick={handleReset}
          disabled={isResetting || selectedCount === 0}
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting…
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset {selectedCount} Collection{selectedCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
