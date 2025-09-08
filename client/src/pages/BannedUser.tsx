import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ban, LogOut, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function BannedUser() {
  const { logout, user } = useAuth();

  console.log("BannedUser - user data:", user);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const formatBanDuration = (banEndDate: string | null) => {
    if (!banEndDate) return "Permanent";
    
    const endDate = new Date(banEndDate);
    const now = new Date();
    
    if (endDate <= now) return "Expired (Contact Admin)";
    
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day remaining";
    if (diffDays < 7) return `${diffDays} days remaining`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks remaining`;
    return `Until ${endDate.toLocaleDateString()}`;
  };

  const formatBanDate = (bannedAt: string) => {
    return new Date(bannedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Use the actual user data from useAuth
  const displayUser = user;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <Card className="w-full max-w-2xl mx-4 border-red-200 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <Ban className="h-20 w-20 text-red-500" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-700">Account Suspended</CardTitle>
          <p className="text-lg text-gray-700 font-medium mt-2">
            Your account has been suspended and you no longer have access to the system.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Combined Ban Information Card */}
          <div className="bg-gradient-to-r from-red-50 to-blue-50 border border-red-200 rounded-xl p-6">
            
            {/* Ban Reason Section */}
            {displayUser?.banReason && (
              <div className="mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <h3 className="font-semibold text-red-800 text-lg">Reason for Suspension</h3>
                </div>
                <div className="bg-white/70 rounded-lg p-3 border border-red-100">
                  <p className="text-red-800 leading-relaxed">{displayUser.banReason}</p>
                </div>
              </div>
            )}
            
            {/* Suspension Details Section */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <h3 className="font-semibold text-blue-800 text-lg">Suspension Details</h3>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-blue-100 space-y-2">
                {displayUser?.bannedAt && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                    <span className="font-medium text-blue-800 min-w-[120px]">Suspended on:</span>
                    <span className="text-blue-700">{formatBanDate(displayUser.bannedAt)}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <span className="font-medium text-blue-800 min-w-[120px]">Duration:</span>
                  <span className="text-blue-700 font-medium">
                    {displayUser?.banEndDate ? formatBanDuration(displayUser.banEndDate) : "Permanent"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Appeal Information */}
          <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border">
            <p className="mb-1 font-medium">Need to Appeal?</p>
            <p>If you believe this suspension is in error, please contact the system administrator for review.</p>
          </div>
          
          {/* Sign Out Button */}
          <Button 
            onClick={handleLogout}
            variant="destructive"
            className="w-full flex items-center justify-center gap-2 py-3 text-lg"
            size="lg"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
