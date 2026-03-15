"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/config";

interface PasswordSetupModalProps {
  open: boolean;
  onComplete?: () => void;
  email?: string;
}

export function PasswordSetupModal({ open, onComplete, email }: PasswordSetupModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    try {
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

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

      // Sign out the user and redirect to login to re-authenticate with new password
      setTimeout(async () => {
        onComplete?.();
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open && !success} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Your Password</DialogTitle>
          <DialogDescription>
            Create a secure password to access your account. This is required before you can proceed.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Password set successfully! Redirecting to login...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                className="pr-10"
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
            <div className="space-y-1 mt-2">
              <div className={`text-xs flex items-center gap-2 ${hasMinLength ? "text-green-600" : "text-gray-400"}`}>
                {hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least 8 characters
              </div>
              <div className={`text-xs flex items-center gap-2 ${hasUpperCase ? "text-green-600" : "text-gray-400"}`}>
                {hasUpperCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least one uppercase letter
              </div>
              <div className={`text-xs flex items-center gap-2 ${hasLowerCase ? "text-green-600" : "text-gray-400"}`}>
                {hasLowerCase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least one lowercase letter
              </div>
              <div className={`text-xs flex items-center gap-2 ${hasNumbers ? "text-green-600" : "text-gray-400"}`}>
                {hasNumbers ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                At least one number
              </div>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
                className="pr-10"
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
              <div className={`text-xs font-medium flex items-center gap-2 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {passwordsMatch ? "Passwords match" : "Passwords don't match"}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700"
            disabled={loading || success || !meetsAllRequirements || !passwordsMatch}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Setting Password..." : "Set Password"}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            You won't be able to use your account until you set a secure password.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
