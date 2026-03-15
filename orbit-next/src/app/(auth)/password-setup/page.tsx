"use client";

// Prevent caching of this page (authentication required)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/config";

export default function PasswordSetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [sessionReady, setSessionReady] = useState(false);

  // Check if user is authenticated and session is valid
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No active session, redirect to login
          router.push("/login");
          return;
        }

        // Session exists, get user email
        setUserEmail(session.user?.email || "");
        setSessionReady(true);
      } catch (error) {
        console.error("Session check error:", error);
        router.push("/login");
      }
    };

    checkSession();
  }, [router]);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const meetsAllRequirements = hasMinLength && hasUpperCase && hasLowerCase && hasNumbers;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!password || !confirmPassword) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }

      if (!meetsAllRequirements) {
        setError("Password does not meet all requirements");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords don't match");
        setLoading(false);
        return;
      }

      // Call the password setup endpoint
      const response = await apiRequest("POST", "/api/auth/setup-password", {
        password,
        confirmPassword,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to set password");
        setLoading(false);
        return;
      }

      // Password setup successful
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

      // Wait 2 seconds, then sign out and redirect to login
      // This forces the user to re-authenticate with their new password
      setTimeout(async () => {
        try {
          // Clear all caches before signing out
          sessionStorage.clear();
          
          // Clear browser cache by clearing cookies
          document.cookie.split(";").forEach((c) => {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
          });
          
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Sign out error:", signOutError);
        }
        
        // Prevent back button from showing cached version of password setup page
        window.history.pushState(null, "", window.location.href);
        window.addEventListener('popstate', () => {
          window.history.pushState(null, "", window.location.href);
        });
        
        // Use window.location for full page refresh (not Next.js navigation)
        // This ensures fresh page load without cache
        window.location.href = "/login?message=Password+setup+successful.+Please+log+in+with+your+new+password";
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Up Your Password</h1>
            <p className="text-gray-600">
              Create a secure password to secure your account. This is required before you can proceed.
            </p>
            {userEmail && (
              <p className="text-sm text-gray-500 mt-2">Account: {userEmail}</p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50 mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password set successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="pr-10 bg-gray-50 border-gray-300 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  disabled={loading || success}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="space-y-2 mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
                <div className={`text-xs flex items-center gap-2 ${hasMinLength ? "text-green-600" : "text-gray-400"}`}>
                  {hasMinLength ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`text-xs flex items-center gap-2 ${hasUpperCase ? "text-green-600" : "text-gray-400"}`}>
                  {hasUpperCase ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0" />}
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`text-xs flex items-center gap-2 ${hasLowerCase ? "text-green-600" : "text-gray-400"}`}>
                  {hasLowerCase ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0" />}
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`text-xs flex items-center gap-2 ${hasNumbers ? "text-green-600" : "text-gray-400"}`}>
                  {hasNumbers ? <Check className="h-3 w-3 flex-shrink-0" /> : <X className="h-3 w-3 flex-shrink-0" />}
                  <span>At least one number (0-9)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  className="pr-10 bg-gray-50 border-gray-300 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  disabled={loading || success}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className={`text-xs font-medium flex items-center gap-2 mt-2 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                  {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {passwordsMatch ? "Passwords match ✓" : "Passwords don't match"}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg transition-colors"
              disabled={loading || success || !meetsAllRequirements || !passwordsMatch}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Setting Password..." : "Set Password"}
            </Button>

            {/* Info Message */}
            <p className="text-xs text-gray-500 text-center">
              Your account is secure. You'll be signed out and asked to log in again with your new password.
            </p>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Need help? Contact support at admin@example.com</p>
        </div>
      </div>
    </div>
  );
}
