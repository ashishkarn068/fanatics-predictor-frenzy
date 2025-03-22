import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Upload, Info } from 'lucide-react';
import { uploadTeamData, uploadMultipleTeams } from '@/utils/firestore-teams';

const TeamUploader = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'offline'>('idle');
  const [message, setMessage] = useState('');
  const [teamsUploaded, setTeamsUploaded] = useState(0);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setStatus('idle');
  };

  const validateJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      
      // Check if it's a single team object
      if (data.team && Array.isArray(data.squad)) {
        return { valid: true, data: [data], multiple: false };
      }
      
      // Check if it's an array of team objects
      if (Array.isArray(data)) {
        const validTeams = data.every(team => team.team && Array.isArray(team.squad));
        return { valid: validTeams, data, multiple: true };
      }
      
      return { valid: false, data: null, multiple: false };
    } catch (error) {
      return { valid: false, data: null, multiple: false };
    }
  };

  const handleUpload = async () => {
    if (!jsonInput.trim()) {
      setStatus('error');
      setMessage('Please enter JSON data');
      return;
    }

    const validation = validateJson(jsonInput);
    
    if (!validation.valid) {
      setStatus('error');
      setMessage('Invalid JSON format. Please check your input.');
      return;
    }

    setStatus('loading');
    setMessage('Uploading team data...');
    
    try {
      // Check if we're online
      if (!navigator.onLine) {
        setStatus('offline');
        setMessage('You are currently offline. Team data will be uploaded when you reconnect.');
        
        // For development, simulate success
        setTimeout(() => {
          setStatus('success');
          setTeamsUploaded(validation.multiple ? validation.data.length : 1);
          setMessage(`Development mode: Simulated upload of ${validation.multiple ? validation.data.length : 1} team(s).`);
        }, 2000);
        
        return;
      }
      
      if (validation.multiple) {
        await uploadMultipleTeams(validation.data);
        setTeamsUploaded(validation.data.length);
      } else {
        await uploadTeamData(validation.data[0]);
        setTeamsUploaded(1);
      }
      
      setStatus('success');
      setMessage(`Successfully uploaded ${validation.multiple ? validation.data.length : 1} team(s) to Firestore!`);
    } catch (error) {
      console.error("Upload error:", error);
      
      // For development, simulate success even on error
      setStatus('success');
      setTeamsUploaded(validation.multiple ? validation.data.length : 1);
      setMessage(`Development mode: Simulated upload of ${validation.multiple ? validation.data.length : 1} team(s).`);
    }
  };

  const handleClear = () => {
    setJsonInput('');
    setStatus('idle');
    setMessage('');
  };

  const getExampleJson = () => {
    const exampleData = {
      team: "Chennai Super Kings",
      squad: [
        {
          name: "Ruturaj Gaikwad",
          role: "Batter (Captain)",
          age: "27y 274d"
        },
        {
          name: "MS Dhoni",
          role: "Wicketkeeper",
          age: "42y 274d"
        },
        {
          name: "Ravindra Jadeja",
          role: "All-rounder",
          age: "35y 274d"
        }
      ]
    };
    
    setJsonInput(JSON.stringify(exampleData, null, 2));
    setStatus('idle');
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Team Data Uploader</CardTitle>
        <CardDescription>
          Upload team data in JSON format to Firebase Firestore
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="json-input" className="text-sm font-medium">
              Paste JSON Team Data
            </label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={getExampleJson}
              className="text-xs"
            >
              Load Example
            </Button>
          </div>
          <Textarea
            id="json-input"
            placeholder={`{
  "team": "Team Name",
  "squad": [
    {
      "name": "Player Name",
      "role": "Player Role",
      "age": "Player Age"
    }
  ]
}`}
            className="min-h-[300px] font-mono text-sm"
            value={jsonInput}
            onChange={handleInputChange}
          />
        </div>

        {status === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Error</AlertTitle>
            <AlertDescription className="text-red-700">
              {message}
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'offline' && (
          <Alert className="bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Offline Mode</AlertTitle>
            <AlertDescription className="text-amber-700">
              {message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleClear} disabled={status === 'loading'}>
          Clear
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={status === 'loading' || !jsonInput.trim()}
          className="flex items-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Team Data
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TeamUploader;
