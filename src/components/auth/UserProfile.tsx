import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const UserProfile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/register");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!currentUser.displayName) return "U";
    return currentUser.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={currentUser.photoURL || ""} alt={currentUser.displayName || "User"} />
          <AvatarFallback className="text-lg bg-ipl-blue text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{currentUser.displayName || "User"}</CardTitle>
          <CardDescription>{currentUser.email}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Account Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Email</span>
            <span>{currentUser.email}</span>
            <span className="text-muted-foreground">Email Verified</span>
            <span>{currentUser.emailVerified ? "Yes" : "No"}</span>
            <span className="text-muted-foreground">User ID</span>
            <span className="truncate">{currentUser.uid}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          onClick={handleLogout} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Logging out..." : "Sign Out"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserProfile;
