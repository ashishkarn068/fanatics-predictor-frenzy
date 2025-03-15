import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import RegisterForm from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/LoginForm";
import { Button } from "@/components/ui/button";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";

const Register = () => {
  const [activeTab, setActiveTab] = useState<"register" | "login">("register");
  const { currentUser } = useAuth();

  // If user is already logged in, redirect to home page
  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            {activeTab === "register" ? "Create an Account" : "Welcome Back"}
          </h1>

          <Tabs 
            defaultValue="register" 
            className="w-full"
            onValueChange={(value) => setActiveTab(value as "register" | "login")}
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="register">Register</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>

            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>

            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-gray-500">
            {activeTab === "register" ? (
              <p>
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-ipl-blue hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-ipl-blue hover:underline">
                  Privacy Policy
                </Link>
              </p>
            ) : (
              <p>
                <Link to="/forgot-password" className="text-ipl-blue hover:underline">
                  Forgot your password?
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Register;
