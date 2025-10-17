/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Metrics Dashboard | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import { useState } from "react";

// Mock metrics data
const MOCK_METRICS = {
  overall: {
    totalRequests: 247,
    approvalRate: 87.5,
    avgTurnaroundDays: 3.2,
    urgentRequests: 42,
  },
  byStatus: {
    draft: 15,
    submitted: 38,
    pending_info: 12,
    approved: 156,
    denied: 22,
    appealed: 4,
  },
  byPayer: [
    { name: "Blue Cross", count: 89, approvalRate: 91.0, avgDays: 2.8 },
    { name: "Aetna", count: 62, approvalRate: 88.7, avgDays: 3.1 },
    { name: "United", count: 54, approvalRate: 81.5, avgDays: 4.2 },
    { name: "Cigna", count: 32, approvalRate: 87.5, avgDays: 3.0 },
    { name: "Medicare", count: 10, approvalRate: 100.0, avgDays: 2.5 },
  ],
  byModality: [
    { name: "MRI Brain", count: 78, approvalRate: 89.7 },
    { name: "CT Chest", count: 56, approvalRate: 85.7 },
    { name: "MRI Spine", count: 48, approvalRate: 87.5 },
    { name: "MRI Knee", count: 35, approvalRate: 91.4 },
    { name: "Other", count: 30, approvalRate: 83.3 },
  ],
  trends: [
    { month: "Jul", requests: 38, approvalRate: 85.0 },
    { month: "Aug", requests: 42, approvalRate: 86.5 },
    { month: "Sep", requests: 51, approvalRate: 88.0 },
    { month: "Oct", requests: 55, approvalRate: 87.5 },
  ],
};

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Metrics & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor PA performance and identify improvement opportunities
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Requests</div>
              <div className="text-3xl font-bold text-gray-900">
                {MOCK_METRICS.overall.totalRequests}
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600">
            ↑ 12% from last period
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Approval Rate</div>
              <div className="text-3xl font-bold text-green-600">
                {MOCK_METRICS.overall.approvalRate}%
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600">
            ↑ 2.3% from last period
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Avg Turnaround</div>
              <div className="text-3xl font-bold text-blue-600">
                {MOCK_METRICS.overall.avgTurnaroundDays}
                <span className="text-lg">d</span>
              </div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-green-600">↓ 0.3 days (faster)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Urgent Requests</div>
              <div className="text-3xl font-bold text-red-600">
                {MOCK_METRICS.overall.urgentRequests}
              </div>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">17% of total</div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Status Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(MOCK_METRICS.byStatus).map(([status, count]) => {
              const percentage = (
                (count / MOCK_METRICS.overall.totalRequests) *
                100
              ).toFixed(1);
              const colors: Record<string, string> = {
                draft: "bg-gray-500",
                submitted: "bg-blue-500",
                pending_info: "bg-yellow-500",
                approved: "bg-green-500",
                denied: "bg-red-500",
                appealed: "bg-purple-500",
              };
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 capitalize">
                      {status.replace("_", " ")}
                    </span>
                    <span className="font-medium text-gray-900">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[status]} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Trend
          </h3>
          <div className="space-y-4">
            {MOCK_METRICS.trends.map((item) => (
              <div
                key={item.month}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium text-gray-600 w-8">
                    {item.month}
                  </span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {item.requests} requests
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(item.requests / 60) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600 ml-4">
                  {item.approvalRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payer Performance */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Payer Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Payer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Approval Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Days
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {MOCK_METRICS.byPayer.map((payer) => (
                <tr key={payer.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payer.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${
                        payer.approvalRate >= 90
                          ? "text-green-600"
                          : payer.approvalRate >= 85
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {payer.approvalRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payer.avgDays} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modality Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Modality Performance
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_METRICS.byModality.map((modality) => (
              <div
                key={modality.name}
                className="border border-gray-200 rounded-lg p-4"
              >
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {modality.name}
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {modality.count}
                  </span>
                  <span
                    className={`text-lg font-semibold ${
                      modality.approvalRate >= 90
                        ? "text-green-600"
                        : modality.approvalRate >= 85
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {modality.approvalRate}%
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {(
                    (modality.count / MOCK_METRICS.overall.totalRequests) *
                    100
                  ).toFixed(1)}
                  % of total
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
