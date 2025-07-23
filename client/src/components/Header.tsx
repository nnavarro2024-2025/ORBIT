import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, BookOpen } from "lucide-react";

export default function Header() {
  const { user } = useAuth();

  // 👇 Add this to check what's inside user
 

  return (
    <header className="bg-card shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-semibold">ORBIT</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user?.role === 'admin' && (
              <div className="relative">
                <button className="p-2 text-muted-foreground hover:text-primary">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </button>
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata.first_name} {user?.user_metadata.last_name}
            </span>
            <a href="/api/logout" className="material-button outlined">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
