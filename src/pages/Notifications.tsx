import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Trophy, Calendar, BarChart, Check } from "lucide-react";
import { Notification } from "@/lib/types";

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: "1",
    userId: "user1",
    title: "Match Reminder",
    message: "CSK vs MI match starts in 2 hours. Don't forget to make your predictions!",
    type: "match-reminder",
    read: false,
    createdAt: "2025-03-15T10:30:00Z",
    linkTo: "/matches/1"
  },
  {
    id: "2",
    userId: "user1",
    title: "Prediction Results",
    message: "You earned 35 points for your predictions in the RCB vs KKR match!",
    type: "prediction-result",
    read: false,
    createdAt: "2025-03-14T18:45:00Z",
    linkTo: "/matches/2"
  },
  {
    id: "3",
    userId: "user1",
    title: "Leaderboard Update",
    message: "You've moved up 5 positions on the weekly leaderboard!",
    type: "leaderboard-update",
    read: true,
    createdAt: "2025-03-13T09:15:00Z",
    linkTo: "/leaderboard"
  },
  {
    id: "4",
    userId: "user1",
    title: "Achievement Unlocked",
    message: "Congratulations! You've earned the 'Perfect Match' badge for correctly predicting all polls in a match.",
    type: "achievement",
    read: true,
    createdAt: "2025-03-12T14:20:00Z",
    linkTo: "/profile"
  },
  {
    id: "5",
    userId: "user1",
    title: "Match Reminder",
    message: "SRH vs PBKS match starts tomorrow. Make your predictions now!",
    type: "match-reminder",
    read: true,
    createdAt: "2025-03-11T11:00:00Z",
    linkTo: "/matches/3"
  }
];

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'match-reminder':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'prediction-result':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'leaderboard-update':
        return <BarChart className="h-5 w-5 text-purple-500" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-gray-600">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` 
                  : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                onClick={markAllAsRead}
                className="flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                <span>Mark all as read</span>
              </Button>
            )}
          </div>
          
          <Card>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 flex gap-3 ${!notification.read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-medium ${!notification.read ? 'text-blue-800' : ''}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex justify-between mt-2">
                          <Button 
                            variant="link" 
                            className="h-auto p-0 text-ipl-blue" 
                            asChild
                          >
                            <a href={notification.linkTo}>View Details</a>
                          </Button>
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-xs"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Notifications;
