/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Audit Log Viewer | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import { useState } from "react";

// Mock audit log data for demo
const MOCK_AUDIT_LOGS = [
  {
    id: "audit-001",
    org_id: "org-001",
    user_id: "user-001",
    action: "pa_request.created",
    subject: "pa_request",
    subject_id: "PA-001",
    meta_json: {
      modality: "MRI Brain",
      priority: "standard",
    },
    at: "2025-10-17 10:30:00",
    user_email: "admin@example.com",
  },
  {
    id: "audit-002",
    org_id: "org-001",
    user_id: "user-001",
    action: "pa_request.submitted",
    subject: "pa_request",
    subject_id: "PA-002",
    meta_json: {
      modality: "CT Chest",
      priority: "urgent",
    },
    at: "2025-10-17 11:45:00",
    user_email: "admin@example.com",
  },
  {
    id: "audit-003",
    org_id: "org-001",
    user_id: "user-002",
    action: "attachment.uploaded",
    subject: "attachment",
    subject_id: "att-001",
    meta_json: {
      filename: "clinical_notes.pdf",
      size: "2.3 MB",
    },
    at: "2025-10-17 14:15:00",
    user_email: "staff@example.com",
  },
  {
    id: "audit-004",
    org_id: "org-001",
    user_id: "user-001",
    action: "pa_request.updated",
    subject: "pa_request",
    subject_id: "PA-001",
    meta_json: {
      changes: ["priority: standard -> urgent"],
    },
    at: "2025-10-17 15:20:00",
    user_email: "admin@example.com",
  },
  {
    id: "audit-005",
    org_id: "org-001",
    user_id: "user-002",
    action: "attachment.deleted",
    subject: "attachment",
    subject_id: "att-002",
    meta_json: {
      filename: "old_report.pdf",
      reason: "incorrect file",
    },
    at: "2025-10-17 16:05:00",
    user_email: "staff@example.com",
  },
];

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  submitted: "bg-purple-100 text-purple-800",
  uploaded: "bg-indigo-100 text-indigo-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

function getActionColor(action: string): string {
  const actionType = action.split(".")[1] || action;
  return ACTION_COLORS[actionType] || "bg-gray-100 text-gray-800";
}

export default function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<
    (typeof MOCK_AUDIT_LOGS)[0] | null
  >(null);

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesAction =
      actionFilter === "all" || log.action.includes(actionFilter);
    const matchesSubject =
      subjectFilter === "all" || log.subject === subjectFilter;
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesSubject && matchesSearch;
  });

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Log</h3>
        <p className="text-sm text-gray-600">
          All system actions are logged for security and compliance. Logs are
          retained for 7 years per HIPAA requirements.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label
              htmlFor="audit-search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              type="text"
              id="audit-search"
              placeholder="Action, ID, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Action Filter */}
          <div>
            <label
              htmlFor="action-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Action Type
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="submitted">Submitted</option>
              <option value="uploaded">Uploaded</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label
              htmlFor="subject-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Subject Type
            </label>
            <select
              id="subject-filter"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Subjects</option>
              <option value="pa_request">PA Requests</option>
              <option value="attachment">Attachments</option>
              <option value="patient">Patients</option>
              <option value="order">Orders</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No audit logs found
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.at}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.subject}</div>
                    <div className="text-xs text-gray-500">
                      {log.subject_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Audit Log Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                <dd className="text-sm text-gray-900">{selectedLog.at}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Action</dt>
                <dd className="text-sm text-gray-900">{selectedLog.action}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Subject</dt>
                <dd className="text-sm text-gray-900">
                  {selectedLog.subject} ({selectedLog.subject_id})
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">User</dt>
                <dd className="text-sm text-gray-900">
                  {selectedLog.user_email}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Metadata</dt>
                <dd className="mt-1">
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.meta_json, null, 2)}
                  </pre>
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Events</div>
          <div className="text-2xl font-bold text-gray-900">
            {MOCK_AUDIT_LOGS.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">PA Actions</div>
          <div className="text-2xl font-bold text-blue-600">
            {MOCK_AUDIT_LOGS.filter((l) => l.subject === "pa_request").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Attachments</div>
          <div className="text-2xl font-bold text-indigo-600">
            {MOCK_AUDIT_LOGS.filter((l) => l.subject === "attachment").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Unique Users</div>
          <div className="text-2xl font-bold text-purple-600">
            {new Set(MOCK_AUDIT_LOGS.map((l) => l.user_id)).size}
          </div>
        </div>
      </div>
    </div>
  );
}
