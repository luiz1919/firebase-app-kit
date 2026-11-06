// Files: attachments (PDFs and photos) and handing generated files to the user. No dependencies.

/**
 * Size of each chunk a file is stored in, in Firestore. A document holds up to 1 MiB: each chunk
 * leaves room for the other fields. Do NOT change: files already stored and the apps' Firestore
 * rules (data.size() <= 768000) depend on this value.
 */
export const CHUNK_BYTES = 750 * 1024

/** Number of chunks for a file of `size` bytes (at least 1). */
export const chunkCountOf = (size: number): number => Math.max(1, Math.ceil(size / CHUNK_BYTES))

export type FileType = 'application/pdf' | 'image/jpeg' | 'image/png'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** File type from its content (not its name), or null if it is not a PDF, JPEG or PNG. */
export function fileTypeOf(bytes: Uint8Array): FileType | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-') return 'application/pdf'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return 'image/png'
  return null
}

/**
 * Reads a file picked by the user. On iOS reading can fail or hang, so it is time-limited and
 * the error includes its technical name to help diagnose it.
 * It must be read before clearing the <input>: on iOS that can invalidate the file.
 */
export async function readFileBytes(file: Blob & { name: string }, timeoutMs = 15_000): Promise<Uint8Array<ArrayBuffer>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DOMException('Timed out', 'TimeoutError')), timeoutMs)
  })
  try {
    return new Uint8Array(await Promise.race([file.arrayBuffer(), timeout]))
  } catch (readError) {
    const reason = readError instanceof Error ? readError.name : 'Error'
    throw new Error(`No se ha podido leer «${file.name}» (${reason}).`)
  } finally {
    clearTimeout(timer)
  }
}

/** Downloads a file generated in the browser. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Phone or tablet (touch screen as the main pointer). */
export const isTouchDevice = (): boolean => window.matchMedia('(pointer: coarse)').matches

/**
 * Safari only opens the Share sheet right after a tap. If there was a wait first (reading chunks,
 * preparing a backup), it throws NotAllowedError: the app must ask for another tap (e.g. a
 * "Ver el archivo" button) and call the function again from it.
 */
export const needsNewTap = (error: unknown): boolean => error instanceof DOMException && error.name === 'NotAllowedError'

/**
 * On mobile, opens the Share sheet (Save to Files, AirDrop...); on desktop, downloads the file.
 * Closing the Share sheet is not an error. Call it straight from a tap (see `needsNewTap`).
 */
export async function shareOrDownload(file: File): Promise<void> {
  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      throw shareError
    }
    return
  }
  downloadBlob(file, file.name)
}

/**
 * Shows a file generated in the browser (a PDF, a photo): on mobile, the Share sheet, which
 * previews it; on desktop, a new tab, or a download if the browser blocks the tab.
 */
export async function openFile(file: File): Promise<void> {
  if (isTouchDevice()) {
    await shareOrDownload(file)
    return
  }
  const url = URL.createObjectURL(file)
  if (!window.open(url, '_blank')) downloadBlob(file, file.name)
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
