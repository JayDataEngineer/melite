// cardsLanes.ts — THE LANE PRESENCE GATE (the one-pattern law).
// Extracted from cardsRegistry: which families have a live lane on
// disk (the packs the compose arm refuses without).
import { checkModelPresent, getModel, loadEndpointConfig } from "@melite/comfyui-cordis";
import { LIVE_ACQUIRE_STATES, provisioningSeat } from "@melite/estate-provisioning";
import { CardArmError } from "./cardsArmError.js";
// ── THE LANE PRESENCE GATE (2026-09-13, the one-pattern law) ───────
// The operator's alarm: "If Img Gen works and Img Edit doesn't,
// that's really bad — that means we are handrolling and not
// enforcing one pattern." It was true. Every family DECLARES its
// lane files (lane_inputs) and the store check existed
// (checkModelPresent) but nothing in the run path consulted it —
// Img Gen worked because its weights happened to be on disk, Img
// Edit died at ComfyUI validation with the reason swallowed by the
// UI. Presence is now ENFORCED at phase-1 for every FAMILY-BACKED
// card run (familyless units and declaration-only lane keys —
// keys outside the map below — are excluded on purpose, see the
// LANE_FOLDERS note), one gate, one voice — the refusal names the
// family, the lane key, the missing file, the folders checked, and
// the provision URL when the family declares one (the fetch hint).
/** lane_inputs keys that name FILES the stock loaders read, mapped
 * to their ComfyUI folder sets (text_encoders folds legacy clip;
 * unet folds diffusion_models; loras is the LoraLoaderModelOnly
 * root — a family's default-bag distill rides it). Keys absent here
 * are declaration-only — model_path/texture_vae ride pack-specific
 * loaders whose folders the estate cannot name without inventing a
 * mapping; those slots are judged through the DECL's own
 * `lane_homes` row (the declared-home loop below), which replaces
 * this map and the pack union for its slot. */
export const LANE_FOLDERS = {
    text_encoder: ["text_encoders", "clip"],
    vae: ["vae"],
    unet: ["unet", "diffusion_models"],
    checkpoint: ["checkpoints"],
    clip_vision: ["clip_vision"],
    background_removal: ["background_removal"],
    loras: ["loras"],
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
/** The store spellings one declared home probes for one lane
 *  value. The value may carry a loader-side subpath
 *  ("qwen3-tts/hf/Qwen3-TTS-…-Base" under the qwen3_tts key) or be
 *  a bare name ("sam_vit_b_01ec64.pth" under sams) — both spellings
 *  ride findModelPresent's exact join, so both are probed. */
function homeProbes(home, name) {
    const probes = [[home, name]];
    const cut = name.lastIndexOf("/");
    if (cut > 0)
        probes.push([home + "/" + name.slice(0, cut), name.slice(cut + 1)]);
    return probes;
}
function firstLaneMiss(decl, check) {
    const li = (decl.lane_inputs ?? {});
    const homes = (decl.lane_homes ?? {});
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
        // THE PROVISION-FOLDER LEG (2026-10-11): a provisioned lane file
        // lands where its own row says — loras land in loras/h3, not the
        // stock root — so the row's folder is the last folder probed and
        // the refusal names it. One truth: the provision row owns the
        // file's home; no second subfolder mapping lives here.
        const prov = (decl.provisions ?? []).find((p) => p.name === name);
        if (prov !== undefined && !folders.includes(prov.folder))
            folders.push(prov.folder);
        if (folders.some((folder) => check(folder, name) !== null))
            continue;
        return { key, name, folders };
    }
    // THE DECLARED-HOME LOOP (the declaration-only cure, 2026-10-23):
    // model_path/texture_vae name files whose loader is pack-specific
    // — the estate cannot name their folders without inventing a map,
    // so the DECL does (lane_homes). The declared home replaces the
    // stock map AND the pack union (the pack keys are a guess for a
    // pack-specific loader; the DECL is the family's own statement);
    // the provision-folder leg still rides when the family fetches
    // the file itself.
    for (const [key, home] of Object.entries(homes)) {
        const raw = li[key];
        const name = typeof raw === "string" ? raw.trim() : "";
        if (name === "")
            continue;
        const probes = homeProbes(home, name);
        const prov = (decl.provisions ?? []).find((p) => p.name === name.split("/").pop());
        if (prov !== undefined && !probes.some(([f, n]) => f === prov.folder && n === name)) {
            probes.push([prov.folder, name]);
        }
        if (probes.some(([folder, probeName]) => check(folder, probeName) !== null))
            continue;
        return { key, name, folders: probes.map(([f, n]) => f + " × " + n) };
    }
    return null;
}
export function laneFilesStatus(decl, check = (folder, name) => checkModelPresent("models/" + folder, name)) {
    const li = (decl.lane_inputs ?? {});
    const homes = (decl.lane_homes ?? {});
    const hasRows = [...Object.keys(LANE_FOLDERS), ...Object.keys(homes)].some((key) => {
        const raw = li[key];
        return typeof raw === "string" && raw.trim() !== "";
    });
    if (!hasRows)
        return null;
    return firstLaneMiss(decl, check) === null;
}
/** THE IN-FLIGHT READ (the run gate's seat query — the provisioning
 *  service's operation read, wired through the process seat the way
 *  the models seat's namespace arms the models table): the LIVE
 *  acquire row for one family, null when no seat is mounted in this
 *  process, no acquisition runs for the family, or the row already
 *  settled (a settled row is the rescue verbs' story — the idle miss's
 *  own voice stands for it, and its fresh-fetch hint is then true).
 *  The read keys the family ref the acquire door itself starts
 *  (owner family, no variant/quant), so the gate sees exactly the
 *  operation the manage seat's Download press minted. */
function acquireInFlight(fam) {
    const progress = provisioningSeat()?.progressOfRef({ kind: "model", owner: "family", id: fam }) ?? null;
    if (progress === null)
        return null;
    return LIVE_ACQUIRE_STATES.has(progress.state) ? progress : null;
}
/** The live fraction's one voice: a percent of the DECL's own total,
 *  or the undeclared-total word when no row declared a size (a
 *  fraction of nothing is a lie). */
function inFlightFraction(progress) {
    if (progress.total <= 0)
        return "total undeclared";
    return String(Math.floor((progress.bytes * 100) / progress.total)) + "%";
}
export function lanePresenceMiss(fam) {
    const decl = getModel(fam);
    const miss = firstLaneMiss(decl, (folder, name) => checkModelPresent("models/" + folder, name));
    if (miss === null)
        return null;
    const prov = (decl.provisions ?? []).find((p) => p.name === miss.name);
    // THE IN-FLIGHT LEG (ERRORS.md k2 — NEVER-RUN-ON-INCOMPLETE): a
    // miss whose file is landing RIGHT NOW is not the idle story. The
    // refusal voices the acquisition (the operation and its live
    // fraction, real landed bytes over the DECL total), carries the
    // structured row beside the lane miss, and DROPS the fresh-fetch
    // hint — "fetch it: <url>" while a fetch runs is what re-pops the
    // download loop the burn names.
    const inFlight = acquireInFlight(fam);
    if (inFlight !== null) {
        return new CardArmError(400, "lane presence: family '" + fam + "' declares " + miss.key + " '" + miss.name +
            "' — acquisition in flight (" + inFlightFraction(inFlight) + "): operation " +
            inFlight.operationId + ", " + String(inFlight.bytes) + "/" + String(inFlight.total) +
            " bytes landed — the run refuses until the weight is on the store", "lane_input_missing", undefined, undefined, undefined, 
        // the lane miss stands WITHOUT its fetchUrl (no fresh-fetch
        // hint): the popup keys its face on fields and finds no
        // download offer to double-press
        {
            family: fam,
            slot: miss.key,
            missing: miss.name,
            folders: miss.folders,
            kind: "model",
        }, {
            acquire_in_flight: true,
            operation_id: inFlight.operationId,
            bytes: inFlight.bytes,
            total: inFlight.total,
        });
    }
    return new CardArmError(400, "lane presence: family '" + fam + "' declares " + miss.key + " '" + miss.name +
        "' but no store copy exists (folders checked: " + miss.folders.join(", ") + ")" +
        (prov !== undefined ? " — fetch it: " + prov.url : ""), "lane_input_missing", undefined, undefined, undefined, 
    // THE STRUCTURED ARTIFACT (operator 2026-10-22): the wire
    // details carry the same facts the prose carries, so the
    // client's missing-model popup keys its download action on
    // fields, never on parsing this message.
    {
        family: fam,
        slot: miss.key,
        missing: miss.name,
        folders: miss.folders,
        ...(prov !== undefined ? { fetchUrl: prov.url } : {}),
        kind: "model",
    });
}
//# sourceMappingURL=cardsLanes.js.map
