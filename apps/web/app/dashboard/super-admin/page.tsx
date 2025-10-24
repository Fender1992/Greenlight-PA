/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Super Admin Dashboard | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@web/lib/toast";
import supabase from "@greenlight/db/client";

type SuperAdminTab = "overview" | "organizations" | "users" | "system";

interface Stats {
  totals: {
    organizations: number;
    users: number;
    pendingMembers: number;
    patients: number;
    paRequests: number;
    orders: number;
    payers: number;
    superAdmins: number;
  };
  recentActivity: {
    paRequests: number;
    orders: number;
    organizations: number;
  };
}

interface Organization {
  id: string;
  name: string;
  npi: string | null;
  address: string | null;
  created_at: string;
  stats: {
    totalMembers: number;
    activeMembers: number;
    pendingMembers: number;
    patients: number;
    paRequests: number;
  };
}

interface User {
  id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
  org_id: string;
  org_name: string;
  created_at: string;
  last_sign_in: string | null;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateOrgForm, setShowCreateOrgForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDomain, setNewOrgDomain] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);

  // Verify user is a super admin via API (bypasses RLS)
  useEffect(() => {
    const verifySuperAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/dashboard");
        return;
      }

      // Use stats API to verify access instead of direct table query
      // Stats endpoint checks super admin status server-side
      try {
        const response = await fetch("/api/super-admin/stats");
        const data = await response.json();

        if (!data.success) {
          // Not a super admin or access denied
          showToast("You do not have access to this page", "error");
          router.push("/dashboard");
          return;
        }

        // Successfully accessed super admin endpoint
        setIsVerifying(false);
      } catch (error) {
        console.error("Super admin verification failed:", error);
        showToast("Access verification failed", "error");
        router.push("/dashboard");
      }
    };

    verifySuperAdmin();
  }, [router, showToast]);

  // Fetch statistics
  const statsQuery = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/stats");
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load statistics");
      }
      return data.data as Stats;
    },
  });

  // Fetch organizations
  const orgsQuery = useQuery({
    queryKey: ["super-admin-organizations"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/organizations");
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load organizations");
      }
      return data.data as Organization[];
    },
    enabled: activeTab === "organizations",
  });

  // Fetch users
  const usersQuery = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/super-admin/users");
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load users");
      }
      return data.data as User[];
    },
    enabled: activeTab === "users",
  });

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async ({ name, domain }: { name: string; domain?: string }) => {
      const response = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create organization");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["super-admin-organizations"],
      });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      showToast("Organization created successfully", "success");
      setShowCreateOrgForm(false);
      setNewOrgName("");
      setNewOrgDomain("");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await fetch(
        `/api/super-admin/organizations?org_id=${orgId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete organization");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["super-admin-organizations"],
      });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      showToast("Organization deleted successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
      status,
    }: {
      memberId: string;
      role?: string;
      status?: string;
    }) => {
      const response = await fetch("/api/super-admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role, status }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update user");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      showToast("User updated successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(
        `/api/super-admin/users?member_id=${memberId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to remove user");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-stats"] });
      showToast("User removed successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      showToast("Organization name is required", "error");
      return;
    }
    createOrgMutation.mutate({
      name: newOrgName.trim(),
      domain: newOrgDomain.trim() || undefined,
    });
  };

  const handleDeleteOrg = async (org: Organization) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${org.name}"? This will permanently delete all data including ${org.stats.patients} patients and ${org.stats.paRequests} PA requests.`,
      {
        confirmText: "Delete Organization",
        cancelText: "Cancel",
        confirmVariant: "danger",
      }
    );

    if (confirmed) {
      deleteOrgMutation.mutate(org.id);
    }
  };

  const handleDeleteUser = async (user: User) => {
    const confirmed = await confirm(
      `Are you sure you want to remove ${user.email} from ${user.org_name}?`,
      {
        confirmText: "Remove User",
        cancelText: "Cancel",
        confirmVariant: "danger",
      }
    );

    if (confirmed) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleChangeUserStatus = async (user: User, newStatus: string) => {
    updateUserMutation.mutate({ memberId: user.id, status: newStatus });
  };

  const handleChangeUserRole = async (user: User, newRole: string) => {
    updateUserMutation.mutate({ memberId: user.id, role: newRole });
  };

  const tabs: { id: SuperAdminTab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "organizations", label: "Organizations", icon: "🏢" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "system", label: "System", icon: "⚙️" },
  ];

  const filteredOrgs = (orgsQuery.data || []).filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = (usersQuery.data || []).filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.org_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading state while verifying access
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👑</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Super Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Platform-wide administration and management
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {statsQuery.isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600">
                    Loading statistics...
                  </p>
                </div>
              ) : statsQuery.error ? (
                <div className="text-center py-12 text-red-600">
                  Error loading statistics
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Platform Statistics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <StatCard
                        title="Organizations"
                        value={statsQuery.data?.totals.organizations || 0}
                        icon="🏢"
                        color="blue"
                      />
                      <StatCard
                        title="Active Users"
                        value={statsQuery.data?.totals.users || 0}
                        icon="👥"
                        color="green"
                      />
                      <StatCard
                        title="PA Requests"
                        value={statsQuery.data?.totals.paRequests || 0}
                        icon="📋"
                        color="purple"
                      />
                      <StatCard
                        title="Patients"
                        value={statsQuery.data?.totals.patients || 0}
                        icon="🏥"
                        color="pink"
                      />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Additional Metrics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <StatCard
                        title="Pending Members"
                        value={statsQuery.data?.totals.pendingMembers || 0}
                        icon="⏳"
                        color="yellow"
                      />
                      <StatCard
                        title="Orders"
                        value={statsQuery.data?.totals.orders || 0}
                        icon="📦"
                        color="indigo"
                      />
                      <StatCard
                        title="Payers"
                        value={statsQuery.data?.totals.payers || 0}
                        icon="💳"
                        color="cyan"
                      />
                      <StatCard
                        title="Super Admins"
                        value={statsQuery.data?.totals.superAdmins || 0}
                        icon="👑"
                        color="purple"
                      />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Activity (Last 7 Days)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <StatCard
                        title="New PA Requests"
                        value={statsQuery.data?.recentActivity.paRequests || 0}
                        icon="📋"
                        color="purple"
                        subtitle="in the last week"
                      />
                      <StatCard
                        title="New Orders"
                        value={statsQuery.data?.recentActivity.orders || 0}
                        icon="📦"
                        color="indigo"
                        subtitle="in the last week"
                      />
                      <StatCard
                        title="New Organizations"
                        value={
                          statsQuery.data?.recentActivity.organizations || 0
                        }
                        icon="🏢"
                        color="blue"
                        subtitle="in the last week"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "organizations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={() => setShowCreateOrgForm(!showCreateOrgForm)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {showCreateOrgForm ? "Cancel" : "+ Create Organization"}
                </button>
              </div>

              {showCreateOrgForm && (
                <form
                  onSubmit={handleCreateOrg}
                  className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create New Organization
                  </h3>
                  <div>
                    <label
                      htmlFor="org-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Organization Name *
                    </label>
                    <input
                      id="org-name"
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      required
                      placeholder="Enter organization name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="org-domain"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Domain (Optional)
                    </label>
                    <input
                      id="org-domain"
                      type="text"
                      value={newOrgDomain}
                      onChange={(e) => setNewOrgDomain(e.target.value)}
                      placeholder="example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={createOrgMutation.isPending}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      {createOrgMutation.isPending
                        ? "Creating..."
                        : "Create Organization"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateOrgForm(false);
                        setNewOrgName("");
                        setNewOrgDomain("");
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {orgsQuery.isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600">
                    Loading organizations...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrgs.map((org) => (
                    <div
                      key={org.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {org.name}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {org.id}
                            </span>
                          </div>
                          {org.npi && (
                            <p className="text-sm text-gray-600 mt-1">
                              NPI: {org.npi}
                            </p>
                          )}
                          {org.address && (
                            <p className="text-sm text-gray-600">
                              {org.address}
                            </p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>
                              👥 {org.stats.activeMembers} /{" "}
                              {org.stats.totalMembers} members
                            </span>
                            <span>🏥 {org.stats.patients} patients</span>
                            <span>📋 {org.stats.paRequests} PA requests</span>
                            {org.stats.pendingMembers > 0 && (
                              <span className="text-yellow-600">
                                ⏳ {org.stats.pendingMembers} pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Created:{" "}
                            {new Date(org.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteOrg(org)}
                          disabled={deleteOrgMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No organizations found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {usersQuery.isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading users...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Organization
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Sign In
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.user_id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.org_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleChangeUserRole(user, e.target.value)
                              }
                              disabled={updateUserMutation.isPending}
                              className="text-xs px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="staff">Staff</option>
                              <option value="referrer">Referrer</option>
                              <option value="super_admin">
                                👑 Super Admin
                              </option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.status}
                              onChange={(e) =>
                                handleChangeUserStatus(user, e.target.value)
                              }
                              disabled={updateUserMutation.isPending}
                              className={`text-xs px-2 py-1 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                                user.status === "active"
                                  ? "border-green-300 text-green-800"
                                  : user.status === "pending"
                                    ? "border-yellow-300 text-yellow-800"
                                    : "border-red-300 text-red-800"
                              }`}
                            >
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_sign_in
                              ? new Date(user.last_sign_in).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={deleteUserMutation.isPending}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "system" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  System Information
                </h2>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Version:</span>
                    <span className="font-medium">Greenlight PA v0.1.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Database:</span>
                    <span className="font-medium">Supabase PostgreSQL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Super Admin Count:</span>
                    <span className="font-medium">
                      {statsQuery.data?.totals.superAdmins || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Your Role:</span>
                    <span className="font-medium text-purple-600">
                      👑 Super Admin
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="/api/audit?limit=100"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
                  >
                    <div className="text-2xl mb-2">📜</div>
                    <div className="font-medium text-gray-900">
                      View Audit Logs
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      See recent activity
                    </div>
                  </a>
                  <a
                    href="/api/metrics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
                  >
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-medium text-gray-900">
                      View Metrics API
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Raw metrics data
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  subtitle?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    pink: "bg-pink-50 border-pink-200 text-pink-800",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
    cyan: "bg-cyan-50 border-cyan-200 text-cyan-800",
  };

  return (
    <div
      className={`${colorClasses[color as keyof typeof colorClasses]} border rounded-lg p-4`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs mt-1 opacity-75">{subtitle}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
