import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  initLoggingControl, 
  setLoggingEnabled, 
  isLoggingEnabled 
} from '@/utils/logging-control';

export default function LoggingControl() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initLoggingControl();
        setEnabled(isLoggingEnabled());
        setError(null);
      } catch (err) {
        setError('Failed to initialize logging control');
        console.error('Error initializing logging control:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const handleToggleLogging = async () => {
    try {
      setUpdating(true);
      const newState = !enabled;
      const success = await setLoggingEnabled(newState);
      
      if (success) {
        setEnabled(newState);
        toast({
          title: 'Logging settings updated',
          description: newState 
            ? 'Console logging is now enabled' 
            : 'Console logging is now disabled',
        });
      } else {
        throw new Error('Failed to update logging settings');
      }
    } catch (err) {
      setError('Failed to update logging settings');
      toast({
        title: 'Error',
        description: 'Failed to update logging settings',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const testLogging = () => {
    console.log('Test log message');
    console.info('Test info message');
    console.warn('Test warning message');
    console.error('Test error message');
    
    toast({
      title: 'Test Logging',
      description: 'Check your browser console to see if logging is working',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Console Logging Control
        </CardTitle>
        <CardDescription>
          Control whether console logs are displayed throughout the application
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

        <div className="flex items-center space-x-2">
          <Switch
            id="logging-enabled"
            checked={enabled}
            onCheckedChange={handleToggleLogging}
            disabled={loading || updating}
          />
          <Label htmlFor="logging-enabled" className="font-medium">
            {enabled ? 'Console Logging Enabled' : 'Console Logging Disabled'}
          </Label>
          {updating && <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />}
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">
            When disabled, no console.log, console.info, or console.warn messages will be shown in the browser console.
            Error logs will still be displayed for critical issues.
          </p>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="rounded bg-gray-100 px-2 py-1 text-xs">
              <code>{ enabled ? 'console.log("Message")' : 'console.log("Message") // Suppressed' }</code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testLogging}
              disabled={loading}
            >
              Test Logging
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-gray-50 px-6 py-3">
        <div className="flex items-center text-xs text-gray-500">
          <Check className="mr-1 h-3 w-3 text-green-500" />
          Changes are applied immediately across all connected clients
        </div>
      </CardFooter>
    </Card>
  );
} 