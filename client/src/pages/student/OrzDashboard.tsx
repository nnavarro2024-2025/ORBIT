import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import TimeExtensionModal from "@/components/modals/TimeExtensionModal";
import { Dock, Clock, History, Settings, Circle, ChevronLeft, ChevronRight } from "lucide-react";

interface Session {
  id: string;
  stationId: number;
  startTime: string;
  plannedEndTime: string;
  endTime?: string; // Optional, for completed sessions
  isActive: boolean;
}

interface Station {
  id: number;
  name: string;
}

export default function OrzDashboard() {
  useAuth(); // Keep auth hook for authentication check
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [recentSessionsPage, setRecentSessionsPage] = useState(0);
  const itemsPerPage = 10;

  const handleScrollToRecent = () => {
    const el = document.getElementById('recent-sessions');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orz/sessions/active"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orz/sessions/history"] });
    queryClient.invalidateQueries({ queryKey: ["/api/orz/stations"] });
  };

  const [previousPlannedEndTime, setPreviousPlannedEndTime] = useState<string | undefined>(undefined);

  const { data: activeSession, isLoading: sessionLoading } = useQuery<Session | null>({
    queryKey: ["/api/orz/sessions/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orz/sessions/active");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  useEffect(() => {
    if (activeSession) {
      // Check if plannedEndTime has increased, indicating an approval
      if (previousPlannedEndTime && new Date(activeSession.plannedEndTime).getTime() > new Date(previousPlannedEndTime).getTime()) {
        toast({
          title: "Time Extension Approved!",
          description: "Your requested time extension has been approved by an administrator.",
          variant: "default",
        });
      }
      setPreviousPlannedEndTime(activeSession.plannedEndTime);
    } else {
      // Reset when there's no active session
      setPreviousPlannedEndTime(undefined);
    }
  }, [activeSession, previousPlannedEndTime, toast]);

  const { data: sessionHistory } = useQuery<Session[]>({
    queryKey: ["/api/orz/sessions/history"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orz/sessions/history");
      return response.json();
    },
  });

  const { data: stations } = useQuery<Station[]>({
    queryKey: ["/api/orz/stations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orz/stations");
      return response.json();
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: async (stationId: number) => {
      const response = await apiRequest("POST", "/api/orz/sessions", { stationId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orz/sessions/active"] });
      toast({
        title: "Session Started",
        description: "Your computer session has been started successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("POST", `/api/orz/sessions/${sessionId}/end`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/orz/sessions/active"], null); // Optimistically set active session to null
      queryClient.invalidateQueries({ queryKey: ["/api/orz/sessions/active"] });
      queryClient.refetchQueries({ queryKey: ["/api/orz/sessions/active"] });
      toast({
        title: "Session Ended",
        description: "Your computer session has been ended.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("POST", `/api/orz/sessions/${sessionId}/activity`);
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate time remaining
  useEffect(() => {
    if (activeSession) {
      const updateTimer = () => {
        const now = new Date();
        const endTime = new Date(activeSession.plannedEndTime);
        const diff = endTime.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeRemaining("00:00:00");
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  // Update activity every 2 minutes
  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        updateActivityMutation.mutate(activeSession.id);
      }, 120000); // 2 minutes

      return () => clearInterval(interval);
    }
  }, [activeSession, updateActivityMutation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStationName = (stationId: number) => {
    const station = stations?.find((s: Station) => s.id === stationId);
    return station?.name || `Station ${stationId}`;
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Active Session Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Computer Session Status</h2>
                {activeSession ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <Circle className="h-3 w-3 fill-current" />
                    Active
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                    <Circle className="h-3 w-3" />
                    Not Active
                  </div>
                )}
              </div>
              
              {activeSession ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Computer Station</div>
                    <div className="text-lg font-bold text-gray-900">{getStationName(activeSession.stationId)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Session Started</div>
                    <div className="text-lg font-bold text-gray-900">{formatTime(activeSession.startTime)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Time Remaining</div>
                    <div className="text-2xl font-bold text-blue-600">{timeRemaining}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Auto-logout Warning</div>
                    <div className="text-sm font-medium text-amber-600">10 minutes of inactivity</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Dock className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h3>
                  <p className="text-gray-600 mb-6">Select a computer station to start your session</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {stations?.map((station: Station) => (
                      <button
                        key={station.id}
                        onClick={() => startSessionMutation.mutate(station.id)}
                        disabled={startSessionMutation.isPending}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Dock className="h-4 w-4" />
                        Start Session on {station.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeSession && (
                <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowExtensionModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    <Clock className="h-4 w-4" />
                    Request Time Extension
                  </button>
                  <button
                    onClick={() => endSessionMutation.mutate(activeSession.id)}
                    disabled={endSessionMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    End Session
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={handleScrollToRecent} 
                  className="w-full flex items-center gap-3 p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200"
                >
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <History className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">View Usage History</div>
                    <div className="text-sm text-gray-600">See your past sessions</div>
                  </div>
                </button>
                <button 
                  onClick={handleRefresh} 
                  className="w-full flex items-center gap-3 p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200"
                >
                  <div className="bg-green-600 p-2 rounded-lg">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Refresh Data</div>
                    <div className="text-sm text-gray-600">Update session status</div>
                  </div>
                </button>
                {activeSession && (
                  <button 
                    onClick={() => updateActivityMutation.mutate(activeSession.id)} 
                    className="w-full flex items-center gap-3 p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 border border-gray-200"
                  >
                    <div className="bg-amber-600 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Update Activity</div>
                      <div className="text-sm text-gray-600">Prevent auto-logout</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Sessions */}
        <div id="recent-sessions" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Sessions</h3>
          
          {sessionHistory && sessionHistory.length > 0 ? (
            <div className="space-y-4">
              {sessionHistory
                .slice(recentSessionsPage * itemsPerPage, (recentSessionsPage + 1) * itemsPerPage)
                .map((session: Session) => (
                <div key={session.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Date</div>
                        <div className="font-semibold text-gray-900">{formatDate(session.startTime)}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Station</div>
                        <div className="font-semibold text-gray-900 truncate" title={getStationName(session.stationId)}>
                          {getStationName(session.stationId)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500 mb-1">Duration</div>
                        <div className="font-semibold text-gray-900">{formatDuration(session.startTime, session.endTime)}</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        session.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {session.isActive ? 'Active' : 'Completed'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <History className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
              <p className="text-gray-600">Your session history will appear here</p>
            </div>
          )}
          
          {/* Enhanced Pagination */}
          {sessionHistory && sessionHistory.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
              <p className="text-sm text-gray-600">
                Showing {recentSessionsPage * itemsPerPage + 1} to {Math.min((recentSessionsPage + 1) * itemsPerPage, sessionHistory.length)} of {sessionHistory.length} sessions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecentSessionsPage(prev => Math.max(prev - 1, 0))}
                  disabled={recentSessionsPage === 0}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-sm font-medium">
                  {recentSessionsPage + 1} of {Math.ceil(sessionHistory.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setRecentSessionsPage(prev => (sessionHistory && (prev + 1) * itemsPerPage < sessionHistory.length ? prev + 1 : prev))}
                  disabled={!sessionHistory || (recentSessionsPage + 1) * itemsPerPage >= sessionHistory.length}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TimeExtensionModal
        isOpen={showExtensionModal}
        onClose={() => {
          setShowExtensionModal(false);
          queryClient.invalidateQueries({ queryKey: ["/api/orz/sessions/active"] });
          queryClient.refetchQueries({ queryKey: ["/api/orz/sessions/active"] });
        }}
        sessionId={activeSession?.id}
      />
    </div>
  );
}
