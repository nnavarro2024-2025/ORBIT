import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Calendar, Users, Shield } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/login");
  };

  // Redirect authenticated users to the appropriate dashboard (admins -> /admin, others -> /booking)
  useEffect(() => {
    if (isAuthenticated && user) {
      try {
        if (user.role === "admin") {
          setLocation("/admin");
        } else {
          setLocation("/booking");
        }
      } catch (e) {
        // Avoid throwing during render; fallthrough to render landing if redirect fails
        console.error("Redirect after auth check failed:", e);
      }
    }
  }, [isAuthenticated, user, setLocation]);

  // Not logged in (Landing page)
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <div className="inline-flex items-center justify-center mb-3 sm:mb-4 lg:mb-6">
              <img 
                src="/orbit-logo.png" 
                alt="ORBIT Logo" 
                className="h-12 sm:h-14 md:h-16 w-auto object-contain"
              />
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-3 sm:mb-4 font-bold">ORBIT - Integrated Library Facility Management System</p>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-snug">
              Easily find and reserve school rooms and facilities — manage your bookings in one place.
            </p>
          </div>

          <div className="mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-4 sm:mb-8 lg:mb-10">
              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center transform transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-md">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-600 to-rose-700 rounded-full mb-3 sm:mb-4 shadow-lg">
                  <Users className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">User-Friendly Interface</h3>
                  <p className="text-sm text-gray-600 leading-tight">
                  Easy-to-use system designed specifically for school users
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center transform transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-md mx-auto">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mb-3 sm:mb-4 shadow-lg">
                  <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Facility Booking</h3>
                <p className="text-sm text-gray-600 leading-tight">
                  Quickly reserve rooms and manage bookings
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 text-center transform transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-md">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mb-3 sm:mb-4 shadow-lg">
                  <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Secure UIC-only Access</h3>
                <p className="text-sm text-gray-600 leading-tight">
                  Sign in with your UIC account for authorized and secure access to system features.
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto max-w-xs sm:max-w-md mx-auto bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white font-bold text-base sm:text-lg px-4 py-2 sm:px-10 sm:py-3 rounded-lg transition-all duration-150 transform hover:scale-105 shadow-lg hover:shadow-pink-500/20"
              >
                Get Started
              </button>
              <p className="text-sm sm:text-base text-gray-600 mt-3 sm:mt-4 font-medium">
                Sign in with your UIC account to access the system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
