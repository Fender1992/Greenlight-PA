# @greenlight/pdfkit

PDF generation package for Greenlight PA - create professional PDFs for prior authorization documents.

## Features

- Cover letter generation for PA submissions
- Approval/denial summary documents
- Professional formatting with headers, footers, tables
- Dynamic content rendering
- Type-safe template data
- Ready-to-print PDF output

## Setup

### Prerequisites

- Node.js 20+
- PDFKit library (already installed)

### Installation

```bash
npm install
```

## Usage

### Generate Cover Letter

```typescript
import { generateCoverLetter, type CoverLetterData } from "@greenlight/pdfkit";

const data: CoverLetterData = {
  orgName: "Downtown Medical Center",
  orgAddress: "123 Main St, Anytown, ST 12345",
  orgPhone: "(555) 123-4567",

  payerName: "Blue Cross Blue Shield",

  patientName: "Smith, John",
  patientDOB: "01/15/1975",
  patientMemberID: "BC123456789",

  providerName: "Dr. Jane Doe",
  providerNPI: "1234567890",
  providerSpecialty: "Radiology",

  paRequestNumber: "PA-2025-001",
  submissionDate: "10/17/2025",
  modality: "MRI Brain with and without contrast",
  cptCodes: ["70553"],
  icd10Codes: ["G89.29", "R51"],
  priority: "standard",

  attachments: [
    { name: "Clinical_Notes.pdf", type: "notes" },
    { name: "Prior_Imaging.pdf", type: "imaging" },
  ],
};

const result = await generateCoverLetter(data);

if (result.success) {
  // result.buffer contains the PDF
  console.log("PDF generated successfully");
} else {
  console.error("Error:", result.error);
}
```

### Generate Approval Summary

```typescript
import {
  generateApprovalSummary,
  type ApprovalSummaryData,
} from "@greenlight/pdfkit";

const data: ApprovalSummaryData = {
  paRequestNumber: "PA-2025-001",
  status: "approved",
  statusDate: "10/20/2025",
  submissionDate: "10/17/2025",

  orgName: "Downtown Medical Center",

  patientName: "Smith, John",
  patientMemberID: "BC123456789",

  payerName: "Blue Cross Blue Shield",
  authorizationNumber: "AUTH-20251020-001",
  validFrom: "10/20/2025",
  validTo: "01/20/2026",

  modality: "MRI Brain with and without contrast",
  cptCodes: ["70553"],
  icd10Codes: ["G89.29", "R51"],

  providerName: "Dr. Jane Doe",
  providerNPI: "1234567890",

  decision: {
    approvedUnits: 1,
    additionalInfo: "All requirements met. Authorization granted.",
    reviewerNotes: "Reviewed per payer medical policy.",
  },

  checklistItems: [
    { requirement: "Clinical notes", status: "met" },
    { requirement: "Prior imaging reports", status: "met" },
    { requirement: "Lab results", status: "waived" },
  ],
};

const result = await generateApprovalSummary(data);

if (result.success) {
  // result.buffer contains the PDF
  console.log("PDF generated successfully");
}
```

## API Integration

### Cover Letter Endpoint

```bash
POST /api/pdf/cover-letter
Content-Type: application/json
Authorization: Bearer <token>

{
  "pa_request_id": "uuid-here"
}
```

Returns: PDF file (application/pdf)

### Approval Summary Endpoint

```bash
POST /api/pdf/approval-summary
Content-Type: application/json
Authorization: Bearer <token>

{
  "pa_request_id": "uuid-here"
}
```

Returns: PDF file (application/pdf)

## Template Features

### Cover Letter

- Professional header with org logo (placeholder)
- Payer and provider information
- Patient demographics (de-identified for demo)
- Requested service details (CPT/ICD codes)
- Medical necessity statement
- Attached documents list
- Provider signature block
- Page numbering and footer

### Approval Summary

- Status badge (approved/denied/pending)
- Color-coded indicators
- Summary information table
- Patient and provider details
- Service authorization details
- Decision rationale
- Requirements checklist
- Next steps (for denials/pending)
- Professional footer

## Customization

### Core Utilities

The package provides low-level utilities for custom PDF generation:

```typescript
import {
  createPDF,
  pdfToBuffer,
  addHeader,
  addSection,
  addTable,
  addList,
  addFooter,
} from "@greenlight/pdfkit";

// Create custom PDF
const doc = createPDF({ title: "Custom Document" });

addHeader(doc, "My Title", "Subtitle");
addSection(doc, "Section 1", "Content here...");
addTable(
  doc,
  ["Column 1", "Column 2"],
  [
    ["Row 1", "Data"],
    ["Row 2", "More data"],
  ]
);
addList(doc, ["Item 1", "Item 2", "Item 3"]);
addFooter(doc, "My Organization", true);

const buffer = await pdfToBuffer(doc);
```

## Testing

```bash
npm run test
```

Tests verify:

- PDF document creation
- Buffer conversion
- Header/section rendering
- Table generation
- Empty document handling

### Manual Testing

1. Call PDF API endpoint with valid PA request ID
2. Download generated PDF
3. Open in PDF viewer
4. Verify:
   - All data populated correctly
   - Professional formatting
   - Multi-page layout (if applicable)
   - Footer on all pages
   - No layout issues

## Design Decisions

### Layout

- **Size**: Letter (8.5" x 11")
- **Margins**: 1 inch all sides (72 points)
- **Fonts**: Helvetica (standard PDF font, no embedding needed)
- **Colors**: Professional blue (#4A90E2) for headers, red (#d32f2f) for urgent/denied
- **Line spacing**: Optimized for readability

### Content Structure

**Cover Letter**:

1. Header with PA number
2. Date
3. To/From sections
4. Priority indicator (if urgent)
5. Patient information
6. Provider information
7. Requested service
8. Medical necessity statement
9. Attached documents
10. Certification and signature
11. Footer

**Approval Summary**:

1. Header with status badge
2. Summary information table
3. Patient & provider table
4. Service details
5. Decision explanation
6. Requirements checklist
7. Next steps (context-dependent)
8. Footer

## Troubleshooting

### "Buffer is empty"

Ensure `doc.end()` is called before converting to buffer (handled automatically by `pdfToBuffer`).

### "Layout issues"

Check that `doc.y` is monitored for page breaks. Use `doc.addPage()` when needed.

### "Missing fonts"

PDFKit includes standard PDF fonts. Custom fonts require font files and embedding.

### "Large file sizes"

Avoid embedding images unless necessary. Use vector graphics or reduce image quality.

## Future Enhancements

1. **Logo Support**: Add org logo to header
2. **Custom Branding**: Configurable colors and fonts per organization
3. **Attachments**: Embed referenced documents in PDF
4. **E-Signature**: Digital signature support
5. **Internationalization**: Multi-language support
6. **Templates**: Additional document types (appeals, addendums)

## Dependencies

- **pdfkit**: ^0.15.1 - PDF generation library
- **@types/pdfkit**: ^0.13.5 - TypeScript types

## Directory Structure

```
packages/pdfkit/
├── generator.ts            # Core PDF utilities
├── templates/
│   ├── cover-letter.ts    # Cover letter generator
│   └── approval-summary.ts # Approval summary generator
├── tests/
│   └── generator.test.ts  # Unit tests
├── index.ts               # Main exports
├── package.json
└── README.md              # This file
```

## References

- PDFKit Documentation: https://pdfkit.org/docs/getting_started.html
- PDF Specification: https://www.adobe.com/devnet/pdf/pdf_reference.html
