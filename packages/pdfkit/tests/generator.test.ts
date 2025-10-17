/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Test: PDF Generator | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { describe, it, expect } from "vitest";
import { createPDF, pdfToBuffer, addHeader, addSection } from "../generator";

describe("PDF Generator", () => {
  it("should create a PDF document", () => {
    const doc = createPDF({
      title: "Test Document",
      author: "Test Author",
    });

    expect(doc).toBeDefined();
  });

  it("should convert PDF to buffer", async () => {
    const doc = createPDF();
    doc.text("Hello World");

    const buffer = await pdfToBuffer(doc);

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
    // PDF files start with "%PDF"
    expect(Buffer.from(buffer).toString("utf-8", 0, 4)).toBe("%PDF");
  });

  it("should add header to PDF", async () => {
    const doc = createPDF();
    addHeader(doc, "Test Header", "Test Subtitle");

    const buffer = await pdfToBuffer(doc);

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should add section to PDF", async () => {
    const doc = createPDF();
    addSection(doc, "Test Section", "Test content goes here.");

    const buffer = await pdfToBuffer(doc);

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should handle empty document", async () => {
    const doc = createPDF();
    const buffer = await pdfToBuffer(doc);

    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(0);
  });
});

/**
 * PDF Test Notes:
 *
 * These tests verify basic PDF generation functionality.
 * Full visual testing requires rendering PDFs and checking layout.
 *
 * For manual testing:
 * 1. Generate a test PDF via API
 * 2. Open in PDF viewer
 * 3. Verify formatting, fonts, layout
 * 4. Check multi-page handling
 * 5. Verify footer appears on all pages
 */
