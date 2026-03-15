"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/api";

interface UserSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string;
}

export function UserSettingsModal({ open, onOpenChange, email }: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
  };

  const handleTabChange = (tab: "profile" | "password") => {
    resetForm();
    setActiveTab(tab);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      setLoading(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to change password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      resetForm();

      // Keep success message visible for 2 seconds then close modal
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Settings</DialogTitle>
          <DialogDescription>Manage your account and security settings</DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => handleTabChange("profile")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "profile"
                ? "text-pink-600 border-b-2 border-pink-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => handleTabChange("password")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "password"
                ? "text-pink-600 border-b-2 border-pink-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Password
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email || ""} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">Your email cannot be changed</p>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">Password changed successfully!</AlertDescription>
              </Alert>
            )}

            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password (8+ chars, mixed case, numbers)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Password requires: 8+ characters, uppercase, lowercase, and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={loading || success}
                className="flex-1 bg-pink-600 hover:bg-pink-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || success}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
