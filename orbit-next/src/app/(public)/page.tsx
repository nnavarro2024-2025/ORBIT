"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Calendar, Shield, Users } from "lucide-react";

import { useAuth } from "@/hooks/data";
import { useLegacyLocation } from "@/lib/utils";

export default function LandingPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLegacyLocation();
  const processedOAuthRef = useRef(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGetStarted = () => {
    setLocation("/login");
  };

  // Handle OAuth hash tokens (#access_token=...) landing on the public page.
  // Wait for useAuth to fully establish the session (isAuthenticated && user && !authLoading) before redirecting.
  useEffect(() => {
    // Early hash detection: if we have an access_token fragment, show redirecting state.
    if (processedOAuthRef.current) return;
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
      if (hash.includes('access_token=')) {
        processedOAuthRef.current = true;
        setIsRedirecting(true);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    // Wait until auth is fully resolved (not loading, user exists, isAuthenticated).
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      // If not authenticated after loading finished, clear redirecting state.
      if (isRedirecting) setIsRedirecting(false);
      return;
    }
    try {
      const target = user.role === 'admin' ? '/admin' : '/booking';
      setLocation(target);
    } catch (error) {
      console.error('Redirect after auth check failed:', error);
      setIsRedirecting(false);
    }
  }, [isAuthenticated, user, authLoading, setLocation, isRedirecting]);

  return (
    <>
      {isRedirecting && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/orbit-logo.png" alt="ORBIT" className="h-20 w-auto animate-pulse" />
            </div>
            <p className="text-gray-600 text-sm">Signing you in...</p>
          </div>
        </div>
      )}
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
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-3 sm:mb-4 font-bold">
                ORBIT - Integrated Library Facility Management System
              </p>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-snug">
                Easily find and reserve school rooms and facilities — manage your bookings in one
                place.
              </p>
            </div>

          <div className="mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-4 sm:mb-8 lg:mb-10">
              <FeatureCard
                icon={<Users className="h-5 w-5 sm:h-7 sm:w-7 text-white" />}
                title="User-Friendly Interface"
                description="Easy-to-use system designed specifically for school users"
              />
              <FeatureCard
                icon={<Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-white" />}
                title="Facility Booking"
                description="Quickly reserve rooms and manage bookings"
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5 sm:h-7 sm:w-7 text-white" />}
                title="Secure UIC-only Access"
                description="Sign in with your UIC account for authorized and secure access to system features."
              />
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={handleGetStarted}
                className="bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-700 hover:to-rose-800 text-white font-bold text-lg px-10 py-3 rounded-lg transition-all duration-150 transform hover:scale-105 shadow-lg hover:shadow-pink-500/20"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 md:p-6 text-center transform transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-md">
      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-pink-600 to-rose-700 rounded-full mb-2 sm:mb-3 md:mb-4 shadow-lg">
        {icon}
      </div>
      <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-1 sm:mb-2 text-gray-900">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 leading-tight break-words">{description}</p>
    </div>
  );
}
