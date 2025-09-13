      case "booking-management":
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Facility Booking Management</h2>
                  <p className="text-gray-600 mt-1">Monitor active bookings, pending requests, and booking history</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activeBookings?.length || 0} Active
                  </div>
                  <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm font-medium">
                    {upcomingBookings?.length || 0} Upcoming
                  </div>
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pendingBookings?.length || 0} Pending
                  </div>
                </div>
              </div>

              <Tabs defaultValue="active" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Active Bookings
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Currently Active Facility Bookings</h3>
                      <span className="text-sm text-gray-600">{activeBookings?.length || 0} bookings</span>
                    </div>
                    
                    {activeBookings && activeBookings.length > 0 ? (
                      <div className="space-y-3">
                        {activeBookings
                          ?.slice(activeBookingsPage * itemsPerPage, (activeBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-green-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-green-100 p-2 rounded-lg">
                                  <Calendar className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3 text-pink-600" />
                                              <span className="text-xs text-pink-600">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Started</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for active bookings */}
                        {activeBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {activeBookingsPage * itemsPerPage + 1} to {Math.min((activeBookingsPage + 1) * itemsPerPage, activeBookings.length)} of {activeBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setActiveBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={activeBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {activeBookingsPage + 1} of {Math.ceil(activeBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setActiveBookingsPage(prev => (activeBookings && (prev + 1) * itemsPerPage < activeBookings.length ? prev + 1 : prev))}
                                disabled={!activeBookings || (activeBookingsPage + 1) * itemsPerPage >= activeBookings.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Calendar className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No active facility bookings</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="upcoming" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Upcoming Facility Bookings</h3>
                      <span className="text-sm text-gray-600">{upcomingBookings?.length || 0} bookings</span>
                    </div>
                    
                    {upcomingBookings && upcomingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingBookings
                          ?.slice(upcomingBookingsPage * itemsPerPage, (upcomingBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-pink-200 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-pink-100 p-2 rounded-lg">
                                  <Clock className="h-5 w-5 text-pink-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3 text-pink-600" />
                                              <span className="text-xs text-pink-600">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Starts</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                  Scheduled
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for upcoming bookings */}
                        {upcomingBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {upcomingBookingsPage * itemsPerPage + 1} to {Math.min((upcomingBookingsPage + 1) * itemsPerPage, upcomingBookings.length)} of {upcomingBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setUpcomingBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={upcomingBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {upcomingBookingsPage + 1} of {Math.ceil(upcomingBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setUpcomingBookingsPage(prev => (upcomingBookings && (prev + 1) * itemsPerPage < upcomingBookings.length ? prev + 1 : prev))}
                                disabled={!upcomingBookings || (upcomingBookingsPage + 1) * itemsPerPage >= upcomingBookings.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No upcoming facility bookings</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="pending" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Pending Facility Booking Requests</h3>
                      <span className="text-sm text-gray-600">{pendingBookings?.length || 0} requests</span>
                    </div>
                    
                    {pendingBookings && pendingBookings.length > 0 ? (
                      <div className="space-y-3">
                        {pendingBookings
                          ?.slice(pendingBookingsPage * itemsPerPage, (pendingBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-yellow-300 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="bg-yellow-100 p-2 rounded-lg">
                                  <Clock className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3 text-pink-600" />
                                              <span className="text-xs text-pink-600">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Starts</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ends</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending Request
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      approveBookingMutation.mutate({
                                        bookingId: booking.id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                                  >
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      denyBookingMutation.mutate({
                                        bookingId: booking.id,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Deny
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Pagination for pending bookings */}
                        {pendingBookings.length > itemsPerPage && (
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Showing {pendingBookingsPage * itemsPerPage + 1} to {Math.min((pendingBookingsPage + 1) * itemsPerPage, pendingBookings.length)} of {pendingBookings.length} results
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPendingBookingsPage(prev => Math.max(prev - 1, 0))}
                                disabled={pendingBookingsPage === 0}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="px-3 py-1 text-sm font-medium">
                                {pendingBookingsPage + 1} of {Math.ceil(pendingBookings.length / itemsPerPage)}
                              </span>
                              <button
                                onClick={() => setPendingBookingsPage(prev => (pendingBookings && (prev + 1) * itemsPerPage < pendingBookings.length ? prev + 1 : prev))}
                                disabled={!pendingBookings || (pendingBookingsPage + 1) * itemsPerPage >= pendingBookings.length}
                                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">No pending facility booking requests</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="recent" className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
                      <span className="text-sm text-gray-600">{recentBookings?.length || 0} records</span>
                    </div>
                    
                    {recentBookings && recentBookings.length > 0 ? (
                      <div className="space-y-3">
                        {recentBookings
                          ?.slice(approvedAndDeniedBookingsPage * itemsPerPage, (approvedAndDeniedBookingsPage + 1) * itemsPerPage)
                          .map((booking: FacilityBooking) => (
                          <div key={booking.id} className={`bg-white rounded-lg p-4 border transition-colors duration-200 ${
                            booking.status === 'denied' ? 'border-red-200 hover:border-red-300' : 'border-green-200 hover:border-green-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${
                                  booking.status === 'denied' ? 'bg-red-100' : 'bg-green-100'
                                }`}>
                                  {booking.status === 'denied' ? (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                                  <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help justify-end">
                                          {booking.purpose && booking.purpose.length > 30 ? (
                                            <>
                                              <Eye className="h-3 w-3 text-pink-600" />
                                              <span className="text-xs text-pink-600">View purpose</span>
                                            </>
                                          ) : (
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-gray-900">Purpose</p>
                                              <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                                {booking.purpose || 'No purpose specified'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                          <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                        </div>
                                        <div className="p-4 max-h-48 overflow-y-auto">
                                          <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words text-left">
                                            {booking.purpose || 'No purpose specified'}
                                          </p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Started</p>
                                  <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">Ended</p>
