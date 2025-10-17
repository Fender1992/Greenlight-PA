/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/pdfkit/generator | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import PDFDocument from "pdfkit";
import { Readable } from "stream";

/**
 * PDF Generation Options
 */
export interface PDFOptions {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
}

/**
 * PDF Generator Result
 */
export interface PDFResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

/**
 * Create a new PDF document
 */
export function createPDF(options: PDFOptions = {}): PDFDocument {
  return new PDFDocument({
    size: "LETTER",
    margins: {
      top: 72, // 1 inch
      bottom: 72,
      left: 72,
      right: 72,
    },
    info: {
      Title: options.title || "Greenlight PA Document",
      Author: options.author || "Greenlight PA System",
      Subject: options.subject,
      Keywords: options.keywords,
      Creator: options.creator || "Greenlight PA",
      CreationDate: new Date(),
    },
  });
}

/**
 * Convert PDF stream to buffer
 */
export async function pdfToBuffer(doc: PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.end();
  });
}

/**
 * Add header to PDF
 */
export function addHeader(
  doc: PDFDocument,
  title: string,
  subtitle?: string
): PDFDocument {
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(title, { align: "center" })
    .moveDown(0.3);

  if (subtitle) {
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#666")
      .text(subtitle, { align: "center" })
      .fillColor("#000");
  }

  doc.moveDown(1.5);

  return doc;
}

/**
 * Add section header
 */
export function addSection(
  doc: PDFDocument,
  title: string,
  content?: string
): PDFDocument {
  // Check if we need a new page
  if (doc.y > 650) {
    doc.addPage();
  }

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title)
    .moveDown(0.5)
    .fontSize(11)
    .font("Helvetica");

  if (content) {
    doc.text(content, { align: "justify" }).moveDown(1);
  }

  return doc;
}

/**
 * Add table to PDF
 */
export function addTable(
  doc: PDFDocument,
  headers: string[],
  rows: string[][]
): PDFDocument {
  const startX = doc.page.margins.left;
  const startY = doc.y;
  const columnWidth =
    (doc.page.width - doc.page.margins.left - doc.page.margins.right) /
    headers.length;
  const rowHeight = 25;

  // Draw headers
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#fff")
    .rect(startX, startY, columnWidth * headers.length, rowHeight)
    .fill("#4A90E2");

  headers.forEach((header, i) => {
    doc
      .fillColor("#fff")
      .text(header, startX + i * columnWidth + 5, startY + 7, {
        width: columnWidth - 10,
        align: "left",
      });
  });

  doc.fillColor("#000");

  // Draw rows
  let currentY = startY + rowHeight;

  rows.forEach((row, rowIndex) => {
    const fillColor = rowIndex % 2 === 0 ? "#f9f9f9" : "#ffffff";

    doc
      .rect(startX, currentY, columnWidth * headers.length, rowHeight)
      .fill(fillColor);

    row.forEach((cell, cellIndex) => {
      doc
        .fillColor("#000")
        .font("Helvetica")
        .text(cell, startX + cellIndex * columnWidth + 5, currentY + 7, {
          width: columnWidth - 10,
          align: "left",
        });
    });

    currentY += rowHeight;
  });

  doc.y = currentY + 10;

  return doc;
}

/**
 * Add footer to all pages
 */
export function addFooter(
  doc: PDFDocument,
  text: string,
  pageNumbering: boolean = true
): PDFDocument {
  const pages = doc.bufferedPageRange();

  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);

    // Footer line
    doc
      .moveTo(doc.page.margins.left, doc.page.height - 50)
      .lineTo(doc.page.width - doc.page.margins.right, doc.page.height - 50)
      .stroke("#ccc");

    // Footer text
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(text, doc.page.margins.left, doc.page.height - 40, {
        align: "left",
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });

    // Page number
    if (pageNumbering) {
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        doc.page.margins.left,
        doc.page.height - 40,
        {
          align: "right",
          width:
            doc.page.width - doc.page.margins.left - doc.page.margins.right,
        }
      );
    }
  }

  doc.fillColor("#000");

  return doc;
}

/**
 * Add formatted list
 */
export function addList(
  doc: PDFDocument,
  items: string[],
  options: { bullet?: string; indent?: number } = {}
): PDFDocument {
  const bullet = options.bullet || "•";
  const indent = options.indent || 20;

  items.forEach((item) => {
    const x = doc.x;
    const y = doc.y;

    // Add bullet
    doc.text(bullet, x, y);

    // Add item text with indent
    doc.text(item, x + indent, y, {
      width:
        doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right -
        indent,
      align: "left",
    });

    doc.moveDown(0.3);
  });

  doc.moveDown(0.7);

  return doc;
}
