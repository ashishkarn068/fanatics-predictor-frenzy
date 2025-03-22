import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw, Database, Check, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { forceRefreshQuestions } from '@/utils/refresh-questions';
import { seedQuestionsIfNeeded } from '@/utils/firestore-collections';

export default function RefreshDatabase() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefreshQuestions = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await forceRefreshQuestions();
      setRefreshed(true);
      toast({
        title: "Questions Refreshed",
        description: "The prediction questions have been refreshed successfully. Please reload any open pages to see the changes.",
      });
    } catch (err) {
      console.error("Error refreshing questions:", err);
      setError('Failed to refresh the questions. Check console for details.');
      toast({
        title: "Error",
        description: "Failed to refresh the questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSeedQuestions = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await seedQuestionsIfNeeded();
      setRefreshed(true);
      toast({
        title: "Questions Seeded",
        description: "The prediction questions have been seeded successfully. Please reload any open pages to see the changes.",
      });
    } catch (err) {
      console.error("Error seeding questions:", err);
      setError('Failed to seed the questions. Check console for details.');
      toast({
        title: "Error",
        description: "Failed to seed the questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8 max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Database Maintenance</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Refresh Questions Database
            </CardTitle>
            <CardDescription>
              Use this utility to refresh the questions in the Firestore database. This will delete all 
              existing questions and create new ones with the latest definitions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleRefreshQuestions} 
                  disabled={isRefreshing}
                  className="w-full"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing Database...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Force Refresh All Questions
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleSeedQuestions} 
                  variant="outline"
                  disabled={isRefreshing}
                  className="w-full"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Seeding Database...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Seed Questions (Keep Existing)
                    </>
                  )}
                </Button>
              </div>
              
              {refreshed && !error && (
                <div className="bg-green-50 p-3 rounded-md flex items-center">
                  <Check className="text-green-500 mr-2 h-5 w-5" />
                  <p className="text-green-700 text-sm">
                    Database refreshed successfully!
                  </p>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 p-3 rounded-md flex items-start">
                  <XCircle className="text-red-500 mr-2 h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="text-sm text-gray-500">
          <p>
            Note: After refreshing the database, you may need to reload any open pages to see the updated questions.
          </p>
        </div>
      </div>
    </Layout>
  );
} 