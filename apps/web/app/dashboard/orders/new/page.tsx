"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, ApiResponse } from "@web/lib/api";
import type {
  PatientRow,
  ProviderRow,
  PayerRow,
  OrderRow,
} from "@web/types/api";

type OrderCreateResponse = ApiResponse<OrderRow>;

export default function OrderCreatePage() {
  const router = useRouter();

  const patientsQuery = useQuery({
    queryKey: ["patients"],
    queryFn: () => apiGet<ApiResponse<PatientRow[]>>("/api/patients"),
    select: (response) => response.data ?? [],
  });

  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: () => apiGet<ApiResponse<ProviderRow[]>>("/api/providers"),
    select: (response) => response.data ?? [],
  });

  const payersQuery = useQuery({
    queryKey: ["payers"],
    queryFn: () => apiGet<ApiResponse<PayerRow[]>>("/api/payers"),
    select: (response) => response.data ?? [],
  });

  const [modality, setModality] = useState("");
  const [patientId, setPatientId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [payerId, setPayerId] = useState("");
  const [cptCodes, setCptCodes] = useState("");
  const [icd10Codes, setIcd10Codes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createOrder = useMutation({
    mutationFn: async () => {
      const payload = {
        patient_id: patientId,
        provider_id: providerId,
        modality,
        cpt_codes: cptCodes
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean),
        icd10_codes: icd10Codes
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean),
        clinic_notes_text: notes || null,
      };

      if (!payload.patient_id || !payload.provider_id || !payload.modality) {
        throw new Error("Patient, provider, and modality are required");
      }

      const response = await apiPost<OrderCreateResponse>(
        "/api/orders",
        payload
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create order");
      }
      return response.data;
    },
    onSuccess: async (order) => {
      if (payerId) {
        try {
          await apiPost<ApiResponse<unknown>>("/api/pa-requests", {
            order_id: order.id,
            payer_id: payerId,
          });
        } catch (submissionError) {
          console.warn("Order created without PA request", submissionError);
        }
      }
      router.push("/dashboard/orders");
    },
    onError: (mutationError: unknown) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create order"
      );
    },
  });

  const loading =
    patientsQuery.isLoading ||
    providersQuery.isLoading ||
    payersQuery.isLoading;

  return (
    <div className="px-4 sm:px-0">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create an imaging order and optionally launch a prior authorization.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading reference data…</div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              createOrder.mutate();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient
                </label>
                <select
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select patient</option>
                  {patientsQuery.data?.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordering Provider
                </label>
                <select
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select provider</option>
                  {providersQuery.data?.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modality
                </label>
                <input
                  value={modality}
                  onChange={(event) => setModality(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. MRI Brain"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optional: Launch PA with Payer
                </label>
                <select
                  value={payerId}
                  onChange={(event) => setPayerId(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No – create order only</option>
                  {payersQuery.data?.map((payer) => (
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
                  CPT Codes (comma separated)
                </label>
                <input
                  value={cptCodes}
                  onChange={(event) => setCptCodes(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="70553"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ICD-10 Codes (comma separated)
                </label>
                <input
                  value={icd10Codes}
                  onChange={(event) => setIcd10Codes(event.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="G89.29, R51"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinical Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Include key clinical information…"
              />
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
                disabled={createOrder.isPending}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {createOrder.isPending ? "Saving…" : "Create Order"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
