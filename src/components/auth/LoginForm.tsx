import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { FirebaseError } from "firebase/app";
import { FaGoogle } from "react-icons/fa";

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { googleSignIn } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await googleSignIn();
      
      toast({
        title: "Login successful!",
        description: "You've successfully logged in with Google.",
      });
      
      navigate("/");
    } catch (error) {
      console.error(error);
      const firebaseError = error as FirebaseError;
      let errorMessage = "There was an error logging in. Please try again.";
      
      if (firebaseError.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup was closed before completing the sign in.";
      } else if (firebaseError.code === "auth/cancelled-popup-request") {
        errorMessage = "The sign-in popup was cancelled.";
      }
      
      toast({
        title: "Google Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white rounded-xl shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
        <p className="text-gray-600 mt-2">Sign in to continue your prediction journey</p>
      </div>

      <div className="space-y-6">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">Sign in with your Google account</p>
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 py-5"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <FaGoogle className="h-5 w-5 text-red-500" />
          <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
        </Button>
      </div>

      <div className="text-center text-sm">
        <p className="text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-ipl-blue hover:underline font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
