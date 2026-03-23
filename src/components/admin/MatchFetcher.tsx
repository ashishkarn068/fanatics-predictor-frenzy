import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/utils/admin-auth';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp, writeBatch, getDocs, query } from 'firebase/firestore';
import { COLLECTIONS, createTimestamps } from '@/utils/firestore-collections';
import {
  Download,
  Upload,
  Loader2,
  CheckCircle,
  Globe,
  Calendar,
  MapPin,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const API_BASE = '/api';

interface FetchedMatch {
  iplMatchId: string;
  cricbuzzMatchId: string;
  matchDesc: string;
  matchFormat: string;
  matchOrder: number | null;
  startDate: string;
  endDate: string | null;
  state: string;
  status: string;
  team1: string;
  team1Short: string;
  team1Id: string;
  team2: string;
  team2Short: string;
  team2Id: string;
  venue: string;
  winnerTeamId: string | null;
}

export default function MatchFetcher() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [fetching, setFetching] = useState(false);
  const [fetchedMatches, setFetchedMatches] = useState<FetchedMatch[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('merge');

  async function handleFetchMatches() {
    if (!isAdmin(currentUser?.uid)) {
      toast({ title: 'Permission Denied', variant: 'destructive' });
      return;
    }

    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/cricket/matches`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      if (data.success && data.matches) {
        setFetchedMatches(data.matches);
        toast({
          title: 'Matches Fetched',
          description: `Found ${data.matches.length} matches from iplt20.com`,
        });
      } else {
        toast({ title: 'No Matches Found', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Fetch Failed', description: err.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  }

  async function handleUploadMatches() {
    if (!isAdmin(currentUser?.uid)) {
      toast({ title: 'Permission Denied', variant: 'destructive' });
      return;
    }
    if (fetchedMatches.length === 0) return;

    setUploading(true);
    try {
      const matchesCollection = collection(db, COLLECTIONS.MATCHES);

      // If replace mode, delete existing matches first
      if (uploadMode === 'replace') {
        const existing = await getDocs(query(matchesCollection));
        if (!existing.empty) {
          const deleteBatch = writeBatch(db);
          existing.forEach(d => deleteBatch.delete(d.ref));
          await deleteBatch.commit();
        }
      }

      // Upload in batches of 500 (Firestore limit)
      const batchSize = 450;
      for (let i = 0; i < fetchedMatches.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = fetchedMatches.slice(i, i + batchSize);

        for (const m of chunk) {
          // Use iplMatchId as doc ID for consistent referencing
          const matchRef = doc(matchesCollection, `ipl_${m.iplMatchId}`);
          const matchDate = new Date(m.startDate);

          batch.set(matchRef, {
            id: `ipl_${m.iplMatchId}`,
            team1: m.team1,
            team1Id: m.team1Id,
            team1Short: m.team1Short,
            team2: m.team2,
            team2Id: m.team2Id,
            team2Short: m.team2Short,
            venue: m.venue,
            date: Timestamp.fromDate(matchDate),
            status: m.state === 'complete' ? 'completed' : m.state === 'live' ? 'live' : 'upcoming',
            matchDesc: m.matchDesc,
            matchOrder: m.matchOrder,
            iplMatchId: m.iplMatchId,
            isPlayoff: false,
            playoffRound: null,
            playoffOrder: null,
            source: 'iplt20',
            ...(m.winnerTeamId && { winnerTeamId: m.winnerTeamId }),
            ...createTimestamps(),
          });
        }

        await batch.commit();
      }

      toast({
        title: 'Matches Uploaded',
        description: `${fetchedMatches.length} matches saved to Firestore`,
      });
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  const completed = fetchedMatches.filter(m => m.state === 'complete').length;
  const upcoming = fetchedMatches.filter(m => m.state === 'upcoming').length;
  const live = fetchedMatches.filter(m => m.state === 'live').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Fetch Matches from IPL Website
        </CardTitle>
        <CardDescription>
          Fetch the official match schedule from iplt20.com and upload to Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fetch Button */}
        <div className="flex gap-3 flex-wrap items-center">
          <Button onClick={handleFetchMatches} disabled={fetching}>
            {fetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Fetch Match Schedule from iplt20.com
          </Button>
        </div>

        {/* Results Summary */}
        {fetchedMatches.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap items-center">
              <Badge variant="default">{fetchedMatches.length} matches</Badge>
              {upcoming > 0 && <Badge variant="secondary">{upcoming} upcoming</Badge>}
              {live > 0 && <Badge className="bg-green-500">{live} live</Badge>}
              {completed > 0 && <Badge variant="outline">{completed} completed</Badge>}
            </div>

            {/* Match List */}
            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
              {fetchedMatches.map((m) => (
                <div
                  key={m.iplMatchId}
                  className="p-3 flex items-center justify-between text-sm hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {m.team1Short} vs {m.team2Short}
                      {m.matchOrder && (
                        <span className="text-gray-400 ml-2">#{m.matchOrder}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(m.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {m.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {m.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      m.state === 'complete'
                        ? 'default'
                        : m.state === 'live'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="ml-2 shrink-0"
                  >
                    {m.state}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Upload Controls */}
            <div className="flex gap-3 items-center flex-wrap pt-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={uploadMode === 'merge' ? 'default' : 'outline'}
                  onClick={() => setUploadMode('merge')}
                >
                  Add/Update
                </Button>
                <Button
                  size="sm"
                  variant={uploadMode === 'replace' ? 'default' : 'outline'}
                  onClick={() => setUploadMode('replace')}
                >
                  Replace All
                </Button>
              </div>
              <Button onClick={handleUploadMatches} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload {fetchedMatches.length} Matches to Firestore
              </Button>
            </div>

            {uploadMode === 'replace' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Replace Mode</AlertTitle>
                <AlertDescription>
                  This will delete all existing matches before uploading. User predictions linked to old match IDs may be affected.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
