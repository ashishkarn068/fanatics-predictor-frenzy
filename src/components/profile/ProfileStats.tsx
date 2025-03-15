
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Award, Star } from "lucide-react";
import { User } from "@/lib/types";
import { calculateAccuracy } from "@/lib/utils";

interface ProfileStatsProps {
  user: User;
}

const ProfileStats = ({ user }: ProfileStatsProps) => {
  const accuracy = calculateAccuracy(user);
  
  // Mock achievements for the demo
  const achievements = [
    { id: "1", name: "Prediction Streak", description: "3 correct predictions in a row", icon: <Trophy className="h-5 w-5 text-yellow-500" /> },
    { id: "2", name: "First Blood", description: "First correct prediction", icon: <Star className="h-5 w-5 text-blue-500" /> }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Total Points</CardTitle>
          <Trophy className="h-4 w-4 text-ipl-orange" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{user.totalPoints}</div>
          <p className="text-xs text-muted-foreground">
            Rank 3 on the leaderboard
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Prediction Accuracy</CardTitle>
          <Target className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{accuracy.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {user.predictions.filter(p => p.isCorrect).length} correct out of {user.predictions.length} predictions
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Achievements</CardTitle>
          <Award className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{achievements.length}</div>
          <p className="text-xs text-muted-foreground">
            Latest: {achievements[0].name}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2</div>
          <p className="text-xs text-muted-foreground">
            Keep going for bonus points!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileStats;
