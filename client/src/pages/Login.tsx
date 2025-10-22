import { useState, useEffect, useRef } from "react";
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
  const [domainBlockMsg, setDomainBlockMsg] = useState("");
  const [showDomainBlockModal, setShowDomainBlockModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"manual" | "oauth" | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  // When the confirm modal opens, focus the Confirm button so Enter will activate it immediately
  useEffect(() => {
    if (showConfirmModal) {
      // small delay to ensure dialog content is mounted
      const id = setTimeout(() => {
        try {
          confirmButtonRef.current?.focus();
        } catch (e) {
          // ignore focus failures
        }
      }, 50);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [showConfirmModal]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('domain_block') || params.get('error') === 'domain_restricted') {
        setDomainBlockMsg('Access restricted: Please use your UIC email account (@uic.edu.ph) to sign in.');
        setShowDomainBlockModal(true);
        // Clean query string so message isn't persistent on refresh
        try { window.history.replaceState({}, '', window.location.pathname); } catch (_) {}
      }
    } catch (e) {}
    // Redirect authenticated users to the appropriate dashboard.
    if (isAuthenticated && user) {
      try {
        if (user.role === "admin") {
          window.location.href = "/admin";
        } else {
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
                <p className="text-sm text-gray-700 font-bold">Integrated Library Facility Management System</p>
              </div>
            </div>

            <div className="space-y-4">
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs text-center shadow-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); setConfirmAction("manual"); setShowConfirmModal(true); }} className="space-y-4">
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
                  type="submit"
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Login"}
                </button>
                <div className="my-2 border-t border-gray-100" />
                <button
                  type="button"
                  onClick={() => { setConfirmAction("oauth"); setShowConfirmModal(true); }}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign up with UIC Account"}
                </button>
              </div>
            </form>

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
              ORBIT - Integrated Library Facility Management System — Terms and Conditions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-semibold">Introduction</p>
            <p>
              ORBIT is provided to authorized members of the University of the Immaculate Conception ("UIC") to request and manage facility reservations and related services. These Terms explain acceptable use, what data we collect and why, and how we handle violations. By using ORBIT you agree to follow these Terms and any applicable university policies.
            </p>

            <h4 className="font-semibold">Eligibility</h4>
            <p>Access is granted only to current UIC students, faculty, and staff with valid institutional accounts. Sharing credentials or accessing another person’s account is strictly prohibited.</p>

            <h4 className="font-semibold">Acceptable Use</h4>
            <p>Use ORBIT only for legitimate academic, research, or university-related activities. Do not make fraudulent or overlapping bookings, attempt to bypass booking limits, or use the system to disrupt other users' access.</p>

            <h4 className="font-semibold">Data & Privacy</h4>
            <p>
              We collect basic profile details (name, institutional email, profile photo) and booking metadata (times, facility, participants) to operate the service. Collected data is used for reservation management, notifications, and administrative reporting and is handled in accordance with UIC's privacy policies.
            </p>

            <h4 className="font-semibold">Bookings, Cancellations & No-shows</h4>
            <p>
              Please create reservations in good faith and cancel promptly if plans change. Repeated no-shows or last-minute cancellations may result in temporary restrictions. Follow any facility-specific rules listed in the facility details when using a space.
            </p>

            <h4 className="font-semibold">Enforcement & Appeals</h4>
            <p>
              Violations may result in warnings, temporary suspension, or permanent loss of access. Serious cases may be referred to university authorities. If you believe an action was taken in error, contact the library or the system administrators to request a review.
            </p>

            <h4 className="font-semibold">Contact & Support</h4>
            <p>
              For questions, support, or to report problems with a facility, contact the library staff using the contact information provided in the facility details or the university directory.
            </p>

            <p className="text-sm text-gray-600">Click "I Understand" to acknowledge these Terms and continue. Your acknowledgement will be recorded for compliance and support purposes.</p>
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
          <form onSubmit={async (e) => {
            e.preventDefault();
            setShowConfirmModal(false);
            if (confirmAction === "manual") {
              await handleAuth();
            } else if (confirmAction === "oauth") {
              await signInWithGoogle();
            }
            setConfirmAction(null);
          }}>
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
              <Button type="button" variant="ghost" onClick={() => { setShowConfirmModal(false); setConfirmAction(null); }} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancel
              </Button>
              <Button ref={confirmButtonRef} type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">
                Confirm
              </Button>
            </div>
          </form>
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
              <p className="text-sm text-gray-600 mb-4">ORBIT requires a valid UIC (University of the Immaculate Conception) email account to access school services.</p>
              <p className="text-sm text-gray-600 mb-6">You can sign in using your UIC Account (Google OAuth).</p>

              <div className="space-y-3">
                <Button
                  onClick={() => { setShowCreateModal(false); signInWithGoogle(); }}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 rounded-lg"
                >
                  Sign up with UIC Account
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">If you don't have a UIC account, please contact the school administration for assistance.</p>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Domain Block Modal */}
      <Dialog open={showDomainBlockModal} onOpenChange={setShowDomainBlockModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center mb-2 text-red-600">Access Restricted</DialogTitle>
          </DialogHeader>

          <div className="p-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white rounded-full p-4 shadow-sm border border-yellow-100">
                  <Mail className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <h4 className="font-semibold text-lg text-gray-900 mb-2">UIC Email Required</h4>
              <p className="text-sm text-gray-700 mb-4">{domainBlockMsg}</p>
              <p className="text-sm text-gray-600">Please sign in using your @uic.edu.ph email account to access ORBIT.</p>
            </div>
          </div>

          <div className="flex justify-center pb-4">
            <Button
              onClick={() => setShowDomainBlockModal(false)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-8"
            >
              OK, I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}