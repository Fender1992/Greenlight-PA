/**
 * Organization Selector for Multi-Org Users
 *
 * Shows when a user has memberships in multiple organizations
 * and needs to select which org to perform an action in.
 */

"use client";

import { useState, useEffect } from "react";
import supabase from "@greenlight/db/client";

interface Membership {
  org_id: string;
  role: string;
  org: {
    id: string;
    name: string;
  };
}

interface OrgSelectorProps {
  value?: string;
  onChange: (orgId: string) => void;
  label?: string;
  required?: boolean;
  filterByRole?: "admin" | "staff" | "referrer";
}

export function OrgSelector({
  value,
  onChange,
  label = "Organization",
  required = false,
  filterByRole,
}: OrgSelectorProps) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("member")
          .select("org_id, role, org:org_id(id, name)")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        let filtered = (data || []) as unknown as Membership[];

        // Filter by role if specified
        if (filterByRole) {
          filtered = filtered.filter((m) => m.role === filterByRole);
        }

        setMemberships(filtered);

        // Auto-select if only one option
        if (filtered.length === 1 && !value) {
          onChange(filtered[0].org_id);
        }

        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load organizations"
        );
        setLoading(false);
      }
    };

    fetchMemberships();
  }, [value, onChange, filterByRole]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="w-full h-10 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading organizations: {error}
      </div>
    );
  }

  // Don't show selector if only one org (auto-selected)
  if (memberships.length === 1) {
    return <input type="hidden" name="org_id" value={memberships[0].org_id} />;
  }

  // Show helpful message if no orgs available
  if (memberships.length === 0) {
    return (
      <div className="text-sm text-yellow-600">
        {filterByRole
          ? `You don't have any ${filterByRole} memberships.`
          : "You don't have any active organization memberships."}
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="org-selector"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {memberships.length > 1 && (
          <span className="text-gray-500 text-xs ml-2">
            ({memberships.length} organizations)
          </span>
        )}
      </label>
      <select
        id="org-selector"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
      >
        <option value="">Select an organization...</option>
        {memberships.map((membership) => (
          <option key={membership.org_id} value={membership.org_id}>
            {membership.org.name}
            {filterByRole && ` (${membership.role})`}
          </option>
        ))}
      </select>
      {memberships.length > 1 && (
        <p className="mt-1 text-xs text-gray-500">
          You have access to multiple organizations. Please select which one to
          use for this action.
        </p>
      )}
    </div>
  );
}

/**
 * Hook to detect if current user has multiple orgs
 */
export function useIsMultiOrg() {
  const [isMultiOrg, setIsMultiOrg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMultiOrg = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("member")
          .select("org_id")
          .eq("user_id", session.user.id)
          .eq("status", "active");

        setIsMultiOrg((data?.length || 0) > 1);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    checkMultiOrg();
  }, []);

  return { isMultiOrg, loading };
}
