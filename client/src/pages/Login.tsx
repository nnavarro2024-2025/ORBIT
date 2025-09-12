import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Check, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Login() {
  useRoute<{ subsystem?: string }>("/login/:subsystem?");

  const { isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"manual" | "oauth" | null>(null);

  useEffect(() => {
    // When authentication completes, redirect regular users to the booking dashboard.
    // Admins should be able to choose their destination, so we don't auto-redirect them.
    if (isAuthenticated && user) {
      try {
        if (user.role !== "admin") {
          window.location.href = "/booking";
        }
      } catch (e) {
        // If anything goes wrong, do not redirect and let the user proceed manually.
        console.error("Redirect after login failed:", e);
      }
    }
  }, [isAuthenticated, user]);

  const signInWithGoogle = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          // Force Google to show the account chooser so users can pick which account to use
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) setErrorMsg("Sign-in failed: " + error.message);
    } catch (e) {
      setErrorMsg("Sign-in failed");
    }
    setLoading(false);
  };

  const handleAuth = async () => {
    setLoading(true);
    setErrorMsg("");
    // basic client-side validation
    if (!email || !password) {
      setErrorMsg("Login failed: missing email or phone");
      setLoading(false);
      return;
    }
    try {
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
      }
      // Do not auto-redirect after login; allow the user to choose the next page.
    } catch (e) {
      setErrorMsg("Login failed");
    }
    setLoading(false);
  };

  // subsystem prop is available if needed later

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/facility-overview.jpg)' }} />
        <div className="absolute inset-0 bg-black/60" />
        
        <div className="relative w-full max-w-md z-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center mb-1">
                <img
                  src="/orbit-logo.png"
                  alt="ORBIT Logo"
                  className="h-24 sm:h-28 w-auto object-contain"
                />
              </div>
              <div className="text-center mb-3">
                <p className="text-sm text-gray-700 font-medium">Integrated Library Facility Management System</p>
              </div>
            </div>

            <div className="space-y-4">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs text-center shadow-sm">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-pink-600 focus:outline-none transition-all duration-200 shadow-sm"
                placeholder="Enter Email Address"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-pink-600 focus:outline-none transition-all duration-200 shadow-sm"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setConfirmAction("manual"); setShowConfirmModal(true); }}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="my-2 border-t border-gray-100" />
              <button
                onClick={() => { setConfirmAction("oauth"); setShowConfirmModal(true); }}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in with UIC Account"}
              </button>
            </div>

            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-600">
                By continuing, you agree to our{" "}
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="text-pink-600 hover:text-pink-700 underline transition-colors text-xs"
                >
                  Terms and Conditions
                </button>
              </p>
            </div>
            <div className="text-center mt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-pink-600 hover:text-pink-700 underline transition-colors text-xs"
              >
                Create Account
              </button>
            </div>
          </div>

          <div />
          </div>
        </div>
      </div>
      <button onClick={() => window.location.href = "/"} className="absolute top-6 left-6 z-20 text-gray-700 hover:text-gray-900 text-sm font-medium bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200">
        ← Back to Home
      </button>
      
      {/* Terms and Conditions Modal */}
    <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-4">
              ORBIT — Integrated Library Facility Management System — Terms and Conditions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-semibold">Introduction</p>
            <p>
              ORBIT is provided to authorized members of the University of the Immaculate Conception ("UIC") to manage facility reservations and related services. These Terms describe acceptable use, data practices, and enforcement procedures. By using ORBIT you agree to comply with these Terms and any applicable institutional policies.
            </p>

            <h4 className="font-semibold">1. Eligibility</h4>
            <p>Access is limited to holders of valid UIC accounts. Sharing credentials or using another person's account is prohibited.</p>

            <h4 className="font-semibold">2. Permitted Use</h4>
            <p>ORBIT shall be used for legitimate academic and library-related activities. Users must not obstruct others' access, make fraudulent bookings, or abuse system functionality.</p>

            <h4 className="font-semibold">3. Data & Privacy</h4>
            <p>We collect minimal profile information (name, institutional email, avatar) and booking metadata to provide services. Data is processed according to UIC policies. By creating an account you consent to this data use for system operations and communications related to bookings.</p>

            <h4 className="font-semibold">4. Enforcement</h4>
            <p>Violations of these Terms may result in warning, suspension, or revocation of access. Serious or repeated misconduct may be escalated to university authorities.</p>

            <p className="text-sm text-gray-600">Click "I Understand" to acknowledge these Terms and continue.</p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="ghost"
              onClick={() => setShowTermsModal(false)}
              className="bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => setShowTermsModal(false)}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Sign In / OAuth */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md bg-white rounded-lg p-6 text-gray-900 shadow-sm border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center mb-2">Confirm action</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-700">
            {confirmAction === "manual" && (
              <p>You're about to sign in with the email and password you provided. Do you want to continue?</p>
            )}
            {confirmAction === "oauth" && (
              <p>You're about to sign in with your UIC account. You will be redirected to the provider to complete sign in. Continue?</p>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => { setShowConfirmModal(false); setConfirmAction(null); }} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              Cancel
            </Button>
            <Button onClick={async () => {
              setShowConfirmModal(false);
              if (confirmAction === "manual") {
                await handleAuth();
              } else if (confirmAction === "oauth") {
                await signInWithGoogle();
              }
              setConfirmAction(null);
            }} className="bg-pink-600 hover:bg-pink-700 text-white">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Account Modal (UIC Account Required) */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center mb-2">UIC Account Required</DialogTitle>
          </DialogHeader>

          <div className="p-4">
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-4 shadow-sm border border-pink-100">
                  <Mail className="h-8 w-8 text-pink-600" />
                </div>
              </div>
              <h4 className="font-semibold text-lg text-gray-900 mb-2">University Account Only</h4>
              <p className="text-sm text-gray-600 mb-4">ORBIT requires a valid UIC (University of the Immaculate Conception) email account to access library services.</p>
              <p className="text-sm text-gray-600 mb-6">You can sign in using your UIC Account (Google OAuth).</p>

              <div className="space-y-3">
                <Button
                  onClick={() => { setShowCreateModal(false); signInWithGoogle(); }}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg"
                >
                  Sign in with UIC Account
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">If you don't have a UIC account, please contact the library administration for assistance.</p>
          </div>
        </DialogContent>
      </Dialog>
      
      
    </>
  );
}