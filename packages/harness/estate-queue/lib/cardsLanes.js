// cardsLanes.ts — THE LANE PRESENCE GATE (the one-pattern law).
// Extracted from cardsRegistry: which families have a live lane on
// disk (the packs the compose arm refuses without).
import { checkModelPresent, getModel, loadEndpointConfig } from "@melite/comfyui-cordis";
import { LIVE_ACQUIRE_STATES, provisioningSeat } from "@melite/estate-provisioning";
import { resolveCellRow } from "@melite/contracts/laneRelations";
import { engineOutputDir, engineRootOf, resolveRuntimeHome, runtimeEnvView, sentinelHit } from "./runtimeProvision.js";
import { hashPhaseWordOf, laneVoice } from "./cardsLanesCopy.js";
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
export function lanePresenceRefusal(fam, body, mid) {
    const sandbox = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
    const envPath = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
    if (sandbox !== "" && envPath === "")
        return null;
    // the refusal is a THROW, never a value (phase1Card's pinned
    // contract — no return-value arm there)
    const miss = lanePresenceMiss(fam, body, mid);
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
/** THE MISS COLLECTION (the sequential-missing-weight-reveal cure,
 *  2026-11-09): the SAME walk firstLaneMiss always rode, collecting
 *  EVERY missing declared weight instead of returning at the first —
 *  the stock-map loop, then the declared-home loop, deduped by
 *  slot+name (a key declared in both shapes is one miss, judged
 *  once). One face per press: the operator learns of every missing
 *  weight in the refusal that names the first, never one wedged run
 *  later. */
function laneMisses(decl, check, variantRow, cellRow) {
    // THE VARIANT-LANE PRESENCE LAW (h¹ remainder — the one-parameter
    // switch): the probe judges the RESOLVED lane inputs — the family's
    // rows under the STATED variant's per-key override (the same merge
    // the compose stamps; a variant that does not override a key leaves
    // the family's row gating). A family-only probe green-lit a variant
    // whose own file never existed (the Singularity burn: the family's
    // timeline unet present, the override's 20 GB never fetched).
    const li = {
        ...(decl.lane_inputs ?? {}),
        ...(variantRow?.lane_inputs ?? {}),
        // THE CELL-LANE CASCADE (the qwen cell-fold cure, 2026-11-10):
        // the STATED cell's rows fold in last — the same per-key
        // precedence the compose stamps (the derived route read folds
        // atom → variant → CELL, comfyui-cordis service.ts getModel) and
        // the client mirror's resolvedLaneSurface rides (the ONE
        // RESOLVER's coordinate, never a second spelling). A family whose
        // weight tiers live only at variants[].cells (qwen-img-21 /
        // qwen-img-edit-21's bf16+turbo unets, qwen3-tts's per-size
        // model_path) gated the DEFAULT tier's files for every stated
        // coordinate — the burn: a missing stated-cell weight sailed the
        // presence gate straight into the engine's validation.
        ...(cellRow?.lane_inputs ?? {}),
    };
    const homes = (decl.lane_homes ?? {});
    const packs = lanePackFolders();
    const misses = [];
    const seen = new Set();
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
        const dedupe = key + " " + name;
        if (!seen.has(dedupe)) {
            seen.add(dedupe);
            misses.push({ key, name, folders });
        }
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
        // THE SNAPSHOT-PLACEMENT LEG (the 0.6B-Base miss, 2026-10-23):
        // a loader-side subpath ("qwen3-tts/hf/…-Base" — the C++ load
        // gate reads it relative to the AUDIO pack root, transcript-014)
        // double-joins under its lane_homes key (the qwen3_tts extras
        // map already descends into audio/qwen3-tts/hf), so the home
        // probes can never hit a present tree. The snapshot row owns
        // the placement truth (folder + bare name — the same anchor
        // probe the provisioning plane's presence rides), so it probes
        // as its own (folder, name) pair, never re-suffixed.
        const base = name.split("/").pop() ?? name;
        const snap = (decl.snapshot_provisions ?? []).find((s) => s.name === base && typeof s.folder === "string" && s.folder !== "");
        if (snap !== undefined &&
            !probes.some(([f, n]) => f === snap.folder && (n === name || n === snap.name))) {
            probes.push([snap.folder, snap.name]);
        }
        if (probes.some(([folder, probeName]) => check(folder, probeName) !== null))
            continue;
        const dedupe = key + " " + name;
        if (!seen.has(dedupe)) {
            seen.add(dedupe);
            misses.push({ key, name, folders: probes.map(([f, n]) => f + " × " + n) });
        }
    }
    return misses;
}
/** The first miss — the presence boolean's own leg (laneFilesStatus)
 *  and the refusal's LEAD row. The whole list rides beside it
 *  (laneMisses → the refusal's missingAll). */
function firstLaneMiss(decl, check, variantRow) {
    return laneMisses(decl, check, variantRow)[0] ?? null;
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
/** THE RUNTIME LEG (E2-2 Piece A, 2026-10-20 — the press-time
 *  half): the DECL's runtime row, judged only when the consuming
 *  param is stated (a GLB-only anny run never touches the
 *  estimator — the leg sleeps) and only when the endpoint
 *  declares its engine root. The refusal voices the ENGINE's own
 *  sentence (name + path + Provision it + env override) so the
 *  existing runtime banner fires on it with no new wire; the
 *  structured artifact rides beside the prose (the fold's law).
 *  THE G3 LEG (Piece B, 2026-10-20): the override is read through
 *  the ONE env view (runtimeEnvView — the endpoint's
 *  lanes_env_file overlays the process env for exactly rt.env), the
 *  same view the provision_runtime verb decides on, so a
 *  lanes.env-visible override is a press-time pass with the file's
 *  value named — gate and verb can never disagree. The lanes.env
 *  hatch rides every refusal: an override the engine sees but the
 *  lane cannot is a one-line export away, and the refusal says so.
 *
 *  The engine-root/output-dir readers, the walk-up, and the
 *  sentinel join live in ./runtimeProvision.ts — the decision core
 *  the provision_runtime verb shares (ONE spelling; gate and verb
 *  can never disagree). */
function runtimeLegMiss(decl, fam, body) {
    const rt = decl.runtime;
    if (rt === undefined)
        return null;
    const stated = body?.[rt.consuming_param];
    if (typeof stated !== "string" || stated.trim() === "")
        return null;
    const root = engineRootOf();
    if (root === null)
        return null;
    // THE FAIL-OPEN TRUST (audit G2, extended to the lanes.env file by
    // G3): a stated override with valid sentinels is trusted WITHOUT a
    // walk-up — a deliberately stated path is right far more often
    // than a blind walk is. The known split (an override valid in the
    // LANE's env but absent from the ENGINE's own env) then passes the
    // gate and burns at the engine — but that burn is FACED (the
    // post-hoc runtime banner voices the same provision + env, and the
    // provision_runtime verb answers it), never silent. The alternative
    // (distrusting a stated-valid path) would false-refuse managed
    // deployments whose override points outside any walk-up tree —
    // blocking good work is worse than facing a bad run.
    const override = runtimeEnvView(rt.env);
    if (override.value !== "") {
        if (rt.sentinel.every((s) => sentinelHit(override.value, s)))
            return null;
        return runtimeRefusal(fam, rt, [override.value]);
    }
    const start = engineOutputDir(root);
    const home = resolveRuntimeHome(start, rt);
    if (home !== null)
        return null;
    return runtimeRefusal(fam, rt, [start]);
}
/** The press-time runtime refusal: the engine-voiced sentence the
 *  E2 parser anchors on (run-rescue-core.ts THE RUNTIME-MISS
 *  VOICE) — `<name> runtime not found at <path>. Provision it:
 *  <cmd>. Or point <ENV> at an existing runtime.` — plus the
 *  lanes.env hatch. Deliberately NOT the "lane presence:" prefix:
 *  that voice is the model leg's anchor (weight extensions), and
 *  this sentence must fall through to the runtime arm, never be
 *  claimed by it. */
function runtimeRefusal(fam, rt, checked) {
    return new CardArmError(400, "family '" + fam + "' declares runtime '" + rt.name + "' (" + rt.consuming_param + " stated) but no " +
        "provisioned copy exists — " + rt.name + " runtime not found at " + checked[0] + ". Provision it: " +
        rt.command + ". Or point " + rt.env + " at an existing runtime. If " + rt.env + " is set for the " +
        "engine but the lane cannot see it, export it in lanes.env and restart the lane. (walk-up from " +
        checked[0] + " for " + rt.rel.join("/") + " found no copy holding " + rt.sentinel.join(", ") + ")", "lane_input_missing", undefined, undefined, undefined, {
        family: fam,
        slot: rt.consuming_param,
        missing: rt.name,
        folders: [...checked],
        kind: "runtime",
    });
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
 *  fraction of nothing is a lie). THE HASH VOICE (audit
 *  download-stack-audit-2026-10-20 F10, the run-gate row): mid-verify
 *  the byte count sits frozen while the hash runs, so the voice joins
 *  the phase word (the cardsLanesCopy table — never a literal here)
 *  when the ledger row says verifying. */
function inFlightFraction(progress) {
    const fraction = progress.total <= 0
        ? "total undeclared"
        : String(Math.floor((progress.bytes * 100) / progress.total)) + "%";
    return laneVoice.inFlightFraction({ fraction, phaseWord: hashPhaseWordOf(progress) });
}
/** THE STATED VARIANT'S ROW (the same derivation the compose
 *  stamps, over the DECL's own rows — the facts fold drops
 *  lane_inputs): a stated body.variant wins (id match), else the
 *  ADDRESS's own row (route/id/cell-route/resolver model — a bare
 *  route pick composes that route's defaults), else undefined (the
 *  family default: no override, the family rows gate alone). */
function statedVariantRow(decl, body, mid) {
    const variants = decl.variants ?? [];
    const stated = typeof body?.["variant"] === "string" && body["variant"].trim() !== ""
        ? body["variant"].trim()
        : "";
    if (stated !== "") {
        const row = variants.find((v) => v.id === stated || v.route === stated);
        if (row !== undefined)
            return row;
    }
    if (mid === undefined || mid === "")
        return undefined;
    return variants.find((v) => v.route === mid || v.id === mid
        || (v.cells ?? []).some((c) => c.route === mid)
        || v.resolver_defaults?.["model"] === mid);
}
/** THE STATED CELL'S ROW (the cell-fold cure, 2026-11-10): the ONE
 *  RESOLVER's quant coordinate over the stated variant — the same
 *  shape selectCardVariant rides at the door (stated body.quant wins,
 *  else the address's own cell claim, else the variant's first
 *  visible cell) and the client mirror's resolvedLaneCoordinate runs
 *  (resolveCellRow in @melite/contracts/laneRelations — one
 *  coordinate law, no second resolution). 'native' rides unstated
 *  (the fold's legacy coordinate). A coordinate the door already
 *  refused (an unknown quant, a hidden cell route) folds nothing —
 *  the gate sits DOWNSTREAM of prepareCardParams, it never re-voices
 *  a coordinate refusal, and a missing resolution degrades to the
 *  pre-cure family ∪ variant row rather than guessing. */
function statedCellRow(variant, body, mid) {
    if (variant === undefined)
        return undefined;
    const raw = body?.["quant"];
    const stated = typeof raw === "string" && raw !== "native" ? raw : null;
    // the explicit cell type: the resolver's generic erases to its
    // constraint (ResolverCellRow) — the runtime row IS the DECL cell
    const res = resolveCellRow(variant, stated, mid ?? "", "offered");
    return res.status === "resolved" ? (res.cell ?? undefined) : undefined;
}
export function laneFetchAnchor(decl, seats, name) {
    // 1. the family's own provisions row — the loaded-identity rule
    // (full name or basename, the registration law's spelling)
    const base = name.split("/").pop() ?? name;
    const prov = (decl.provisions ?? []).find((p) => p.name === name || p.name === base);
    if (prov !== undefined) {
        return { url: prov.url, ...(prov.size_bytes !== undefined ? { sizeBytes: prov.size_bytes } : {}) };
    }
    // 2. the stated cell/variant artifact — the source_url's basename is
    // the lane file's name (the cell's own spelling, krea-2/qwen law);
    // only the cell row declares an artifact member
    for (const seat of seats) {
        if (seat === undefined || !("artifact" in seat))
            continue;
        const artifact = seat.artifact;
        const url = artifact?.source_url;
        if (typeof url === "string" && url.length > 0 && (url.split("/").pop() ?? "") === base) {
            const size = artifact?.size_bytes;
            return { url, ...(typeof size === "number" ? { sizeBytes: size } : {}) };
        }
    }
    // 2.5 THE FAMILY-WIDE ARTIFACT FALLBACK (the shared-weight law): a
    // weight many coordinates ride (the family default unet under a
    // lora variant) declares its channel ONCE — on the OWNING cell's
    // artifact row. The basename is the file identity: any cell's
    // artifact with that basename is a true URL for the missing
    // weight, exactly what the provisioner fetches. Refusing to say
    // it (the seat-only lookup) is the kroma class wearing a
    // different coat — a URL exists, the press reports a bare miss.
    for (const variant of decl.variants ?? []) {
        for (const cell of variant.cells) {
            const url = cell.artifact?.source_url;
            if (typeof url === "string" && url.length > 0 && (url.split("/").pop() ?? "") === base) {
                const size = cell.artifact?.size_bytes;
                return { url, ...(typeof size === "number" ? { sizeBytes: size } : {}) };
            }
        }
    }
    // 3. the snapshot tree — the repo link anchors the fetch AT ITS
    // PINNED REVISION (kroma audit F7, 2026-10-26: the bare repo URL
    // omitted the pin — the fetcher's coordinate is the tree, not the
    // moving default branch; the refusal names repo@revision)
    const snap = (decl.snapshot_provisions ?? []).find((s) => s.name === base);
    if (snap !== undefined) {
        return { url: "https://huggingface.co/" + snap.repo_id + "/tree/" + snap.revision };
    }
    return undefined;
}
export function lanePresenceMiss(fam, body, mid) {
    const decl = getModel(fam);
    const check = (folder, name) => checkModelPresent("models/" + folder, name);
    const variantRow = statedVariantRow(decl, body, mid);
    const cellRow = statedCellRow(variantRow, body, mid);
    const misses = laneMisses(decl, check, variantRow, cellRow);
    const miss = misses[0] ?? null;
    if (miss === null)
        return runtimeLegMiss(decl, fam, body);
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
    // THE ONE-FACE LIST (the sequential-missing-weight-reveal cure,
    // 2026-11-09): the anchored lead sentence keeps the client's prose
    // anchor byte-exact; the WHOLE miss list rides after it (prose)
    // and inside the structured row (missingAll) — the operator learns
    // of the vae in the refusal that names the text encoder, with the
    // DECL's declared size per file, never one wedged run later.
    // THE ANCHOR-AT-THE-DOOR LAW (the kroma burn, 2026-10-26): every
    // row's anchor resolves through laneFetchAnchor — the cascade's
    // own channels (provisions, the stated cell/variant artifact, the
    // snapshot repo), NEVER provisions alone. The wall
    // (variant-linkability ARM 4) walks this exact builder over an
    // empty store and reds any declared weight the door cannot anchor.
    const rows = misses.map((m) => {
        const anchor = laneFetchAnchor(decl, [variantRow, cellRow], m.name);
        return {
            slot: m.key,
            name: m.name,
            folders: m.folders,
            ...(anchor?.sizeBytes !== undefined ? { sizeBytes: anchor.sizeBytes } : {}),
            ...(anchor !== undefined ? { fetchUrl: anchor.url } : {}),
        };
    });
    const listVoice = misses.length > 1
        ? "; the run declares " + String(misses.length) + " missing files — " +
            misses.map((m) => {
                const anchor = laneFetchAnchor(decl, [variantRow, cellRow], m.name);
                return m.key + " '" + m.name + "'" + (anchor !== undefined ? " — fetch it: " + anchor.url : "");
            }).join("; ")
        : "";
    return new CardArmError(400, "lane presence: family '" + fam + "' declares " + miss.key + " '" + miss.name +
        "' but no store copy exists (folders checked: " + miss.folders.join(", ") + ")" +
        (rows[0]?.fetchUrl !== undefined ? " — fetch it: " + rows[0].fetchUrl : "") +
        listVoice, "lane_input_missing", undefined, undefined, undefined, 
    // THE STRUCTURED ARTIFACT (operator 2026-10-22): the wire
    // details carry the same facts the prose carries, so the
    // client's missing-model popup keys its download action on
    // fields, never on parsing this message.
    {
        family: fam,
        slot: miss.key,
        missing: miss.name,
        folders: miss.folders,
        ...(rows[0]?.fetchUrl !== undefined ? { fetchUrl: rows[0].fetchUrl } : {}),
        ...(rows.length > 1 ? { missingAll: rows } : {}),
        kind: "model",
    });
}
//# sourceMappingURL=cardsLanes.js.map
