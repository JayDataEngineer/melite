// managePreflight.ts — audit 019 C3: the first-boot preflight, one
// named list instead of null presence + mid-run burns. The five
// engine-plane axes, each GREEN or a MISS naming its door; a probe
// that throws is a MISS naming the error — the answer can never
// degrade to all-green over an unchecked axis (the wall's law).
//
// The brain axis (audit 019 §5) is NOT here: the estate's own boot
// row already voices it at boot (melite-estate/src/index.ts, the
// agent-row note — one home, the config row that owns it). This
// module owns the axes the manage plane can see.
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { probeEndpoint } from "./manageProbe.js";
import { managerGet } from "./managerRail.js";
import { loadShippedExtensionManifest } from "@melite/comfyui-cordis/provisioning-manifest";
/** The wiring probe's per-folder dial (LAN engines answer in ms;
 * the bound only bites the absent — the INSPECT_DIAL precedent). */
const FOLDER_DIAL_MS = 2_000;
/** The wiring probe's whole-axis budget: 18 mapped folders × a
 * blackholed 2s dial would park the verb for 36s — one budget
 * bounds the loop and the row names how many it reached. */
const WIRING_BUDGET_MS = 10_000;
function row(axis, state, detail, door) {
    return state === "miss" ? { axis, state, detail, door } : { axis, state, detail };
}
function errText(e) {
    return (e instanceof Error ? e.message : String(e)).slice(0, 200);
}
/** `GET <url>/models/<folder>` — registration-only (the preflight's
 * question is "does the engine see the wiring at all"). The deep
 * verifier — store sampling, per-file visibility — is the CLI's
 * probeStoreFolders (provision-instance-layout.ts); this is its
 * yes/no sibling, never a second copy of its verdict logic. */
async function folderRegistered(url, folder, signal) {
    const target = url.replace(/\/+$/, "") + "/models/" + encodeURIComponent(folder);
    try {
        const r = await fetch(target, { signal: AbortSignal.any([AbortSignal.timeout(FOLDER_DIAL_MS), ...(signal ? [signal] : [])]) });
        return r.status === 200;
    }
    catch {
        return false;
    }
}
/** THE PREFLIGHT CORE (audit 019 C3): engine reachable, Manager
 * present, every REQUIRED declared pack landed, the estate's store
 * root on disk, the extra-model wiring visible to the engine — one
 * row per axis. An engine miss cascades: the downstream axes answer
 * misses naming the engine axis, never green over an engine they
 * could not reach (and never duplicate refusals of their own).
 * @param mctx the manage context (endpoint + repoRoot + signal).
 * @returns every axis row, in axis order, misses included. */
export async function runPreflight(mctx) {
    const rows = [];
    const cfg = mctx.endpoint();
    const url = typeof cfg["url"] === "string" ? cfg["url"].trim().replace(/\/+$/, "") : "";
    // ── engine ────────────────────────────────────────────────────
    let engineUp = false;
    if (url === "") {
        rows.push(row("engine", "miss", "no engine url in the endpoint config — the estate cannot reach any ComfyUI", "endpoint_set"));
    }
    else {
        const probe = await probeEndpoint(mctx);
        if (probe.reachable) {
            engineUp = true;
            rows.push(row("engine", "green", "reachable at " + String(probe.url) +
                (probe.comfyui_version !== undefined ? " (comfyui " + String(probe.comfyui_version) + ")" : "")));
        }
        else {
            rows.push(row("engine", "miss", "unreachable at " + url + (probe.reason === undefined ? "" : " — " + probe.reason), "endpoint_set"));
        }
    }
    // ── manager (engine-gated: the cascade names the engine axis) ─
    let installed;
    if (!engineUp) {
        rows.push(row("manager", "miss", "unchecked — the engine axis missed above; a manager on an unreachable engine is invisible", "endpoint_set"));
    }
    else {
        try {
            const doc = await managerGet(url, "/customnode/installed", { ctx: mctx, timeoutMs: 30_000 });
            installed = (doc ?? {});
            rows.push(row("manager", "green", "ComfyUI-Manager answered /customnode/installed (" + Object.keys(installed).length + " pack(s) listed)"));
        }
        catch (e) {
            rows.push(row("manager", "miss", "the manager rail refused: " + errText(e) +
                " — the engine is up but ComfyUI-Manager is absent or refusing (BYO engines must carry it; every pack door rides it)", "install_extension_url (after the engine carries ComfyUI-Manager — https://github.com/Comfy-Org/ComfyUI-Manager)"));
        }
    }
    // ── packs: REQUIRED declared rows vs the installed list ───────
    if (!engineUp || installed === undefined) {
        rows.push(row("packs", "miss", "unchecked — the " + (engineUp ? "manager" : "engine") + " axis missed above; the landed-pack census rides /customnode/installed", engineUp ? undefined : "endpoint_set"));
    }
    else {
        try {
            const declared = loadShippedExtensionManifest();
            const required = declared.filter((d) => d.required);
            const missing = required.filter((d) => !Object.prototype.hasOwnProperty.call(installed, d.name));
            const optional = declared.length - required.length;
            if (missing.length === 0) {
                rows.push(row("packs", "green", "every required declared pack landed (" + required.length + " of " + declared.length +
                    " rows required" + (optional > 0 ? "; " + optional + " optional" : "") + ")"));
            }
            else {
                rows.push(row("packs", "miss", missing.length + " required pack(s) not landed: " + missing.map((d) => d.name).join(", "), "install_extension"));
            }
        }
        catch (e) {
            // The shipped manifest's own loud refusal (missing/malformed
            // data file) is a packs miss naming the regenerate door —
            // never a silent zero-row census (the 019 F1 burn's shape).
            rows.push(row("packs", "miss", errText(e), "regenerate: pnpm --filter @melite/comfyui-cordis run regen:extension-manifest"));
        }
    }
    // ── store: the estate's weights root on disk ──────────────────
    // No configured store is GREEN (BYO: the engine's own folders
    // serve weights — the acquire doors name their target per call);
    // a CONFIGURED root that is absent is the miss (the first acquire
    // creates it — the door names why you would care now: runs that
    // expect landed weights will refuse at the queue until then).
    const statedStore = typeof cfg["model_download_path"] === "string" && cfg["model_download_path"].trim() !== ""
        ? cfg["model_download_path"].trim()
        : typeof cfg["model_base_path"] === "string" && cfg["model_base_path"].trim() !== ""
            ? cfg["model_base_path"].trim()
            : undefined;
    if (statedStore === undefined) {
        rows.push(row("store", "green", "no estate store configured (BYO — the engine's own model folders serve weights; acquire doors name their target per call)"));
    }
    else {
        const storePath = isAbsolute(statedStore) ? statedStore : resolve(mctx.repoRoot, statedStore);
        if (existsSync(storePath)) {
            rows.push(row("store", "green", "the configured weights store exists at " + storePath));
        }
        else {
            rows.push(row("store", "miss", "the endpoint config names the weights store (" + statedStore + " → " + storePath +
                ") but it is not on disk — weights land there at first acquire, and runs expecting landed weights refuse at the queue until then", "provision_model (lands the declared weights) or create the directory"));
        }
    }
    // ── wiring: the extra-model folders visible to the engine ─────
    const folders = cfg["extra_model_folders"];
    if (!engineUp) {
        rows.push(row("wiring", "miss", "unchecked — the engine axis missed above; folder visibility rides GET /models/<folder>", "endpoint_set"));
    }
    else if (folders === undefined || folders === null || typeof folders !== "object" || Array.isArray(folders) || Object.keys(folders).length === 0) {
        rows.push(row("wiring", "green", "no extra-model wiring declared in the endpoint config (the engine serves only its own folders)"));
    }
    else {
        const keys = Object.keys(folders).sort();
        const started = Date.now();
        const registered = [];
        let probed = 0;
        for (const key of keys) {
            if (Date.now() - started > WIRING_BUDGET_MS)
                break;
            probed++;
            if (await folderRegistered(url, key, mctx.signal))
                registered.push(key);
        }
        if (registered.length === 0) {
            rows.push(row("wiring", "miss", "none of the " + keys.length + " declared extra-model folder(s) answer on the engine" +
                (probed < keys.length ? " (probe budget stopped after " + probed + ")" : "") +
                " — the store↔engine wiring (extra_model_paths.yaml) never landed, so weights the estate lands are invisible to runs", "the BYO attach door: provision paths (writes extra_model_paths.yaml into the engine tree), then restart the engine"));
        }
        else {
            const absent = keys.filter((k) => !registered.includes(k));
            rows.push(row("wiring", "green", registered.length + "/" + keys.length + " declared folder(s) registered on the engine" +
                (absent.length > 0 ? " (not registered: " + absent.join(", ") + ")" : "") +
                (probed < keys.length ? " (probe budget stopped after " + probed + ")" : "")));
        }
    }
    return rows;
}
/** The one-line voice of a row (the render and the boot note share
 * it — one spelling of the verdict text).
 * @param r the axis row.
 * @returns "<axis>: green|miss — <detail>" (+ " · door: <door>"). */
export function preflightLine(r) {
    const head = r.axis + ": " + r.state + " — " + r.detail;
    return r.door === undefined ? head : head + " · door: " + r.door;
}
//# sourceMappingURL=managePreflight.js.map
