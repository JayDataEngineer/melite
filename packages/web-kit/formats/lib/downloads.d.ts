/** downloads - browser download triggers for pose artifacts
 * (ex-lib/text-to-pose export helpers). */
import type { PoseMotion } from "./textToPose.js";
/**
 * Trigger a browser download from a base64-encoded payload.
 * Mirrors Kimodo demo's _download_bytes_to_browser (ui.py).
 */
export declare function downloadBase64Payload(b64: string, filename: string, mimeType?: string): void;
/**
 * Download the SOMA-77 motion as an .npz file (poses + rotmats + deformed verts).
 */
export declare function downloadMotionNpz(motion: PoseMotion, filename?: string): void;
/**
 * Capture the largest <canvas> on the page as a PNG download.
 * Used for screenshots of the 3D viewer.
 */
export declare function downloadCanvasScreenshot(filename?: string): void;
//# sourceMappingURL=downloads.d.ts.map