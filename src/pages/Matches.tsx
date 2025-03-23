import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import MatchList from "@/components/matches/MatchList";
import { useMatches } from "@/hooks/useFirestore";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Match } from "@/utils/firestore-collections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper function to check if a match date has passed
const hasMatchDatePassed = (match: Match): boolean => {
  let matchDate: Date;
  
  try {
    if (typeof match.date === 'string') {
      matchDate = new Date(match.date);
    } else if (match.date && typeof match.date.toDate === 'function') {
      matchDate = match.date.toDate();
    } else {
      console.error('Invalid match date format:', match.date);
      return false;
    }
    
    return matchDate <= new Date();
  } catch (error) {
    console.error('Error checking match date:', error);
    return false;
  }
};

// Helper function to get the effective status of a match
const getEffectiveMatchStatus = (match: Match): 'upcoming' | 'live' | 'completed' => {
  // If match is officially marked as completed or live, use that status
  if (match.status === 'completed' || match.status === 'live') {
    return match.status;
  }
  
  // If match time has passed, treat it as completed regardless of database status
  if (hasMatchDatePassed(match)) {
    return 'completed';
  }
  
  // Otherwise, keep the existing status
  return match.status as 'upcoming';
};

const Matches = () => {
  const { matches, loading, error } = useMatches();
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!matches) return;
    
    let filtered = [...matches];
    
    // Filter by tab
    if (activeTab === "upcoming") {
      filtered = filtered.filter(match => getEffectiveMatchStatus(match) === "upcoming");
    } else if (activeTab === "live") {
      filtered = filtered.filter(match => getEffectiveMatchStatus(match) === "live");
    } else if (activeTab === "completed") {
      filtered = filtered.filter(match => getEffectiveMatchStatus(match) === "completed");
    }
    
    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(match => {
        // Handle both string and Timestamp date formats
        let matchDate = "";
        if (typeof match.date === 'string') {
          matchDate = new Date(match.date).toDateString().toLowerCase();
        } else if (match.date && typeof match.date.toDate === 'function') {
          matchDate = match.date.toDate().toDateString().toLowerCase();
        }
        
        const venue = (match.venue || '').toLowerCase();
        const team1 = (match.team1 || '').toLowerCase();
        const team2 = (match.team2 || '').toLowerCase();
        
        return matchDate.includes(query) || 
               venue.includes(query) || 
               team1.includes(query) || 
               team2.includes(query);
      });
    }
    
    setFilteredMatches(filtered);
  }, [matches, searchQuery, activeTab]);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">IPL 2025 Matches</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            Error loading matches: {error.message}
          </div>
        )}
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Search by team, date or venue..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Matches</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-lg">Loading matches...</span>
          </div>
        ) : filteredMatches.length > 0 ? (
          <MatchList matches={filteredMatches} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No matches found. Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Matches;
