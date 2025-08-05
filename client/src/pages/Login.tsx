import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { BookOpen, Dock, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { subsystem } = useParams<{ subsystem?: string }>();
  const { isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg("");

    if (isSignUp) {
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

      alert("Signup successful. Please check your email to confirm your account.");
      setIsSignUp(false);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg("Login failed: " + error.message);
        setLoading(false);
        return;
      }

      // Save the access token to localStorage for API requests
      const token = data?.session?.access_token;
      if (token) {
        localStorage.setItem("auth.token", token);
        console.log("Saved token:", localStorage.getItem("auth.token")); // Debug log
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
          icon: <Dock className="h-12 w-12 text-primary" />,
          description: "Access computer workstations in the Online Resource Zone",
        };
      case "booking":
        return {
          title: "Library Facility Booking System",
          icon: <Calendar className="h-12 w-12 text-secondary" />,
          description: "Book and manage library facilities and study rooms",
        };
      default:
        return {
          title: "ORBIT System",
          icon: <BookOpen className="h-12 w-12 text-primary" />,
          description: "Integrated Library Facility & Computer Usage Management System",
        };
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-800 dark:from-blue-900 dark:to-blue-950 flex items-center justify-center">
      <div className="material-card p-8 w-full max-w-md mx-6">
        <div className="text-center mb-8">
          {subsystemInfo.icon}
          <h2 className="text-2xl font-bold mt-4 mb-2">
            {isSignUp ? "Sign Up for ORBIT" : "Login to ORBIT"}
          </h2>
          <p className="text-muted-foreground">{subsystemInfo.title}</p>
          <p className="text-sm text-muted-foreground mt-2">{subsystemInfo.description}</p>
        </div>

        <div className="space-y-6">
          {errorMsg && <div className="text-sm text-red-500 text-center">{errorMsg}</div>}

          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="material-input w-full"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="material-input w-full"
                  placeholder="Doe"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-white">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="material-input w-full"
              placeholder="example@domain.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="material-input w-full"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            onClick={handleAuth}
            className="material-button primary w-full"
            disabled={loading}
          >
            {loading
              ? isSignUp
                ? "Signing up..."
                : "Logging in..."
              : isSignUp
              ? "Sign Up"
              : "Login with University Email"}
          </button>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">
                Terms and Conditions
              </a>
            </p>
          </div>

          <div className="text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button className="text-primary underline" onClick={() => setIsSignUp(false)}>
                  Log In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button className="text-primary underline" onClick={() => setIsSignUp(true)}>
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-primary hover:underline text-sm">
            ← Back to System Selection
          </a>
        </div>
      </div>
    </div>
  );
}