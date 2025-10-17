/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Admin / Payer Management | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import AuditLogViewer from "./audit-viewer";

// Mock data for demo
const MOCK_PAYERS = [
  {
    id: "payer-001",
    name: "Blue Cross Blue Shield",
    payerId: "BCBS001",
    planTypes: ["PPO", "HMO", "EPO"],
    activeCount: 45,
    approvalRate: 87.2,
    avgTurnaroundDays: 3.5,
    lastPolicyUpdate: "2025-09-15",
    portalUrl: "https://provider.bcbs.com",
    requiresPA: true,
  },
  {
    id: "payer-002",
    name: "Aetna",
    payerId: "AET002",
    planTypes: ["PPO", "HMO"],
    activeCount: 32,
    approvalRate: 91.5,
    avgTurnaroundDays: 2.8,
    lastPolicyUpdate: "2025-10-01",
    portalUrl: "https://provider.aetna.com",
    requiresPA: true,
  },
  {
    id: "payer-003",
    name: "United Healthcare",
    payerId: "UHC003",
    planTypes: ["PPO", "HMO", "POS"],
    activeCount: 58,
    approvalRate: 84.3,
    avgTurnaroundDays: 4.2,
    lastPolicyUpdate: "2025-08-20",
    portalUrl: "https://provider.uhc.com",
    requiresPA: true,
  },
  {
    id: "payer-004",
    name: "Cigna",
    payerId: "CIG004",
    planTypes: ["PPO", "HMO"],
    activeCount: 28,
    approvalRate: 89.7,
    avgTurnaroundDays: 3.1,
    lastPolicyUpdate: "2025-09-28",
    portalUrl: "https://provider.cigna.com",
    requiresPA: true,
  },
  {
    id: "payer-005",
    name: "Medicare",
    payerId: "MED005",
    planTypes: ["Traditional", "Advantage"],
    activeCount: 72,
    approvalRate: 93.8,
    avgTurnaroundDays: 5.0,
    lastPolicyUpdate: "2025-07-01",
    portalUrl: "https://www.cms.gov",
    requiresPA: false,
  },
];

const MOCK_ORG_SETTINGS = {
  organizationName: "Downtown Medical Center",
  npi: "9876543210",
  address: "123 Main St, Anytown, ST 12345",
  phone: "(555) 123-4567",
  fax: "(555) 123-4568",
  email: "pa@downtownmedical.com",
  defaultProvider: "Dr. Jane Doe",
  autoGenerateChecklist: true,
  autoGenerateMedicalNecessity: false,
  requireAttachmentOCR: true,
  notificationEmail: "pa-notifications@downtownmedical.com",
};

type AdminTab = "payers" | "settings" | "users" | "audit";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("payers");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayers = MOCK_PAYERS.filter((payer) => {
    const query = searchQuery.toLowerCase();
    return (
      searchQuery === "" ||
      payer.name.toLowerCase().includes(query) ||
      payer.payerId.toLowerCase().includes(query)
    );
  });

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "payers", label: "Payers" },
    { id: "settings", label: "Settings" },
    { id: "users", label: "Users" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage payers, settings, users, and audit logs
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Payers Tab */}
          {activeTab === "payers" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search payers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button className="ml-4 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  + Add Payer
                </button>
              </div>

              <div className="space-y-4">
                {filteredPayers.map((payer) => (
                  <div
                    key={payer.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {payer.name}
                          </h3>
                          {payer.requiresPA && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              PA Required
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-500">
                              Payer ID
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {payer.payerId}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">
                              Plan Types
                            </div>
                            <div className="text-sm text-gray-900">
                              {payer.planTypes.join(", ")}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">
                              Active PAs
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {payer.activeCount}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">
                              Approval Rate
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              {payer.approvalRate}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-gray-500">
                              Avg Turnaround
                            </div>
                            <div className="text-sm text-gray-900">
                              {payer.avgTurnaroundDays} days
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">
                              Last Policy Update
                            </div>
                            <div className="text-sm text-gray-900">
                              {payer.lastPolicyUpdate}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Portal</div>
                            <a
                              href={payer.portalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Open Portal →
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex gap-2">
                        <Link
                          href={`/dashboard/admin/payers/${payer.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                        <button className="text-sm text-gray-600 hover:text-gray-800">
                          Policies
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="max-w-3xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Organization Settings
              </h3>

              <div className="space-y-6">
                {/* Organization Info */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Organization Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        defaultValue={MOCK_ORG_SETTINGS.organizationName}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        NPI
                      </label>
                      <input
                        type="text"
                        defaultValue={MOCK_ORG_SETTINGS.npi}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        defaultValue={MOCK_ORG_SETTINGS.address}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        defaultValue={MOCK_ORG_SETTINGS.phone}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fax
                      </label>
                      <input
                        type="text"
                        defaultValue={MOCK_ORG_SETTINGS.fax}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* PA Workflow Settings */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    PA Workflow Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto-checklist"
                        defaultChecked={MOCK_ORG_SETTINGS.autoGenerateChecklist}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="auto-checklist"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Auto-generate checklist when PA is created
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto-medical-necessity"
                        defaultChecked={
                          MOCK_ORG_SETTINGS.autoGenerateMedicalNecessity
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="auto-medical-necessity"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Auto-generate medical necessity summary
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="require-ocr"
                        defaultChecked={MOCK_ORG_SETTINGS.requireAttachmentOCR}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="require-ocr"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Require OCR processing for all attachments
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="pb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Notifications
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notification Email
                    </label>
                    <input
                      type="email"
                      defaultValue={MOCK_ORG_SETTINGS.notificationEmail}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email address for PA status notifications and alerts
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div>
                  <button className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Users</h3>
                <button className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  + Invite User
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-yellow-400 mt-0.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      User management is not yet implemented. This will
                      integrate with Supabase Auth in production.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === "audit" && <AuditLogViewer />}
        </div>
      </div>
    </div>
  );
}
