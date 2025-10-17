"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, ApiResponse } from "@web/lib/api";
import type { OrgRow, PayerRow } from "@web/types/api";
import AuditLogViewer from "./audit-viewer";

type AdminTab = "payers" | "settings" | "users" | "audit";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("payers");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPayerForm, setShowPayerForm] = useState(false);

  const payersQuery = useQuery({
    queryKey: ["payers"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<PayerRow[]>>("/api/payers");
      if (!response.success) {
        throw new Error(response.error || "Failed to load payers");
      }
      return response.data ?? [];
    },
  });

  const orgQuery = useQuery({
    queryKey: ["org"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<OrgRow>>("/api/org");
      if (!response.success) {
        throw new Error(response.error || "Failed to load organization");
      }
      return response.data as OrgRow;
    },
  });

  const createPayerMutation = useMutation({
    mutationFn: (payload: { name: string; portal_url?: string; contact?: string }) =>
      apiPost<ApiResponse<PayerRow>>("/api/payers", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payers"] });
      setShowPayerForm(false);
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: (payload: Partial<OrgRow>) =>
      apiPatch<ApiResponse<OrgRow>>("/api/org", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    },
  });

  const filteredPayers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return (payersQuery.data ?? []).filter((payer) =>
      payer.name.toLowerCase().includes(query)
    );
  }, [payersQuery.data, searchQuery]);

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "payers", label: "Payers" },
    { id: "settings", label: "Settings" },
    { id: "users", label: "Users" },
    { id: "audit", label: "Audit Log" },
  ];

  const handleCreatePayer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name")?.toString().trim() || "";
    const portalUrl = formData.get("portal_url")?.toString().trim();
    const contact = formData.get("contact")?.toString().trim();

    if (!name) return;

    createPayerMutation.mutate({
      name,
      portal_url: portalUrl || undefined,
      contact: contact || undefined,
    });
  };

  const handleUpdateOrg = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    updateOrgMutation.mutate({
      name: formData.get("name")?.toString() ?? undefined,
      npi: formData.get("npi")?.toString() ?? undefined,
      address: formData.get("address")?.toString() ?? undefined,
    });
  };

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage payers, organization settings, and audit history
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "payers" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search payers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:max-w-sm px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => setShowPayerForm((prev) => !prev)}
                  className="ml-auto px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {showPayerForm ? "Cancel" : "+ Add Payer"}
                </button>
              </div>

              {showPayerForm && (
                <form
                  onSubmit={handleCreatePayer}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payer Name
                      </label>
                      <input
                        name="name"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Portal URL
                      </label>
                      <input
                        name="portal_url"
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Email / Phone
                      </label>
                      <input
                        name="contact"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={createPayerMutation.isLoading}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {createPayerMutation.isLoading ? "Saving…" : "Save Payer"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {(payersQuery.data ?? []).length === 0 && !payersQuery.isLoading && (
                  <div className="text-sm text-gray-500">
                    No payers configured yet. Add your payers to track policy references.
                  </div>
                )}

                {filteredPayers.map((payer) => (
                  <div
                    key={payer.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {payer.name}
                        </div>
                        {payer.portal_url && (
                          <div className="text-xs text-blue-600">
                            <a href={payer.portal_url} target="_blank" rel="noreferrer">
                              {payer.portal_url}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {payer.policy_links.length} policy links
                      </div>
                    </div>
                    {payer.contact && (
                      <div className="text-sm text-gray-600 mt-2">
                        Contact: {payer.contact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              {orgQuery.isLoading ? (
                <div className="text-sm text-gray-500">Loading organization…</div>
              ) : orgQuery.isError || !orgQuery.data ? (
                <div className="text-sm text-red-600">
                  {(orgQuery.error as Error)?.message || "Unable to load organization"}
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleUpdateOrg}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name
                      </label>
                      <input
                        name="name"
                        defaultValue={orgQuery.data.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        NPI
                      </label>
                      <input
                        name="npi"
                        defaultValue={orgQuery.data.npi ?? ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        name="address"
                        defaultValue={orgQuery.data.address ?? ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updateOrgMutation.isLoading}
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {updateOrgMutation.isLoading ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                User management is handled via Supabase Auth. Invite new users or
                update roles from the Supabase dashboard.
              </p>
              <p>
                Ensure each user is assigned to the appropriate organization via the
                <code className="px-1 py-0.5 bg-gray-100 rounded ml-1">member</code> table to grant
                access to protected resources.
              </p>
            </div>
          )}

          {activeTab === "audit" && <AuditLogViewer />}
        </div>
      </div>
    </div>
  );
}
