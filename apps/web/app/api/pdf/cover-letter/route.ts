/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PDF Cover Letter | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { generateCoverLetter, type CoverLetterData } from "@greenlight/pdfkit";
import type { Database } from "@greenlight/db";
import { requireUser, HttpError } from "../../_lib/org";

type Tables = Database["public"]["Tables"];
type PaRequestRow = Tables["pa_request"]["Row"];
type OrderRow = Tables["order"]["Row"];
type PatientRow = Tables["patient"]["Row"];
type ProviderRow = Tables["provider"]["Row"];
type PayerRow = Tables["payer"]["Row"];
type OrgRow = Tables["org"]["Row"];
type AttachmentRow = Tables["attachment"]["Row"];

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

    const [orderResult, payerResult, orgResult] = await Promise.all([
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

    const { data: attachments } = await supabaseAdmin
      .from("attachment")
      .select("id, type, storage_path")
      .eq("org_id", paRequestRow.org_id);

    const normalizedPriority: CoverLetterData["priority"] =
      paRequestRow.priority === "urgent" ? "urgent" : "standard";

    // Prepare cover letter data
    const coverLetterData: CoverLetterData = {
      orgName: org.name,
      orgAddress: org.address || "Address not provided",
      orgPhone: undefined,
      orgFax: undefined,

      payerName: payer.name,
      payerAddress: undefined,

      patientName: patient.name,
      patientDOB: patient.dob
        ? new Date(patient.dob).toLocaleDateString()
        : "Not provided",
      patientMemberID: "Protected", // In real app, get from coverage table

      providerName: provider?.name ?? "Unknown Provider",
      providerNPI: provider?.npi ?? "NPI not available",
      providerSpecialty: provider?.specialty ?? undefined,

      paRequestNumber: paRequestRow.id.slice(0, 8).toUpperCase(),
      submissionDate: paRequestRow.submitted_at
        ? new Date(paRequestRow.submitted_at).toLocaleDateString()
        : new Date().toLocaleDateString(),
      modality: order.modality,
      cptCodes: order.cpt_codes ?? [],
      icd10Codes: order.icd10_codes ?? [],
      priority: normalizedPriority,

      attachments:
        attachments?.map((att) => {
          const attachment = att as Pick<
            AttachmentRow,
            "storage_path" | "type"
          >;
          return {
            name: attachment.storage_path.split("/").pop() || "Attachment",
            type: attachment.type,
          };
        }) ?? [],
    };

    const result = await generateCoverLetter(coverLetterData);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { success: false, error: result.error || "PDF generation failed" },
        { status: 500 }
      );
    }

    const pdfArrayBuffer = new ArrayBuffer(result.buffer.byteLength);
    new Uint8Array(pdfArrayBuffer).set(result.buffer);

    const pdfBlob = new Blob([pdfArrayBuffer], {
      type: "application/pdf",
    });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PA_Cover_Letter_${coverLetterData.paRequestNumber}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

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
