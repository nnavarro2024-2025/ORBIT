import { useState } from "react";
import { useAuth } from "@/hooks/data";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/ui";
import { Settings, User as UserIcon, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PasswordRequirements, checkPasswordStrength } from "@/components/common";
// Removed accordion import - settings UI simplified and handled inline

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PROFILE_IMAGE = "https://placehold.co/150x150/E0E0E0/FFFFFF/png?text=User"; // A generic user icon placeholder

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [showing, setShowSettings] = useState(false); // State to toggle between profile info and settings
  const [profileImageUrlInput, setProfileImageUrlInput] = useState(user?.profileImageUrl || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password validation checks for new password
  const passwordStrengthInfo = checkPasswordStrength(newPassword);
  const newPasswordMeetsAllRequirements = passwordStrengthInfo.meetsAllRequirements;
  const newPasswordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const updateProfileMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string; profileImageUrl?: string }) => apiRequest("PUT", "/api/user/profile", data),
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated.",
      });
      // Close the modal after successful update
  onClose();
  // Ask the auth hook to refresh the user (useAuth listens for this event)
  try { window.dispatchEvent(new Event('orbit:auth:refresh')); } catch (e) {}
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

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      apiRequest("PUT", "/api/auth/change-password", data),
    onSuccess: () => {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);
    },
    onError: (error: any) => {
      setPasswordError(error.message || "Failed to change password");
    },
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill in all fields");
      return;
    }

    if (!newPasswordMeetsAllRequirements) {
      setPasswordError("New password does not meet all requirements");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }
    
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }
    
    await changePasswordMutation.mutateAsync({ currentPassword, newPassword, confirmPassword });
  };

  // Update logic uses the provided profile image URL

  const handleToggleSettings = () => setShowSettings(!showing);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="flex flex-row justify-between items-center">
          <SheetTitle className="flex items-center gap-2">
            {showing ? (
              <button 
                onClick={handleToggleSettings} 
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
            {showing ? "User Settings" : "User Profile"}
          </SheetTitle>
          {!showing && (
            <button 
              onClick={handleToggleSettings} 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
        </SheetHeader>
        <SheetDescription>
          {showing ? "Manage your preferences and account settings." : "View your personal information."}
        </SheetDescription>
        <div className="py-4 flex-1 overflow-y-auto">
          {user ? (
            <>
              {!showing ? (
                <div className="flex flex-col items-center space-y-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <Avatar className="h-24 w-24 border-4 border-blue-200 shadow-lg">
                    <AvatarImage src={previewUrl || user.profileImageUrl || DEFAULT_PROFILE_IMAGE} alt="User Avatar" />
                    <AvatarFallback className="text-4xl bg-pink-500 text-white font-bold">
                      {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Profile preview - uploads are available in User Settings only */}
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
                      <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full font-medium">{user.role || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-700">Member Since:</span>
                      <span className="text-gray-600">{new Date(user.createdAt).toLocaleDateString() || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 w-full mt-6">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex flex-col items-center space-y-4">
                      <Avatar className="h-24 w-24 border-4 border-blue-200 shadow-lg">
                        <AvatarImage src={previewUrl || user.profileImageUrl || DEFAULT_PROFILE_IMAGE} alt="User Avatar" />
                        <AvatarFallback className="text-4xl bg-pink-500 text-white font-bold">
                          {`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col w-full space-y-2 pt-2">
                        <label className="block text-sm font-semibold text-gray-700">Profile Image URL</label>
                        <input
                          type="url"
                          value={profileImageUrlInput}
                          onChange={(e) => { setProfileImageUrlInput(e.target.value); setPreviewUrl(e.target.value || null); }}
                          placeholder="https://example.com/your-avatar.png"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                        <p className="text-sm text-gray-500">Paste a link to your avatar image above.</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
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
                      {/* Removed direct Profile Image URL input to avoid duplication; upload via file input only */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            disabled={updateProfileMutation.isPending}
                            className="w-full px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Profile Update</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to save these changes to your profile?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                // Execute upload and update logic
                                const uploadAndUpdate = async () => {
                                  try {
                                        const finalUrl = profileImageUrlInput || undefined;
                                        await updateProfileMutation.mutateAsync({ firstName, lastName, profileImageUrl: finalUrl });
                                  } catch (err: any) {
                                    toast({ title: 'Upload Failed', description: err.message || 'Could not upload image', variant: 'destructive' });
                                  }
                                };
                                uploadAndUpdate();
                              }}
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Password Change Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}
                      
                      {passwordSuccess && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-800">Password changed successfully!</AlertDescription>
                        </Alert>
                      )}

                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            disabled={changePasswordMutation.isPending}
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            disabled={changePasswordMutation.isPending}
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {newPassword && <PasswordRequirements password={newPassword} className="mt-3" />}
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            disabled={changePasswordMutation.isPending}
                            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={changePasswordMutation.isPending || passwordSuccess}
                        className="w-full px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <Skeleton className="h-3 w-48 mx-auto" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}