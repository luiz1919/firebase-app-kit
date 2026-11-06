export interface PdfTextStyle {
    bold?: boolean;
    gray?: boolean;
    /** Indent in points from the left margin. */
    indent?: number;
}
export interface PdfDocumentOptions {
    /** Margin on every side, in points (default 50). */
    margin?: number;
    /** Space kept free above the bottom margin for the footer, in points (default 40). */
    footerSpace?: number;
}
export interface PdfInfo {
    title: string;
    /** App that generated the file (PDF metadata). */
    producer?: string;
}
/** Approximate width of a text in Helvetica, in points. */
export declare function pdfTextWidth(text: string, size: number, bold?: boolean): number;
/** Splits a text into lines that fit in `maxWidth` points; keeps existing line breaks. */
export declare function wrapPdfText(text: string, size: number, maxWidth: number): string[];
/**
 * An A4 document written top to bottom with a vertical cursor: each line moves the cursor down by
 * its `gap` and is written at that height, starting a new page when it does not fit.
 */
export declare class PdfDocument {
    readonly width = 595.28;
    readonly height = 841.89;
    readonly margin: number;
    readonly footerSpace: number;
    /** Current cursor height, in points from the bottom edge. */
    y: number;
    private readonly pages;
    private ops;
    constructor({ margin, footerSpace }?: PdfDocumentOptions);
    /** Width between the left and right margins. */
    get contentWidth(): number;
    /** Right margin position: the default edge for right-aligned text. */
    get rightEdge(): number;
    /** Tallest block that fits on one page. */
    get pageContentHeight(): number;
    get pageCount(): number;
    private addPage;
    /** Starts a new page if `height` more points do not fit on this one. */
    ensure(height: number): void;
    /** Moves the cursor down `gap` points and writes a line there. */
    line(value: string, size: number, gap: number, style?: PdfTextStyle): void;
    /** Writes right-aligned at `rightX`, at the same height as the last line. */
    right(value: string, rightX: number, size: number, style?: PdfTextStyle): void;
    /** Moves the cursor down `gap` points and draws a light gray line across the page there. */
    rule(gap: number): void;
    /**
     * Writes a footer on every page: `left` on the left and, on the right, the page number
     * ("Página 1 de 3" unless `right` says otherwise). Call it once, after all the content.
     */
    footer(left: string, right?: (page: number, total: number) => string, size?: number): void;
    /** The finished PDF file. */
    toBytes({ title, producer }: PdfInfo): Uint8Array<ArrayBuffer>;
}
