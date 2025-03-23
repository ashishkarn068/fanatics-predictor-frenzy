import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { initLoggingControl } from "@/utils/logging-control";
import { initializeFirebase } from "@/lib/firebase";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Matches from "./pages/Matches";
import MatchDetails from "./pages/MatchDetails";
import Leaderboard from "./pages/Leaderboard";
import MatchLeaderboard from "./pages/MatchLeaderboard";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Admin from "./pages/Admin";
import Teams from "./pages/Teams";
import ExampleMatch from "./pages/ExampleMatch";
import InitializeDatabase from "./pages/admin/InitializeDatabase";
import RefreshDatabase from "./pages/RefreshDatabase";

const queryClient = new QueryClient();

// Initialize logging control
initLoggingControl().catch(err => 
  console.error("Failed to initialize logging control:", err)
);

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase();
        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to initialize Firebase:', err);
        setError(err as Error);
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-lg font-medium text-gray-700">Initializing application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Failed to Initialize Application</h1>
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="text-sm text-red-800">{error.message}</p>
          </div>
          <p className="text-gray-600">
            Please check your network connection and Azure Key Vault configuration, 
            then try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/matches/:id" element={<MatchDetails />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/matches/:id/leaderboard" element={<MatchLeaderboard />} />
              <Route path="/register" element={<Register />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/initialize-database" element={<InitializeDatabase />} />
              <Route path="/admin/refresh-database" element={<RefreshDatabase />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/example-match" element={<ExampleMatch />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
