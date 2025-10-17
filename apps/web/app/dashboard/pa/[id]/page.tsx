/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Component: PA Detail/Editor | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Mock data for demo
const MOCK_PA_DATA = {
  id: "PA-001",
  status: "draft",
  priority: "standard",
  createdDate: "2025-10-15",
  submittedDate: null,
  statusDate: "2025-10-15",

  // Patient info
  patient: {
    name: "Smith, John",
    dob: "01/15/1975",
    memberId: "BC123456789",
    gender: "M",
  },

  // Order info
  order: {
    modality: "MRI Brain",
    bodyPart: "Brain",
    cptCodes: ["70553"],
    icd10Codes: ["G89.29", "R51"],
    orderingProvider: "Dr. Jane Doe",
    orderingProviderNPI: "1234567890",
    orderDate: "2025-10-14",
  },

  // Payer info
  payer: {
    name: "Blue Cross Blue Shield",
    planType: "PPO",
    groupNumber: "GRP123",
  },

  // Organization
  organization: {
    name: "Downtown Medical Center",
    npi: "9876543210",
  },

  // Checklist
  checklist: [
    {
      id: "1",
      requirement: "Clinical notes from last 3 months",
      status: "met",
      notes: "Uploaded on 10/15",
    },
    {
      id: "2",
      requirement: "Prior conservative treatment documentation",
      status: "not_met",
      notes: "Still pending from provider",
    },
    {
      id: "3",
      requirement: "Diagnostic imaging reports",
      status: "met",
      notes: "CT scan report attached",
    },
  ],

  // Medical necessity summary
  medicalNecessity: {
    summary:
      "Patient presents with chronic headaches and neurological symptoms. Conservative treatment with medications has been attempted over the past 6 months without significant improvement. MRI with contrast is medically necessary to rule out intracranial pathology including mass lesions, vascular abnormalities, and inflammatory conditions. Clinical presentation and failed conservative management support the need for advanced imaging.",
    generatedDate: "2025-10-15",
    version: "v1.0",
  },

  // Attachments
  attachments: [
    {
      id: "att-1",
      filename: "clinical_notes_2025.pdf",
      fileType: "clinical_notes",
      uploadedDate: "2025-10-15",
      uploadedBy: "Demo User",
      size: "2.3 MB",
    },
    {
      id: "att-2",
      filename: "ct_scan_report.pdf",
      fileType: "imaging_report",
      uploadedDate: "2025-10-15",
      uploadedBy: "Demo User",
      size: "1.1 MB",
    },
  ],

  // History
  history: [
    {
      id: "h1",
      date: "2025-10-15 10:30 AM",
      action: "PA Request Created",
      user: "Demo User",
      details: "Initial PA request created for MRI Brain",
    },
    {
      id: "h2",
      date: "2025-10-15 11:45 AM",
      action: "Checklist Generated",
      user: "System (LLM)",
      details: "Generated checklist based on payer policy",
    },
    {
      id: "h3",
      date: "2025-10-15 02:15 PM",
      action: "Attachments Uploaded",
      user: "Demo User",
      details: "Uploaded 2 documents",
    },
  ],
};

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  pending_info: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
  appealed: "bg-purple-100 text-purple-800",
};

const CHECKLIST_STATUS_COLORS = {
  met: "text-green-600",
  not_met: "text-red-600",
  waived: "text-gray-500",
};

type Tab =
  | "overview"
  | "checklist"
  | "medical-necessity"
  | "attachments"
  | "history";

export default function PADetailPage() {
  const params = useParams();
  const paId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isEditing, setIsEditing] = useState(false);

  // In production, fetch data based on paId
  const paData = MOCK_PA_DATA;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "checklist", label: "Checklist", count: paData.checklist.length },
    { id: "medical-necessity", label: "Medical Necessity" },
    {
      id: "attachments",
      label: "Attachments",
      count: paData.attachments.length,
    },
    { id: "history", label: "History", count: paData.history.length },
  ];

  const handleSubmit = () => {
    // TODO: Call /api/pa-requests/[id]/submit
    alert("Submit PA request (will be implemented)");
  };

  const handleGenerateCoverLetter = () => {
    // TODO: Call /api/pdf/cover-letter
    alert("Generate cover letter PDF (will be implemented)");
  };

  const handleGenerateChecklist = () => {
    // TODO: Call /api/llm/checklist
    alert("Generate checklist with LLM (will be implemented)");
  };

  const handleGenerateMedicalNecessity = () => {
    // TODO: Call /api/llm/medical-necessity
    alert("Generate medical necessity with LLM (will be implemented)");
  };

  return (
    <div className="px-4 sm:px-0">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          Worklist
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-700">{paId}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{paId}</h1>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${STATUS_COLORS[paData.status as keyof typeof STATUS_COLORS]}`}
              >
                {paData.status.replace("_", " ")}
              </span>
              {paData.priority === "urgent" && (
                <span className="text-red-600 font-semibold">⚠️ URGENT</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {paData.status === "draft" && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {isEditing ? "Cancel Edit" : "Edit"}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Submit PA
                </button>
              </>
            )}
            {(paData.status === "submitted" ||
              paData.status === "approved") && (
              <button
                onClick={handleGenerateCoverLetter}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                📄 Generate Cover Letter
              </button>
            )}
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
          <div>
            <div className="text-sm text-gray-500">Patient</div>
            <div className="text-base font-medium text-gray-900">
              {paData.patient.name}
            </div>
            <div className="text-sm text-gray-600">
              DOB: {paData.patient.dob} | {paData.patient.gender}
            </div>
            <div className="text-sm text-gray-600">
              Member ID: {paData.patient.memberId}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Procedure</div>
            <div className="text-base font-medium text-gray-900">
              {paData.order.modality}
            </div>
            <div className="text-sm text-gray-600">
              CPT: {paData.order.cptCodes.join(", ")}
            </div>
            <div className="text-sm text-gray-600">
              ICD-10: {paData.order.icd10Codes.join(", ")}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Payer</div>
            <div className="text-base font-medium text-gray-900">
              {paData.payer.name}
            </div>
            <div className="text-sm text-gray-600">{paData.payer.planType}</div>
            <div className="text-sm text-gray-600">
              Provider: {paData.order.orderingProvider}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      activeTab === tab.id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Request Information
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      PA Request #
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">{paData.id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Status
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.status.replace("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.createdDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Submitted Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.submittedDate || "Not yet submitted"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Organization
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.organization.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Org NPI
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.organization.npi}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Order Details
                </h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Modality / Body Part
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.order.modality} - {paData.order.bodyPart}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Order Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.order.orderDate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Ordering Provider
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.order.orderingProvider}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Provider NPI
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {paData.order.orderingProviderNPI}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === "checklist" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Requirements Checklist
                </h3>
                <button
                  onClick={handleGenerateChecklist}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  🤖 Regenerate with LLM
                </button>
              </div>

              <div className="space-y-3">
                {paData.checklist.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg ${CHECKLIST_STATUS_COLORS[item.status as keyof typeof CHECKLIST_STATUS_COLORS]}`}
                          >
                            {item.status === "met"
                              ? "✓"
                              : item.status === "waived"
                                ? "○"
                                : "✗"}
                          </span>
                          <h4 className="text-sm font-medium text-gray-900">
                            {item.requirement}
                          </h4>
                        </div>
                        {item.notes && (
                          <p className="mt-1 ml-7 text-sm text-gray-600">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <select
                        value={item.status}
                        className="ml-4 text-sm border-gray-300 rounded-md"
                        disabled={!isEditing}
                      >
                        <option value="not_met">Not Met</option>
                        <option value="met">Met</option>
                        <option value="waived">Waived</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Complete all checklist items before submitting. Use the
                      LLM to regenerate checklist based on latest payer
                      policies.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Medical Necessity Tab */}
          {activeTab === "medical-necessity" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Medical Necessity Summary
                </h3>
                <button
                  onClick={handleGenerateMedicalNecessity}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  🤖 Generate with LLM
                </button>
              </div>

              {paData.medicalNecessity.summary ? (
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                      {paData.medicalNecessity.summary}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Generated: {paData.medicalNecessity.generatedDate} |
                    Version: {paData.medicalNecessity.version}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No medical necessity summary
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Generate a clinical narrative using our AI assistant
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={handleGenerateMedicalNecessity}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Generate Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === "attachments" && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attached Documents
                </h3>
                <button className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                  📎 Upload Document
                </button>
              </div>

              {paData.attachments.length > 0 ? (
                <div className="space-y-3">
                  {paData.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <svg
                            className="h-8 w-8 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {attachment.filename}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {attachment.fileType.replace("_", " ")} •{" "}
                              {attachment.size} • Uploaded{" "}
                              {attachment.uploadedDate} by{" "}
                              {attachment.uploadedBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-sm text-blue-600 hover:text-blue-800">
                            Download
                          </button>
                          <button className="text-sm text-red-600 hover:text-red-800">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No attachments
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload clinical notes, imaging reports, and other documents
                  </p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Activity History
              </h3>

              <div className="flow-root">
                <ul className="-mb-8">
                  {paData.history.map((event, eventIdx) => (
                    <li key={event.id}>
                      <div className="relative pb-8">
                        {eventIdx !== paData.history.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <svg
                                className="h-5 w-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {event.action}
                              </p>
                              <p className="text-sm text-gray-500">
                                {event.details}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                by {event.user}
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              {event.date}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
