/** openPoseCanvas — the COCO-18 stick-figure renderer (pure DOM canvas,
 * ex-lib/text-to-pose). Fetch-free by law. */
// ── OpenPose canvas renderer ──────────────────────────────────────────────
// Draws the COCO-18 stick figure on a 2D canvas with standard OpenPose colors.
// Used for "OpenPose mode" export — alternative to the 3D mesh render.
const OPENPOSE_SKELETON = [
    // Limbs (purple/pink)
    [0, 1], [0, 14], [0, 15], [1, 2], [1, 5],
    [2, 3], [3, 4], [5, 6], [6, 7],
    [8, 9], [9, 10], [11, 12], [12, 13],
    [14, 16], [15, 17],
    // Body trunk
    [1, 8], [1, 11], [8, 11],
];
const OPENPOSE_COLORS = [
    "#8B00FF", "#FF6B00", "#00FF6B", "#FFFF00", "#FFFFFF",
];
/**
 * Render COCO-18 keypoints as an OpenPose-style stick figure on a canvas.
 * Returns a PNG Blob.
 *
 * @param keypoints Flat array of 54 numbers (18 joints × [x, y, confidence])
 * @param opts width, height, background, lineWidth, pointRadius
 */
export function renderOpenPoseCanvas(keypoints, opts = {}) {
    const w = opts.width ?? 1024;
    const h = opts.height ?? 1024;
    const bg = opts.background ?? "transparent";
    const lw = opts.lineWidth ?? 4;
    const pr = opts.pointRadius ?? 5;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // Background
    if (bg === "transparent") {
        ctx.clearRect(0, 0, w, h);
    }
    else {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
    }
    // Extract joint positions (keypoints are normalized 0..1 in SOMA space)
    // pose-transforms renderCustomPose sends raw flat keypoints where
    // x,y are in pixel coords already (1024×1024 space).
    const pts = [];
    for (let i = 0; i < 18; i++) {
        const x = keypoints[i * 3];
        const y = keypoints[i * 3 + 1];
        const c = keypoints[i * 3 + 2];
        pts.push({
            x: typeof x === "number" && isFinite(x) ? (x / 1024) * w : -9999,
            y: typeof y === "number" && isFinite(y) ? (y / 1024) * h : -9999,
            c: typeof c === "number" ? c : 0,
        });
    }
    // Draw limbs
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    OPENPOSE_SKELETON.forEach(([a, b], idx) => {
        const pa = pts[a], pb = pts[b];
        if (pa.c < 0.1 || pb.c < 0.1)
            return;
        if (pa.x < 0 || pb.x < 0)
            return;
        ctx.strokeStyle = OPENPOSE_COLORS[idx % OPENPOSE_COLORS.length];
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
    });
    // Draw joints
    pts.forEach((p) => {
        if (p.c < 0.1 || p.x < 0)
            return;
        ctx.fillStyle = "#00FFFF";
        ctx.beginPath();
        ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
        ctx.fill();
    });
    // Return as blob (sync via toBlob needs callback, but we can use dataURL)
    const dataUrl = canvas.toDataURL("image/png");
    const bin = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: "image/png" });
}
//# sourceMappingURL=openPoseCanvas.js.map
