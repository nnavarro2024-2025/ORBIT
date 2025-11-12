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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center justify-center">
            <img
              src="/orbit-logo.png"
              alt="ORBIT Logo"
              className="h-14 w-auto sm:h-16 md:h-18"
            />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl lg:text-5xl">
            ORBIT – Integrated Library Facility Management System
          </h1>
          <p className="mx-auto max-w-2xl text-base text-gray-600 sm:text-lg">
            Easily find and reserve school rooms and facilities, manage your bookings, and keep
            everything organized in one place.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-md transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-600 to-rose-700 shadow-lg">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-pink-600 to-rose-700 px-10 py-3 text-base font-semibold text-white shadow-lg transition-all duration-150 hover:from-pink-700 hover:to-rose-800 hover:shadow-pink-500/30"
          >
            Get Started
          </a>
          <p className="text-sm font-medium text-gray-600">
            Sign in with your UIC account to access the system
          </p>
        </div>
      </div>
    </div>
  );
}
