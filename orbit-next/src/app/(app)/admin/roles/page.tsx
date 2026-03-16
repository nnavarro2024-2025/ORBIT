"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/data";
import { authenticatedFetch } from "@/lib/api";
import { useLegacyLocation } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  role: "student" | "faculty" | "admin";
  status: string;
};

const ROLE_OPTIONS: Array<UserRow["role"]> = ["student", "faculty", "admin"];

export const dynamic = "force-dynamic";

export default function AdminRoleManagementPage() {
  const { user, isLoading: authLoading, requiresPasswordSetup } = useAuth();
  const [, setLocation] = useLegacyLocation();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (requiresPasswordSetup) {
      setLocation("/create-password");
      return;
    }
    if (user.role !== "admin") {
      setLocation("/booking");
      return;
    }

    void loadUsers();
  }, [authLoading, user, requiresPasswordSetup, setLocation]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users],
  );

  const loadUsers = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await authenticatedFetch("/admin/users", { method: "GET" });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (targetUser: UserRow, nextRole: UserRow["role"]) => {
    if (targetUser.role === nextRole) return;

    setError("");
    setSavingUserId(targetUser.id);
    try {
      await authenticatedFetch(`/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });

      setUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === targetUser.id ? { ...userItem, role: nextRole } : userItem,
        ),
      );
    } catch (err: any) {
      setError(err?.message || "Failed to update user role.");
    } finally {
      setSavingUserId(null);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Admin-only page for updating user roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocation("/admin")}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Back to Admin Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-sm text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-sm text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-gray-800">{row.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.status}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <select
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={row.role}
                            onChange={(event) => {
                              void updateRole(row, event.target.value as UserRow["role"]);
                            }}
                            disabled={savingUserId === row.id}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          {savingUserId === row.id && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
