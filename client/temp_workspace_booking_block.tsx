      );
    }

    // Booking lists are derived above

    // Computer station and booking user status functions are defined above

    switch (selectedView) {
      /* ORZ / station UI removed (conservative cleanup) */

      case "booking-management":
        // Compute booking-related alerts for the badges (exclude unrelated computer/ORZ alerts)
        const bookingAlerts = alerts?.filter(a => {
          if (!a) return false;
          if (a.type === 'booking') return true;
          const t = (a.title || '').toLowerCase();
          const m = (a.message || '').toLowerCase();
          // consider messages that reference booking cancellations or bookings
          return t.includes('booking') || m.includes('booking') || t.includes('cancel') || m.includes('cancel');
        }) || [];
        const unreadBookingAlertsCount = bookingAlerts.filter(a => !a.isRead).length || 0;

        // Helper to compute badge counts per tab
        const computeTabCounts = (tab: string) => {
          switch (tab) {
            case 'active': {
              const total = activeBookings?.length || 0;
              const unread = bookingAlerts.filter(a => !a.isRead && (((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('active') || ((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('in progress'))).length || 0;
              return { total, unread };
            }
            case 'upcoming': {
              const total = upcomingBookings?.length || 0;
              const unread = bookingAlerts.filter(a => !a.isRead && (((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('upcoming') || ((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('starts'))).length || 0;
              return { total, unread };
            }
            case 'requests': {
              const total = pendingBookings?.length || 0;
              const unread = bookingAlerts.filter(a => !a.isRead && (((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('request') || ((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('pending') || ((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('approval'))).length || 0;
              return { total, unread };
            }
            case 'history': {
              const total = recentBookings?.length || 0;
              const unread = bookingAlerts.filter(a => !a.isRead && (((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('history') || ((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('completed') || ((a.title||'') + ' ' + (a.message||'')).toLowerCase().includes('denied'))).length || 0;
              return { total, unread };
            }
            default:
              return { total: bookingAlerts.length || 0, unread: unreadBookingAlertsCount };
          }
        };
  // header badges are now shown per-tab on the TabsTrigger elements

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <CardHeader
                title="Facility Booking Management"
                subtitle="Monitor active bookings, pending requests, and booking history"
              />

              <Tabs defaultValue="active" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  {(() => {
                    const cActive = computeTabCounts('active');
                    const cUpcoming = computeTabCounts('upcoming');
                    const cRequests = computeTabCounts('requests');
                    const cHistory = computeTabCounts('history');
                    return (
                      <>
                        <TabsTrigger value="active" onClick={() => setBookingTab('active')} className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Active</span>
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{cActive.total || 0}</span>
                          {cActive.unread > 0 && <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">{cActive.unread}</span>}
                        </TabsTrigger>

                        <TabsTrigger value="upcoming" onClick={() => setBookingTab('upcoming')} className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Pending</span>
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{cUpcoming.total || 0}</span>
                          {cUpcoming.unread > 0 && <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">{cUpcoming.unread}</span>}
                        </TabsTrigger>

                        <TabsTrigger value="requests" onClick={() => setBookingTab('requests')} className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4" />
                          <span>Booking Requests</span>
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{cRequests.total || 0}</span>
                          {cRequests.unread > 0 && <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">{cRequests.unread}</span>}
                        </TabsTrigger>

                        <TabsTrigger value="history" onClick={() => setBookingTab('history')} className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span>History</span>
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-800">{cHistory.total || 0}</span>
                          {cHistory.unread > 0 && <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">{cHistory.unread}</span>}
                        </TabsTrigger>
                      </>
                    );
                  })()}
                </TabsList>

                <TabsContent value="active">
                  <div className="bg-gray-50 rounded-lg p-6">
                    {activeBookings && activeBookings.length > 0 ? (
                      <div className="space-y-3">
                        {activeBookings.slice(activeBookingsPage * itemsPerPage, (activeBookingsPage + 1) * itemsPerPage).map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-pink-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-pink-600" /></div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {booking.status?.toUpperCase()}
                                </span>
                                <button onClick={() => {/* details placeholder */}} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200">Details</button>
                              </div>
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                              <div>Starts: <span className="font-medium text-gray-900">{formatDateTime(booking.startTime)}</span></div>
                              <div>Ends: <span className="font-medium text-gray-900">{formatDateTime(booking.endTime)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-600">No active facility bookings</div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="upcoming">
                  <div className="bg-gray-50 rounded-lg p-6">
                    {upcomingBookings && upcomingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingBookings.slice(upcomingBookingsPage * itemsPerPage, (upcomingBookingsPage + 1) * itemsPerPage).map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-gray-100 p-2 rounded-lg"><Calendar className="h-5 w-5 text-gray-600" /></div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${booking.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {booking.status?.toUpperCase() || 'PENDING'}
                                </span>
                                <button onClick={() => {/* details placeholder */}} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-sm rounded-lg hover:bg-gray-50 transition-colors duration-200">Details</button>
                              </div>

                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                              <div>Starts: <span className="font-medium text-gray-900">{formatDateTime(booking.startTime)}</span></div>
                              <div>Ends: <span className="font-medium text-gray-900">{formatDateTime(booking.endTime)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-600">No upcoming facility bookings</div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="requests">
                  <div className="bg-gray-50 rounded-lg p-6">
                    {pendingBookings && pendingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {pendingBookings.slice(pendingBookingsPage * itemsPerPage, (pendingBookingsPage + 1) * itemsPerPage).map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-yellow-50 p-2 rounded-lg"><Loader2 className="h-5 w-5 text-yellow-600" /></div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">REQUEST</span>
                                <div className="flex gap-2">
                                  <button onClick={() => approveBookingMutation.mutate({ bookingId: booking.id })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200">Approve</button>
                                  <button onClick={() => denyBookingMutation.mutate({ bookingId: booking.id })} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200">Deny</button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                              <div>Requested: <span className="font-medium text-gray-900">{formatDateTime(booking.createdAt || booking.startTime)}</span></div>
                              <div>From: <span className="font-medium text-gray-900">{formatDateTime(booking.startTime)}</span> — To: <span className="font-medium text-gray-900">{formatDateTime(booking.endTime)}</span></div>
                              {booking.purpose && <div className="mt-2 text-sm text-gray-700">Purpose: {booking.purpose}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-600">No pending facility booking requests</div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div className="bg-gray-50 rounded-lg p-6">
                    {recentBookings && recentBookings.length > 0 ? (
                      <div className="space-y-3">
                        {recentBookings.slice(approvedAndDeniedBookingsPage * itemsPerPage, (approvedAndDeniedBookingsPage + 1) * itemsPerPage).map((booking: FacilityBooking) => (
                          <div key={booking.id} className={`bg-white rounded-lg p-4 border ${booking.status === 'denied' ? 'border-red-200' : 'border-green-200'} hover:border-blue-300 transition-colors duration-200`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-gray-100 p-2 rounded-lg"><Activity className="h-5 w-5 text-gray-600" /></div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 text-xs rounded-full ${booking.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                  {booking.status?.toUpperCase()}
                                </span>
                                <button onClick={() => {/* view */}} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200">Details</button>
                              </div>
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                              <div>From: <span className="font-medium text-gray-900">{formatDateTime(booking.startTime)}</span> — To: <span className="font-medium text-gray-900">{formatDateTime(booking.endTime)}</span></div>
                              <div className="mt-1">Processed: <span className="font-medium text-gray-900">{formatDateTime(booking.updatedAt || booking.createdAt)}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-600">No booking history available</div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        );
      case "user-management":
  const bookingUsers = usersData?.filter(user => getBookingUserStatus(user.id));
  const bannedUsers = usersData?.filter(user => user.status === "banned");

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                  <p className="text-gray-600 mt-1">Manage facility booking users, computer station users, and suspended accounts</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bookingUsers?.length || 0} Booking Users
                  </div>
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                    {bannedUsers?.length || 0} Suspended
                  </div>
                </div>
              </div>

              <Tabs defaultValue="booking-users" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="booking-users" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Booking Users
                  </TabsTrigger>
                  <TabsTrigger value="banned-users" className="flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    Suspended
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="booking-users" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Facility Booking Users</h3>
                      <span className="text-sm text-gray-600">{bookingUsers?.length || 0} users</span>
                    </div>
                    
                    {bookingUsers && bookingUsers.length > 0 ? (
                      <div className="space-y-3">
                        {bookingUsers
                          ?.slice(bookingUsersPage * itemsPerPage, (bookingUsersPage + 1) * itemsPerPage)
                          .map((userItem: User) => {
                          const userBookings = activeBookings?.filter(booking => booking.userId === userItem.id);
                          return (
                            <div key={userItem.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="bg-blue-100 p-2 rounded-lg">
                                    <UserIcon className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{userItem.email}</h4>
                                    <p className="text-sm text-gray-600">
                                      Active facilities: {userBookings?.map(booking => getFacilityName(booking.facilityId)).join(', ') || 'None'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs font-medium text-gray-500">Role:</span>
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                        {userItem.role}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    userItem.status === 'active' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {userItem.status}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setUserToBan(userItem);
                                      setIsBanUserModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                                  >
                                    <UserX className="h-3.5 w-3.5" />
                                    Ban User
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Pagination for booking users */}
                        {bookingUsers.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {bookingUsersPage * itemsPerPage + 1} to {Math.min((bookingUsersPage + 1) * itemsPerPage, bookingUsers.length)} of {bookingUsers.length} results
                            </p>
                            <div className="flex items-center gap-2">
