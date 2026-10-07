import { servableLeaf } from "@melite/contracts/mediaKinds";
// runsList.ts — the runs LIST surface (REBUILD-7, gateway kill):
// the retired runs door's list arm (GET /v1/flows/runs, the restore port) re-homed verbatim into the queue package as the registry's `list` business arm.
// The sidecar byte-surgery helpers are the door's own bodies, second move unchanged (the section notes below name the reader each helper implements).
//
// TWO re-homes ride this stroke (ledgered):
//  - mediaVocab: the media-kinds.json DATA file died with the media
//    client (5cbb5bcc); the vocabulary re-homes as TYPED DATA in
//    ./mediaKinds.ts (same sets, lowered; the $comment laws moved
//    into that file) — no repo-anchored file reads, no cache.
//  - ASSET_URL_PREFIX ("/v1/assets/runs") died with the app: url +
//    thumbnail carry run-RELATIVE names ("run-x/img.png"), the same
//    divergence-by-order law as the live payload (REBUILD-6). The
//    row SCHEMA is byte-pinned by the wall; the web callers migrate
//    on their stroke.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mediaVocab } from "./mediaKinds.js";
import { engineFilmName } from "./filmLead.js";
/** Leading-int read (sidecar tails): optional space, optional
 *  sign, then digits; 0 when no digits lead. */
export function parseLeadingInt(s) {
    // (group 1 always participates on match — the undefined fence is dead.)
    const m = /^[\s]*([+-]?\d+)/.exec(s);
    if (m === null)
        return 0;
    return Number(m[1]);
}
/** sidecar_num: first `"key":`, strtol the tail, default when the key is absent. */
export function sidecarNum(text, key, dflt) {
    const needle = '"' + key + '":';
    const i = text.indexOf(needle);
    if (i < 0)
        return dflt;
    return parseLeadingInt(text.slice(i + needle.length));
}
/** sidecar_str: BYTE-wise exact — first `"key":`, skip spaces/tabs, expect `"`, decode \\n \\r \\t \" \\ (any other escape lands literally — \u stays "u"), stop at cap-1 BYTES. Operates on the UTF-8 bytes (D5). */
export function sidecarStr(raw, key, cap) {
    const pat = Buffer.from('"' + key + '":', "utf8");
    let at = -1;
    outer: for (let i = 0; i + pat.length <= raw.length; i++) {
        for (let j = 0; j < pat.length; j++) {
            if (raw[i + j] !== pat[j])
                continue outer;
        }
        at = i;
        break;
    }
    if (at < 0)
        return "";
    let p = at + pat.length;
    while (p < raw.length && (raw[p] === 0x20 || raw[p] === 0x09))
        p++;
    if (p >= raw.length || raw[p] !== 0x22)
        return "";
    p++;
    const out = [];
    while (p < raw.length && raw[p] !== 0x22 && out.length + 1 < cap) {
        if (raw[p] === 0x5c && p + 1 < raw.length) {
            p++;
            const e = raw[p];
            out.push(e === 0x6e ? 0x0a : e === 0x72 ? 0x0d : e === 0x74 ? 0x09 : e);
            p++;
        }
        else {
            out.push(raw[p]);
            p++;
        }
    }
    return Buffer.from(out).toString("utf8");
}
/** _sidecar_str_impl found-ness: only the runs-list status site reads it — a present-but-empty "status" serves "" (the gate then skips the row), while an absent/non-string key serves "unknown". */
export function sidecarStrFound(raw, key, cap) {
    const pat = Buffer.from('"' + key + '":', "utf8");
    let at = -1;
    outer: for (let i = 0; i + pat.length <= raw.length; i++) {
        for (let j = 0; j < pat.length; j++) {
            if (raw[i + j] !== pat[j])
                continue outer;
        }
        at = i;
        break;
    }
    if (at < 0)
        return [false, ""];
    let p = at + pat.length;
    while (p < raw.length && (raw[p] === 0x20 || raw[p] === 0x09))
        p++;
    if (p >= raw.length || raw[p] !== 0x22)
        return [false, ""];
    p++;
    const out = [];
    while (p < raw.length && raw[p] !== 0x22 && out.length + 1 < cap) {
        if (raw[p] === 0x5c && p + 1 < raw.length) {
            p++;
            const e = raw[p];
            out.push(e === 0x6e ? 0x0a : e === 0x72 ? 0x0d : e === 0x74 ? 0x09 : e);
            p++;
        }
        else {
            out.push(raw[p]);
            p++;
        }
    }
    return [true, Buffer.from(out).toString("utf8")];
}
export function artifactType(name) {
    const kinds = mediaVocab();
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
    if (kinds.image.includes(ext))
        return "image";
    if (kinds.audio.includes(ext))
        return "audio";
    if (kinds.video.includes(ext))
        return "video";
    if (kinds.model.includes(ext))
        return "model";
    if (ext === "json")
        return "spec";
    if (ext === "txt" || ext === "md" || ext === "yaml")
        return "text";
    return "file";
}
/** Byte-wise name order (the sort runs on the surrogateescape bytes — for valid UTF-8, Buffer.compare on the re-encoded name is the same bytes; D5). */
function byteLess(a, b) {
    return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
function isDir(path) {
    try {
        return statSync(path).isDirectory();
    }
    catch {
        return false;
    }
}
function fileSize(path) {
    try {
        return statSync(path).size;
    }
    catch {
        return -1;
    }
}
/** _media_candidates: top-level files (non-underscore) then ONE level down (underscore + deeper dirs skipped), each tier byte-sorted. */
export function mediaCandidates(runDir) {
    const cands = [];
    let names;
    try {
        names = readdirSync(runDir);
    }
    catch {
        return [];
    }
    names.sort(byteLess);
    const subs = [];
    for (const name of names) {
        if (!servableLeaf(name))
            continue; // the estate's own servable law (the poster IS servable)
        const full = join(runDir, name);
        if (isDir(full))
            subs.push(name);
        else
            cands.push({ rel: name, full });
    }
    subs.sort(byteLess);
    for (const sub of subs) {
        let inner;
        try {
            inner = readdirSync(join(runDir, sub));
        }
        catch {
            continue;
        }
        inner.sort(byteLess);
        for (const name of inner) {
            if (!servableLeaf(name))
                continue; // the estate's own servable law (the poster IS servable)
            const full = join(runDir, sub, name);
            if (isDir(full))
                continue;
            cands.push({ rel: sub + "/" + name, full });
        }
    }
    return cands;
}
/** run_artifacts: image/video/audio/model rows (image capped at _MAX_IMGS — counted but unlisted past it), everything else skipped; the {truncated,listed,total} marker when entries went unlisted. */
/** path keeps the "./output/<run>/" literal. */
export function runArtifacts(runDir, outDirLiteral) {
    const kinds = mediaVocab();
    const maxImgs = kinds.maxListedImages;
    const runBase = (() => {
        const stripped = outDirLiteral.replace(/\/+$/, "");
        const slash = stripped.lastIndexOf("/");
        return slash >= 0 ? stripped.slice(slash + 1) : stripped;
    })();
    const arts = [];
    let mediaTotal = 0;
    let listed = 0;
    let imgs = 0;
    for (const cand of mediaCandidates(runDir)) {
        // A dead candidate (dangling symlink, vanished file — partial
        // cleanup, pruned output) drops from the LIST, never the ROW:
        // one unreadable artifact must not erase a finished run from
        // the restore port (the -1 → artifactRowOk row-refusal path,
        // audit finding, stroke 82 — the bytes gate now holds on what
        // is actually listed).
        const size = fileSize(cand.full);
        if (size < 0)
            continue;
        const base = cand.rel.includes("/")
            ? cand.rel.slice(cand.rel.lastIndexOf("/") + 1)
            : cand.rel;
        const t = artifactType(base);
        if (t === "image") {
            mediaTotal++;
            imgs++;
            if (imgs > maxImgs)
                continue;
        }
        else if (t === "video" || t === "audio" || t === "model") {
            mediaTotal++;
        }
        else {
            continue;
        }
        listed++;
        arts.push({
            name: base,
            path: outDirLiteral + "/" + cand.rel,
            bytes: size,
            url: runBase + "/" + cand.rel,
            type: t,
            size,
        });
    }
    if (mediaTotal > listed) {
        arts.push({ truncated: true, listed, total: mediaTotal });
    }
    const marker = arts.find((art) => art['truncated'] === true);
    const named = arts.filter((art) => art !== marker);
    const film = engineFilmName(named.map((art) => art['name']));
    const ordered = film === null
        ? named
        : [named.find((art) => art['name'] === film), ...named.filter((art) => art['name'] !== film)];
    return marker === undefined ? ordered : [...ordered, marker];
}
/** _run_thumbnail: cached poster wins, else the first image candidate (same one-level rule, so nested-only runs still get a poster). */
export function runThumbnail(runDir, runId) {
    try {
        statSync(join(runDir, "_poster.jpg"));
        return runId + "/_poster.jpg";
    }
    catch {
        /* no poster — fall through to first image */
    }
    for (const cand of mediaCandidates(runDir)) {
        const base = cand.rel.includes("/")
            ? cand.rel.slice(cand.rel.lastIndexOf("/") + 1)
            : cand.rel;
        if (artifactType(base) === "image") {
            return runId + "/" + cand.rel;
        }
    }
    return "";
}
/** _run_dir_has_media: the media-FIRST sort key — top-level names, then one level down. */
/** NOTE the absences: NO `_` skip (a lone `_poster.jpg` counts), NO inner isdir check (a nested DIR named x.mp4 counts) — probed live, mirrored exactly. */
/** Gallery sets only (svg/bmp classify but do not list — the media-kinds.json contract). */
export function runDirHasMedia(runDir) {
    const kinds = mediaVocab();
    const has = (name) => {
        const dot = name.lastIndexOf(".");
        const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
        return (kinds.galleryVideo.includes(ext) ||
            kinds.galleryImage.includes(ext) ||
            kinds.galleryAudio.includes(ext) ||
            kinds.galleryModel.includes(ext));
    };
    let names;
    try {
        names = readdirSync(runDir);
    }
    catch {
        return false;
    }
    for (const name of names) {
        if (has(name))
            return true;
    }
    for (const name of names) {
        const sub = join(runDir, name);
        try {
            if (!isDir(sub))
                continue;
            for (const inner of readdirSync(sub)) {
                if (has(inner))
                    return true;
            }
        }
        catch {
            continue;
        }
    }
    return false;
}
// ── the run-row gate (runRowOrNull below owns the row law) ─────
// A refused reconstruction is SKIPPED (RESILIENCE LAW) but stays in count (the C contract).
// Extra keys forbid; statuses outside the closed vocab (incl. "queued") refuse.
//
// DIVERGENCE (ledgered): the original ArtifactRow admitted image/video/audio only — the image-era vocab.
// The estate's own emitter half (runArtifacts in this file) counts "model" rows as listable media, mediaKinds.ts carries the galleryModel set, and the img-to-mesh lane is the first producer of model-only runs.
// Keeping the image-era refusal would drop every completed model run from the restore port (runs/list) — and with it runs/list adoption (fetchLatestRunForDraft) — so the row gate admits "model" alongside the triple.
const RUN_ID_RE = /^run-[A-Za-z0-9_.@-]+$/;
// NOT runsTypes.ts's exported RUN_STATUSES: this set is the list-side vocabulary (adds success/unknown, drops queued/stopping — the C-contract fold runsRegistry owns).
const RUN_STATUS = new Set([
    "running",
    "completed",
    "failed",
    "stopped",
    "success",
    "unknown",
]);
const ARTIFACT_TYPE = new Set([
    "image",
    "video",
    "audio",
    "model",
]);
function isIntGe0(v) {
    return typeof v === "number" && Number.isInteger(v) && v >= 0;
}
function artifactRowOk(a) {
    if (typeof a !== "object" || a === null || Array.isArray(a))
        return false;
    const o = a;
    const keys = Object.keys(o);
    const isTrunc = "truncated" in o;
    if (isTrunc) {
        if (keys.length !== 3)
            return false;
        return (o["truncated"] === true && isIntGe0(o["listed"]) && isIntGe0(o["total"]));
    }
    if (keys.length !== 6)
        return false;
    return (typeof o["name"] === "string" &&
        o["name"].length >= 1 &&
        typeof o["path"] === "string" &&
        isIntGe0(o["bytes"]) &&
        typeof o["url"] === "string" &&
        typeof o["type"] === "string" &&
        ARTIFACT_TYPE.has(o["type"]) &&
        isIntGe0(o["size"]));
}
/** The RunRow gate — the row dict, or null when the gate refuses it (the caller logs LOUD and skips). */
/** Key order is the RunRow field order. */
export function runRowOrNull(row) {
    if (!RUN_ID_RE.test(row.run_id))
        return null;
    if (!RUN_STATUS.has(row.status))
        return null;
    if (!isIntGe0(row.created_at))
        return null;
    if (typeof row.seed !== "number" || !Number.isInteger(row.seed))
        return null;
    for (const a of row.artifacts) {
        if (!artifactRowOk(a))
            return null;
    }
    return {
        run_id: row.run_id,
        name: row.name,
        flow: row.flow,
        status: row.status,
        created_at: row.created_at,
        prompt: row.prompt,
        seed: row.seed,
        thumbnail: row.thumbnail,
        artifacts: row.artifacts,
        params: row.params,
        draft_id: row.draft_id,
        ...(row.stage_ids !== undefined && row.stage_ids.length > 0 ? { stage_ids: [...row.stage_ids] } : {}),
        ...(typeof row.export_name === "string" && row.export_name !== "" ? { export_name: row.export_name } : {}),
        ...(typeof row.export_path === "string" && row.export_path !== "" ? { export_path: row.export_path } : {}),
    };
}
/** Strict int parse: surrounding whitespace stripped, one optional
 *  sign, ASCII digits with single internal underscores ("1_0" ->
 *  10). null = not an int (the 400 arm). */
export function parseIntOrNull(s) {
    const m = /^([+-]?)([0-9]+(?:_[0-9]+)*)$/.exec(s.trim());
    // (both groups always participate on match — the fences are dead.)
    if (m === null)
        return null;
    return Number(m[1] + m[2].replace(/_/g, ""));
}
/** parse_qs (drops blank values): first non-blank
 *  value wins; the shared ctx parseQuery keeps blanks, so the
 *  filter lives here (parse_qs default). */
export function firstQuery(qs, name, dflt) {
    const vals = qs[name];
    if (vals === undefined)
        return dflt;
    for (const v of vals) {
        if (v !== "")
            return v;
    }
    return dflt;
}
/** The single-root scan (the file-era walk, intact): PROD output
 *  root only (test runs never listed — kept 1:1). */
function scanRunsRoot(stateRoot) {
    // The PROD output root only (the door's list scanned
    // roots.runsRoot; test runs never listed — kept 1:1).
    const outputRoot = join(stateRoot, "output");
    let names;
    try {
        names = readdirSync(outputRoot);
    }
    catch {
        names = [];
    }
    const ents = [];
    for (const name of names) {
        if (ents.length >= 8192)
            break; // the C's 8192 collected cap
        if (!name.startsWith("run-"))
            continue;
        const runDir = join(outputRoot, name);
        let created = 0;
        let buf = "";
        try {
            buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
        }
        catch {
            buf = "";
        }
        if (buf) {
            // created_at (sidecar) first, "created" (C fossil) fallback.
            created = sidecarNum(buf, "created", 0);
            const at = buf.indexOf('"created_at":');
            if (at >= 0)
                created = parseLeadingInt(buf.slice(at + 13));
        }
        ents.push({
            dir: name,
            created,
            media: runDirHasMedia(runDir),
            root: stateRoot,
        });
    }
    return ents;
}
/** The per-run card build (the file-era row law, intact): sidecar
 *  byte-scan → zombie override → user-surface skip → orphan-draft
 *  clearing → runRowOrNull. Null = skipped (never stored, never
 *  served — the count still counts the dir). The drafts probe is
 *  ASYNC (the drafts remote's birth-certificate face — the legacy
 *  drafts/<id>.json stat died with the drafts-door migration;
 *  orphans lose their draft link, never the row). */
async function buildRunCard(outputRoot, ent, hasDraft) {
    const runDir = join(outputRoot, ent.dir);
    let buf = null;
    // NO sidecar (ENOENT) is the file-era completed-run law: it reads
    // the "success" default, pinned by runs-list.spec. A sidecar that
    // EXISTS but cannot be read (torn read, permissions) is different —
    // unknown, never success (strictness fix 7, 2026-10-01).
    let torn = false;
    try {
        buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
    }
    catch (e) {
        buf = null;
        torn = !(typeof e === "object" && e !== null && e.code === "ENOENT");
    }
    let status = torn ? "unknown" : "success";
    let pipeline = "";
    let prompt = "";
    let draft = "";
    let stageIdsRaw = "";
    let exported = "";
    let exportedPath = "";
    let seed = -1;
    let created = ent.created;
    const rawBytes = buf === null ? Buffer.alloc(0) : Buffer.from(buf, "utf8");
    if (buf !== null) {
        // found-ness matters: absent key -> "unknown" (served); present-but-empty -> "" (gate-skipped).
        const [foundStatus, rawStatus] = sidecarStrFound(rawBytes, "status", 16);
        if (foundStatus) {
            status = rawStatus === "error" ? "failed" : rawStatus;
            // read-time zombie override (sweep=False: report only, D1).
            if (status === "running")
                status = "failed";
        }
        else {
            status = "unknown";
        }
        pipeline = sidecarStr(rawBytes, "pipeline", 64);
        prompt = sidecarStr(rawBytes, "prompt", 2048);
        draft = sidecarStr(rawBytes, "draft_id", 96);
        // THE STAGE-ID DIGEST, LISTED: CSV on disk, array on the row —
        // absent on pre-digest sidecars (the export_name precedent:
        // optional key, never guessed).
        stageIdsRaw = sidecarStr(rawBytes, "stage_ids", 512);
        // THE EXPORT NAME, LISTED (023's self-critique #4/#6): the
        // design lane's mint rides the list row too — additive, same
        // spelling as the sidecar; absent on non-export runs.
        exported = sidecarStr(rawBytes, "export_name", 128);
        // THE EXPORT PATH, LISTED (the export FULL PATH): the engine's
        // minted .qvoice absolute path rides the list row — the voices
        // root is long, so the slice budget doubles the name's.
        exportedPath = sidecarStr(rawBytes, "export_path", 256);
        seed = sidecarNum(buf, "seed", -1);
        const at = buf.indexOf('"created_at":');
        if (at >= 0)
            created = parseLeadingInt(buf.slice(at + 13));
    }
    if (pipeline.startsWith("_"))
        return null; // user-surface law
    if (draft && !(await hasDraft(draft))) {
        draft = "";
    }
    const literal = "./output/" + ent.dir;
    const row = runRowOrNull({
        run_id: ent.dir,
        name: pipeline,
        flow: pipeline,
        status,
        created_at: created,
        prompt,
        seed,
        thumbnail: runThumbnail(runDir, ent.dir),
        artifacts: runArtifacts(runDir, literal),
        params: { seed },
        draft_id: draft,
        ...(stageIdsRaw !== "" ? { stage_ids: stageIdsRaw.split(",") } : {}),
        ...(exported !== "" ? { export_name: exported } : {}),
        ...(exportedPath !== "" ? { export_path: exportedPath } : {}),
    });
    return row; // null = RESILIENCE LAW loud skip
}
/** The runs-list envelope (the restore port): the output-root scan, media-first + newest sort, the limit parse (raw STRING — the lane/remote pass the raw text; underscores parse, non-ints refuse), refused cards SKIPPED but counted. */
/** url/thumbnail are run-RELATIVE (the /v1/assets prefix died with the app — the header's law). */
export async function listRuns(stateRoot, limit, hasDraft) {
    return listRunsAcross([stateRoot], limit, hasDraft);
}
/** §23 CROSS-ROOTS (2026-09-23): the union list across the
 *  manifest — every root scanned, one media-first + newest sort,
 *  the limit sliced off the merged order, the scan total counted
 *  (refused cards SKIPPED but counted, per root). Every served row
 *  names its root (served_from); same-run-id collisions serve the
 *  FIRST manifest root's row (own writes win — the sort is stable,
 *  own root scanned first). */
export async function listRunsAcross(roots, limit, hasDraft) {
    const ents = [];
    for (const root of roots)
        ents.push(...scanRunsRoot(root));
    const count = ents.length;
    ents.sort((a, b) => {
        const am = a.media ? 0 : 1;
        const bm = b.media ? 0 : 1;
        if (am !== bm)
            return am - bm;
        return b.created - a.created; // newest-first; stable
    });
    const sliced = ents.slice(0, limit);
    const seen = new Set();
    const rows = [];
    for (const ent of sliced) {
        if (seen.has(ent.dir))
            continue; // first manifest root wins
        seen.add(ent.dir);
        const row = await buildRunCard(join(ent.root, "output"), ent, hasDraft);
        if (row === null)
            continue; // RESILIENCE LAW: loud skip
        rows.push({ ...row, served_from: ent.root });
    }
    return { count, runs: rows };
}
//# sourceMappingURL=runsList.js.map
