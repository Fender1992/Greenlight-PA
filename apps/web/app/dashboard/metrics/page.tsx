"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet, ApiResponse } from "@web/lib/api";
import type { MetricsResponse, PayerRow } from "@web/types/api";
import { useOrg } from "../OrgContext";

const TIME_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

export default function MetricsPage() {
  const { selectedOrgId, memberships, loading: orgLoading } = useOrg();
  const [timeRange, setTimeRange] = useState("30d");

  const metricsQuery = useQuery({
    queryKey: ["metrics", selectedOrgId, timeRange],
    queryFn: async () => {
      const url = selectedOrgId
        ? `/api/metrics?org_id=${selectedOrgId}&time_range=${timeRange}`
        : `/api/metrics?time_range=${timeRange}`;

      const response = await apiGet<ApiResponse<MetricsResponse>>(url);
      if (!response.success) {
        throw new Error(response.error || "Failed to load metrics");
      }
      return response.data;
    },
    enabled:
      !orgLoading && (memberships.length === 1 || selectedOrgId !== null),
  });

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

  const metrics = metricsQuery.data;
  const payerLookup = useMemo(() => {
    const map = new Map<string, PayerRow>();
    (payersQuery.data ?? []).forEach((payer) => map.set(payer.id, payer));
    return map;
  }, [payersQuery.data]);

  const payerBreakdown = useMemo(() => {
    if (!metrics) return [] as Array<{ id: string; count: number }>;
    return Object.entries(metrics.payerCounts)
      .filter(([id]) => Boolean(id))
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [metrics]);

  const statusBreakdown = useMemo(() => {
    if (!metrics) return [] as Array<{ status: string; count: number }>;
    return Object.entries(metrics.byStatus)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [metrics]);

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Metrics &amp; Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor approval performance and throughput
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          >
            {TIME_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Show org selection message for multi-org users */}
      {!orgLoading && memberships.length > 1 && !selectedOrgId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <svg
              className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                Select an Organization
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                You have access to multiple organizations. Please select one
                using the organization selector in the top navigation to view
                metrics.
              </p>
            </div>
          </div>
        </div>
      )}

      {metricsQuery.isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Calculating metrics…
        </div>
      ) : metricsQuery.isError || !metrics ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-red-600">
          {(metricsQuery.error as Error)?.message || "Failed to load metrics"}
          <div className="mt-2">
            <button
              onClick={() => metricsQuery.refetch()}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Requests</div>
              <div className="text-3xl font-bold text-gray-900">
                {metrics.overall.totalRequests}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Approval Rate</div>
              <div className="text-3xl font-bold text-green-600">
                {metrics.overall.approvalRate}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Avg Turnaround</div>
              <div className="text-3xl font-bold text-blue-600">
                {metrics.overall.avgTurnaroundDays}
                <span className="text-lg">d</span>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Urgent Requests</div>
              <div className="text-3xl font-bold text-red-600">
                {metrics.overall.urgentRequests}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Status Breakdown
              </h3>
              <div className="space-y-3">
                {statusBreakdown.map(({ status, count }) => {
                  const percentage = metrics.overall.totalRequests
                    ? Math.round((count / metrics.overall.totalRequests) * 100)
                    : 0;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {status.replace("_", " ")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {count} requests
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">
                          {percentage}%
                        </div>
                        <div className="w-32 bg-gray-100 h-2 rounded-full">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payer Volume (Top 5)
              </h3>
              <div className="space-y-3">
                {payerBreakdown.map(({ id, count }) => (
                  <div key={id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {payerLookup.get(id)?.name || id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {count} requests
                      </div>
                    </div>
                  </div>
                ))}
                {payerBreakdown.length === 0 && (
                  <div className="text-sm text-gray-500">
                    No payer data in selected range.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Trend
            </h3>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-w-max md:min-w-0">
                {metrics.trends.map((item) => (
                  <div
                    key={item.month}
                    className="p-4 border border-gray-200 rounded-lg min-w-[140px]"
                  >
                    <div className="text-sm text-gray-500">{item.month}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {item.requests}
                    </div>
                    <div className="text-xs text-green-600">
                      Approval: {item.approvalRate}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
