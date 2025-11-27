"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, ApiResponse } from "@web/lib/api";
import type {
  OrderWithRelations,
  PayerRow,
  PaRequestRow,
} from "@web/types/api";
import { useOrg } from "../../OrgContext";

type PaCreateResponse = ApiResponse<PaRequestRow>;

function PaCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedOrgId, memberships, loading: orgLoading } = useOrg();
  const preselectedOrderId = searchParams?.get("order_id") ?? "";

  const [orderId, setOrderId] = useState(preselectedOrderId);
  const [payerId, setPayerId] = useState("");
  const [priority, setPriority] = useState<"standard" | "urgent">("standard");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedOrderId) {
      setOrderId(preselectedOrderId);
    }
  }, [preselectedOrderId]);

  const ordersQuery = useQuery({
    queryKey: ["orders", selectedOrgId],
    queryFn: () => {
      const url = selectedOrgId
        ? `/api/orders?org_id=${selectedOrgId}`
        : "/api/orders";
      return apiGet<ApiResponse<OrderWithRelations[]>>(url);
    },
    select: (response) => response.data ?? [],
    enabled:
      !orgLoading && (memberships.length === 1 || selectedOrgId !== null),
  });

  const payersQuery = useQuery({
    queryKey: ["payers"],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<PayerRow[]>>("/api/payers");
      return response;
    },
    select: (response) => response.data ?? [],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        order_id: orderId,
        payer_id: payerId,
        priority,
        ...(selectedOrgId && { org_id: selectedOrgId }),
      };

      if (!payload.order_id || !payload.payer_id) {
        throw new Error("Order and payer are required");
      }

      const response = await apiPost<PaCreateResponse>(
        "/api/pa-requests",
        payload
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create PA request");
      }

      return response.data;
    },
    onSuccess: (data) => {
      router.push(`/dashboard/pa/${data.id}`);
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create PA request"
      );
    },
  });

  const orders = ordersQuery.data ?? [];
  const payers = payersQuery.data ?? [];

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === orderId) ?? null;
  }, [orders, orderId]);

  // Show org selection prompt for multi-org users
  const needsOrgSelection =
    !orgLoading && memberships.length > 1 && !selectedOrgId;

  const isLoading =
    orgLoading || ordersQuery.isLoading || payersQuery.isLoading;
  const hasLoadError = ordersQuery.isError || payersQuery.isError;
  const loadErrorMessage =
    (ordersQuery.error as Error | undefined)?.message ||
    (payersQuery.error as Error | undefined)?.message ||
    "Failed to load reference data";

  const hasOrders = orders.length > 0;
  const hasPayers = payers.length > 0;
  const isSubmitDisabled =
    createMutation.isPending ||
    !orderId ||
    !payerId ||
    hasLoadError ||
    !hasOrders ||
    !hasPayers;

  return (
    <div className="px-4 sm:px-0">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            New Prior Authorization
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select an order and payer to launch a new prior authorization.
          </p>
        </div>

        {needsOrgSelection ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Select an Organization
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  You have access to multiple organizations. Please select one
                  from the header dropdown to create a PA request.
                </p>
              </div>
            </div>
          </div>
        ) : hasLoadError ? (
          <div className="text-sm text-red-600">
            {loadErrorMessage}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  ordersQuery.refetch();
                  payersQuery.refetch();
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-sm text-gray-500">Loading reference data…</div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              createMutation.mutate();
            }}
          >
            {(!hasOrders || !hasPayers) && (
              <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
                {!hasOrders && (
                  <p>
                    No orders available.{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/orders/new")}
                      className="text-yellow-900 font-medium underline"
                    >
                      Create an order
                    </button>{" "}
                    before launching a PA.
                  </p>
                )}
                {!hasOrders && !hasPayers && <div className="h-2" />}
                {!hasPayers && (
                  <p>
                    No payers found. Visit the admin section to add payer
                    information.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  required
                >
                  <option value="">Select order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.patient?.name ?? "Unknown patient"} ·{" "}
                      {order.modality}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payer
                </label>
                <select
                  value={payerId}
                  onChange={(event) => setPayerId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  required
                >
                  <option value="">Select payer</option>
                  {payers.map((payer) => (
                    <option key={payer.id} value={payer.id}>
                      {payer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as "standard" | "urgent")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {selectedOrder && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm space-y-1">
                  <div className="font-medium text-gray-900">
                    {selectedOrder.patient?.name ?? "Unknown patient"}
                  </div>
                  <div className="text-gray-600">
                    {selectedOrder.provider?.name ?? "No provider listed"}
                  </div>
                  <div className="text-gray-500">{selectedOrder.modality}</div>
                  <div className="text-xs text-gray-500">
                    CPT:{" "}
                    {Array.isArray(selectedOrder.cpt_codes) &&
                    selectedOrder.cpt_codes.length > 0
                      ? selectedOrder.cpt_codes.join(", ")
                      : "—"}
                  </div>
                  <div className="text-xs text-gray-500">
                    ICD-10:{" "}
                    {Array.isArray(selectedOrder.icd10_codes) &&
                    selectedOrder.icd10_codes.length > 0
                      ? selectedOrder.icd10_codes.join(", ")
                      : "—"}
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                onClick={() => router.back()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Create PA Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PaCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 sm:px-0">
          <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </div>
      }
    >
      <PaCreateForm />
    </Suspense>
  );
}
