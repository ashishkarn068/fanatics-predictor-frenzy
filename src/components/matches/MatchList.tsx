import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Match } from "@/lib/types";
import MatchCard from "@/components/matches/MatchCard";

interface MatchListProps {
  matches: Match[];
}

const MatchList = ({ matches }: MatchListProps) => {
  const [activeTab, setActiveTab] = useState("upcoming");

  // Filter matches by status
  const upcomingMatches = matches.filter((match) => match.status === "upcoming");
  const liveMatches = matches.filter((match) => match.status === "live");
  const completedMatches = matches.filter((match) => match.status === "completed");

  // Separate playoff matches (those with 'tbd' team IDs) from regular league matches
  const upcomingPlayoffMatches = upcomingMatches.filter(
    (match) => match.team1Id === 'tbd' || match.team2Id === 'tbd'
  );
  const upcomingLeagueMatches = upcomingMatches.filter(
    (match) => match.team1Id !== 'tbd' && match.team2Id !== 'tbd'
  );

  return (
    <div>
      <Tabs defaultValue="upcoming" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upcoming" className="text-sm">
            Upcoming ({upcomingMatches.length})
          </TabsTrigger>
          <TabsTrigger value="live" className="text-sm">
            Live ({liveMatches.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm">
            Completed ({completedMatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-0">
          {upcomingLeagueMatches.length > 0 && (
            <>
              <h3 className="text-xl font-bold mb-4">League Matches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {upcomingLeagueMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </>
          )}

          {upcomingPlayoffMatches.length > 0 && (
            <>
              <h3 className="text-xl font-bold mb-4 mt-8">Playoff Matches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingPlayoffMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </>
          )}

          {upcomingMatches.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No upcoming matches
            </div>
          )}
        </TabsContent>

        <TabsContent value="live" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
            {liveMatches.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No live matches at the moment
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
            {completedMatches.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No completed matches
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MatchList;
