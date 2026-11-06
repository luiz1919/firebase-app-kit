import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PdfDocument, pdfTextWidth, wrapPdfText } from '../src/utils/index.ts'

const text = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1')

test('pdfTextWidth uses the Helvetica widths and bold is wider', () => {
  assert.equal(pdfTextWidth('Mi', 10), 10.55)
  assert.equal(pdfTextWidth('á', 10), pdfTextWidth('a', 10))
  assert.ok(pdfTextWidth('Total', 10, true) > pdfTextWidth('Total', 10))
})

test('wrapPdfText fits lines in the width, keeps line breaks and splits long words', () => {
  const lines = wrapPdfText('uno dos tres cuatro cinco seis', 10, 60)
  assert.ok(lines.length > 1)
  assert.equal(lines.join(' '), 'uno dos tres cuatro cinco seis')
  for (const line of lines) assert.ok(pdfTextWidth(line, 10) <= 60)
  assert.deepEqual(wrapPdfText('a\nb\r\nc', 10, 100), ['a', 'b', 'c'])
  assert.deepEqual(wrapPdfText('', 10, 100), [''])
  const long = wrapPdfText('x'.repeat(100), 10, 50)
  assert.equal(long.join(''), 'x'.repeat(100))
  for (const line of long) assert.ok(pdfTextWidth(line, 10) <= 50)
})

test('PdfDocument writes a valid PDF: object offsets, stream lengths and metadata', () => {
  const doc = new PdfDocument()
  doc.line('Informe (2026) \\ prueba', 12, 20, { bold: true })
  doc.right('1.234,56 €', doc.rightEdge, 10)
  doc.rule(8)
  doc.footer('Mi App')
  const pdf = text(doc.toBytes({ title: 'Informe 2026', producer: 'Mi App' }))

  assert.ok(pdf.startsWith('%PDF-1.4\n'))
  assert.ok(pdf.endsWith('%%EOF\n'))
  // Parentheses and backslashes escaped; € as WinAnsi 0x80.
  assert.ok(pdf.includes('(Informe \\(2026\\) \\\\ prueba) Tj'))
  assert.ok(pdf.includes('(1.234,56 \u0080) Tj'))
  assert.ok(pdf.includes('(Página 1 de 1) Tj'))
  assert.ok(pdf.includes('<< /Title (Informe 2026) /Producer (Mi App) >>'))

  const startxref = Number(pdf.match(/startxref\n(\d+)\n/)![1])
  assert.ok(pdf.startsWith('xref\n', startxref))
  const entries = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]))
  entries.forEach((offset, index) => assert.ok(pdf.startsWith(`${index + 1} 0 obj\n`, offset), `object ${index + 1}`))
  for (const match of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const start = match.index + match[0].length
    assert.ok(pdf.startsWith('\nendstream', start + Number(match[1])))
  }
})

test('PdfDocument starts new pages and numbers them in the footer', () => {
  const doc = new PdfDocument()
  for (let index = 0; index < 60; index += 1) doc.line(`Línea ${index}`, 10, 14)
  assert.equal(doc.pageCount, 2)
  assert.ok(doc.y >= doc.margin + doc.footerSpace)
  doc.ensure(doc.pageContentHeight)
  assert.equal(doc.pageCount, 3)
  doc.footer('Mi App', (page, total) => `${page}/${total}`)
  const pdf = text(doc.toBytes({ title: 'Prueba' }))
  assert.ok(pdf.includes('/Count 3'))
  assert.ok(pdf.includes('(2/3) Tj'))
  assert.ok(pdf.includes('<< /Title (Prueba) >>'))
})
