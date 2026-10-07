// provision-models — declaration provision rows: ComfyUI-Manager queue + sha256 gate.
// Split from scripts/provision.ts (pure move — no logic changes).
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readSync, readFileSync, writeFileSync } from "node:fs";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { ComfyUiManagerHttpClient, ComfyUiManagerProvider, VerifiedArtifactWriter, } from "@melite/estate-provisioning";
import { loadCardDefs, provisionsByFamily } from "../src/cardDefs.js";
import { cascadeInit } from "../src/models/models.js";
import { defaultConfig, DRY, runtime, die, info, warn } from "./provision-shared.js";
import { boundModelFolders, engineUrl, loadConfig } from "./provision-config.js";
// ── models via the estate downloader + frozen catalog + sha256 gate ──
/** The Manager whitelist key this estate's declared rows match on:
 *  check_whitelist_for_model compares save_path+base+filename between
 *  the install payload and the model list, so both sides mint the
 *  same tag. */
export const MELITE_MODEL_BASE = "melite";
/**
 * Writes Manager's LOCAL model-list (read by get_data_by_mode('local')
 * from <manager-install>/model-list.json) with one row per declared
 * provision — the file that admits estate rows into Manager's install
 * whitelist. Deterministic: rows are sorted by save_path+filename so
 * repeated runs byte-match.
 *
 * @param listPath absolute path of the manager-local model-list.json
 * @param rows the declared provision rows (family + ProvisionRow)
 */
export function writeManagerLocalModelList(listPath, rows) {
    const list = rows
        .map(({ family, row }) => ({
        name: family + "/" + row.name,
        type: MELITE_MODEL_BASE,
        base: MELITE_MODEL_BASE,
        save_path: row.folder.replace(/^\/+|\/+$/g, ""),
        filename: row.name,
        url: row.url,
    }))
        .sort((a, b) => a.save_path + "/" + a.filename < b.save_path + "/" + b.filename ? -1 : 1);
    mkdirSync(dirname(listPath), { recursive: true });
    writeFileSync(listPath, JSON.stringify({ models: list }, null, 2) + "\n");
    info("  [model] manager local model-list: " + list.length +
        " rows → " + listPath);
}
/**
 * Pins Manager's security_level to 'weak' — the tier whose install
 * gates accept the declared-row channel (non-.safetensors installs
 * are otherwise refused unless their url sits in the public catalog).
 * The estate's per-row sha256 gate is the actual download boundary:
 * every queued file is digest-verified after Manager lands it, so
 * 'weak' plus verification is tighter than the default level without
 * it. Idempotent: replaces only the security_level line; reports
 * whether a RUNNING engine would need a restart (Manager caches its
 * config at read).
 *
 * @param configPath absolute path of user/__manager/config.ini
 * @returns true when the on-disk line was already 'weak'
 */
export function ensureManagerSecurityWeak(configPath) {
    const wanted = "security_level = weak";
    if (!existsSync(configPath)) {
        mkdirSync(dirname(configPath), { recursive: true });
        writeFileSync(configPath, "[default]\n" + wanted + "\n");
        info("  [model] manager config: security_level=weak (digest gate " +
            "owns the boundary; engine restart applies it)");
        return false;
    }
    const text = readFileSync(configPath, "utf8");
    const lines = text.split("\n");
    let seen = false;
    for (let i = 0; i < lines.length; i += 1) {
        if (/^\s*security_level\s*=/.test(lines[i])) {
            seen = lines[i].trim() === wanted;
            if (!seen) {
                lines[i] = wanted;
                writeFileSync(configPath, lines.join("\n"));
                info("  [model] manager config: security_level=weak (digest " +
                    "gate owns the boundary; engine restart applies it)");
            }
            return seen;
        }
    }
    writeFileSync(configPath, text.replace(/\n*$/u, "\n") + wanted + "\n");
    info("  [model] manager config: security_level=weak appended " +
        "(digest gate owns the boundary; engine restart applies it)");
    return false;
}
/** Cheap existence probe for DRY runs: confined path, no hashing. A
 *  symlink counts (the inspect read law resolves in-store links). */
async function artifactExists(storeRoot, relativePath) {
    try {
        const { resolveConfinedPath } = await import("@melite/estate-provisioning");
        const { lstat } = await import("node:fs/promises");
        const kind = await lstat(resolveConfinedPath(storeRoot, relativePath));
        return kind.isFile() || kind.isSymbolicLink();
    }
    catch {
        return false;
    }
}
export function sha256Of(path) {
    const h = createHash("sha256");
    const fd = openSync(path, "r");
    try {
        const chunk = Buffer.alloc(8 * 1024 * 1024);
        for (;;) {
            const n = readSync(fd, chunk, 0, chunk.length, null);
            if (n === 0)
                break;
            h.update(chunk.subarray(0, n));
        }
    }
    finally {
        closeSync(fd);
    }
    return h.digest("hex");
}
export async function catalogProvisions() {
    // The MODEL-side download places, TS-natively from the declaration
    // rows (the engine's provisionsByFamily — DECL provisions + card-
    // owned provisions; the model.py cell/provision walks died with
    // the py plane and the frozen catalog re-home died with the blob).
    // The boot never fires at import (ledger li-cq): callers of the
    // sync singleton readers await the shared entry first.
    await cascadeInit();
    const defs = await loadCardDefs();
    const byFamily = await provisionsByFamily(defs);
    const out = [];
    for (const fam of Object.keys(byFamily).sort()) {
        for (const row of byFamily[fam]?.provisions ?? [])
            out.push({ family: fam, row });
    }
    return out;
}
/** Deletes a landed artifact (a truncated partial) through the same
 *  confinement the writer enforces, so Manager's next queue round
 *  re-downloads instead of skipping the existing file.
 *
 *  @param storeRoot absolute store root
 *  @param relativePath store-relative artifact path
 */
async function removePartial(storeRoot, relativePath) {
    const { resolveConfinedPath } = await import("@melite/estate-provisioning");
    const { rm } = await import("node:fs/promises");
    await rm(resolveConfinedPath(storeRoot, relativePath), { force: true });
}
export async function fetchVerified(_workspace, storeRoot, label, url, name, sub, want, manager, tags) {
    const relativePath = sub === "" ? name : sub.replace(/^\/+|\/+$/gu, "") + "/" + name;
    const writer = new VerifiedArtifactWriter(storeRoot);
    // DRY is a PLAN, never the work (2026-10-12): hashing every present
    // row's full sha made --dry-run read 731GB off the estate store for
    // a download plan. A dry run probes EXISTENCE only — the real run
    // keeps the full inspect (sha gate) on every row.
    if (!DRY) {
        const existing = await writer.inspect({
            root: storeRoot,
            relativePath,
            expectedSha256: want,
        });
        if (existing.present)
            return "skipped";
    }
    else if (await artifactExists(storeRoot, relativePath)) {
        return "skipped";
    }
    info("  [model] " + label + " -> " + relativePath);
    if (DRY) {
        console.log("[dry-run] ComfyUI-Manager install_model " + url + " -> " + relativePath);
        return "planned";
    }
    if (manager === undefined) {
        warn("  [model] " + name + ": ComfyUI-Manager is unavailable; refusing a direct model download");
        return "bad";
    }
    // Manager marks a dead stream done (IncompleteRead class): the
    // landed bytes land short and only the digest gate sees it. Retry
    // the whole queue round after DELETING the partial — Manager skips
    // downloads whose destination file already exists.
    const attempts = 3;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        let queued = true;
        try {
            const installed = await manager.installModel({
                id: label,
                name,
                savePath: sub,
                url,
                filename: name,
                ...(tags === undefined ? {} : tags),
            });
            queued = installed.installed;
        }
        catch (error) {
            // An honest-budget timeout on a live link means the stream
            // died mid-file — same remedy as a digest mismatch.
            warn("  [model] " + name + ": attempt " + String(attempt) + "/" + String(attempts) +
                " " + (error instanceof Error ? error.message : String(error)).slice(0, 160));
            queued = false;
        }
        if (!queued && attempt < attempts) {
            await removePartial(storeRoot, relativePath);
            continue;
        }
        if (!queued) {
            warn("  [model] " + name + ": ComfyUI-Manager did not complete the install in " +
                String(attempts) + " attempts");
            return "bad";
        }
        const landed = await writer.inspect({
            root: storeRoot,
            relativePath,
            expectedSha256: want,
        });
        if (landed.present) {
            info("  [model] " + name + ": verified (" + landed.sha256 + ")");
            return "ok";
        }
        if (attempt < attempts) {
            warn("  [model] " + name + ": attempt " + String(attempt) + "/" + String(attempts) +
                " landed absent or mismatched bytes — deleting the partial and re-queueing");
            await removePartial(storeRoot, relativePath);
            continue;
        }
        warn("  [model] " + name + ": Manager queue completed but declared bytes are absent or mismatched");
        return "bad";
    }
    return "bad";
}
// ── snapshot dirs via the HF resolve channel ──
// A single-file ProvisionRow cannot name a whole HF dir.
// Snapshot rows pin one instead (repo + revision + patterns).
// Manager's install_model queue moves single files only, so these
// rows ride the estate's own fetch: plain HTTPS against the HF
// resolve endpoint, one file per allow-pattern hit, landed straight
// into the models tree.
// The revision pin makes the bytes immutable.
/** The snapshot dest derivation (the single-file twin strips
 *  slashes the same way in stepModels).
 *  @param folder the parent dir under the models root
 *  @param name the tree basename the lane loads
 *  @returns the models-relative dest dir (folder/name) */
export function snapshotDest(folder, name) {
    const sub = String(folder ?? "").trim().replace(/^\/+|\/+$/g, "");
    const leaf = String(name ?? "").trim();
    return sub === "" ? leaf : sub + "/" + leaf;
}
/** The files a snapshot row fetches (deterministic: sorted).
 *  An allow pattern is either an exact repo path (config.json) or
 *  a `dir/*` prefix for a whole subtree (speech_tokenizer/*).
 *  @param siblings the repo file list (HF API rfilenames)
 *  @param allowPatterns the row's allow_patterns
 *  @returns the matched files, deduped and sorted */
export function snapshotFilesForPatterns(siblings, allowPatterns) {
    const seen = new Set();
    const out = [];
    for (const file of siblings) {
        for (const pattern of allowPatterns) {
            const hit = pattern.endsWith("/*")
                ? file.startsWith(pattern.slice(0, -1)) && file.length > pattern.length - 1
                : file === pattern;
            if (hit && !seen.has(file)) {
                seen.add(file);
                out.push(file);
            }
        }
    }
    return out.sort();
}
/** The load-bearing files every TTS snapshot must land.
 *  The vendored node loads from_pretrained on the dir, which reads
 *  the config plus the weights plus the speech tokenizer.
 *  @param files the expanded snapshot file list
 *  @returns true when the list covers the load set */
export function snapshotCoversLoadSet(files) {
    return files.includes("config.json") &&
        files.includes("model.safetensors") &&
        files.some((f) => f.startsWith("speech_tokenizer/") && f.length > "speech_tokenizer/".length);
}
/** The repo file list behind a snapshot row.
 *  @param repoId the upstream repo (owner/name)
 *  @param fetchFn the fetch implementation (injectable for tests)
 *  @returns the sibling rfilenames */
export async function hfRepoFiles(repoId, fetchFn = globalThis.fetch) {
    const res = await fetchFn("https://huggingface.co/api/models/" + repoId);
    if (!res.ok) {
        throw new Error("HF repo list for " + repoId + " answered HTTP " + String(res.status));
    }
    const data = await res.json();
    const siblings = Array.isArray(data?.siblings) ? data.siblings : [];
    return siblings
        .map((s) => typeof s?.rfilename === "string" ? s.rfilename : "")
        .filter((f) => f !== "");
}
/** The snapshot presence probe (the fetchable-tree receipt).
 *  A tree counts present when its dir holds the load set's two
 *  anchor files (config + weights).
 *  @param storeRoot the models tree root
 *  @param folder the row's parent dir under the root
 *  @param name the tree basename
 *  @returns true when the landed tree loads */
export function snapshotDirPresent(storeRoot, folder, name) {
    const dir = join(storeRoot, snapshotDest(folder, name));
    return existsSync(join(dir, "config.json")) && existsSync(join(dir, "model.safetensors"));
}
/** The declared snapshot rows (family + row, all families).
 *  @returns the snapshot channel rows */
export async function catalogSnapshotProvisions() {
    await cascadeInit();
    const { modelIds, getModel } = await import("../src/models/models.js");
    const out = [];
    for (const id of modelIds()) {
        out.push(...(getModel(id).snapshot_provisions ?? []).map((row) => ({ family: id, row })));
    }
    return out;
}
/**
 * Fetches one snapshot row (DRY-aware).
 * DRY is an existence probe (present/skipped, else planned).
 * A real pass downloads every pattern hit the tree lacks, then
 * verifies the load set landed.
 * @param storeRoot the models tree root
 * @param family the declaring family id
 * @param row the snapshot row
 * @param fetchFn the fetch implementation (injectable for tests)
 * @returns ok (landed), bad (fetch or verify failed), skipped
 * (already present), planned (DRY and absent) */
export async function fetchSnapshotVerified(storeRoot, family, row, fetchFn = globalThis.fetch) {
    const dest = snapshotDest(row.folder, row.name);
    const label = family + "/snapshot/" + row.name;
    if (!DRY && snapshotDirPresent(storeRoot, row.folder, row.name)) {
        return "skipped";
    }
    if (DRY) {
        if (snapshotDirPresent(storeRoot, row.folder, row.name))
            return "skipped";
        info("  [model] " + label + ": planned HF snapshot " +
            row.repo_id + "@" + row.revision + " → " + dest);
        return "planned";
    }
    info("  [model] " + label + ": fetching HF snapshot " +
        row.repo_id + "@" + row.revision);
    let siblings;
    try {
        siblings = await hfRepoFiles(row.repo_id, fetchFn);
    }
    catch (error) {
        warn("  [model] " + label + ": repo list failed — " +
            (error instanceof Error ? error.message : String(error)).slice(0, 160));
        return "bad";
    }
    const files = snapshotFilesForPatterns(siblings, row.allow_patterns);
    if (!snapshotCoversLoadSet(files)) {
        warn("  [model] " + label + ": allow_patterns miss the load set " +
            "(config.json + model.safetensors + speech_tokenizer/) — refusing (a partial tree never loads)");
        return "bad";
    }
    for (const file of files) {
        const landed = join(storeRoot, dest, file);
        if (existsSync(landed))
            continue;
        const url = "https://huggingface.co/" + row.repo_id + "/resolve/" + row.revision + "/" + file;
        try {
            const res = await fetchFn(url);
            if (!res.ok || res.body === null) {
                throw new Error("HTTP " + String(res.status));
            }
            mkdirSync(dirname(landed), { recursive: true });
            await finished(Readable.fromWeb(res.body).pipe(createWriteStream(landed)));
        }
        catch (error) {
            warn("  [model] " + label + ": " + file + " failed — " +
                (error instanceof Error ? error.message : String(error)).slice(0, 160));
            return "bad";
        }
    }
    if (!snapshotDirPresent(storeRoot, row.folder, row.name)) {
        warn("  [model] " + label + ": fetch completed but the tree lacks config.json or model.safetensors");
        return "bad";
    }
    info("  [model] " + label + ": snapshot landed (" + String(files.length) + " files)");
    return "ok";
}
/** The loud miss for a merged tree (no upstream repo exists, so no
 *  snapshot row can fetch it — the operator places the built tree).
 *  The folder sentence is the vendored node's own (its _ensure_variant
 *  miss names this folder when the tree is absent).
 *  @param family the declaring family id
 *  @param tree the absent tree entry
 *  @returns the miss sentence */
export function mergedTreeMiss(family, tree) {
    return "qwen3_tts: variant tree '" + tree + "' (family '" + family + "') is not available locally. " +
        "This tree is an operator merge with no upstream repo, so no snapshot row fetches it. " +
        "Place the built tree under the `qwen3_tts` model folder declared in extra_model_paths.yaml " +
        "(image-gen/comfyui/audio/qwen3-tts/hf/).";
}
/** The hand-placed presence receipt (the merged-tree arm of fix 8).
 *  Every hand-placed tree must resolve under one of the TTS folder
 *  roots with a config.json (mirrors the vendored multi-root walk:
 *  audiocpp first, then the qwen3_tts folder).
 *  @param storeRoot the models tree root
 *  @param roots the TTS folder roots (models-relative, audiocpp then qwen3_tts)
 *  @param families the families to verify
 *  @returns the present trees plus the missing split (merged vs fetch-covered) */
export function verifyHandPlacedTrees(storeRoot, roots, families) {
    const present = [];
    const missingMerged = [];
    const missingFetched = [];
    for (const { family, handPlaced, fetched } of families) {
        for (const tree of handPlaced) {
            const clean = tree.replace(/^\/+|\/+$/g, "");
            const hit = roots.some((root) => existsSync(join(storeRoot, root, clean, "config.json")));
            if (hit) {
                present.push(family + ":" + tree);
                continue;
            }
            const base = clean.split("/").pop() ?? clean;
            const entry = { family, tree };
            if (fetched.includes(tree) || fetched.includes(base))
                missingFetched.push(entry);
            else
                missingMerged.push(entry);
        }
    }
    return { present, missingMerged, missingFetched };
}
export async function stepModels() {
    const cfg = loadConfig(defaultConfig());
    if (cfg.provision !== "managed") {
        die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
            "deployments own their model tree; the estate never " +
            "downloads into a user workspace");
    }
    {
        const bound = boundModelFolders(cfg);
        const storeRoot = bound.download_path;
        let manager;
        if (!DRY) {
            try {
                const endpoint = engineUrl(cfg);
                if (endpoint === "")
                    throw new Error("ComfyUI endpoint URL is not configured");
                manager = new ComfyUiManagerProvider(
                // The floor wait fits an unknown-size artifact on a slow
                // link (multi-GB model files, not extensions); rows that
                // declare size_bytes raise it further at the provider.
                new ComfyUiManagerHttpClient({ baseUrl: endpoint, requestTimeoutMs: 30_000, queueTimeoutMs: 900_000 }));
            }
            catch (error) {
                die("ComfyUI-Manager is required for model provisioning: " + (error instanceof Error ? error.message : String(error)));
            }
            // The declared rows ride Manager's LOCAL model-list channel:
            // /manager/queue/install_model whitelists every request by
            // save_path+base+filename against the channel catalog
            // (manager_server.py check_whitelist_for_model), and most
            // estate rows (pinned HF artifacts) exist in NO public
            // catalog. get_data_by_mode('local') reads
            // <manager-install>/model-list.json — the sanctioned file for
            // exactly this. Non-.safetensors files additionally require
            // security_level 'weak' (the url-whitelist tier); the estate's
            // per-row sha256 gate is the actual boundary, so 'weak' plus
            // digest verification is tighter than the default level
            // without it. Both writes are idempotent; a running engine
            // reads the local list per request but caches its config —
            // restart the engine when the security line changes.
            const rows = await catalogProvisions();
            const listPath = join(runtime(), "custom_nodes", "comfyui-manager", "model-list.json");
            if (existsSync(dirname(listPath))) {
                writeManagerLocalModelList(listPath, rows);
            }
            else {
                warn("  [model] ComfyUI-Manager is not installed yet — local " +
                    "model-list NOT written (run the extensions step first)");
            }
            ensureManagerSecurityWeak(join(runtime(), "user", "__manager", "config.ini"));
        }
        let ok = 0, bad = 0, skipped = 0, planned = 0;
        for (const { family, row } of await catalogProvisions()) {
            const url = String(row.url ?? "");
            const name = String(row.name ?? "").trim();
            const sub = String(row.folder ?? "").trim()
                .replace(/^\/+|\/+$/g, "");
            const want = String(row.sha256 ?? "").trim().toLowerCase();
            if (!url || !name) {
                warn("  [model] " + family + " provision " + JSON.stringify(name) +
                    " has no url/name — refusing (declare the download place, " +
                    "never guess it)");
                bad += 1;
                continue;
            }
            if (!want) {
                warn("  [model] " + family + " provision " + JSON.stringify(name) +
                    " has no sha256 — refusing (unverifiable bytes never land)");
                bad += 1;
                continue;
            }
            const st = await fetchVerified("", storeRoot, family + "/provision/" + name, url, name, sub, want, manager, { type: MELITE_MODEL_BASE, base: MELITE_MODEL_BASE,
                ...(row.size_bytes === undefined ? {} : { sizeBytes: row.size_bytes }) });
            if (st === "ok")
                ok += 1;
            else if (st === "bad")
                bad += 1;
            else if (st === "planned")
                planned += 1;
            else
                skipped += 1;
        }
        // THE SNAPSHOT LOOP (the audit's fix 8): whole HF dirs ride
        // the resolve channel, never the Manager queue.
        // A row whose dest is already a loadable tree is skipped.
        let snapOk = 0, snapBad = 0, snapSkipped = 0, snapPlanned = 0;
        const snapshots = await catalogSnapshotProvisions();
        for (const { family, row } of snapshots) {
            const st = await fetchSnapshotVerified(storeRoot, family, row);
            if (st === "ok")
                snapOk += 1;
            else if (st === "bad")
                snapBad += 1;
            else if (st === "planned")
                snapPlanned += 1;
            else
                snapSkipped += 1;
        }
        // THE HAND-PLACED RECEIPT (the merged-tree arm of fix 8): the
        // operator merges have no upstream repo, so provision cannot
        // fetch them — but it must say so LOUD, with the node's own
        // folder sentence, never a silent skip.
        // The roots mirror the vendored multi-root walk (audiocpp, then
        // the qwen3_tts folder); the DECLs stay the tree truth.
        {
            const { getModel } = await import("../src/models/models.js");
            const checks = [];
            for (const id of ["qwen3-tts", "qwen3-tts-voicedesign"]) {
                try {
                    const decl = getModel(id);
                    checks.push({
                        family: id,
                        handPlaced: [...(decl.hand_placed_weights ?? [])],
                        fetched: (decl.snapshot_provisions ?? []).map((r) => r.name),
                    });
                }
                catch {
                    warn("  [model] family '" + id + "' did not resolve — hand-placed receipt skipped");
                }
            }
            const roots = [
                bound.folders["audiocpp"],
                bound.folders["qwen3_tts"],
            ].filter((r) => typeof r === "string" && r !== "");
            const verdict = verifyHandPlacedTrees(storeRoot, roots.length > 0 ? roots : ["audio", "audio/qwen3-tts/hf"], checks);
            for (const { family, tree } of verdict.missingFetched) {
                warn("  [model] " + family + " tree '" + tree + "' is snapshot-covered but absent — the snapshot fetch above failed it");
            }
            for (const { family, tree } of verdict.missingMerged) {
                warn("  [model] " + mergedTreeMiss(family, tree));
            }
            info("hand-placed: " + String(verdict.present.length) + " present, " +
                String(verdict.missingMerged.length) + " operator merges to place by hand, " +
                String(verdict.missingFetched.length) + " snapshot trees still absent");
        }
        if (ok === 0 && skipped === 0 && bad === 0 && planned === 0 &&
            snapOk === 0 && snapSkipped === 0 && snapBad === 0 && snapPlanned === 0) {
            info("no frozen-catalog provisions declared");
            return true;
        }
        // DRY presence is an EXISTENCE probe — the sha gate runs only in
        // a real pass, and the plan says so (never "verified"). PLANNED
        // rows are the plan itself: what a real run would queue.
        info("models: " + ok + " downloaded+verified, " + skipped +
            " present" + (DRY ? " (dry: existence probe, sha unverified)" : "") +
            ", " + planned + " planned, " + bad + " failed");
        info("snapshots: " + snapOk + " landed, " + snapSkipped +
            " present" + (DRY ? " (dry: existence probe)" : "") +
            ", " + snapPlanned + " planned, " + snapBad + " failed");
        return bad === 0 && snapBad === 0;
    }
}
//# sourceMappingURL=provision-models.js.map
