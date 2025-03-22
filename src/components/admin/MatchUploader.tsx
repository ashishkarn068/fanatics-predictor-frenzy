import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createMatch } from '@/utils/firestore-collections';
import { Timestamp } from 'firebase/firestore';
import { isAdmin } from '@/utils/admin-auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload } from 'lucide-react';

// Example match data
const exampleMatch = {
  team1: 'Mumbai Indians',
  team2: 'Chennai Super Kings',
  venue: 'Wankhede Stadium, Mumbai',
  date: new Date('2025-04-10T19:30:00'),
  status: 'upcoming'
};

const MatchUploader = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [status, setStatus] = useState('upcoming');

  const teams = [
    'Mumbai Indians',
    'Chennai Super Kings',
    'Royal Challengers Bangalore',
    'Kolkata Knight Riders',
    'Delhi Capitals',
    'Rajasthan Royals',
    'Sunrisers Hyderabad',
    'Punjab Kings',
    'Gujarat Titans',
    'Lucknow Super Giants',
    'Qualifier 1',
    'Qualifier 2',
    'Eliminator'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!team1 || !team2 || !venue || !matchDate || !matchTime) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (team1 === team2) {
      toast({
        title: 'Invalid Teams',
        description: 'Team 1 and Team 2 cannot be the same',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user is admin or in development mode
      const adminStatus = await isAdmin(currentUser?.uid);
      
      if (!adminStatus.isAdmin) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to upload matches',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Create a Date object from the date and time inputs
      const dateTimeString = `${matchDate}T${matchTime}:00`;
      const dateObj = new Date(dateTimeString);
      
      // Create match data
      const matchData = {
        team1,
        team2,
        venue,
        date: Timestamp.fromDate(dateObj),
        status: status as 'upcoming' | 'live' | 'completed'
      };
      
      // In development mode, simulate success
      if (adminStatus.isDevelopment) {
        setTimeout(() => {
          toast({
            title: 'Match Added (Development Mode)',
            description: 'Match has been successfully added in development mode',
          });
          setIsLoading(false);
          resetForm();
        }, 1000);
        return;
      }
      
      // Upload to Firestore
      const matchId = await createMatch(matchData);
      
      toast({
        title: 'Match Added',
        description: `Match has been successfully added with ID: ${matchId}`,
      });
      
      resetForm();
    } catch (error) {
      console.error('Error uploading match:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTeam1('');
    setTeam2('');
    setVenue('');
    setMatchDate('');
    setMatchTime('');
    setStatus('upcoming');
  };

  const loadExampleData = () => {
    setTeam1(exampleMatch.team1);
    setTeam2(exampleMatch.team2);
    setVenue(exampleMatch.venue);
    setMatchDate(exampleMatch.date.toISOString().split('T')[0]);
    setMatchTime(exampleMatch.date.toISOString().split('T')[1].substring(0, 5));
    setStatus(exampleMatch.status);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add New Match</CardTitle>
        <CardDescription>
          Create a new match in the IPL 2025 schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team1">Team 1</Label>
              <Select value={team1} onValueChange={setTeam1}>
                <SelectTrigger id="team1">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="team2">Team 2</Label>
              <Select value={team2} onValueChange={setTeam2}>
                <SelectTrigger id="team2">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Textarea 
              id="venue" 
              placeholder="Enter match venue" 
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input 
                id="time" 
                type="time" 
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Match Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={loadExampleData}
              disabled={isLoading}
            >
              Load Example
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={resetForm}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Match
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MatchUploader;
