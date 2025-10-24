/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Admin Pending Members Dashboard | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

"use client";

import { useState, useEffect } from "react";
import { useToast } from "@web/lib/toast";

interface PendingMember {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "staff" | "referrer";
  created_at: string;
}

export default function PendingMembersPage() {
  const { showToast, confirm } = useToast();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<{
    [key: string]: "admin" | "staff" | "referrer";
  }>({});

  useEffect(() => {
    fetchPendingMembers();
  }, []);

  const fetchPendingMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/pending-members");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch pending members");
      }

      const membersList = data.data || [];
      setMembers(membersList);

      // Initialize selectedRole with current roles
      const roleMap: { [key: string]: "admin" | "staff" | "referrer" } = {};
      membersList.forEach((member: PendingMember) => {
        roleMap[member.id] = member.role;
      });
      setSelectedRole(roleMap);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pending members"
      );
      console.error("Error fetching pending members:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    memberId: string,
    action: "approve" | "reject"
  ) => {
    const confirmed = await confirm(
      `Are you sure you want to ${action} this member request?`,
      {
        confirmText: action === "approve" ? "Approve" : "Reject",
        cancelText: "Cancel",
        confirmVariant: action === "reject" ? "danger" : "primary",
      }
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(memberId);
    setError(null);

    try {
      const requestBody: {
        memberId: string;
        action: "approve" | "reject";
        role?: "admin" | "staff" | "referrer";
      } = { memberId, action };

      // Include role when approving
      if (action === "approve") {
        requestBody.role = selectedRole[memberId];
      }

      const response = await fetch("/api/admin/pending-members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action} member`);
      }

      // Remove the member from the list
      setMembers((prev) => prev.filter((m) => m.id !== memberId));

      // Show success toast
      showToast(
        `Member ${action === "approve" ? "approved" : "rejected"} successfully`,
        "success"
      );
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : `Failed to ${action} member`;
      setError(errorMsg);
      showToast(errorMsg, "error");
      console.error(`Error ${action}ing member:`, err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Pending Members
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve membership requests for your organization
            </p>
          </div>
          <button
            onClick={fetchPendingMembers}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-gray-600">
            Loading pending members...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && members.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No pending members
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            All membership requests have been processed.
          </p>
        </div>
      )}

      {/* Members List */}
      {!loading && !error && members.length > 0 && (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          Requested: {formatDate(member.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedRole[member.id] || member.role}
                      onChange={(e) =>
                        setSelectedRole((prev) => ({
                          ...prev,
                          [member.id]: e.target.value as
                            | "admin"
                            | "staff"
                            | "referrer",
                        }))
                      }
                      disabled={processingId === member.id}
                      className="text-xs font-medium px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="referrer">Referrer</option>
                    </select>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAction(member.id, "approve")}
                        disabled={processingId === member.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {processingId === member.id
                          ? "Processing..."
                          : "Approve"}
                      </button>
                      <button
                        onClick={() => handleAction(member.id, "reject")}
                        disabled={processingId === member.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {processingId === member.id
                          ? "Processing..."
                          : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Card */}
      <div className="mt-6 rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              About Pending Members
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Members who join an existing organization require admin
                  approval
                </li>
                <li>
                  Approved members will gain immediate access to the
                  organization
                </li>
                <li>
                  Rejected members can contact you to request access again
                </li>
                <li>
                  Members creating new organizations are automatically approved
                  as admins
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
