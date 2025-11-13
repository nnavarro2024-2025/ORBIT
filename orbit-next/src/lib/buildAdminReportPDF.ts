import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";

type PDFDocInstance = Awaited<ReturnType<typeof PDFDocument.create>>;
type PDFPage = ReturnType<PDFDocInstance["addPage"]>;
type PDFFont = Awaited<ReturnType<PDFDocInstance["embedFont"]>>;

export interface PDFReportSection {
  title: string;
  rows: string[][];
  subtitle?: string;
}

export interface PDFReportInput {
  title: string;
  generatedAt: string;
  sections: PDFReportSection[];
  footer?: string;
}

type PageContext = {
  page: PDFPage;
  cursorY: number;
};

const PAGE_MARGIN = 48;

export async function buildAdminReportPDF(input: PDFReportInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let ctx = createPage(pdfDoc);
  drawTitleBlock(ctx, input, titleFont, bodyFont);

  for (const section of input.sections) {
    ctx = ensureSpace(pdfDoc, ctx, 120);

    ctx.page.drawText(section.title, {
      x: PAGE_MARGIN,
      y: ctx.cursorY,
      size: 16,
      font: titleFont,
      color: rgb(0, 0, 0),
    });

    ctx.cursorY -= 20;

    if (section.subtitle) {
      const subtitleHeight = drawWrappedText(
        ctx.page,
        section.subtitle,
        PAGE_MARGIN,
        ctx.cursorY,
        ctx.page.getWidth() - PAGE_MARGIN * 2,
        11,
        bodyFont,
        rgb(0.4, 0.4, 0.4)
      );
      ctx.cursorY -= subtitleHeight + 12;
    }

    const tableResult = renderTable(pdfDoc, ctx, section.rows, bodyFont, titleFont);
    ctx = tableResult.ctx;
    ctx.cursorY -= tableResult.height + 24;
  }

  if (input.footer) {
    ctx = ensureSpace(pdfDoc, ctx, 80);
    drawWrappedText(
      ctx.page,
      input.footer,
      PAGE_MARGIN,
      ctx.cursorY,
      ctx.page.getWidth() - PAGE_MARGIN * 2,
      10,
      bodyFont,
      rgb(0.4, 0.4, 0.4)
    );
  }

  return pdfDoc.save();
}

function drawTitleBlock(ctx: PageContext, input: PDFReportInput, titleFont: PDFFont, bodyFont: PDFFont) {
  ctx.page.drawText(input.title, {
    x: PAGE_MARGIN,
    y: ctx.cursorY,
    size: 24,
    font: titleFont,
    color: rgb(0.074, 0.294, 0.525),
  });

  ctx.cursorY -= 30;

  ctx.page.drawText(`Generated: ${input.generatedAt}`, {
    x: PAGE_MARGIN,
    y: ctx.cursorY,
    size: 12,
    font: bodyFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  ctx.cursorY -= 24;
}

function ensureSpace(pdfDoc: PDFDocument, ctx: PageContext, requiredHeight: number): PageContext {
  if (ctx.cursorY - requiredHeight > PAGE_MARGIN) {
    return ctx;
  }

  const next = createPage(pdfDoc);

  next.page.drawLine({
    start: { x: PAGE_MARGIN, y: next.page.getHeight() - PAGE_MARGIN + 10 },
    end: { x: next.page.getWidth() - PAGE_MARGIN, y: next.page.getHeight() - PAGE_MARGIN + 10 },
    thickness: 2,
    color: rgb(0.074, 0.294, 0.525),
  });

  next.cursorY -= 24;
  return next;
}

function createPage(pdfDoc: PDFDocument): PageContext {
  const page = pdfDoc.addPage();
  return {
    page,
    cursorY: page.getHeight() - PAGE_MARGIN,
  };
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font: PDFFont,
  color: RGB = rgb(0, 0, 0)
): number {
  const words = text.split(/\s+/);
  let line = "";
  let offsetY = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, size);

    if (textWidth > width && line) {
      page.drawText(line, { x, y: y - offsetY, size, font, color });
      line = word;
      offsetY += size + 4;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, { x, y: y - offsetY, size, font, color });
  }

  return offsetY + size;
}

function renderTable(
  pdfDoc: PDFDocument,
  ctx: PageContext,
  rows: string[][],
  font: PDFFont,
  headerFont: PDFFont
): { ctx: PageContext; height: number } {
  if (rows.length === 0) {
    return { ctx, height: 0 };
  }

  let localCtx = ctx;
  const columnCount = Math.max(rows.reduce((acc, row) => Math.max(acc, row.length), 0), 1);
  const startY = ctx.cursorY;
  let columnWidth = (localCtx.page.getWidth() - PAGE_MARGIN * 2) / columnCount;

  const drawHeader = () => {
    const headerRow = rows[0];
    columnWidth = (localCtx.page.getWidth() - PAGE_MARGIN * 2) / columnCount;

    localCtx.page.drawRectangle({
      x: PAGE_MARGIN,
      y: localCtx.cursorY - 18,
      width: columnCount * columnWidth,
      height: 24,
      color: rgb(0.93, 0.97, 0.99),
    });

    headerRow.forEach((value, idx) => {
      localCtx.page.drawText(value ?? "", {
        x: PAGE_MARGIN + idx * columnWidth + 8,
        y: localCtx.cursorY,
        size: 11,
        font: headerFont,
        color: rgb(0.074, 0.294, 0.525),
      });
    });

    localCtx.cursorY -= 28;
  };

  drawHeader();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    if (localCtx.cursorY < PAGE_MARGIN + 40) {
      localCtx = ensureSpace(pdfDoc, localCtx, 80);
      drawHeader();
    }

    row.forEach((value, idx) => {
      localCtx.page.drawText(value ?? "", {
        x: PAGE_MARGIN + idx * columnWidth + 8,
        y: localCtx.cursorY,
        size: 10,
        font,
        color: rgb(0.16, 0.16, 0.16),
      });
    });

    localCtx.cursorY -= 18;
  }

  return { ctx: localCtx, height: Math.max(0, startY - localCtx.cursorY) };
}
