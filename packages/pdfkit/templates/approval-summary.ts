/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/pdfkit/templates/approval-summary | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import {
  createPDF,
  pdfToBuffer,
  addHeader,
  addSection,
  addTable,
  addFooter,
  type PDFResult,
} from "../generator";

/**
 * Approval Summary Data
 */
export interface ApprovalSummaryData {
  // PA Request info
  paRequestNumber: string;
  status: "approved" | "denied" | "pending_info";
  statusDate: string;
  submissionDate: string;

  // Organization info
  orgName: string;

  // Patient info (de-identified)
  patientName: string;
  patientMemberID: string;

  // Payer info
  payerName: string;
  authorizationNumber?: string;
  validFrom?: string;
  validTo?: string;

  // Requested service
  modality: string;
  cptCodes: string[];
  icd10Codes: string[];

  // Provider
  providerName: string;
  providerNPI: string;

  // Decision details
  decision: {
    approvedUnits?: number;
    denialReason?: string;
    additionalInfo?: string;
    reviewerNotes?: string;
  };

  // Checklist summary
  checklistItems: Array<{
    requirement: string;
    status: "met" | "not_met" | "waived";
  }>;
}

/**
 * Generate Approval Summary PDF
 */
export async function generateApprovalSummary(
  data: ApprovalSummaryData
): Promise<PDFResult> {
  try {
    const doc = createPDF({
      title: `PA Approval Summary - ${data.paRequestNumber}`,
      subject: `Prior Authorization ${data.status.toUpperCase()} for ${data.patientName}`,
      keywords: `PA, Prior Authorization, ${data.status}`,
    });

    // Header with status indicator
    const statusColor =
      data.status === "approved"
        ? "#4CAF50"
        : data.status === "denied"
          ? "#d32f2f"
          : "#FF9800";

    addHeader(
      doc,
      "Prior Authorization Decision",
      `PA #${data.paRequestNumber}`
    );

    // Status badge
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(statusColor)
      .text(data.status.toUpperCase().replace("_", " "), { align: "center" })
      .fillColor("#000")
      .font("Helvetica")
      .moveDown(1.5);

    // Summary Information
    const summaryData = [
      ["PA Request Number", data.paRequestNumber],
      ["Status", data.status.toUpperCase().replace("_", " ")],
      ["Status Date", data.statusDate],
      ["Submission Date", data.submissionDate],
      ["Organization", data.orgName],
    ];

    if (data.authorizationNumber) {
      summaryData.push(["Authorization Number", data.authorizationNumber]);
    }

    if (data.validFrom && data.validTo) {
      summaryData.push([
        "Valid Period",
        `${data.validFrom} to ${data.validTo}`,
      ]);
    }

    addSection(doc, "Summary Information");
    addTable(doc, ["Field", "Value"], summaryData);

    // Patient & Provider Info
    const patientProviderData = [
      ["Patient Name", data.patientName],
      ["Member ID", data.patientMemberID],
      ["Provider", `${data.providerName} (NPI: ${data.providerNPI})`],
      ["Payer", data.payerName],
    ];

    addSection(doc, "Patient & Provider");
    addTable(doc, ["Field", "Value"], patientProviderData);

    // Requested Service
    const serviceData = [
      ["Procedure/Modality", data.modality],
      ["CPT Code(s)", data.cptCodes.join(", ")],
      ["Diagnosis (ICD-10)", data.icd10Codes.join(", ")],
    ];

    if (data.decision.approvedUnits) {
      serviceData.push([
        "Approved Units",
        data.decision.approvedUnits.toString(),
      ]);
    }

    addSection(doc, "Requested Service");
    addTable(doc, ["Field", "Value"], serviceData);

    // Decision Details
    addSection(doc, "Decision Details");

    if (data.status === "approved") {
      doc
        .fontSize(11)
        .fillColor("#2e7d32")
        .text("✓ Authorization APPROVED", { continued: false })
        .fillColor("#000")
        .moveDown(0.5);

      if (data.decision.additionalInfo) {
        doc
          .fontSize(10)
          .text(data.decision.additionalInfo, { align: "justify" })
          .moveDown(1);
      }
    } else if (data.status === "denied") {
      doc
        .fontSize(11)
        .fillColor("#c62828")
        .text("✗ Authorization DENIED", { continued: false })
        .fillColor("#000")
        .moveDown(0.5);

      if (data.decision.denialReason) {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text("Reason for Denial:")
          .font("Helvetica")
          .text(data.decision.denialReason, { align: "justify" })
          .moveDown(1);
      }
    } else {
      doc
        .fontSize(11)
        .fillColor("#e65100")
        .text("⚠ Additional Information Required", { continued: false })
        .fillColor("#000")
        .moveDown(0.5);

      if (data.decision.additionalInfo) {
        doc
          .fontSize(10)
          .text(data.decision.additionalInfo, { align: "justify" })
          .moveDown(1);
      }
    }

    // Reviewer Notes
    if (data.decision.reviewerNotes) {
      doc
        .fontSize(10)
        .font("Helvetica-Oblique")
        .fillColor("#666")
        .text(`Reviewer Notes: ${data.decision.reviewerNotes}`, {
          align: "justify",
        })
        .font("Helvetica")
        .fillColor("#000")
        .moveDown(1);
    }

    // Checklist Summary
    if (data.checklistItems.length > 0) {
      addSection(doc, "Requirements Checklist");

      const checklistData = data.checklistItems.map((item) => [
        item.requirement,
        item.status === "met"
          ? "✓ Met"
          : item.status === "waived"
            ? "○ Waived"
            : "✗ Not Met",
      ]);

      addTable(doc, ["Requirement", "Status"], checklistData);
    }

    // Next Steps (if denied or pending)
    if (data.status === "denied") {
      addSection(
        doc,
        "Next Steps",
        "If you believe this denial was made in error, you may:\n\n" +
          "1. Submit additional clinical documentation\n" +
          "2. File an appeal within 60 days of this decision\n" +
          "3. Contact the payer's Provider Relations department for clarification\n\n" +
          "For assistance with appeals, please contact your Greenlight PA administrator."
      );
    } else if (data.status === "pending_info") {
      addSection(
        doc,
        "Next Steps",
        "Please provide the requested additional information as soon as possible to complete the review process. " +
          "The payer typically requires a response within 10 business days to avoid denial."
      );
    }

    // Footer
    addFooter(
      doc,
      `Generated by Greenlight PA | ${data.orgName} | This is an official summary`,
      true
    );

    // Convert to buffer
    const buffer = await pdfToBuffer(doc);

    return {
      success: true,
      buffer,
    };
  } catch (error) {
    console.error("Approval summary generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF generation failed",
    };
  }
}
