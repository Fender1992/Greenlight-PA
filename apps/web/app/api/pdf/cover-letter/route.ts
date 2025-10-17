/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PDF Cover Letter | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, supabase } from "@greenlight/db";
import { generateCoverLetter, type CoverLetterData } from "@greenlight/pdfkit";

/**
 * POST /api/pdf/cover-letter
 * Generate cover letter PDF for a PA request
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
        payer:payer_id(*)
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

    // Fetch attachments
    const { data: attachments } = await supabase
      .from("attachment")
      .select("id, type, storage_path")
      .eq("org_id", paRequest.org_id);

    // Prepare cover letter data
    const coverLetterData: CoverLetterData = {
      orgName: org.name,
      orgAddress: org.address || "Address not provided",
      orgPhone: undefined,
      orgFax: undefined,

      payerName: payer.name,
      payerAddress: undefined,

      patientName: patient.name,
      patientDOB: new Date(patient.dob).toLocaleDateString(),
      patientMemberID: "Protected", // In real app, get from coverage table

      providerName: provider.name,
      providerNPI: provider.npi,
      providerSpecialty: provider.specialty,

      paRequestNumber: paRequest.id.slice(0, 8).toUpperCase(),
      submissionDate: paRequest.submitted_at
        ? new Date(paRequest.submitted_at).toLocaleDateString()
        : new Date().toLocaleDateString(),
      modality: order.modality,
      cptCodes: order.cpt_codes || [],
      icd10Codes: order.icd10_codes || [],
      priority: paRequest.priority,

      attachments:
        attachments?.map((att) => ({
          name: att.storage_path.split("/").pop() || "Attachment",
          type: att.type,
        })) || [],
    };

    // Generate PDF
    const result = await generateCoverLetter(coverLetterData);

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
        "Content-Disposition": `attachment; filename="PA_Cover_Letter_${coverLetterData.paRequestNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Cover letter PDF generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
