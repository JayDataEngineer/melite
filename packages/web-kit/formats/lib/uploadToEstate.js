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
// ANY MEDIA family boards (the any-media law, operator 2026-11-06:
// the mod seat takes any media kind — image, video, audio — and the
// system handles the conversion). The triad set died with it.
const isMediaMime = (t) => t.startsWith("image/") || t.startsWith("video/") || t.startsWith("audio/");
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
    if (!isMediaMime(file.type)) {
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
/**
 * estateInputUrl — slot value → a URL an <img> can load (2026-09-06,
 * operator order: "We need to have an image preview when the card is
 * drilled out for ANNY and IMAGE->3d").
 *
 * The uploads rail returns repo-relative `data/input/<name>` paths —
 * composable at every door, but no browser tag can load them, so a
 * drilled-out card showed NO preview of its own source photo after
 * reload (the fresh object-URL preview is session-local). The input
 * preview door (GET /v1/assets/inputs/<name>) serves those bytes
 * back; this maps the param to that URL.
 *
 * Already-servable shapes pass through untouched (data:/blob:/
 * http(s) URLs, and the estate's own /assets, /api, /v1/assets
 * prefixes — the same vocabulary the assembly viewer uses); anything
 * else (mount paths like /mnt/...) is NOT previewable → null (the
 * caller renders the explicit non-preview state, never a doomed
 * <img>).
 */
export function estateInputUrl(value) {
    if (/^(data:|blob:|https?:)/i.test(value)
        || /^\/(assets|api|v1\/assets)\//.test(value)) {
        return value;
    }
    const m = /^data\/input\/([A-Za-z0-9_-]+\.(?:png|jpe?g|webp))$/i.exec(value);
    return m ? `/v1/assets/inputs/${m[1]}` : null;
}
//# sourceMappingURL=uploadToEstate.js.map
