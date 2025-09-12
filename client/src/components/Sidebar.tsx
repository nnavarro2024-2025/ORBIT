import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";

type SidebarItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

type SidebarProps = {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
};

export default function Sidebar({ items, activeItem, onItemClick }: SidebarProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Redirect is handled globally in useAuth.ts
  };

  return (
    <div className="material-card p-4 flex flex-col h-full">
      {/* Logo / Title */}
      <div className="mb-4 flex items-center gap-3">
        {/* logo removed as requested - sidebar shows no header text or image */}
      </div>
      <nav className="flex-grow">
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemClick(item.id)}
                className={`w-full text-left flex items-center px-4 py-3 rounded-lg transition-colors mb-1 ${
                  activeItem === item.id
                    ? "bg-pink-50 text-pink-700 font-semibold"
                    : "hover:bg-pink-50"
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-4 pt-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center px-4 py-3 rounded-lg hover:bg-pink-50 text-muted-foreground"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}