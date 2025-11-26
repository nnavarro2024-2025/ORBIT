/**
 * User Profile Dropdown Component
 * 
 * Displays user profile information and logout option
 */

import React, { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '../utils';
import { ProfileModal } from '@/components/modals';

interface UserProfileDropdownProps {
  user: any;
  onLogout: () => void;
}

export function UserProfileDropdown({ user, onLogout }: UserProfileDropdownProps) {
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

  return (
    <>
      <DropdownMenu key="user-profile-dropdown" modal={false}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Avatar className="h-9 w-9 border-2 border-gray-200">
              {user.profileImageUrl ? (
                <AvatarImage src={user.profileImageUrl} alt="User Avatar" />
              ) : (
                <AvatarFallback className="bg-pink-500 text-white font-semibold">
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
            className="cursor-pointer p-3 rounded-lg hover:bg-pink-50 hover:text-pink-700"
          >
            <User className="mr-3 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 p-3 rounded-lg"
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <ProfileModal
        isOpen={isProfileSidebarOpen}
        onClose={() => setIsProfileSidebarOpen(false)}
      />
    </>
  );
}
