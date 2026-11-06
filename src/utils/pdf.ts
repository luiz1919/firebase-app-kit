// Text-only PDF 1.4 documents with no dependencies: the standard Helvetica fonts (no need to embed
// them) and WinAnsi encoding (accents, ñ and €). Enough for simple A4 reports: lines of text,
// right-aligned values, horizontal rules, automatic page breaks and a footer on every page.

export interface PdfTextStyle {
  bold?: boolean
  gray?: boolean
  /** Indent in points from the left margin. */
  indent?: number
}

export interface PdfDocumentOptions {
  /** Margin on every side, in points (default 50). */
  margin?: number
  /** Space kept free above the bottom margin for the footer, in points (default 40). */
  footerSpace?: number
}

export interface PdfInfo {
  title: string
  /** App that generated the file (PDF metadata). */
  producer?: string
}

const A4_WIDTH = 595.28 // points
const A4_HEIGHT = 841.89
/** Footer baseline, in points from the bottom edge. */
const FOOTER_Y = 30

// Helvetica widths in thousandths of the font size, for line wrapping and right alignment.
const WIDTH_GROUPS: [string, number][] = [
  ["'", 191],
  ['ijl', 222],
  [' !,./:;I[]\\ft·', 278],
  ['()-r¡', 333],
  ['"', 355],
  ['º', 365],
  ['•', 350],
  ['ª', 370],
  ['*', 389],
  ['Jcksvxyz', 500],
  ['0123456789#$?_abdeghnopquL€«»', 556],
  ['+<=>', 584],
  ['FTZ¿', 611],
  ['&ABEKPSVXY', 667],
  ['CDHNRUw', 722],
  ['GOQ', 778],
  ['Mm', 833],
  ['%', 889],
  ['W', 944],
  ['@', 1015],
]
const WIDTHS = new Map(WIDTH_GROUPS.flatMap(([chars, width]) => [...chars].map((char) => [char, width])))
// Bold is slightly wider: a safety margin is used instead of a second table.
const BOLD_FACTOR = 1.1

/** Approximate width of a text in Helvetica, in points. */
export function pdfTextWidth(text: string, size: number, bold = false): number {
  let units = 0
  for (const char of text) units += WIDTHS.get(char.normalize('NFD')[0]) ?? 556
  return ((units * size) / 1000) * (bold ? BOLD_FACTOR : 1)
}

// Characters outside Latin-1 that do exist in WinAnsi.
const WIN_ANSI_EXTRA: Record<string, number> = {
  '€': 0x80,
  '…': 0x85,
  '•': 0x95,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '–': 0x96,
  '—': 0x97,
  '−': 0x2d,
}

/** Text in WinAnsi (one byte per character), escaped for a PDF string. */
function encodeText(text: string): string {
  let out = ''
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0x3f
    let byte = 0x3f // '?' for anything that cannot be represented
    if (code < 0x20 || code === 0x202f || code === 0x2009) byte = 0x20
    else if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) byte = code
    else if (WIN_ANSI_EXTRA[char] !== undefined) byte = WIN_ANSI_EXTRA[char]
    const encoded = String.fromCharCode(byte)
    out += encoded === '(' || encoded === ')' || encoded === '\\' ? `\\${encoded}` : encoded
  }
  return out
}

/** Splits a text into lines that fit in `maxWidth` points; keeps existing line breaks. */
export function wrapPdfText(text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word
      if (pdfTextWidth(candidate, size) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      // A word longer than the line is split by characters.
      let rest = word
      while (pdfTextWidth(rest, size) > maxWidth) {
        let cut = rest.length - 1
        while (cut > 1 && pdfTextWidth(rest.slice(0, cut), size) > maxWidth) cut -= 1
        lines.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    lines.push(line)
  }
  return lines
}

function textOp(value: string, x: number, y: number, size: number, { bold, gray }: PdfTextStyle = {}) {
  const color = gray ? '0.4 g' : '0 g'
  return `${color} BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${encodeText(value)}) Tj ET`
}

/**
 * An A4 document written top to bottom with a vertical cursor: each line moves the cursor down by
 * its `gap` and is written at that height, starting a new page when it does not fit.
 */
export class PdfDocument {
  readonly width = A4_WIDTH
  readonly height = A4_HEIGHT
  readonly margin: number
  readonly footerSpace: number
  /** Current cursor height, in points from the bottom edge. */
  y = 0
  private readonly pages: string[][] = []
  private ops: string[] = []

  constructor({ margin = 50, footerSpace = 40 }: PdfDocumentOptions = {}) {
    this.margin = margin
    this.footerSpace = footerSpace
    this.addPage()
  }

  /** Width between the left and right margins. */
  get contentWidth(): number {
    return this.width - 2 * this.margin
  }

  /** Right margin position: the default edge for right-aligned text. */
  get rightEdge(): number {
    return this.width - this.margin
  }

  /** Tallest block that fits on one page. */
  get pageContentHeight(): number {
    return this.height - 2 * this.margin - this.footerSpace
  }

  get pageCount(): number {
    return this.pages.length
  }

  private addPage() {
    this.ops = []
    this.pages.push(this.ops)
    this.y = this.height - this.margin
  }

  /** Starts a new page if `height` more points do not fit on this one. */
  ensure(height: number): void {
    if (this.y - height < this.margin + this.footerSpace) this.addPage()
  }

  /** Moves the cursor down `gap` points and writes a line there. */
  line(value: string, size: number, gap: number, style: PdfTextStyle = {}): void {
    this.ensure(gap)
    this.y -= gap
    this.ops.push(textOp(value, this.margin + (style.indent ?? 0), this.y, size, style))
  }

  /** Writes right-aligned at `rightX`, at the same height as the last line. */
  right(value: string, rightX: number, size: number, style: PdfTextStyle = {}): void {
    this.ops.push(textOp(value, rightX - pdfTextWidth(value, size, style.bold), this.y, size, style))
  }

  /** Moves the cursor down `gap` points and draws a light gray line across the page there. */
  rule(gap: number): void {
    this.ensure(gap)
    this.y -= gap
    const y = this.y.toFixed(2)
    this.ops.push(`0.8 G 0.5 w ${this.margin} ${y} m ${this.width - this.margin} ${y} l S`)
  }

  /**
   * Writes a footer on every page: `left` on the left and, on the right, the page number
   * ("Página 1 de 3" unless `right` says otherwise). Call it once, after all the content.
   */
  footer(left: string, right = (page: number, total: number) => `Página ${page} de ${total}`, size = 8): void {
    const total = this.pages.length
    this.pages.forEach((ops, index) => {
      const label = right(index + 1, total)
      ops.push(textOp(left, this.margin, FOOTER_Y, size, { gray: true }))
      ops.push(textOp(label, this.rightEdge - pdfTextWidth(label, size), FOOTER_Y, size, { gray: true }))
    })
  }

  /** The finished PDF file. */
  toBytes({ title, producer }: PdfInfo): Uint8Array<ArrayBuffer> {
    const objects: string[] = []
    const pageId = (index: number) => 5 + index * 2
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
    objects[2] = `<< /Type /Pages /Kids [${this.pages.map((_, index) => `${pageId(index)} 0 R`).join(' ')}] /Count ${this.pages.length} >>`
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    this.pages.forEach((ops, index) => {
      const content = ops.join('\n')
      objects[pageId(index)] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId(index) + 1} 0 R >>`
      objects[pageId(index) + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    })
    const infoId = objects.length
    objects[infoId] = `<< /Title (${encodeText(title)})${producer ? ` /Producer (${encodeText(producer)})` : ''} >>`

    // Everything is one-byte-per-character text, so the string length is the byte offset.
    let out = '%PDF-1.4\n%âãÏÓ\n'
    const offsets: number[] = []
    for (let id = 1; id < objects.length; id += 1) {
      offsets[id] = out.length
      out += `${id} 0 obj\n${objects[id]}\nendobj\n`
    }
    const xrefOffset = out.length
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
    for (let id = 1; id < objects.length; id += 1) out += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    return Uint8Array.from(out, (char) => char.charCodeAt(0))
  }
}
