import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { setUserAsAdmin } from '@/utils/admin-auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserCheck } from 'lucide-react';

const SetAdminUser = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSet, setIsSet] = useState(false);

  const handleSetAdmin = async () => {
    if (!currentUser?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this action.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      await setUserAsAdmin(currentUser.uid);
      setIsSet(true);
      toast({
        title: "Success!",
        description: `Successfully set user ${currentUser.email} as admin.`,
        variant: "default"
      });
    } catch (error) {
      console.error("Error setting user as admin:", error);
      toast({
        title: "Error",
        description: "Failed to set user as admin. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Set Current User as Admin</CardTitle>
        <CardDescription>
          Set your current user account as an admin to gain access to admin features.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800 text-sm">
              <strong>Info:</strong> This will create or update your user document in Firestore with admin privileges.
              Current user: {currentUser?.email || 'Not logged in'}
            </p>
          </div>
          
          {isSet && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 text-sm">
                <strong>Success:</strong> Your user account has been set as an admin.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSetAdmin}
          disabled={isLoading || !currentUser || isSet}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting as Admin...
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4" />
              Set as Admin
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SetAdminUser;
