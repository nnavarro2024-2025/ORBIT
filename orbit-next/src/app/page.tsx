import { Calendar, Shield, Users } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function Home() {
  const features = [
    {
      icon: <Users className="h-6 w-6 text-white" />,
      title: "User-Friendly Interface",
      description: "Easy-to-use system designed specifically for school users.",
    },
    {
      icon: <Calendar className="h-6 w-6 text-white" />,
      title: "Facility Booking",
      description: "Quickly reserve rooms and manage bookings without the paperwork.",
    },
    {
      icon: <Shield className="h-6 w-6 text-white" />,
      title: "Secure UIC-only Access",
      description: "Sign in with your UIC account to keep reservations protected.",
    },
  ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-3 inline-flex items-center justify-center sm:mb-4">
            <img
              src="/orbit-logo.png"
              alt="ORBIT Logo"
              className="h-12 w-auto sm:h-14"
            />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">
            ORBIT – Integrated Library Facility Management System
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-gray-600 sm:text-base">
            Easily find and reserve school rooms and facilities, manage your bookings, and keep
            everything organized in one place.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-gray-200 bg-white p-4 text-center shadow-md transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl sm:p-6"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-600 to-rose-700 shadow-lg sm:h-14 sm:w-14 sm:mb-4">
                {feature.icon}
              </div>
              <h3 className="mb-1 text-base font-semibold text-gray-900 sm:text-lg sm:mb-2">{feature.title}</h3>
              <p className="text-xs text-gray-600 sm:text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:gap-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-pink-600 to-rose-700 px-8 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-150 hover:from-pink-700 hover:to-rose-800 hover:shadow-pink-500/30 sm:px-10 sm:py-3 sm:text-base"
          >
            Get Started
          </a>
          <p className="text-xs font-medium text-gray-600 sm:text-sm">
            Sign in with your UIC account to access the system
          </p>
        </div>
      </div>
    </div>
  );
}
