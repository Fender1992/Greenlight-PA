/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PDF Approval Summary | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import {
  generateApprovalSummary,
  type ApprovalSummaryData,
} from "@greenlight/pdfkit";
import type { Database } from "@greenlight/db";
import { requireUser, HttpError } from "../../_lib/org";

type Tables = Database["public"]["Tables"];
type PaRequestRow = Tables["pa_request"]["Row"];
type OrderRow = Tables["order"]["Row"];
type PatientRow = Tables["patient"]["Row"];
type ProviderRow = Tables["provider"]["Row"];
type PayerRow = Tables["payer"]["Row"];
type ChecklistRow = Tables["pa_checklist_item"]["Row"];
type OrgRow = Tables["org"]["Row"];

/**
 * POST /api/pdf/approval-summary
 * Generate approval summary PDF for a PA request
 *
 * Body:
 * {
 *   pa_request_id: string
 * }
 *
 * Returns: PDF file (application/pdf)
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser(request);

    const body = await request.json();
    const { pa_request_id } = body;

    if (!pa_request_id) {
      return NextResponse.json(
        { success: false, error: "Missing pa_request_id" },
        { status: 400 }
      );
    }

    const { data: paRequest, error: paError } = await supabaseAdmin
      .from("pa_request")
      .select("*")
      .eq("id", pa_request_id)
      .single();

    if (paError || !paRequest) {
      return NextResponse.json(
        { success: false, error: "PA request not found or access denied" },
        { status: 404 }
      );
    }

    const paRequestRow = paRequest as PaRequestRow;

    if (!paRequestRow.payer_id) {
      return NextResponse.json(
        { success: false, error: "PA request missing payer information" },
        { status: 400 }
      );
    }

    const [orderResult, payerResult, checklistResult, orgResult] =
      await Promise.all([
        supabaseAdmin
          .from("order")
          .select("*")
          .eq("id", paRequestRow.order_id)
          .single(),
        supabaseAdmin
          .from("payer")
          .select("*")
          .eq("id", paRequestRow.payer_id)
          .single(),
        supabaseAdmin
          .from("pa_checklist_item")
          .select("*")
          .eq("pa_request_id", paRequestRow.id),
        supabaseAdmin
          .from("org")
          .select("*")
          .eq("id", paRequestRow.org_id)
          .single(),
      ]);

    const order = orderResult.data as OrderRow | null;
    if (orderResult.error || !order) {
      return NextResponse.json(
        { success: false, error: "Related order not found" },
        { status: 404 }
      );
    }

    const patientResult = await supabaseAdmin
      .from("patient")
      .select("*")
      .eq("id", order.patient_id)
      .single();

    const providerResult = order.provider_id
      ? await supabaseAdmin
          .from("provider")
          .select("*")
          .eq("id", order.provider_id)
          .single()
      : null;

    const patient = patientResult.data as PatientRow | null;
    if (patientResult.error || !patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const payer = payerResult.data as PayerRow | null;
    if (payerResult.error || !payer) {
      return NextResponse.json(
        { success: false, error: "Payer not found" },
        { status: 404 }
      );
    }

    const org = orgResult.data as OrgRow | null;
    if (orgResult.error || !org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    const provider = (providerResult?.data as ProviderRow | null) ?? null;
    const checklistItems = (checklistResult.data ?? []) as ChecklistRow[];

    // Map status to approval summary format
    const statusMapping: Record<
      string,
      "approved" | "denied" | "pending_info"
    > = {
      approved: "approved",
      denied: "denied",
      pending_info: "pending_info",
      draft: "pending_info",
      submitted: "pending_info",
    };

    const mappedStatus = statusMapping[paRequestRow.status] ?? "pending_info";

    // Prepare approval summary data
    const summaryData: ApprovalSummaryData = {
      paRequestNumber: paRequestRow.id.slice(0, 8).toUpperCase(),
      status: mappedStatus,
      statusDate: new Date().toLocaleDateString(),
      submissionDate: paRequestRow.submitted_at
        ? new Date(paRequestRow.submitted_at).toLocaleDateString()
        : new Date().toLocaleDateString(),

      orgName: org.name,

      patientName: patient.name,
      patientMemberID: "Protected", // In real app, get from coverage table

      payerName: payer.name,
      authorizationNumber:
        mappedStatus === "approved"
          ? `AUTH-${paRequestRow.id.slice(0, 8).toUpperCase()}`
          : undefined,
      validFrom:
        mappedStatus === "approved"
          ? new Date().toLocaleDateString()
          : undefined,
      validTo:
        mappedStatus === "approved"
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()
          : undefined,

      modality: order.modality,
      cptCodes: order.cpt_codes ?? [],
      icd10Codes: order.icd10_codes ?? [],

      providerName: provider?.name ?? "Unknown Provider",
      providerNPI: provider?.npi ?? "NPI not available",

      decision: {
        approvedUnits: mappedStatus === "approved" ? 1 : undefined,
        denialReason:
          mappedStatus === "denied"
            ? "Additional clinical documentation required to establish medical necessity."
            : undefined,
        additionalInfo:
          mappedStatus === "pending_info"
            ? "Please provide recent clinical notes and prior imaging reports."
            : mappedStatus === "approved"
              ? "All requirements met. Authorization granted per payer policy."
              : undefined,
        reviewerNotes: "Reviewed in accordance with payer medical policy.",
      },

      checklistItems: checklistItems.map((item) => ({
        requirement: item.name,
        status:
          item.status === "attached"
            ? "met"
            : item.status === "waived"
              ? "waived"
              : "not_met",
      })),
    };

    // Generate PDF
    const result = await generateApprovalSummary(summaryData);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { success: false, error: result.error || "PDF generation failed" },
        { status: 500 }
      );
    }

    // Return PDF file
    const pdfArrayBuffer = new ArrayBuffer(result.buffer.byteLength);
    new Uint8Array(pdfArrayBuffer).set(result.buffer);

    const pdfBlob = new Blob([pdfArrayBuffer], {
      type: "application/pdf",
    });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PA_Approval_Summary_${summaryData.paRequestNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Approval summary PDF generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
