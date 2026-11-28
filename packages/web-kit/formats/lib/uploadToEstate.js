/**
 * uploadToEstate — the ONE browser-file → estate-path rail
 * (2026-09-06).
 *
 * Operator report (verbatim): "Could not read image file: A requested
 * file or directory could not be found…" + "It works for the DSH
 * input box, but you can't make it work?"
 *
 * Root cause: every slot-shaped image input (SlotGrid's slots,
 * InputCardEditor's source) ferried the picked/dropped File through
 * FileReader into the param bag as a `data:` URL — the browser's
 * bytes NEVER reached the estate, and the compose door refuses data:
 * refs at phase 1 (`input_image artifact not found on disk:
 * 'data:image/png;base64,…'` — the run-9e8fd6b813a2 class). The
 * gateway's upload door (POST /v1/uploads — bytes land under
 * data/input/, it returns the estate path) existed and the anny
 * studio well used it; the flow surfaces never boarded it.
 *
 * Contract: uploadToEstate(File) → the ESTATE PATH string
 * ("data/input/<name>") that every compose door accepts as a wire
 * value. The data: URL NEVER enters a param bag. ANY media kind
 * rides (image / video / audio — the any-media law, operator
 * 2026-11-06); non-media refuses client-side before any POST.
 */
import { readAsDataURL } from "./readFile.js";
import { uploadKindOf } from "@melite/contracts/mediaKinds";
// ANY MEDIA family boards (the any-media law, operator 2026-11-06:
// the mod seat takes any media kind — image, video, audio — and the
// system handles the conversion). The triad set died with it. THE
// ONE CLASSIFIER (operator burn 2026-11-27: "QVOICE NEEDS TO WORK
// THE SAME WAY. ONE SYSTEM"): the family comes from the estate's media
// vocabulary (uploadKindOf — the extension first, the browser's MIME
// second), so a `.qvoice` — which the OS hands over with NO type —
// rides exactly like a `.wav`, and this rail carries no private list.
// Shared readAsDataURL (@melite/ui SlotSquare — the ONE read path). The
// picker-specific guidance survives as a catch mapping: the shared read
// rejects bare, and only this rail knows what to tell the operator next.
function readUploadFile(file) {
    return readAsDataURL(file).catch(() => {
        throw new Error(`The browser could not read "${file.name}" at its source ` +
            "(the drag handed over a file the browser can't open — this " +
            "happens when the file was moved/deleted, or the drag came " +
            "from a recent-files list or another app). " +
            "Drag it from its actual folder, or CLICK the square and browse — " +
            "the picker path reads through the OS dialog and works.");
    });
}
export class UploadRefusedError extends Error {
}
/** The rail: File → POST /v1/uploads → the estate path. */
export async function uploadToEstate(file) {
    if (uploadKindOf(file.name, file.type) === undefined) {
        throw new UploadRefusedError(`${file.name}: only image / video / audio upload (got ${file.type || "unknown type"})`);
    }
    const data = await readUploadFile(file);
    let resp;
    try {
        resp = await fetch("/v1/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, data }),
        });
    }
    catch (e) {
        throw new Error(`Upload failed (network): ${e.message}`);
    }
    const text = await resp.text();
    let body = {};
    try {
        body = JSON.parse(text);
    }
    catch { /* refused below */ }
    if (!resp.ok || !body.path) {
        throw new Error(body.error ?? `Upload failed (HTTP ${resp.status})`);
    }
    return body.path;
}
//# sourceMappingURL=uploadToEstate.js.map
