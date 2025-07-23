import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { BookOpen, Calendar, Dock, Users, Shield } from "lucide-react";

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    setLocation("/login");
  };

  if (isAuthenticated && user) {
    if (user.role === "admin") {
      return (
        <div className="min-h-screen bg-gradient-to-br from-primary to-blue-800 dark:from-blue-900 dark:to-blue-950">
          <div className="container mx-auto px-6 py-16">
            <div className="text-center mb-12">
              <BookOpen className="h-16 w-16 text-white mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-white mb-4">ORBIT</h1>
              <p className="text-xl text-white/90 mb-8">Administrative Dashboard</p>
              <p className="text-white/80">
                Welcome back, {user.firstName} {user.lastName}
              </p>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/admin" className="material-card p-6 hover:shadow-material-lg cursor-pointer transition-all duration-300">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
                  <p className="text-muted-foreground">Manage system settings and users</p>
                </div>
              </Link>
              <Link href="/orz" className="material-card p-6 hover:shadow-material-lg cursor-pointer transition-all duration-300">
                <div className="text-center">
                  <Dock className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">ORZ Management</h3>
                  <p className="text-muted-foreground">Monitor computer usage</p>
                </div>
              </Link>
              <Link href="/booking" className="material-card p-6 hover:shadow-material-lg cursor-pointer transition-all duration-300">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-secondary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Booking Management</h3>
                  <p className="text-muted-foreground">Manage facility bookings</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Student
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-blue-800 dark:from-blue-900 dark:to-blue-950">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <BookOpen className="h-16 w-16 text-white mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-4">ORBIT</h1>
            <p className="text-xl text-white/90 mb-8">Integrated Library Facility & Computer Usage Management System</p>
            <p className="text-white/80">Welcome back, {user.firstName} {user.lastName}</p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <Link href="/orz" className="material-card p-8 hover:shadow-material-lg cursor-pointer transition-all duration-300">
              <div className="text-center">
                <Dock className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">ORZ Computer Usage</h3>
                <p className="text-muted-foreground mb-4">Manage computer logins and usage in the Online Resource Zone</p>
                <div className="material-button primary w-full">Access System</div>
              </div>
            </Link>

            <Link href="/booking" className="material-card p-8 hover:shadow-material-lg cursor-pointer transition-all duration-300">
              <div className="text-center">
                <Calendar className="h-16 w-16 text-secondary mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2">Facility Booking</h3>
                <p className="text-muted-foreground mb-4">Book and manage library facilities and study rooms</p>
                <div className="material-button secondary w-full">Book Facility</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in (Landing page)
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-blue-800 dark:from-blue-900 dark:to-blue-950">
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <BookOpen className="h-20 w-20 text-white mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-white mb-4">ORBIT</h1>
          <p className="text-2xl text-white/90 mb-8">Integrated Library Facility & Computer Usage Management System</p>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Streamline your library experience with our comprehensive digital management system
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="material-card p-8 text-center">
              <Dock className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">ORZ Computer Usage</h3>
              <p className="text-muted-foreground">Manage computer logins and usage in the Online Resource Zone</p>
            </div>

            <div className="material-card p-8 text-center">
              <Calendar className="h-16 w-16 text-secondary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Facility Booking</h3>
              <p className="text-muted-foreground">Book and manage library facilities and study rooms</p>
            </div>

            <div className="material-card p-8 text-center">
              <Users className="h-16 w-16 text-warning mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-muted-foreground">Secure access for students, faculty, and administrators</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleGetStarted}
              className="material-button primary text-lg px-8 py-4 inline-block"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
