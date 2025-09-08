import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Calendar, Dock, Users, Shield } from "lucide-react";
import Footer from "@/components/Footer";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/login");
  };

  if (isAuthenticated && user) {
    if (user.role === "admin") {
      return (
        <>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-6 py-16">
              <div className="text-center mb-16">
                <div className="inline-flex items-center justify-center mb-6">
                  <img 
                    src="/images/orbit-logo.png" 
                    alt="ORBIT Logo" 
                    className="h-20 w-auto object-contain"
                  />
                </div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 tracking-tight">ORBIT</h1>
                <p className="text-2xl text-gray-700 mb-4 font-light">Integrated Library Facility & Computer Usage Management System</p>
                <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 inline-block shadow-lg">
                  <p className="text-gray-900 font-medium">
                    Welcome back, {user.firstName} {user.lastName}
                  </p>
                </div>
              </div>

              <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Link to="/admin" className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900">Admin Dashboard</h3>
                      <p className="text-gray-600">Manage system settings and users</p>
                    </div>
                  </div>
                </Link>
                <Link to="/orz" className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                        <Dock className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900">ORZ Management</h3>
                      <p className="text-gray-600">Monitor computer usage</p>
                    </div>
                  </div>
                </Link>
                <Link to="/booking" className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                        <Calendar className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900">Booking Management</h3>
                      <p className="text-gray-600">Manage facility bookings</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
          <Footer />
        </>
      );
    }

    // Student
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="container mx-auto px-6 py-16">
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center mb-6">
                <img 
                  src="/images/orbit-logo.png" 
                  alt="ORBIT Logo" 
                  className="h-20 w-auto object-contain"
                />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 tracking-tight">ORBIT</h1>
              <p className="text-xl text-gray-700 mb-6 font-light max-w-3xl mx-auto">
                Integrated Library Facility & Computer Usage Management System
              </p>
              <div className="bg-white border border-gray-200 rounded-lg px-6 py-3 inline-block shadow-lg">
                <p className="text-gray-900 font-medium">
                  Welcome back, {user.firstName} {user.lastName}
                </p>
              </div>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              <Link to="/orz" className="group">
                <div className="bg-white border border-gray-200 rounded-2xl p-10 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                      <Dock className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">ORZ Computer Usage</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Manage computer logins and usage in the Online Resource Zone
                    </p>
                    <div className="bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-xl">
                      Access System
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/booking" className="group">
                <div className="bg-white border border-gray-200 rounded-2xl p-10 hover:bg-gray-50 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-6 shadow-xl group-hover:shadow-2xl transition-all duration-300">
                      <Calendar className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Facility Booking</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Book and manage library facilities and study rooms
                    </p>
                    <div className="bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-xl">
                      Book Facility
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Not logged in (Landing page)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-8">
            <img 
              src="/images/orbit-logo.png" 
              alt="ORBIT Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6 tracking-tight">ORBIT</h1>
          <p className="text-3xl text-gray-700 mb-8 font-light">
            Integrated Library Facility & Computer Usage Management System
          </p>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Streamline your library experience with comprehensive facility booking and computer usage management
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl shadow-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mb-6 shadow-xl">
                <Dock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">ORZ Computer Usage</h3>
              <p className="text-gray-600 leading-relaxed">
                Manage computer logins and usage in the Online Resource Zone
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl shadow-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-6 shadow-xl">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Facility Booking</h3>
              <p className="text-gray-600 leading-relaxed">
                Book and manage library facilities and study rooms
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl shadow-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mb-6 shadow-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">User-Friendly Interface</h3>
              <p className="text-gray-600 leading-relaxed">
                Easy-to-use system designed specifically for library users
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-bold text-xl px-12 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-2xl hover:shadow-blue-500/30"
            >
              Get Started
            </button>
            <p className="text-gray-600 mt-4 text-sm font-medium">
              Start managing your library experience with ORBIT
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
