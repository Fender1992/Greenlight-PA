"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet, ApiResponse } from "@web/lib/api";
import type { OrderWithRelations } from "@web/types/api";

// Skeleton loader component
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-28"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-36 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-28"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right">
            <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
          </td>
        </tr>
      ))}
    </>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const response =
        await apiGet<ApiResponse<OrderWithRelations[]>>("/api/orders");
      if (!response.success) {
        throw new Error(response.error || "Failed to load orders");
      }
      return response.data ?? [];
    },
  });

  const orders = data ?? [];

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const patientName = order.patient?.name ?? "";
      const providerName = order.provider?.name ?? "";
      return (
        patientName.toLowerCase().includes(query) ||
        providerName.toLowerCase().includes(query) ||
        order.modality.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query)
      );
    });
  }, [orders, searchQuery]);

  // Paginate filtered results
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  // Reset to page 1 when search query changes
  useMemo(() => {
    setPage(1);
  }, [searchQuery]);

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            View imaging orders and launch prior authorizations
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/dashboard/orders/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + New Order
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <label
          htmlFor="order-search"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Search
        </label>
        <input
          type="text"
          id="order-search"
          placeholder="Patient, provider, modality, or order ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isError ? (
          <div className="py-12 text-center text-red-600">
            {(error as Error)?.message || "Failed to load orders"}
            <div className="mt-2">
              <button
                onClick={() => refetch()}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modality & Codes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <TableSkeleton rows={pageSize} />
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No orders found
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.patient?.name || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.provider?.name || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.modality}
                        </div>
                        <div className="text-xs text-gray-500">
                          CPT: {order.cpt_codes.join(", ")}
                        </div>
                        <div className="text-xs text-gray-500">
                          ICD-10: {order.icd10_codes.join(", ")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <Link
                          href={`/dashboard/pa/new?order_id=${order.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Create PA
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {!isLoading && filteredOrders.length > pageSize && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(page - 1) * pageSize + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(page * pageSize, filteredOrders.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">
                        {filteredOrders.length}
                      </span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }).map(
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pageNum
                                  ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Orders</div>
          <div className="text-2xl font-bold text-gray-900">
            {orders.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Unique Patients</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(orders.map((o) => o.patient_id)).size}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Unique Providers</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Set(orders.map((o) => o.provider_id).filter(Boolean)).size}
          </div>
        </div>
      </div>
    </div>
  );
}
