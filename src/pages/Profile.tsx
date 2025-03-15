import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import UserProfile from "@/components/auth/UserProfile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { currentUser } = useAuth();
  
  // Mock prediction data
  const predictions = [
    {
      id: "1",
      match: "MI vs CSK",
      prediction: "MI to win",
      result: "Correct",
      points: 10,
      date: "Mar 10, 2025"
    },
    {
      id: "2",
      match: "RCB vs KKR",
      prediction: "RCB to win",
      result: "Incorrect",
      points: 0,
      date: "Mar 12, 2025"
    },
    {
      id: "3",
      match: "DC vs PBKS",
      prediction: "DC to win",
      result: "Correct",
      points: 10,
      date: "Mar 14, 2025"
    }
  ];

  // Mock achievements data
  const achievements = [
    {
      id: "1",
      title: "First Blood",
      description: "Made your first prediction",
      date: "Mar 10, 2025",
      icon: "🏆"
    },
    {
      id: "2",
      title: "Streak Master",
      description: "Correctly predicted 3 matches in a row",
      date: "Mar 14, 2025",
      icon: "🔥"
    }
  ];

  return (
    <Layout>
      <ProtectedRoute>
        <div className="container mx-auto py-8 px-4">
          <UserProfile />
          
          <div className="mt-8">
            <Tabs defaultValue="predictions">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="predictions">Predictions</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>
              
              <TabsContent value="predictions" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Predictions</CardTitle>
                    <CardDescription>
                      Track your prediction history and performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {predictions.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        You haven't made any predictions yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {predictions.map(prediction => (
                          <div 
                            key={prediction.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium">{prediction.match}</h4>
                              <p className="text-sm text-gray-600">{prediction.prediction}</p>
                              <p className="text-xs text-gray-400">{prediction.date}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={prediction.result === "Correct" ? "default" : "destructive"}>
                                {prediction.result}
                              </Badge>
                              {prediction.result === "Correct" && (
                                <span className="text-green-600 font-semibold">+{prediction.points}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="achievements" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Achievements</CardTitle>
                    <CardDescription>
                      Badges and rewards you've earned
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {achievements.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        You haven't earned any achievements yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {achievements.map(achievement => (
                          <div 
                            key={achievement.id}
                            className="flex items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center bg-blue-100 rounded-full text-2xl mr-4">
                              {achievement.icon}
                            </div>
                            <div>
                              <h4 className="font-medium">{achievement.title}</h4>
                              <p className="text-sm text-gray-600">{achievement.description}</p>
                              <p className="text-xs text-gray-400">Earned on {achievement.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ProtectedRoute>
    </Layout>
  );
};

export default Profile;
