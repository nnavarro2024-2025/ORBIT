import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { BookOpen, Dock, Calendar, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [, params] = useRoute<{ subsystem?: string }>("/login/:subsystem?");
  const subsystem = params?.subsystem;

  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg("");

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    if (isSignUp) {
      // Sign up flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        setErrorMsg("Signup failed: " + error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        // No session means email confirmation required
        alert("Signup successful! Please check your email and confirm your account.");
        setIsSignUp(false);
        setLoading(false);
        return;
      }

      try {
        // Sync user data with backend if you have an API endpoint for that
        const token = data.session.access_token;
        const res = await fetch(`${API_URL}/api/auth/sync`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Sync failed: ${res.status} ${text}`);
        }

        alert("Signup successful and user synced!");
        setIsSignUp(false);
      } catch (syncError) {
        console.error("User sync failed:", syncError);
        setErrorMsg("Signup succeeded but syncing user data failed.");
        setLoading(false);
        return;
      }
    } else {
      // Login flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg("Login failed: " + error.message);
        setLoading(false);
        return;
      }

      if (data.session?.access_token) {
        localStorage.setItem("auth.token", data.session.access_token);
        console.log("Saved token:", localStorage.getItem("auth.token"));
      }

      window.location.href = "/";
    }

    setLoading(false);
  };

  const subsystemInfo = (() => {
    switch (subsystem) {
      case "orz":
        return {
          title: "ORZ Computer Usage System",
          icon: <Dock className="h-8 w-8 text-white" />,
          description: "Access computer workstations in the Online Resource Zone",
        };
      case "booking":
        return {
          title: "Library Facility Booking System",
          icon: <Calendar className="h-8 w-8 text-white" />,
          description: "Book and manage library facilities and study rooms",
        };
      default:
        return {
          title: "ORBIT System",
          icon: <BookOpen className="h-8 w-8 text-white" />,
          description: "Integrated Library Facility & Computer Usage Management System",
        };
    }
  })();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        </div>
        
        <div className="relative w-full max-w-md z-10">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                <img 
                  src="/images/orbit-logo.png" 
                  alt="ORBIT Logo" 
                  className="h-16 w-auto object-contain filter brightness-200"
                />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent mb-2">
                {isSignUp ? "Join ORBIT" : "Welcome Back"}
              </h2>
              <p className="text-blue-100 text-lg font-medium">{subsystemInfo.title}</p>
              <p className="text-blue-200 text-sm mt-2">{subsystemInfo.description}</p>
            </div>

            <div className="space-y-6">
            {errorMsg && (
              <div className="bg-red-500/20 backdrop-blur border border-red-400/30 text-red-100 px-4 py-3 rounded-lg text-sm text-center shadow-lg">
                {errorMsg}
              </div>
            )}

          {isSignUp && (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-blue-200 focus:bg-white/20 focus:border-blue-400 focus:outline-none transition-all duration-200 shadow-sm"
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-blue-200 focus:bg-white/20 focus:border-blue-400 focus:outline-none transition-all duration-200 shadow-sm"
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-100">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-blue-200 focus:bg-white/20 focus:border-blue-400 focus:outline-none transition-all duration-200 shadow-sm"
              placeholder="your.email@university.edu"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-100">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-lg text-white placeholder-blue-200 focus:bg-white/20 focus:border-blue-400 focus:outline-none transition-all duration-200 shadow-sm"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            onClick={handleAuth}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl backdrop-blur border border-white/20"
            disabled={loading}
          >
            {loading
              ? isSignUp
                ? "Creating Account..."
                : "Signing In..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </button>

          <div className="text-center pt-4 border-t border-white/20">
            <p className="text-sm text-blue-200">
              By continuing, you agree to our{" "}
              <button 
                onClick={() => setShowTermsModal(true)}
                className="text-blue-300 hover:text-blue-100 underline transition-colors font-medium"
              >
                Terms and Conditions
              </button>
            </p>
          </div>

          <div className="text-center text-sm">
            {isSignUp ? (
              <p className="text-blue-100">
                Already have an account?{" "}
                <button 
                  className="text-blue-300 hover:text-blue-100 underline font-medium transition-colors" 
                  onClick={() => setIsSignUp(false)}
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-blue-100">
                Don't have an account?{" "}
                <button 
                  className="text-blue-300 hover:text-blue-100 underline font-medium transition-colors" 
                  onClick={() => setIsSignUp(true)}
                >
                  Create Account
                </button>
              </p>
            )}
          </div>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => window.location.href = "/"} className="text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors inline-flex items-center gap-2">
              ← Back to Home
            </button>
          </div>
          </div>
        </div>
      </div>
      
      {/* Terms and Conditions Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">
              Terms and Conditions
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-lg mb-2">ORBIT Library Management System - Terms of Use</h3>
              <p className="mb-4">
                Welcome to ORBIT (Integrated Library Facility & Computer Usage Management System). 
                By using this system, you agree to the following terms and conditions:
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">1. Acceptable Use</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use the system only for legitimate library and academic purposes</li>
                <li>Respect other users' booking times and computer session allocations</li>
                <li>Do not attempt to circumvent time limits or access restrictions</li>
                <li>Report any technical issues or policy violations to library staff</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Computer Usage</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Computer sessions are subject to time limits as set by library policy</li>
                <li>Automatic logout will occur after periods of inactivity</li>
                <li>Time extensions require approval and are subject to availability</li>
                <li>Inappropriate use may result in session termination</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Facility Booking</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Bookings are subject to approval by library administration</li>
                <li>Users must arrive on time and present valid identification</li>
                <li>Cancellations should be made at least 2 hours in advance</li>
                <li>No-shows may result in future booking restrictions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. Privacy and Data</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Usage data is collected for system administration and improvement</li>
                <li>Personal information is protected according to institutional privacy policies</li>
                <li>Session logs may be reviewed for policy compliance</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">5. Violations and Restrictions</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Violations of these terms may result in account suspension</li>
                <li>Repeated violations may lead to permanent restriction from library services</li>
                <li>Appeals may be submitted through proper institutional channels</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-800 text-center font-medium">
                These terms are subject to change. Continued use of the system constitutes acceptance of any updates.
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button 
              onClick={() => setShowTermsModal(false)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Check className="h-4 w-4 mr-2" />
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      
    </>
  );
}