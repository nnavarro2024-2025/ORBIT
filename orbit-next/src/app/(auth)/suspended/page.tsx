"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/config";
import { Shield, LogOut, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function SuspendedPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            <Image
              src="/orbit-logo.png"
              alt="ORBIT Logo"
              width={96}
              height={96}
              className="object-contain"
            />
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <Shield className="w-16 h-16 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-3">
          Account Suspended
        </h1>

        {/* User Email */}
        {userEmail && (
          <div className="flex items-center justify-center gap-2 mb-6 text-gray-600">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{userEmail}</span>
          </div>
        )}

        {/* Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-center text-gray-700 leading-relaxed">
            Your account has been suspended due to a violation of our terms of service or community guidelines.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">What happens now?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>You cannot access the facility booking system</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>All active bookings have been cancelled</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Contact the library administrator if you believe this is an error</span>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">Need Help?</h3>
          <p className="text-sm text-gray-600">
            Contact the UIC Library Administration at{" "}
            <a href="mailto:library@uic.edu.ph" className="text-blue-600 hover:underline">
              library@uic.edu.ph
            </a>
          </p>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          size="lg"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 mt-6">
          University of the Immaculate Conception
          <br />
          ORBIT - Integrated Library Facility Management System
        </p>
      </div>
    </div>
  );
}
