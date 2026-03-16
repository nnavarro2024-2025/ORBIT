"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/data";
import { authenticatedFetch } from "@/lib/api";
import { supabase } from "@/lib/config";
import { useLegacyLocation, getPasswordChecks, isStrongPassword } from "@/lib/utils";

export default function CreatePasswordPage() {
  const { isAuthenticated, user, isLoading, requiresPasswordSetup } = useAuth();
  const [, setLocation] = useLegacyLocation();
  const hasNavigatedRef = useRef(false);

  const hasRecentPasswordSetupCompletion = () => {
    try {
      const raw = sessionStorage.getItem("orbit:password_setup_completed_until");
      if (!raw) return false;
      const until = Number(raw);
      if (!Number.isFinite(until)) {
        sessionStorage.removeItem("orbit:password_setup_completed_until");
        return false;
      }
      if (Date.now() > until) {
        sessionStorage.removeItem("orbit:password_setup_completed_until");
        return false;
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (hasNavigatedRef.current) return;
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      hasNavigatedRef.current = true;
      setLocation("/login");
      return;
    }

    const canBypass = hasRecentPasswordSetupCompletion();
    if (!requiresPasswordSetup || canBypass) {
      hasNavigatedRef.current = true;
      setLocation(user.role === "admin" ? "/admin" : "/booking");
    }
  }, [isLoading, isAuthenticated, user, requiresPasswordSetup, setLocation]);

  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = isStrongPassword(password) && passwordsMatch && !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!canSubmit) {
      setError("Please satisfy all password requirements and confirm your password.");
      return;
    }

    setSubmitting(true);
    try {
      await authenticatedFetch("/auth/password/setup", {
        method: "POST",
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      });

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await supabase.auth.signOut();
        try {
          sessionStorage.setItem("orbit:password_created_msg", "Password created successfully. Please sign in with your new password.");
          sessionStorage.setItem("orbit:password_setup_completed_until", String(Date.now() + 30000));
        } catch (_) {}
        setSuccess("Password created successfully. Please sign in again with your new password.");
        setTimeout(() => {
          hasNavigatedRef.current = true;
          setLocation("/login");
        }, 2200);
        return;
      }

      setSuccess("Password created successfully. Redirecting...");
      try {
        sessionStorage.setItem("orbit:password_setup_completed_until", String(Date.now() + 30000));
      } catch (_) {}
      try {
        window.dispatchEvent(new Event("orbit:auth:refresh"));
      } catch (_) {
        // ignore
      }

      setTimeout(() => {
        const target = user?.role === "admin" ? "/admin" : "/booking";
        hasNavigatedRef.current = true;
        setLocation(target);
      }, 1800);
    } catch (err: any) {
      setError(err?.message || "Failed to create password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-rose-50 via-white to-pink-50">

      {success && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
          <div
            className="mt-6 flex items-start gap-3 bg-white border border-green-200 shadow-2xl rounded-2xl px-5 py-4 max-w-sm w-full mx-4 pointer-events-auto"
            style={{ animation: "slideDownFadeIn 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Password Created</p>
              <p className="text-sm text-gray-600 mt-0.5">{success}</p>
            </div>
          </div>
          <style>{`
            @keyframes slideDownFadeIn {
              from { opacity: 0; transform: translateY(-18px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="text-center mb-6">
          <img src="/orbit-logo.png" alt="ORBIT Logo" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Create Your Password</h1>
          <p className="text-sm text-gray-600 mt-2">
            Set a secure password before continuing to ORBIT.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-2.5 pr-11 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-pink-600 focus:outline-none transition-all duration-200"
                placeholder="Create a strong password"
                autoComplete="new-password"
                disabled={submitting}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className=" rounded-lg  space-y-2">
            <p className="text-[12px] font-medium text-gray-700">Password requirements</p>
             <ChecklistItem ok={checks.hasMinLength} text="At least 8 characters" />
            <ChecklistItem ok={checks.hasLowercase} text="At least one lowercase letter (a-z)" />
            <ChecklistItem ok={checks.hasUppercase} text="At least one uppercase letter (A-Z)" />
            <ChecklistItem ok={checks.hasNumber} text="At least one number (0-9)" />
            <ChecklistItem ok={checks.hasSymbol} text="At least one symbol (!@#$%^&*)." />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-2.5 pr-11 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-pink-600 focus:outline-none transition-all duration-200"
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={submitting}
                required
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className={`text-[12px] ${passwordsMatch ? "text-green-600" : "text-gray-500"}`}>
              {passwordsMatch ? "Passwords match" : "Passwords must match"}
            </p>
          </div>


          <button
            type="submit"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium text-sm py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={!canSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Create Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChecklistItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-[12px] ${ok ? "text-green-600" : "text-gray-500"}`}>
      <Check className={`h-4 w-4 ${ok ? "text-green-600" : "text-gray-400"}`} />
      <span>{text}</span>
    </div>
  );
}
