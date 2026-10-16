/** openPoseCanvas — the COCO-18 stick-figure renderer (pure DOM canvas,
 * ex-lib/text-to-pose). Fetch-free by law. */
/**
 * Render COCO-18 keypoints as an OpenPose-style stick figure on a canvas.
 * Returns a PNG Blob.
 *
 * @param keypoints Flat array of 54 numbers (18 joints × [x, y, confidence])
 * @param opts width, height, background, lineWidth, pointRadius
 */
export declare function renderOpenPoseCanvas(keypoints: number[], opts?: {
    width?: number;
    height?: number;
    background?: string | "transparent";
    lineWidth?: number;
    pointRadius?: number;
}): Blob;
//# sourceMappingURL=openPoseCanvas.d.ts.map
