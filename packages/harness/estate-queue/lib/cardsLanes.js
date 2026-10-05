// cardsLanes.ts — THE LANE PRESENCE GATE (the one-pattern law).
// Extracted from cardsRegistry: which families have a live lane on
// disk (the packs the compose arm refuses without).
import { checkModelPresent, getModel, loadEndpointConfig } from "@melite/comfyui-cordis";
import { CardArmError } from "./cardsArmError.js";
// ── THE LANE PRESENCE GATE (2026-09-13, the one-pattern law) ───────
// The operator's alarm: "If Img Gen works and Img Edit doesn't,
// that's really bad — that means we are handrolling and not
// enforcing one pattern." It was true. Every family DECLARES its
// lane files (lane_inputs) and the store check existed
// (checkModelPresent) but nothing in the run path consulted it —
// Img Gen worked because its weights happened to be on disk, Img
// Edit died at ComfyUI validation with the reason swallowed by the
// UI. Presence is now ENFORCED at phase-1 for EVERY card run, one
// gate, one voice — the refusal names the family, the lane key,
// the missing file, the folders checked, and the provision URL
// when the family declares one (the fetch hint).
/** lane_inputs keys that name FILES the stock loaders read, mapped
 * to their ComfyUI folder sets (text_encoders folds legacy clip;
 * unet folds diffusion_models). Keys absent here are declaration-
 * only — model_path/texture_vae ride pack-specific loaders whose
 * folders the estate cannot name without inventing a mapping. */
const LANE_FOLDERS = {
    text_encoder: ["text_encoders", "clip"],
    vae: ["vae"],
    unet: ["unet", "diffusion_models"],
    checkpoint: ["checkpoints"],
    clip_vision: ["clip_vision"],
    background_removal: ["background_removal"],
};
/** The endpoint's pack categories (extra_model_folders keys) — the
 * custom-node weight homes (SEEDVR2, anny, …). A lane file may
 * legally live in a pack the stock map doesn't name (seedvr2's
 * unet/vae ride the SEEDVR2 pack), so every key's folder set unions
 * these. Same config findModelPresent's mount leg reads — one
 * truth, no second mapping. Unparseable/absent config = no packs
 * (the stock sets stand alone; the gate errs loud, never blocks on
 * a config read). */
export function lanePackFolders() {
    let cfg;
    try {
        cfg = loadEndpointConfig();
    }
    catch {
        return [];
    }
    const extras = cfg["extra_model_folders"];
    if (typeof extras !== "object" || extras === null || Array.isArray(extras)) {
        return [];
    }
    return Object.keys(extras);
}
/** THE GATE (pure over the registry + the store probes): null when
 * every declared lane file stands on disk; else the CardArmError a
 * card start refuses with.getModel's own unknown-family throw is
 * NOT swallowed here — phase-1's resolution gates own that voice
 * (this runs after prepareCardParams resolved the family).
 *
 * HERMETIC DEFERRAL (the same rule loadEndpointConfig serves, one
 * seam two consumers): a sandboxed test world with no explicit
 * endpoint fixture has no store to enforce against — the gate
 * stands down and ComfyUI's own validation (UI-surfaced since
 * 2026-09-13) remains the backstop. A fixture endpoint env always
 * re-arms the gate (the gate specs drive it that way). */
export function lanePresenceRefusal(fam) {
    const sandbox = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
    const envPath = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
    if (sandbox !== "" && envPath === "")
        return null;
    // the refusal is a THROW, never a value (phase1Card's pinned
    // contract — no return-value arm there)
    const miss = lanePresenceMiss(fam);
    if (miss !== null)
        throw miss;
    return null;
}
function firstLaneMiss(decl, check) {
    const li = (decl.lane_inputs ?? {});
    const packs = lanePackFolders();
    for (const [key, stock] of Object.entries(LANE_FOLDERS)) {
        const raw = li[key];
        const name = typeof raw === "string" ? raw.trim() : "";
        if (name === "")
            continue;
        const folders = [
            ...stock,
            ...packs.filter((p) => !stock.includes(p)),
        ];
        if (folders.some((folder) => check(folder, name) !== null))
            continue;
        return { key, name, folders };
    }
    return null;
}
export function laneFilesStatus(decl, check = (folder, name) => checkModelPresent("models/" + folder, name)) {
    const li = (decl.lane_inputs ?? {});
    const hasRows = Object.keys(LANE_FOLDERS).some((key) => {
        const raw = li[key];
        return typeof raw === "string" && raw.trim() !== "";
    });
    if (!hasRows)
        return null;
    return firstLaneMiss(decl, check) === null;
}
export function lanePresenceMiss(fam) {
    const decl = getModel(fam);
    const miss = firstLaneMiss(decl, (folder, name) => checkModelPresent("models/" + folder, name));
    if (miss === null)
        return null;
    const prov = (decl.provisions ?? []).find((p) => p.name === miss.name);
    return new CardArmError(400, "lane presence: family '" + fam + "' declares " + miss.key + " '" + miss.name +
        "' but no store copy exists (folders checked: " + miss.folders.join(", ") + ")" +
        (prov !== undefined ? " — fetch it: " + prov.url : ""), "lane_input_missing");
}
//# sourceMappingURL=cardsLanes.js.map
