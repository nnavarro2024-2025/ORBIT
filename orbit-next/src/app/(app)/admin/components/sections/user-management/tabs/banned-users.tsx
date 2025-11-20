import React, { useState } from 'react';
import { User } from '@shared/schema';
import { UserX, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const USER_MANAGEMENT_TAB_BANNED_USERS = 'banned-users' as const;

export type BannedUsersTabProps = {
  normalizedSearch: string;
  bannedUsers: User[];
  bannedUsersFiltered: User[];
  bannedUsersPage: number;
  onBannedUsersPageChange: (page: number) => void;
  itemsPerPage: number;
  onRequestUnban: (userId: string) => void;
};

export function BannedUsersTab(props: BannedUsersTabProps) {
  const {
    normalizedSearch,
    bannedUsers,
    bannedUsersFiltered,
    bannedUsersPage,
    onBannedUsersPageChange,
    itemsPerPage,
    onRequestUnban,
  } = props;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Suspended Users</h3>
        <span className="text-sm text-gray-600">
          {normalizedSearch ? `${bannedUsersFiltered.length}/${bannedUsers.length}` : `${bannedUsersFiltered.length}`} users
        </span>
      </div>

      {bannedUsers.length > 0 ? (
        <div className="space-y-3">
          {bannedUsersFiltered
            .slice(bannedUsersPage * itemsPerPage, (bannedUsersPage + 1) * itemsPerPage)
            .map(userItem => (
              <div key={userItem.id} onClick={() => handleUserClick(userItem)} className="bg-white rounded-lg p-4 border border-red-200 hover:border-red-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <UserX className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{userItem.email}</h4>
                      <p className="text-sm text-gray-600">Account suspended</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500">Role:</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {userItem.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {userItem.status}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      className="inline-flex items-center gap-1 bg-green-600 text-white hover:bg-green-700"
                      onClick={() => onRequestUnban(String(userItem.id))}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Unban User
                    </Button>
                  </div>
                </div>
              </div>
            ))}

          {bannedUsersFiltered.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {bannedUsersPage * itemsPerPage + 1} to {Math.min((bannedUsersPage + 1) * itemsPerPage, bannedUsersFiltered.length)} of {bannedUsersFiltered.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => onBannedUsersPageChange(Math.max(bannedUsersPage - 1, 0))}
                  disabled={bannedUsersPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1 text-sm font-medium">
                  {bannedUsersPage + 1} of {Math.ceil(bannedUsersFiltered.length / itemsPerPage)}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() =>
                    onBannedUsersPageChange(
                      bannedUsersFiltered.length > (bannedUsersPage + 1) * itemsPerPage
                        ? bannedUsersPage + 1
                        : bannedUsersPage,
                    )
                  }
                  disabled={bannedUsersFiltered.length <= (bannedUsersPage + 1) * itemsPerPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <UserX className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">No suspended users</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suspended User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                <p className="text-base font-semibold text-gray-900">{selectedUser.email}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Role</h4>
                  <Badge className="bg-gray-100 text-gray-800">{selectedUser.role}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <Badge className="bg-red-100 text-red-800">{selectedUser.status}</Badge>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Account Status</h4>
                <p className="text-sm text-red-600 font-medium">Account suspended</p>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">User ID</h4>
                <p className="text-sm text-gray-600 font-mono">{selectedUser.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
