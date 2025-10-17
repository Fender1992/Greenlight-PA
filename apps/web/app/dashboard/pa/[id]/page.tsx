"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost, ApiResponse } from "@web/lib/api";
import type {
  ChecklistItemRow,
  PaRequestWithRelations,
  PaSummaryRow,
  StatusEventRow,
} from "@web/types/api";

const CHECKLIST_STATUS_LABEL: Record<string, string> = {
  met: "Met",
  not_met: "Not Met",
  waived: "Waived",
};

const CHECKLIST_STATUS_COLOR: Record<string, string> = {
  met: "text-green-600",
  not_met: "text-red-600",
  waived: "text-gray-500",
};

const STATUS_BADGE_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  pending_info: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  appealed: "bg-purple-100 text-purple-800",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function PADetailPage() {
  const params = useParams();
  const paId = params.id as string;
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState<string>("standard");

  const paQuery = useQuery({
    queryKey: ["pa-request", paId],
    queryFn: async () => {
      const response = await apiGet<ApiResponse<PaRequestWithRelations>>(
        `/api/pa-requests/${paId}`
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || "PA request not found");
      }
      return response.data;
    },
  });

  const data = paQuery.data;

  useEffect(() => {
    if (data?.priority) {
      setPriority(data.priority);
    }
  }, [data?.priority]);

  const updatePriorityMutation = useMutation({
    mutationFn: (newPriority: string) =>
      apiPatch<ApiResponse<PaRequestWithRelations>>(
        `/api/pa-requests/${paId}`,
        { priority: newPriority }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-request", paId] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      apiPatch<ApiResponse<PaRequestWithRelations>>(
        `/api/pa-requests/${paId}`,
        { status: "submitted" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-request", paId] });
    },
  });

  const checklistMutation = useMutation({
    mutationFn: () =>
      apiPost<ApiResponse<{ checklist_items: ChecklistItemRow[] }>>(
        "/api/llm/checklist",
        { pa_request_id: paId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-request", paId] });
    },
  });

  const necessityMutation = useMutation({
    mutationFn: () =>
      apiPost<ApiResponse<{ summary: PaSummaryRow }>>(
        "/api/llm/medical-necessity",
        { pa_request_id: paId }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-request", paId] });
    },
  });

  const downloadApprovalSummary = async () => {
    const response = await fetch("/api/pdf/approval-summary", {
      method: "POST",
      body: JSON.stringify({ pa_request_id: paId }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error("Failed to generate PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PA_${paId}_approval-summary.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadCoverLetter = async () => {
    const response = await fetch("/api/pdf/cover-letter", {
      method: "POST",
      body: JSON.stringify({ pa_request_id: paId }),
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error("Failed to generate PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PA_${paId}_cover-letter.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const checklistItems: ChecklistItemRow[] = useMemo(
    () => data?.checklist_items ?? [],
    [data]
  );

  const summaries: PaSummaryRow[] = useMemo(
    () => data?.summaries ?? [],
    [data]
  );

  const timeline: StatusEventRow[] = useMemo(
    () => (data?.status_events ?? []).sort((a, b) => a.at.localeCompare(b.at)),
    [data]
  );

  if (paQuery.isLoading) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Loading PA request…
        </div>
      </div>
    );
  }

  if (paQuery.isError || !data) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-lg shadow p-8 text-center text-red-600">
          {(paQuery.error as Error)?.message || "PA request not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0 space-y-6">
      <nav className="text-sm">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          Worklist
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-700">{paId}</span>
      </nav>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{paId}</h1>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                  STATUS_BADGE_COLOR[data.status] ?? "bg-gray-100 text-gray-800"
                }`}
              >
                {data.status.replace("_", " ")}
              </span>
              <select
                value={priority}
                onChange={(event) => {
                  const newPriority = event.target.value;
                  setPriority(newPriority);
                  updatePriorityMutation.mutate(newPriority);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Created {formatDate(data.created_at)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || data.status !== "draft"}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit PA"}
            </button>
            <button
              onClick={() => checklistMutation.mutate()}
              disabled={checklistMutation.isPending}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {checklistMutation.isPending
                ? "Generating…"
                : "Generate Checklist"}
            </button>
            <button
              onClick={() => necessityMutation.mutate()}
              disabled={necessityMutation.isPending}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {necessityMutation.isPending
                ? "Generating…"
                : "Generate Medical Necessity"}
            </button>
            <button
              onClick={downloadApprovalSummary}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Download Approval Summary
            </button>
            <button
              onClick={downloadCoverLetter}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Download Cover Letter
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Patient Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div>{data.order?.patient?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">DOB</div>
                <div>
                  {data.order?.patient?.dob
                    ? new Date(data.order.patient.dob).toLocaleDateString()
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Member ID</div>
                <div>{data.order?.patient?.mrn ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Sex</div>
                <div>{data.order?.patient?.sex ?? "—"}</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Order Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Modality</div>
                <div>{data.order?.modality ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Provider</div>
                <div>{data.order?.provider?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">CPT Codes</div>
                <div>{data.order?.cpt_codes.join(", ") || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ICD-10 Codes</div>
                <div>{data.order?.icd10_codes.join(", ") || "—"}</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Payer</h2>
            <div className="text-sm text-gray-700">
              {data.payer?.name ?? "—"}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Checklist
            </h2>
            <div className="space-y-3">
              {checklistItems.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No checklist items yet. Generate a checklist to get started.
                </div>
              ) : (
                checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          CHECKLIST_STATUS_COLOR[item.status] ?? "text-gray-500"
                        }`}
                      >
                        {CHECKLIST_STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </div>
                    {item.rationale && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.rationale}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Medical Necessity Summary
            </h2>
            {summaries.length === 0 ? (
              <div className="text-sm text-gray-500">
                Generate a medical necessity narrative to populate this section.
              </div>
            ) : (
              summaries.map((summary) => (
                <div key={summary.id} className="space-y-3">
                  <div className="text-xs text-gray-500">
                    Version {summary.version} · {formatDate(summary.created_at)}
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-line">
                    {summary.medical_necessity_text}
                  </div>
                  {summary.indications_text && (
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      <strong>Indications:</strong> {summary.indications_text}
                    </div>
                  )}
                  {summary.risk_benefit_text && (
                    <div className="text-sm text-gray-700 whitespace-pre-line">
                      <strong>Risk / Benefit:</strong>{" "}
                      {summary.risk_benefit_text}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </div>

        <aside className="bg-white rounded-lg shadow p-6 space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Timeline
            </h3>
            <ol className="relative border-l border-gray-200 text-sm text-gray-700">
              {timeline.length === 0 ? (
                <li className="ml-4">No status events yet.</li>
              ) : (
                timeline.map((event) => (
                  <li key={event.id} className="mb-4 ml-4">
                    <div className="absolute w-2 h-2 bg-blue-500 rounded-full left-[-5px] mt-1.5" />
                    <time className="text-xs text-gray-500">
                      {formatDate(event.at)}
                    </time>
                    <div className="text-sm font-medium text-gray-900">
                      {event.status.replace("_", " ")}
                    </div>
                    {event.note && (
                      <div className="text-xs text-gray-500">{event.note}</div>
                    )}
                  </li>
                ))
              )}
            </ol>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Attachments
            </h3>
            <div className="text-sm text-gray-600">
              Upload and manage supporting documentation from the Attachments
              tab.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
