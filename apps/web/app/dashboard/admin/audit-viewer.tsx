"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@web/lib/api";
import type { AuditLogResponse, AuditLogRow } from "@web/types/api";

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "created", label: "Created" },
  { value: "submitted", label: "Submitted" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "uploaded", label: "Uploaded" },
];

const SUBJECT_OPTIONS = [
  { value: "all", label: "All Subjects" },
  { value: "pa_request", label: "PA Requests" },
  { value: "attachment", label: "Attachments" },
  { value: "patient", label: "Patients" },
  { value: "order", label: "Orders" },
  { value: "user", label: "Users" },
];

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  submitted: "bg-purple-100 text-purple-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  uploaded: "bg-indigo-100 text-indigo-800",
};

function getActionColor(action: string) {
  const suffix = action.split(".")[1] || action;
  return ACTION_COLORS[suffix] ?? "bg-gray-100 text-gray-800";
}

export default function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const response = await apiGet<AuditLogResponse>("/api/audit?limit=200");
      if (!response.success) {
        throw new Error(response.error as string);
      }
      return response;
    },
  });

  const logs = data?.data ?? [];

  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const matchesAction =
        actionFilter === "all" || log.action.includes(actionFilter);
      const matchesSubject =
        subjectFilter === "all" || log.subject === subjectFilter;
      const matchesSearch =
        query === "" ||
        log.action.toLowerCase().includes(query) ||
        (log.subject_id ?? "").toLowerCase().includes(query) ||
        (log.user_id ?? "").toLowerCase().includes(query);
      return matchesAction && matchesSubject && matchesSearch;
    });
  }, [logs, actionFilter, subjectFilter, searchQuery]);

  const summary = useMemo(() => {
    return {
      total: logs.length,
      paRequests: logs.filter((log) => log.subject === "pa_request").length,
      attachments: logs.filter((log) => log.subject === "attachment").length,
      uniqueUsers: new Set(logs.map((log) => log.user_id).filter(Boolean))
        .size,
    };
  }, [logs]);

  const renderMeta = (log: AuditLogRow) => {
    if (!log.meta_json) return null;
    return (
      <pre className="mt-2 bg-gray-50 text-xs text-gray-600 rounded p-3 overflow-x-auto">
        {JSON.stringify(log.meta_json, null, 2)}
      </pre>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        Loading audit log…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-red-600">
        {(error as Error)?.message || "Failed to load audit log"}
        <div className="mt-2">
          <button
            onClick={() => refetch()}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Audit Log
        </h3>
        <p className="text-sm text-gray-600">
          All system actions are logged for security and compliance. Logs are
          retained according to retention policy.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="audit-search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              id="audit-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Action, subject ID, or user ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No audit events match the selected filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}
                    >
                      {log.action.replace(".", " · ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">{log.subject}</div>
                    <div className="text-xs text-gray-500">
                      {log.subject_id ?? "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.user_id ?? "System"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {renderMeta(log)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Events (30d)</div>
          <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">PA Activity</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.paRequests}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Attachment Events</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.attachments}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Active Users</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.uniqueUsers}
          </div>
        </div>
      </div>
    </div>
  );
}
