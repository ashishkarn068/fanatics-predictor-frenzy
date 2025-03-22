import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
import Layout from '@/components/Layout';
import { initializeFirestore } from '@/scripts/initializeFirestore';
import { generateFirestoreRules } from '@/scripts/generateFirestoreRules';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const InitializeDatabase = () => {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState('initialize');

  // Check if user is admin
  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/login');
      return false;
    }
    
    // In a real app, you would check if the user has admin role
    // For now, we'll just allow any authenticated user for demo purposes
    return true;
  };

  const handleInitialize = async () => {
    const hasAccess = await checkAdminAccess();
    
    if (!hasAccess) {
      setResult({
        success: false,
        message: 'You do not have permission to initialize the database.'
      });
      return;
    }
    
    setIsInitializing(true);
    setResult(null);
    
    try {
      const success = await initializeFirestore();
      
      if (success) {
        setResult({
          success: true,
          message: 'Database initialized successfully! Sample data has been added to Firestore.'
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to initialize database. Check console for errors.'
        });
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      setResult({
        success: false,
        message: `Error initializing database: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleGenerateRules = async () => {
    const hasAccess = await checkAdminAccess();
    
    if (!hasAccess) {
      setResult({
        success: false,
        message: 'You do not have permission to generate security rules.'
      });
      return;
    }
    
    setIsGeneratingRules(true);
    setResult(null);
    
    try {
      const success = generateFirestoreRules();
      
      if (success) {
        setResult({
          success: true,
          message: 'Firestore security rules generated successfully! The rules file has been created in the project root directory.'
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to generate security rules. Check console for errors.'
        });
      }
    } catch (error) {
      console.error('Error generating security rules:', error);
      setResult({
        success: false,
        message: `Error generating security rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsGeneratingRules(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Firestore Database Management</CardTitle>
            <CardDescription>
              Initialize your Firestore database with sample data and security rules for the IPL 2025 prediction app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-6">
                <TabsTrigger value="initialize" className="flex-1">Initialize Database</TabsTrigger>
                <TabsTrigger value="security" className="flex-1">Security Rules</TabsTrigger>
              </TabsList>
              
              <TabsContent value="initialize" className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                  <h3 className="text-amber-800 font-semibold flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Warning
                  </h3>
                  <p className="text-amber-700 mt-1">
                    This action will add sample data to your Firestore database. If collections already exist, this may add duplicate data. Use this only for initial setup or testing purposes.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">This will initialize the following collections:</h3>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>Teams - All 10 IPL teams with their branding</li>
                    <li>Players - Key players for each team</li>
                    <li>Matches - Schedule of upcoming IPL 2025 matches</li>
                    <li>Questions - Standard prediction questions</li>
                    <li>PredictionGames - Match-specific prediction games</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleInitialize} 
                    disabled={isInitializing}
                    className="w-full"
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      'Initialize Database'
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="security" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                  <h3 className="text-blue-800 font-semibold flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Rules
                  </h3>
                  <p className="text-blue-700 mt-1">
                    Generate Firestore security rules for your application. These rules will define who can read and write data in your Firestore database.
                  </p>
                  <p className="text-blue-700 mt-2">
                    The rules will be saved to a file called <code className="bg-blue-100 px-1 rounded">firestore.rules</code> in the project root directory.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleGenerateRules} 
                    disabled={isGeneratingRules}
                    className="w-full"
                    variant="outline"
                  >
                    {isGeneratingRules ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Rules...
                      </>
                    ) : (
                      'Generate Security Rules'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {result && (
              <Alert variant={result.success ? "default" : "destructive"} className="mt-6">
                <div className="flex items-center">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 mr-2" />
                  ) : (
                    <AlertCircle className="h-5 w-5 mr-2" />
                  )}
                  <AlertTitle>
                    {result.success ? 'Success' : 'Error'}
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Back to Admin
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default InitializeDatabase;
