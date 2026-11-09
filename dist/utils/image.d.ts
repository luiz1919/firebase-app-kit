/** Largest side sent to the AI (models downscale bigger images anyway). */
export declare const MAX_IMAGE_SIDE = 1568;
/** Size that fits within `max` on both sides, keeping the proportions and never enlarging. */
export declare function fitWithin(width: number, height: number, max?: number): {
    width: number;
    height: number;
};
export interface JpegImage {
    bytes: Uint8Array<ArrayBuffer>;
    width: number;
    height: number;
}
export interface ImageToJpegOptions {
    /** Largest side in pixels (default MAX_IMAGE_SIDE). */
    maxSide?: number;
    /** Largest size in bytes: quality, then size, go down until it fits (default CHUNK_BYTES, one chunk). */
    maxBytes?: number;
    /** Starting JPEG quality, 0-1 (default 0.85). */
    quality?: number;
}
/** The image as a JPEG within `maxSide` and `maxBytes`. Browser only. */
export declare function imageToJpeg(file: Blob, { maxSide, maxBytes, quality }?: ImageToJpegOptions): Promise<JpegImage>;
/** JPEG in base64 (without the data: prefix), ready for the AI. Browser only. */
export declare function imageToJpegBase64(file: Blob, maxSide?: number): Promise<string>;
