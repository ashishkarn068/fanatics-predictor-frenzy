
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Leaderboard } from "@/lib/types";
import { ChevronUp, Medal } from "lucide-react";

interface LeaderboardTableProps {
  leaderboard: Leaderboard;
  highlightUserId?: string;
}

const LeaderboardTable = ({ leaderboard, highlightUserId }: LeaderboardTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Accuracy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.entries.map((entry) => {
            const isCurrentUser = entry.userId === highlightUserId;
            const accuracy = Math.round(
              (entry.correctPredictions / entry.totalPredictions) * 100
            );

            return (
              <TableRow
                key={entry.userId}
                className={isCurrentUser ? "bg-blue-50" : ""}
              >
                <TableCell className="text-center font-medium">
                  {entry.position <= 3 ? (
                    <div className="flex justify-center">
                      <Medal
                        size={20}
                        className={
                          entry.position === 1
                            ? "text-yellow-500"
                            : entry.position === 2
                            ? "text-gray-400"
                            : "text-amber-600"
                        }
                      />
                    </div>
                  ) : (
                    entry.position
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.userAvatar} alt={entry.userName} />
                      <AvatarFallback className={isCurrentUser ? "bg-ipl-blue text-white" : ""}>
                        {entry.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`font-medium ${isCurrentUser ? "text-ipl-blue" : ""}`}>
                      {entry.userName}
                      {isCurrentUser && " (You)"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {entry.points}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {entry.correctPredictions === entry.totalPredictions && entry.totalPredictions > 0 && (
                      <ChevronUp className="text-green-500" size={14} />
                    )}
                    <span>{accuracy}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaderboardTable;
