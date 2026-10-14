// comfyui-outputs.ts — history verdicts + artifact harvest + channel publish (native 438-522).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
// ── harvest (native 459-522) ──
/** The /view artifact-fetch budget (stroke 83): the run's own
 *  timeout when it EXCEEDS the 180s floor, else the
 *  floor. The harvest rides the run's budget — a long run may
 *  serve large artifacts without the fetch fuse firing first —
 *  while short runs keep the 180s floor (never a raw
 *  timeoutS*1000 shrink). Exported for the formula wall. */
export function viewTimeoutMs(timeoutS) {
    return Math.max(180_000, normalizeTimeoutS(timeoutS) * 1000);
}
export async function fetchOutputArtifacts(client, runDir, entry, timeoutS) {
    mkdirSync(runDir, { recursive: true });
    const artifacts = [];
    const outputs = entry["outputs"];
    if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs)) {
        return artifacts;
    }
    const viewTimeout = viewTimeoutMs(timeoutS);
    for (const [nodeId, nodeOut] of Object.entries(outputs)) {
        if (typeof nodeOut !== "object" || nodeOut === null || Array.isArray(nodeOut)) {
            continue;
        }
        const rec = nodeOut;
        for (const kind of [
            "images",
            "gifs",
            "audio",
            "video",
            "3d",
            "three_model",
            "result",
            "files",
        ]) {
            let raw = rec[kind] ?? [];
            if (!Array.isArray(raw))
                continue;
            if (kind === "result" && raw.length > 0 && typeof raw[0] === "string") {
                raw = [raw]; // flat tuple-row: the whole list IS the row
            }
            for (const f of raw) {
                let filename = "";
                let sub = "";
                let ftype = "output";
                if (typeof f === "object" && f !== null && !Array.isArray(f)) {
                    const fr = f;
                    if (!fr["filename"])
                        continue;
                    filename = String(fr["filename"]);
                    sub = String(fr["subfolder"] ?? "");
                    ftype = String(fr["type"] ?? "output");
                }
                else if (Array.isArray(f) && f.length > 0 && typeof f[0] === "string" && f[0] !== "") {
                    filename = f[0];
                    sub =
                        f.length > 1 && typeof f[1] === "string" ? f[1] : "";
                    ftype =
                        f.length > 2 && typeof f[2] === "string" && f[2] !== ""
                            ? f[2]
                            : "output";
                }
                else {
                    continue;
                }
                const name = basename(filename);
                const dest = join(runDir, sub !== "" ? nodeId + "_" + name : name);
                // THE SPLIT CATCH (audit M-S9): only the REMOTE half folds —
                // one unreachable artifact never kills the harvest. The
                // local write below throws loud: disk-full, permission, and
                // read-only-dir failures must not silently shrink the
                // artifact set a success receipt then attests to.
                let raw;
                let ct;
                try {
                    const resp = await client.fetchApi("/view?" +
                        new URLSearchParams({
                            filename,
                            subfolder: sub,
                            type: ftype,
                        }).toString(), { signal: AbortSignal.timeout(viewTimeout) });
                    ct = resp.headers.get("content-type") ?? "";
                    raw = Buffer.from(await resp.arrayBuffer());
                }
                catch {
                    /* one unreachable artifact never kills the harvest (the
                     * remote half only — the local write throws loud below) */
                    continue;
                }
                // a JSON artifact (a result row) re-serializes pretty
                // (indent 2, raw UTF-8) instead of riding minified.
                let blob = raw;
                if (ct.includes("json")) {
                    try {
                        blob = Buffer.from(JSON.stringify(JSON.parse(raw.toString("utf8")), null, 2), "utf8");
                    }
                    catch {
                        /* raw bytes ride */
                    }
                }
                writeFileSync(dest, blob);
                artifacts.push({ nodeId, path: dest, kind });
            }
        }
    }
    return artifacts;
}
export async function fetchOutputs(client, runDir, entry, timeoutS) {
    return (await fetchOutputArtifacts(client, runDir, entry, timeoutS)).map((artifact) => artifact.path);
}
// ── channel publish (native 438-458) ──
/** FILE-kind -> artifact extensions. */
export const CHANNEL_EXTS = {
    mesh: [".glb", ".gltf", ".obj", ".fbx", ".usd", ".usdz"],
    image: [".png", ".jpg", ".jpeg", ".webp"],
    video: [".mp4", ".webm", ".mov", ".avi", ".mkv"],
    audio: [".wav", ".mp3", ".ogg", ".flac"],
    // THE MASK CHANNEL (the stroke-103 debt): the mask card declares
    // outputs { default: 'seg' } — with no row here, publishOutputChannels
    // skipped the channel SILENTLY (line's `if (!exts) continue`): every
    // mask run published zero outputs to the card face. Masks are
    // SaveImage PNGs.
    seg: [".png"],
    // THE TEXT CHANNEL (the tagger publish-plane gap, 2026-10-24 — the
    // stroke-103 debt's documented twin): the tagger card declares
    // outputs { default: 'text' } — with no row here,
    // publishOutputChannels skipped the channel SILENTLY (the same
    // `if (!exts) continue`) and the assert exempted it: every tagger
    // run published zero outputs to the card face. SaveText's own
    // format set (comfy_extras/nodes_text.py FORMAT_EXTENSIONS —
    // the estate text vocabulary's own four).
    text: [".txt", ".csv", ".md", ".json"],
};
/** THE QVOICE CHANNEL (roadmap OWED 2026-09-24 — the export FULL
 *  PATH, transcript-026 #4): the vendored AudiocoreVoiceStudio
 *  export node returns its minted .qvoice ABSOLUTE path in the
 *  history ui dict (`outputs[<node>].qvoice_path = [path]`) — the
 *  file lives engine-side in the voices root, never the ComfyUI
 *  output dir, so /view cannot fetch it. Collect the FIRST
 *  non-empty string (one design lane per run — the single-stage
 *  gateway law) so the stage's result_outputs carry the exact
 *  collision-numbered path; the harness never hardcodes the
 *  voices root (the path rides verbatim from the engine). Pure:
 *  shared by the single and merge harvests. */
export function qvoicePathsOf(outputs) {
    if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs))
        return "";
    for (const nodeOut of Object.values(outputs)) {
        if (typeof nodeOut !== "object" || nodeOut === null || Array.isArray(nodeOut))
            continue;
        const raw = nodeOut["qvoice_path"];
        if (!Array.isArray(raw))
            continue;
        for (const p of raw) {
            if (typeof p === "string" && p.trim() !== "")
                return p.trim();
        }
    }
    return "";
}
/** THE LOUDNESS RECEIPT (§39's law, 2026-09-25): the MeliteLoudness
 *  passthrough meter stamps its reading into the node's history UI
 *  dict (loudness_lufs / peak_db — BS.1770-4 integrated, K-weighted
 *  + gated, calibrated within 0.1 LU of ffmpeg's ebur128). Collect
 *  the first finite reading so the stage's result_outputs carry the
 *  number — every surface REPORTS it instead of re-deriving it from
 *  the encoded file. Pure: shared by both harvest seats. */
/** THE UI LIST LAW (run-a248c5614633 receipt, 2026-09-25): the nodes
 *  write every ui entry as a one-element list (ComfyUI's merge extends
 *  lists; scalars kill the prompt). The collector unwraps BOTH shapes
 *  — the bare number (the original form) and its 1-list. */
const scalarOf = (v) => {
    if (typeof v === "number" && Number.isFinite(v))
        return v;
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "number" && Number.isFinite(v[0])) {
        return v[0];
    }
    return undefined;
};
export function loudnessOf(outputs) {
    if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs))
        return null;
    for (const nodeOut of Object.values(outputs)) {
        if (typeof nodeOut !== "object" || nodeOut === null || Array.isArray(nodeOut))
            continue;
        const row = nodeOut;
        const lufs = scalarOf(row["loudness_lufs"]);
        const peak = scalarOf(row["peak_db"]);
        if (lufs !== undefined && peak !== undefined) {
            return { loudness_lufs: lufs, peak_db: peak };
        }
    }
    return null;
}
/** THE FRESHNESS RECEIPT (the loudness sibling, 2026-09-26): the
 *  MeliteQVoiceCopy node stamps which voice file won and whether
 *  that mint predates the run (reused_existing) into its history UI
 *  dict — under THE UI LIST LAW every entry a 1-list. That flag is
 *  the ONLY signal guarding the single-tenant voice-name law, and
 *  until this collector it was minted and thrown away (the BRIEF14
 *  commission derived it by hand from the winning file's mtime —
 *  transcript-0034's finding). Collect the first coherent pair so
 *  the stage's result_outputs carry the fact every surface can
 *  report. Pure: shared by both harvest seats. */
const boolOf = (v) => {
    if (typeof v === "boolean")
        return v;
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "boolean")
        return v[0];
    return undefined;
};
const stringOf = (v) => {
    if (typeof v === "string" && v.trim() !== "")
        return v.trim();
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string" && v[0].trim() !== "") {
        return v[0].trim();
    }
    return undefined;
};
export function qvoiceFreshnessOf(outputs) {
    if (typeof outputs !== "object" || outputs === null || Array.isArray(outputs))
        return null;
    for (const nodeOut of Object.values(outputs)) {
        if (typeof nodeOut !== "object" || nodeOut === null || Array.isArray(nodeOut))
            continue;
        const row = nodeOut;
        const reused = boolOf(row["reused_existing"]);
        const file = stringOf(row["voice_file"]);
        if (reused !== undefined && file !== undefined) {
            return { reused_existing: reused, voice_file: file };
        }
    }
    return null;
}
/** Harvested paths -> {channel: path} for the FILE-kind channels
 *  the stage DECLARED. First unmatched artifact wins per channel,
 *  declaration order. */
export function publishOutputChannels(outputs, artifacts, bindings = {}, records = []) {
    const published = {};
    const claimed = new Set();
    for (const [channel, kind] of Object.entries(outputs ?? {})) {
        const nodeId = bindings[channel];
        if (nodeId !== undefined) {
            const artifact = records.find((record) => record.nodeId === nodeId);
            // THE DECLARED CHANNEL'S KIND IS THE LAW HERE TOO: the
            // binding says which node serves the channel, not that the
            // node's artifact is of that kind. Without this check an
            // action that returns its PROOF RENDERER published a PNG as a
            // `mesh` channel and every gate stayed green — only a live
            // run's own assertion caught it. A declared node whose
            // artifact is the wrong kind publishes nothing here, and
            // assertPublishedOutputChannels then names the channel.
            const exts = CHANNEL_EXTS[String(kind)];
            if (artifact !== undefined &&
                (exts === undefined ||
                    exts.some((extension) => artifact.path.toLowerCase().endsWith(extension)))) {
                published[channel] = artifact.path;
                claimed.add(artifact.path);
            }
            continue;
        }
        const exts = CHANNEL_EXTS[String(kind)];
        if (!exts)
            continue;
        for (const art of artifacts ?? []) {
            if (claimed.has(art))
                continue;
            if (exts.some((extension) => art.toLowerCase().endsWith(extension))) {
                published[channel] = art;
                claimed.add(art);
                break;
            }
        }
    }
    return published;
}
export function assertPublishedOutputChannels(outputs, published, bindings) {
    const missing = Object.keys(bindings).filter((channel) => published[channel] === undefined);
    if (missing.length > 0) {
        throw new Error(`declared output node(s) ${missing.join(', ')} produced no artifact`);
    }
    for (const channel of Object.keys(outputs)) {
        if (bindings[channel] === undefined && published[channel] === undefined) {
            const kind = String(outputs[channel]);
            if (CHANNEL_EXTS[kind] !== undefined) {
                throw new Error(`declared ${kind} output '${channel}' produced no artifact`);
            }
        }
    }
}
/** THE AGENT-READABLE EXECUTION ERROR (agent-debt F-1, 2026-09-22:
 * the maker-test film run failed twice at the same sampler node and
 * the error voice carried node_id + the executed list ONLY — the raw
 * JSON sliced at 400 chars spent its whole budget before the
 * exception. The agent saw WHICH node died, never WHY, and guessed
 * its retry strategy blind). ComfyUI's execution_error payload
 * carries the cause: exception_type, exception_message, traceback.
 * Voice the cause FIRST (type: message), then the node, then the
 * traceback's deepest frames — the tail holds the raise site
 * (allocation sizes, shape mismatches); the executed list compresses
 * to a count. */
function voiceExecutionError(e) {
    if (typeof e !== "object" || e === null || Array.isArray(e)) {
        return JSON.stringify(e).slice(0, 400);
    }
    const r = e;
    const type = typeof r["exception_type"] === "string" ? r["exception_type"] : "";
    const message = typeof r["exception_message"] === "string" ? r["exception_message"] : "";
    const rawNode = r["node_id"] ?? r["node"];
    const nodeId = typeof rawNode === "string" ? rawNode : typeof rawNode === "number" ? String(rawNode) : "?";
    const nodeType = typeof r["node_type"] === "string" ? r["node_type"] : "?";
    const executed = Array.isArray(r["executed"]) ? r["executed"].length : 0;
    const rawTb = typeof r["traceback"] === "string" ? r["traceback"] : "";
    const tbTail = rawTb.length > 600 ? "…" + rawTb.slice(-600) : rawTb;
    const head = type !== "" || message !== ""
        ? `${type !== "" ? type : "ExecutionError"}${message !== "" ? `: ${message}` : ""} @ ${nodeId} (${nodeType}${executed > 0 ? `, ${executed} nodes executed before the failure` : ""})`
        : `execution failed @ ${nodeId} (${nodeType})`;
    const out = tbTail !== "" ? `${head} — traceback tail: ${tbTail}` : head;
    return out.length > 2000 ? out.slice(0, 2000) + "…" : out;
}
/** Map one history entry to its verdict — the read half of the
 *  poll loop (native 394-408 / mergegraph 350-363, minus the WS
 *  execution_error arm which has no tap here). */
export function mapHistoryEntry(entry) {
    if (entry === null || entry === undefined)
        return { kind: "pending" };
    const statusD = entry["status"];
    const rec = typeof statusD === "object" && statusD !== null && !Array.isArray(statusD)
        ? statusD
        : {};
    if (rec["status_str"] === "error") {
        const msgs = rec["messages"];
        let detail = JSON.stringify(rec).slice(0, 400);
        if (Array.isArray(msgs)) {
            for (const m of msgs) {
                if (Array.isArray(m) &&
                    m.length > 1 &&
                    m[0] === "execution_error") {
                    detail = voiceExecutionError(m[1]);
                    break;
                }
            }
        }
        return { kind: "failed", detail };
    }
    if (rec["completed"] !== true)
        return { kind: "pending" };
    return { kind: "completed" };
}
// ── timeout budget (relocated verbatim with the harvest half that
//    consumes it: viewTimeoutMs above is its only outputs-side caller;
//    the execute/merge spans import it from here — one spelling) ──
/** Normalize a stage timeout_s to a finite positive budget (seconds).
 *  Garbage (0, negatives, NaN, Infinity, non-numeric strings) rides
 *  the 2400 default — the single path's old `Number(...) || 2400`
 *  kept truthy Infinity/negatives, and the flow path's isFinite-only
 *  guard kept negatives (audit finding, stroke 82). One spelling for
 *  both paths now. */
export function normalizeTimeoutS(v) {
    const n = Number(v ?? 2400);
    return Number.isFinite(n) && n > 0 ? n : 2400;
}
//# sourceMappingURL=comfyui-outputs.js.map
