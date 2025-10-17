/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PDF Approval Summary | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, supabase } from "@greenlight/db";
import {
  generateApprovalSummary,
  type ApprovalSummaryData,
} from "@greenlight/pdfkit";

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pa_request_id } = body;

    if (!pa_request_id) {
      return NextResponse.json(
        { success: false, error: "Missing pa_request_id" },
        { status: 400 }
      );
    }

    // Fetch PA request with all related data
    const { data: paRequest, error: paError } = await supabase
      .from("pa_request")
      .select(
        `
        *,
        order:order_id(
          *,
          patient:patient_id(*),
          provider:provider_id(*)
        ),
        payer:payer_id(*),
        checklist_items:pa_checklist_item(*)
      `
      )
      .eq("id", pa_request_id)
      .single();

    if (paError || !paRequest) {
      return NextResponse.json(
        { success: false, error: "PA request not found or access denied" },
        { status: 404 }
      );
    }

    const order = paRequest.order as any;
    const patient = order.patient as any;
    const provider = order.provider as any;
    const payer = paRequest.payer as any;
    const checklistItems = (paRequest.checklist_items as any[]) || [];

    // Fetch organization
    const { data: org } = await supabase
      .from("org")
      .select("*")
      .eq("id", paRequest.org_id)
      .single();

    if (!org) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

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

    const mappedStatus = statusMapping[paRequest.status] || "pending_info";

    // Prepare approval summary data
    const summaryData: ApprovalSummaryData = {
      paRequestNumber: paRequest.id.slice(0, 8).toUpperCase(),
      status: mappedStatus,
      statusDate: new Date().toLocaleDateString(),
      submissionDate: paRequest.submitted_at
        ? new Date(paRequest.submitted_at).toLocaleDateString()
        : new Date().toLocaleDateString(),

      orgName: org.name,

      patientName: patient.name,
      patientMemberID: "Protected", // In real app, get from coverage table

      payerName: payer.name,
      authorizationNumber:
        mappedStatus === "approved"
          ? `AUTH-${paRequest.id.slice(0, 8).toUpperCase()}`
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
      cptCodes: order.cpt_codes || [],
      icd10Codes: order.icd10_codes || [],

      providerName: provider.name,
      providerNPI: provider.npi,

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
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PA_Approval_Summary_${summaryData.paRequestNumber}.pdf"`,
      },
    });
  } catch (error) {
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
