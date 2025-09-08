import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, User as UserIcon, ArrowLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROFILE_IMAGE = "https://placehold.co/150x150/E0E0E0/FFFFFF/png?text=User"; // A generic user icon placeholder

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [profileImageUrlInput, setProfileImageUrlInput] = useState(user?.profileImageUrl || "");
  const [showSettings, setShowSettings] = useState(false); // State to toggle between profile info and settings

  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; profileImageUrl?: string }) => apiRequest("PUT", "/api/user/profile", data),
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Profile Update Failed",
        description: error.message || "An error occurred while updating your profile.",
        variant: "destructive",
      });
    },
  });

  // Removed updateUserSettingsMutation as it was only for theme/emailNotifications

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({ firstName, lastName, profileImageUrl: profileImageUrlInput });
  };

  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="flex flex-row justify-between items-center">
          <SheetTitle className="flex items-center gap-2">
            {showSettings ? (
              <button 
                onClick={handleToggleSettings} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
            {showSettings ? "User Settings" : "User Profile"}
          </SheetTitle>
          {!showSettings && (
            <button 
              onClick={handleToggleSettings} 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </SheetHeader>
        <SheetDescription>
          {showSettings ? "Manage your preferences and account settings." : "View your personal information."}
        </SheetDescription>
        <div className="py-4 flex-1 overflow-y-auto">
          {user ? (
            <>
              {!showSettings ? (
                <div className="flex flex-col items-center space-y-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <Avatar className="h-24 w-24 border-4 border-blue-200 shadow-lg">
                    <AvatarImage src={user.profileImageUrl || DEFAULT_PROFILE_IMAGE} alt="User Avatar" />
                    <AvatarFallback className="text-4xl bg-blue-500 text-white font-bold">
                      {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : 'N/A'}
                    </h3>
                    <p className="text-lg text-gray-600">
                      {user.email || 'N/A'}
                    </p>
                  </div>
                  <div className="w-full space-y-3 pt-4 border-t border-gray-300">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-700">Role:</span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">{user.role || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-700">Member Since:</span>
                      <span className="text-gray-600">{new Date(user.createdAt).toLocaleDateString() || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 w-full mt-6">
                  {/* Profile Information */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value="profile-information" className="border-none">
                        <AccordionTrigger className="px-6 py-4 text-lg font-bold text-gray-900 hover:bg-gray-50 rounded-t-xl">
                          Profile Information
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                              <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Enter your first name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                              <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Enter your last name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Image URL</label>
                              <input
                                type="text"
                                value={profileImageUrlInput}
                                onChange={(e) => setProfileImageUrlInput(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="Enter profile image URL"
                              />
                            </div>
                            <button
                              onClick={handleUpdateProfile}
                              disabled={updateProfileMutation.isPending}
                              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                            </button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>Loading user data...</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}