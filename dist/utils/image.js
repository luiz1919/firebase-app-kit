// Photos and screenshots picked by the user, shrunk and re-encoded as JPEG in the browser: for the
// AI (smaller uploads, fewer tokens) and for feedback screenshots (one Firestore chunk each).
import { CHUNK_BYTES } from './files.js';
/** Largest side sent to the AI (models downscale bigger images anyway). */
export const MAX_IMAGE_SIDE = 1568;
/** Size that fits within `max` on both sides, keeping the proportions and never enlarging. */
export function fitWithin(width, height, max = MAX_IMAGE_SIDE) {
    const scale = Math.min(1, max / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
const failure = () => new Error('No se ha podido procesar la imagen.');
function encode(canvas, quality) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(failure())), 'image/jpeg', quality));
}
/** The image as a JPEG within `maxSide` and `maxBytes`. Browser only. */
export async function imageToJpeg(file, { maxSide = MAX_IMAGE_SIDE, maxBytes = CHUNK_BYTES, quality = 0.85 } = {}) {
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    }
    catch {
        throw failure();
    }
    try {
        let side = maxSide;
        for (;;) {
            const { width, height } = fitWithin(bitmap.width, bitmap.height, side);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context)
                throw failure();
            // JPEG has no transparency: transparent parts of a PNG would turn black.
            context.fillStyle = '#fff';
            context.fillRect(0, 0, width, height);
            context.drawImage(bitmap, 0, 0, width, height);
            for (let current = quality; current >= 0.45; current -= 0.15) {
                const blob = await encode(canvas, current);
                if (blob.size <= maxBytes)
                    return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
            }
            if (side <= 320)
                throw failure();
            side = Math.round(side * 0.75);
        }
    }
    finally {
        bitmap.close();
    }
}
/** JPEG in base64 (without the data: prefix), ready for the AI. Browser only. */
export async function imageToJpegBase64(file, maxSide = MAX_IMAGE_SIDE) {
    const { bytes } = await imageToJpeg(file, { maxSide, maxBytes: Number.POSITIVE_INFINITY });
    let binary = '';
    for (let start = 0; start < bytes.length; start += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
    return btoa(binary);
}
