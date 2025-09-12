import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Users, Shield } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/login");
  };

  // Redirect non-admin authenticated users directly to the booking dashboard
  useEffect(() => {
    if (isAuthenticated && user && user.role !== "admin") {
      setLocation("/booking");
    }
  }, [isAuthenticated, user, setLocation]);

  if (isAuthenticated && user) {
    if (user.role === "admin") {
      return (
        <>
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
              <div className="text-center mb-8 sm:mb-12 lg:mb-16">
                <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
                  <img
                    src="/orbit-logo.png"
                    alt="ORBIT Logo"
                    className="h-16 sm:h-20 lg:h-24 w-auto object-contain"
                  />
                </div>
                <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-3 sm:mb-4 font-light">Integrated Library Facility Management System</p>
                {/* Removed admin 'Welcome back' greeting as requested */}
              </div>

              <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <Link to="/admin" className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mb-4 sm:mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">Admin Dashboard</h3>
                      <p className="text-sm sm:text-base text-gray-600">Manage system settings and users</p>
                    </div>
                  </div>
                </Link>
                {/* ORZ feature removed */}
                <Link to="/booking" className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-600 to-rose-700 rounded-full mb-4 sm:mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                        <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">Booking Management</h3>
                      <p className="text-sm sm:text-base text-gray-600">Manage facility bookings</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </>
      );
    }

  // Non-admins are redirected by the top-level effect; render nothing here
  return null;
  }

  // Not logged in (Landing page)
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="h-full flex items-center justify-center">
        <div className="w-full max-w-6xl px-6">
          <div className="text-center mb-6 sm:mb-8 lg:mb-10">
            <div className="inline-flex items-center justify-center mb-3 sm:mb-4 lg:mb-6">
              <img 
                src="/orbit-logo.png" 
                alt="ORBIT Logo" 
                className="h-18 sm:h-22 lg:h-24 w-auto object-contain"
              />
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-3 sm:mb-4 font-light">
              Integrated Library Facility Management System
            </p>
            <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-snug">
              Easily find and reserve library rooms and facilities — manage your bookings in one place.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12 lg:mb-16">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-lg">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-600 to-rose-700 rounded-full mb-4 sm:mb-6 shadow-xl">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">User-Friendly Interface</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Easy-to-use system designed specifically for library users
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-lg mx-auto">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mb-4 sm:mb-6 shadow-xl">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Facility Booking</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Quickly reserve rooms and manage bookings
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center transform transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-lg">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full mb-4 sm:mb-6 shadow-xl">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Secure UIC-only Access</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Sign in with your UIC account for authorized and secure access to system features.
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white font-bold text-lg sm:text-xl px-8 sm:px-12 py-3 sm:py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-2xl hover:shadow-pink-500/30"
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
