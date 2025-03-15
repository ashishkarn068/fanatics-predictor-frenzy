
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Mock successful login
    console.log("Login with:", { email, password });
    
    toast({
      title: "Welcome back!",
      description: "You've successfully logged in.",
    });
    
    setIsLoading(false);
    navigate("/");
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} Login`,
      description: `${provider} login will be implemented in the next phase.`,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white rounded-xl shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
        <p className="text-gray-600 mt-2">Sign in to continue your prediction journey</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-ipl-blue hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" className="w-full bg-ipl-blue hover:bg-ipl-blue/90" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          type="button"
          onClick={() => handleSocialLogin("Google")}
        >
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.545 12.151L12.545 14.106L16.806 14.106C16.59 15.297 15.703 16.918 13.925 16.918C11.769 16.918 9.991 15.171 9.991 12.944C9.991 10.716 11.769 8.97 13.925 8.97C15.139 8.97 15.966 9.492 16.427 9.923L17.98 8.431C16.751 7.289 15.488 6.686 13.925 6.686C10.534 6.686 7.809 9.46 7.809 12.944C7.809 16.428 10.534 19.202 13.925 19.202C17.033 19.202 19.27 17.142 19.27 13.38C19.27 12.853 19.225 12.493 19.167 12.151L12.545 12.151Z" />
          </svg>
          Google
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => handleSocialLogin("Facebook")}
        >
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
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
