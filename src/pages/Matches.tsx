
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import MatchList from "@/components/matches/MatchList";
import { matches } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const Matches = () => {
  const [filteredMatches, setFilteredMatches] = useState(matches);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMatches(matches);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = matches.filter(match => {
        const matchDate = new Date(match.date).toDateString().toLowerCase();
        const venue = match.venue.toLowerCase();
        return matchDate.includes(query) || venue.includes(query);
      });
      setFilteredMatches(filtered);
    }
  }, [searchQuery]);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">IPL 2025 Matches</h1>
        
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Search by date or venue..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <MatchList matches={filteredMatches} />
      </div>
    </Layout>
  );
};

export default Matches;
