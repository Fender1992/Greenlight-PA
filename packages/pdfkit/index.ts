/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/pdfkit | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

// Core generator utilities
export {
  createPDF,
  pdfToBuffer,
  addHeader,
  addSection,
  addTable,
  addFooter,
  addList,
  type PDFOptions,
  type PDFResult,
} from "./generator";

// Template generators
export {
  generateCoverLetter,
  type CoverLetterData,
} from "./templates/cover-letter";

export {
  generateApprovalSummary,
  type ApprovalSummaryData,
} from "./templates/approval-summary";
