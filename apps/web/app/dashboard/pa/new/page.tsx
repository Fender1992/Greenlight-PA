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

type PaCreateResponse = ApiResponse<PaRequestRow>;

function PaCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    queryKey: ["orders"],
    queryFn: () => apiGet<ApiResponse<OrderWithRelations[]>>("/api/orders"),
    select: (response) => response.data ?? [],
  });

  const payersQuery = useQuery({
    queryKey: ["payers"],
    queryFn: async () => {
      console.log("[PA Form] Fetching payers...");
      const response = await apiGet<ApiResponse<PayerRow[]>>("/api/payers");
      console.log("[PA Form] Payers response:", response);
      return response;
    },
    select: (response) => {
      const payers = response.data ?? [];
      console.log("[PA Form] Selected payers:", payers);
      return payers;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        order_id: orderId,
        payer_id: payerId,
        priority,
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

  // Debug logging
  console.log("[PA Form] Query states:", {
    ordersLoading: ordersQuery.isLoading,
    ordersError: ordersQuery.isError,
    ordersCount: orders.length,
    payersLoading: payersQuery.isLoading,
    payersError: payersQuery.isError,
    payersCount: payers.length,
  });

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === orderId) ?? null;
  }, [orders, orderId]);

  const isLoading = ordersQuery.isLoading || payersQuery.isLoading;
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

        {hasLoadError ? (
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
