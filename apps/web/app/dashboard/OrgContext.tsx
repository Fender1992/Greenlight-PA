/**
 * Organization Context Provider
 *
 * Provides current organization selection to all dashboard pages
 * Handles auto-selection for single-org users and persists selection
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import supabase from "@greenlight/db/client";

interface OrgContextValue {
  selectedOrgId: string | null;
  setSelectedOrgId: (orgId: string) => void;
  memberships: Array<{
    org_id: string;
    role: string;
    org: { id: string; name: string };
  }>;
  loading: boolean;
  isSuperAdmin: boolean;
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<
    OrgContextValue["memberships"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const loadOrgContext = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setLoading(false);
          return;
        }

        // Check if user is super admin
        let isSuperAdminUser = false;
        try {
          const response = await fetch("/api/super-admin/stats");
          const data = await response.json();
          isSuperAdminUser = data.success === true;
          setIsSuperAdmin(isSuperAdminUser);
        } catch {
          setIsSuperAdmin(false);
        }

        // Fetch user's active memberships or all orgs for super admin
        let typedMemberships: OrgContextValue["memberships"] = [];

        if (isSuperAdminUser) {
          // Super admin - fetch all organizations
          const { data: allOrgs, error: orgsError } = await supabase
            .from("org")
            .select("id, name")
            .order("name", { ascending: true });

          if (orgsError) {
            console.error(
              "Failed to load organizations for super admin:",
              orgsError
            );
          } else {
            // Convert all orgs to membership format for super admin
            typedMemberships = (allOrgs || []).map((org) => ({
              org_id: org.id,
              role: "super_admin",
              org: { id: org.id, name: org.name },
            }));
          }
        } else {
          // Regular user - fetch their memberships
          const { data: memberData, error } = await supabase
            .from("member")
            .select("org_id, role, org:org_id(id, name)")
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .order("created_at", { ascending: true });

          if (error) {
            console.error("Failed to load memberships:", error);
            setLoading(false);
            return;
          }

          typedMemberships = (memberData ||
            []) as unknown as OrgContextValue["memberships"];
        }

        setMemberships(typedMemberships);

        // Try to restore selection from sessionStorage
        const storedOrgId = sessionStorage.getItem("dashboard_selected_org_id");

        if (
          storedOrgId &&
          typedMemberships.some((m) => m.org_id === storedOrgId)
        ) {
          // Restore valid stored selection
          setSelectedOrgIdState(storedOrgId);
        } else if (typedMemberships.length === 1) {
          // Auto-select if user has only one org
          setSelectedOrgIdState(typedMemberships[0].org_id);
          sessionStorage.setItem(
            "dashboard_selected_org_id",
            typedMemberships[0].org_id
          );
        } else if (typedMemberships.length > 0 && !storedOrgId) {
          // Multi-org user with no selection - don't auto-select, let them choose
          setSelectedOrgIdState(null);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to load org context:", error);
        setLoading(false);
      }
    };

    loadOrgContext();
  }, []);

  const setSelectedOrgId = (orgId: string) => {
    setSelectedOrgIdState(orgId);
    sessionStorage.setItem("dashboard_selected_org_id", orgId);
  };

  return (
    <OrgContext.Provider
      value={{
        selectedOrgId,
        setSelectedOrgId,
        memberships,
        loading,
        isSuperAdmin,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return context;
}
