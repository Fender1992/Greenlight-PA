/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: Order Management | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import { useState } from "react";
import Link from "next/link";

// Mock data for demo
const MOCK_ORDERS = [
  {
    id: "order-001",
    orderNumber: "ORD-20251015-001",
    patientName: "Smith, John",
    modality: "MRI Brain",
    bodyPart: "Brain",
    cptCodes: ["70553"],
    icd10Codes: ["G89.29", "R51"],
    orderingProvider: "Dr. Jane Doe",
    orderDate: "2025-10-14",
    status: "pending_pa",
    paStatus: "draft",
    paId: "PA-001",
  },
  {
    id: "order-002",
    orderNumber: "ORD-20251016-002",
    patientName: "Doe, Jane",
    modality: "CT Chest",
    bodyPart: "Chest",
    cptCodes: ["71260"],
    icd10Codes: ["J18.9"],
    orderingProvider: "Dr. John Smith",
    orderDate: "2025-10-14",
    status: "pa_submitted",
    paStatus: "submitted",
    paId: "PA-002",
  },
  {
    id: "order-003",
    orderNumber: "ORD-20251010-003",
    patientName: "Johnson, Mary",
    modality: "MRI Lumbar Spine",
    bodyPart: "Lumbar Spine",
    cptCodes: ["72148"],
    icd10Codes: ["M54.5"],
    orderingProvider: "Dr. Sarah Lee",
    orderDate: "2025-10-08",
    status: "approved",
    paStatus: "approved",
    paId: "PA-003",
  },
  {
    id: "order-004",
    orderNumber: "ORD-20251017-004",
    patientName: "Williams, Robert",
    modality: "MRI Knee",
    bodyPart: "Knee",
    cptCodes: ["73721"],
    icd10Codes: ["M23.91", "S83.271A"],
    orderingProvider: "Dr. Michael Chen",
    orderDate: "2025-10-17",
    status: "new",
    paStatus: null,
    paId: null,
  },
];

const ORDER_STATUS_COLORS = {
  new: "bg-gray-100 text-gray-800",
  pending_pa: "bg-yellow-100 text-yellow-800",
  pa_submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  scheduled: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = MOCK_ORDERS.filter((order) => {
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      order.patientName.toLowerCase().includes(query) ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.modality.toLowerCase().includes(query) ||
      order.orderingProvider.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage imaging orders
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            + New Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label
              htmlFor="order-search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Search
            </label>
            <input
              type="text"
              id="order-search"
              placeholder="Patient, Order #, Modality, Provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="order-status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Status
            </label>
            <select
              id="order-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="pending_pa">Pending PA</option>
              <option value="pa_submitted">PA Submitted</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Procedure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Codes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/dashboard/orders/${order.id}`)
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.patientName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.modality}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.bodyPart}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      CPT: {order.cptCodes.join(", ")}
                    </div>
                    <div className="text-xs text-gray-500">
                      ICD-10: {order.icd10Codes.join(", ")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.orderingProvider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.orderDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                    {order.paId && (
                      <div className="text-xs text-blue-600 mt-1">
                        <Link
                          href={`/dashboard/pa/${order.paId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {order.paId}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {order.status === "new" ? (
                      <Link
                        href={`/dashboard/pa/new?order_id=${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Create PA
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900">
            {MOCK_ORDERS.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">New</div>
          <div className="text-2xl font-bold text-gray-600">
            {MOCK_ORDERS.filter((o) => o.status === "new").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending PA</div>
          <div className="text-2xl font-bold text-yellow-600">
            {MOCK_ORDERS.filter((o) => o.status === "pending_pa").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Submitted</div>
          <div className="text-2xl font-bold text-blue-600">
            {MOCK_ORDERS.filter((o) => o.status === "pa_submitted").length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">
            {MOCK_ORDERS.filter((o) => o.status === "approved").length}
          </div>
        </div>
      </div>
    </div>
  );
}
