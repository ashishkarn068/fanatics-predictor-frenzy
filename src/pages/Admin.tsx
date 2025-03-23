import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, Settings } from "lucide-react";
import Layout from "@/components/Layout";
import TeamUploader from "@/components/admin/TeamUploader";
import TeamsList from "@/components/admin/TeamsList";
import MatchUploader from "@/components/admin/MatchUploader";
import MatchResultUpdater from "@/components/admin/MatchResultUpdater";
import MockDataUploader from "@/components/admin/MockDataUploader";
import SetAdminUser from '@/components/admin/SetAdminUser';
import UserManagement from '@/components/admin/UserManagement';
import LoggingControl from '@/components/admin/LoggingControl';
import GlobalLeaderboardReset from '@/components/admin/GlobalLeaderboardReset';
import { PredictionControls } from '@/components/admin/PredictionControls';
import QuestionManagement from '@/components/admin/QuestionManagement';
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { isUserAdmin, setUserAsAdmin } from "@/utils/admin-auth";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("teams");
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSettingAdmin, setIsSettingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        if (!currentUser) {
          setIsAdmin(false);
          navigate('/');
          return;
        }
        
        const adminStatus = await isUserAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          navigate('/');
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        navigate('/');
      }
    };

    checkAdminStatus();
  }, [currentUser, navigate]);

  const handleSetAsAdmin = async () => {
    if (!currentUser) return;
    
    setIsSettingAdmin(true);
    setAdminError(null);
    
    try {
      await setUserAsAdmin(currentUser.uid);
      setIsAdmin(true);
    } catch (error) {
      console.error("Error setting admin:", error);
      // For development, we'll still set isAdmin to true
      setIsAdmin(true);
      setAdminError("Error occurred, but admin access granted for development");
    } finally {
      setIsSettingAdmin(false);
    }
  };

  // For development purposes, if isAdmin is still null after 2 seconds, set it to true
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAdmin === null) {
        console.log("Admin check timed out, granting access for development");
        setIsAdmin(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isAdmin]);

  if (isAdmin === null) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">Verifying admin access...</span>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null; // The useEffect will handle navigation
  }

  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
          
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Database Utilities</CardTitle>
                  <CardDescription>Manage the application database</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/admin/initialize-database">
                        <Database className="mr-2 h-4 w-4" />
                        Initialize Database
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/admin/refresh-database">
                        <Database className="mr-2 h-4 w-4" />
                        Refresh Question Database
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="teams" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="teams">Teams</TabsTrigger>
                <TabsTrigger value="matches">Matches</TabsTrigger>
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              
              <TabsContent value="teams" className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Team Management</h2>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <TeamUploader />
                  <TeamsList />
                </div>
              </TabsContent>
              
              <TabsContent value="matches" className="space-y-6">
                <h2 className="text-xl font-semibold mb-4">Match Management</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <MockDataUploader />
                  </div>
                  <div className="md:col-span-2">
                    <MatchUploader />
                  </div>
                  <div className="md:col-span-2">
                    <MatchResultUpdater />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="predictions">
                <h2 className="text-xl font-semibold mb-4">Prediction Management</h2>
                <div className="grid grid-cols-1 gap-6">
                  <QuestionManagement />
                  <PredictionControls />
                </div>
              </TabsContent>
              
              <TabsContent value="users">
                <h2 className="text-xl font-semibold mb-4">User Management</h2>
                <UserManagement />
              </TabsContent>

              <TabsContent value="system">
                <h2 className="text-xl font-semibold mb-4">System Settings</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <LoggingControl />
                  </div>
                  <div>
                    <GlobalLeaderboardReset />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default AdminPage;
