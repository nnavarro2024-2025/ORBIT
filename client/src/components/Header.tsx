import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import ProfileModal from "./modals/ProfileModal";
import { useState } from "react";

export default function Header() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    }
    // The redirect to the login page is handled globally in useAuth.ts
  };

  const handleNotificationsClick = () => {
    toast({
      title: "Coming Soon!",
      description: "A notification center is not yet implemented.",
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return `${first}${last}`.toUpperCase() || "U";
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-200">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shadow-lg">
            <span className="text-xl text-white">📚</span>
          </div>
          <span className="font-bold text-xl tracking-wider text-gray-900">ORBIT</span>
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleNotificationsClick} 
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Avatar className="h-9 w-9 border-2 border-gray-200">
                    {user.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt="User Avatar" />
                    ) : (
                      <AvatarFallback className="bg-blue-500 text-white font-semibold">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="text-sm text-gray-600">Signed in as</div>
                  <div className="font-semibold text-gray-900 truncate">
                    {user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </div>
                  {user.firstName && user.lastName && (
                    <div className="text-sm text-gray-500 truncate">
                      {user.email}
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setIsProfileSidebarOpen(true)}
                  className="cursor-pointer p-3 rounded-lg hover:bg-blue-50 hover:text-blue-700"
                >
                  <User className="mr-3 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-lg"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <ProfileModal
        isOpen={isProfileSidebarOpen}
        onClose={() => setIsProfileSidebarOpen(false)}
      />
    </header>
  );
}