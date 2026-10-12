import { saveAudio } from "@melite/comfyui-card-kit";
/** The staged-source row the prep segment reads (the card's schema
 * walk validated types and bounds — a same-process typed boundary;
 * crop/scale rows are re-validated here because the node build reads
 * their members raw). */
/** The closed upscale-method set (the dropdown law, 2026-10-24):
 *  ComfyUI core ImageScale's own combo values, grounded in the live
 *  engine's object_info (not memory). The input-prep card's
 *  scale_method vocabulary serves THIS export — one truth, two
 *  consumers, so a card-authored copy cannot drift from what the
 *  engine accepts. */
export const SCALE_METHODS = ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"];
/** The weightless door: the family declares no lane_inputs, so
 * there is nothing to parse and nothing that can drift. The raw
 * view rides unvalidated by contract (absent ≡ {}).
 *  @param _raw the resolved lane_inputs (empty for this family)
 *  @returns the vacuous facts shape */
export function parsePrepFacts(_raw) {
    return {};
}
/** The staged-source transform action: audio passthrough
 * (LoadAudio→SaveAudio) or image LoadImage→[crop]→[scale]→SaveImage
 * under <run>/input_prep. */
export const prep = {
    id: "prep",
    inputs: [],
    outputs: [{ name: "image", kind: "IMAGE" }],
    // THE DECLARED SURFACE (the write plane, phase 2): the
    // input-prep card schema's own types and bounds — the family
    // door judges defaults and variant presets against this row. The
    // segment reads the crop and scale rows as the crop/scale
    // objects the card packs from these flat members; a value tier
    // cannot name an object, so the surface declares the members the
    // card's gate validates and packs. Each transform member's floor
    // is -1 (the unset sentinel) and its ceiling is the card's — none.
    params: [
        { name: "source", type: "string" },
        { name: "media_type", type: "enum", options: ["image", "audio"] },
        { name: "crop_x", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
        { name: "crop_y", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
        { name: "crop_width", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
        { name: "crop_height", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
        { name: "scale_width", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
        { name: "scale_height", type: "number", bounds: [-1, Number.MAX_SAFE_INTEGER] },
        { name: "scale_method", type: "enum", options: [...SCALE_METHODS] },
    ],
    facts: parsePrepFacts,
    build({ p, g, runId }) {
        const prefix = `${runId}/input_prep`;
        if (p.media_type === "audio") {
            const loaded = g.node("LoadAudio", { audio: p.source });
            return saveAudio(g, loaded.out(), prefix).out();
        }
        let img = g.node("LoadImage", { image: p.source }).out(0);
        const crop = p.crop;
        if (crop) {
            for (const k of ["x", "y", "width", "height"]) {
                if (typeof crop[k] !== "number") {
                    throw new Error(`crop row refused on the input-prep card: '${k}' must be a number (got ${JSON.stringify(crop[k])})`);
                }
                // THE INTEGER LAW (2026-10-24, volley item g): ImageCrop
                // takes INT — a 1.5 that reaches the engine dies as a raw
                // engine error. The family refuses it here in its own voice.
                if (!Number.isInteger(crop[k])) {
                    throw new Error(`crop row refused on the input-prep card: '${k}' must be an integer (got ${JSON.stringify(crop[k])})`);
                }
            }
            img = g.node("ImageCrop", { image: img, x: crop.x, y: crop.y, width: crop.width, height: crop.height }).out(0);
        }
        const scale = p.scale;
        if (scale) {
            if (typeof scale.width !== "number" || typeof scale.height !== "number") {
                throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be numbers (got ${JSON.stringify(scale)})`);
            }
            // THE INTEGER LAW (2026-10-24, volley item g): ImageScale
            // takes INT — `scale_width expected number multiple of 1 but
            // got 1.5` must fire HERE, naming the contract, never as a raw
            // engine refusal downstream.
            if (!Number.isInteger(scale.width) || !Number.isInteger(scale.height)) {
                throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be integers (got ${JSON.stringify(scale)})`);
            }
            const method = typeof scale.method === "string" ? scale.method : "lanczos";
            // THE CLOSED SET (the dropdown law's backstop): the legacy
            // scale-object path bypasses the card's vocabulary gate, so a
            // bogus method string is refused here — the engine's combo
            // would 500 it raw.
            if (!SCALE_METHODS.includes(method)) {
                throw new Error(`scale row refused on the input-prep card: 'method' must be one of ${SCALE_METHODS.join(" | ")} (got ${JSON.stringify(scale.method)})`);
            }
            img = g.node("ImageScale", { image: img, upscale_method: method, width: scale.width, height: scale.height, crop: "disabled" }).out(0);
        }
        return g.node("SaveImage", { images: img, filename_prefix: prefix }).out();
    },
};
//# sourceMappingURL=actions.js.map