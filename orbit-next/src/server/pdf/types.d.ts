declare module "pdf-lib" {
  export type RGB = {
    red: number;
    green: number;
    blue: number;
  };

  export function rgb(r: number, g: number, b: number): RGB;

  export const StandardFonts: {
    Helvetica: string;
    HelveticaBold: string;
    [key: string]: string;
  };

  export interface DrawTextOptions {
    x: number;
    y: number;
    size?: number;
    font?: PDFFont;
    color?: RGB;
  }

  export interface DrawRectangleOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: RGB;
  }

  export interface DrawLineOptions {
    start: { x: number; y: number };
    end: { x: number; y: number };
    thickness?: number;
    color?: RGB;
  }

  export class PDFFont {
    widthOfTextAtSize(text: string, size: number): number;
  }

  export class PDFPage {
    getWidth(): number;
    getHeight(): number;
    drawText(text: string, options: DrawTextOptions): void;
    drawRectangle(options: DrawRectangleOptions): void;
    drawLine(options: DrawLineOptions): void;
  }

  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    addPage(): PDFPage;
    embedFont(font: string): Promise<PDFFont>;
    save(): Promise<Uint8Array>;
  }
}
