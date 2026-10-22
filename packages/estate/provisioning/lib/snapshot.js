import { join } from "node:path";
/** THE SNAPSHOT CHANNEL (the snapshot_provisions cure, 2026-10-21):
 *  the operator's burn — a Download button that answers "declares no
 *  downloadable provisions" over a family whose DECL pins two HF
 *  snapshot trees. The pure halves of the fetch live here so the
 *  service arms and the walls share one spelling (the script-era
 *  twins in comfyui-cordis/scripts/provision-models.ts own the
 *  CLI face; this module owns the seat's face). */
/** The snapshot dest derivation (folder/name under the models root).
 *  @param folder the DECL row's parent dir under the store root
 *  @param name the tree basename the lane loads
 *  @returns the store-relative dest dir */
export function snapshotDest(folder, name) {
    const sub = String(folder ?? "").trim().replace(/^\/+|\/+$/g, "");
    const leaf = String(name ?? "").trim();
    return sub === "" ? leaf : sub + "/" + leaf;
}
/** The files a snapshot row fetches (deterministic: sorted, deduped).
 *  An allow pattern is either an exact repo path (config.json) or a
 *  `dir/*` prefix for a whole subtree (speech_tokenizer/*).
 *  @param siblings the repo file list (paths)
 *  @param allowPatterns the row's allow_patterns
 *  @returns the matched files */
export function snapshotFilesForPatterns(siblings, allowPatterns) {
    const seen = new Set();
    const out = [];
    for (const file of siblings) {
        for (const pattern of allowPatterns) {
            if (patternMatches(file, pattern) && !seen.has(file)) {
                seen.add(file);
                out.push(file);
            }
        }
    }
    return out.sort();
}
/** ONE pattern law for both faces (the file set and the size
 *  denominator must match the SAME rows — two spellings would drift).
 *  Exact path or `dir/*` subtree prefix; nothing else.
 *  @param file the repo-relative path
 *  @param pattern the allow pattern
 *  @returns whether the pattern claims the file */
function patternMatches(file, pattern) {
    return pattern.endsWith("/*")
        ? file.startsWith(pattern.slice(0, -1)) && file.length > pattern.length - 1
        : file === pattern;
}
/** Is this body a stream (vs an async iterable)? One realm — the
 *  seat's own fetcher answers in-process, so instanceof is the
 *  whole truth (no cross-realm duck typing to honor).
 *  @param body the response body
 *  @returns true when the body reads through getReader() */
function isStreamBody(body) {
    return body instanceof ReadableStream;
}
async function bodyText(body) {
    if (body === null)
        return "";
    const chunks = [];
    if (isStreamBody(body)) {
        const reader = body.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (value !== undefined)
                chunks.push(value);
        }
    }
    else {
        for await (const chunk of body)
            chunks.push(chunk);
    }
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
        out.set(c, at);
        at += c.byteLength;
    }
    return new TextDecoder().decode(out);
}
/** The revision-pinned tree listing door.
 *  @param repoId the upstream repo (owner/name)
 *  @param revision the immutable pin
 *  @returns the tree listing url (recursive, pinned — the unpinned
 *    model-info listing was a drift seam: the file set could name
 *    paths the pin does not carry) */
export function snapshotTreeUrl(repoId, revision) {
    return "https://huggingface.co/api/models/" + repoId + "/tree/" + revision + "?recursive=true";
}
/** The repo file list behind a snapshot row, AT THE PIN — one door
 *  with the per-file sizes the progress denominator derives from.
 *  @param repoId the upstream repo (owner/name)
 *  @param revision the immutable pin
 *  @param fetchFn the seat's fetcher
 *  @param signal the operation's abort signal
 *  @returns the pinned tree's file rows (directories dropped, a
 *    missing size row counts 0) */
export async function hfTreeEntries(repoId, revision, fetchFn, signal) {
    const res = await fetchFn(snapshotTreeUrl(repoId, revision), signal);
    if (res.status !== 200) {
        throw new Error("HF repo list for " + repoId + " answered HTTP " + String(res.status));
    }
    const data = JSON.parse(await bodyText(res.body));
    if (!Array.isArray(data))
        return [];
    const out = [];
    for (const row of data) {
        if (typeof row !== "object" || row === null)
            continue;
        const r = row;
        if (r.type !== "file" || typeof r.path !== "string" || r.path === "")
            continue;
        out.push({ path: r.path, size: typeof r.size === "number" && Number.isFinite(r.size) ? r.size : 0 });
    }
    return out;
}
/** THE PROGRESS DENOMINATOR (the no-percent burn, 2026-10-21): the
 *  live 16GB joycaption fetch answered bytes/0 — no total, no
 *  percent, the operator's only signal a raw counter. The pinned
 *  tree listing carries per-file sizes; their sum over the MATCHED
 *  set (the same pattern law as the file set) is the denominator.
 *  An upstream row without a size counts 0 — an undercount, never
 *  an invented byte.
 *  @param entries the pinned tree's file rows
 *  @param allowPatterns the row's allow_patterns
 *  @returns the matched set's byte sum */
export function snapshotTotalForEntries(entries, allowPatterns) {
    let total = 0;
    for (const entry of entries) {
        for (const pattern of allowPatterns) {
            if (patternMatches(entry.path, pattern)) {
                total += entry.size;
                break;
            }
        }
    }
    return total;
}
/** The resolve url for one snapshot file at the pinned revision.
 *  @param repoId the upstream repo (owner/name)
 *  @param revision the immutable pin
 *  @param file the repo-relative path
 *  @returns the fetch url */
export function snapshotFileUrl(repoId, revision, file) {
    return "https://huggingface.co/" + repoId + "/resolve/" + revision + "/" + file;
}
/** THE SNAPSHOT PRESENCE PROBE — a tree counts present when every
 *  EXACT-named file of its declared allow set exists on disk and at
 *  least one of them is a weights anchor (model.safetensors OR a
 *  shard — sharded repos carry model.safetensors.index.json +
 *  model-0000X-of-0000Y.safetensors, never a single weights file:
 *  the joycaption law, 2026-10-21 — a hardcoded model.safetensors
 *  anchor called a complete 16GB sharded tree absent and would have
 *  re-fetched it). Glob rows (dir/*) cannot be probed exhaustively
 *  without a listing; the exact-named core carries the verdict.
 *  @param fileExists the store's file-presence predicate
 *  @param destDir the store-absolute tree dir
 *  @param exactFiles the row's allow patterns that name files
 *  @returns the presence verdict + the missing exact files (the
 *  refusal's own voice) */
export function snapshotTreePresent(fileExists, destDir, exactFiles) {
    const missing = exactFiles.filter((file) => !fileExists(join(destDir, file)));
    const weightsAnchor = exactFiles.some((file) => file === "model.safetensors" || file.endsWith(".safetensors"));
    return { present: exactFiles.length > 0 && missing.length === 0 && weightsAnchor, missing };
}
/** The exact-named patterns of an allow set (the presence probe's
 *  file list — globs probe nothing without a listing).
 *  @param allowPatterns the row's allow_patterns
 *  @returns the patterns that name one repo file each */
export function exactPatternFiles(allowPatterns) {
    return allowPatterns.filter((pattern) => !pattern.includes("*"));
}
//# sourceMappingURL=snapshot.js.map