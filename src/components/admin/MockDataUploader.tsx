import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { isAdmin } from '@/utils/admin-auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { uploadMockMatchesToFirestore } from '@/utils/upload-mock-matches';
import { matches as mockMatches } from '@/lib/mock-data';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const MockDataUploader = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUploadMockMatches = async () => {
    if (!isAdmin(currentUser?.uid)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to perform this action.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage("Deleting existing matches...");
      
      // Add a console log listener to capture status messages
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (message, ...args) => {
        originalConsoleLog(message, ...args);
        if (typeof message === 'string') {
          setStatusMessage(message);
        }
      };
      
      console.error = (message, ...args) => {
        originalConsoleError(message, ...args);
        if (typeof message === 'string') {
          setStatusMessage(`Error: ${message}`);
        }
      };
      
      const success = await uploadMockMatchesToFirestore();
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      if (success) {
        setUploadedCount(mockMatches.length);
        setStatusMessage(`Successfully uploaded ${mockMatches.length} matches to Firestore, including playoff matches.`);
        toast({
          title: "Success!",
          description: `Successfully uploaded ${mockMatches.length} matches to Firestore.`,
          variant: "default"
        });
      } else {
        setStatusMessage("Failed to upload matches. Check console for details.");
        toast({
          title: "Error",
          description: "Failed to upload matches. Check console for details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error uploading mock matches:", error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Upload Mock Matches</CardTitle>
        <CardDescription>
          Upload all mock match data to Firestore. This will delete all existing matches first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            <span className="text-sm text-muted-foreground">
              This will delete all existing matches before uploading new ones.
            </span>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Total matches to upload: <span className="font-medium">{mockMatches.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Includes <span className="font-medium">4 playoff matches</span> (Qualifier 1, Eliminator, Qualifier 2, Final)
            </p>
          </div>
          
          {uploadedCount > 0 && !isLoading && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Upload Complete</AlertTitle>
              <AlertDescription>
                Successfully uploaded {uploadedCount} matches to Firestore.
              </AlertDescription>
            </Alert>
          )}
          
          {statusMessage && (
            <div className="text-sm p-2 border rounded bg-gray-50">
              <p className="font-medium mb-1">Status:</p>
              <p className="text-muted-foreground">{statusMessage}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUploadMockMatches} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload All Mock Matches
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MockDataUploader;
