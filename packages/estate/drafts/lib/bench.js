// bench.ts — the bench domain logic (REBUILD-2, re-homed 2026-09-10).
//
// The bench doc IS a draft doc (same domain, same table, id
// "bench-<session>") plus a `bench` block: { rev, log } — the
// append-only revision log both authors walk. HTTP vocabulary is
// dead with the gateway: birth/load refuse as RemoteError codes,
// never status payloads.
//
// Laws carried over (the bench rework's, unchanged):
//   CAS — ensure-with-stages takes expect_rev; a moved bench refuses
//   loud (bench/cas-conflict carries current_rev), never merges.
//   APPEND-ONLY LOG — load appends a revert-carrying entry; history
//   is never rewritten (patch/undo arms land in later strokes).
//   AUTHORSHIP — every entry carries author ("agent"|"user").
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
/** Session key gate: same charset family as draft ids, capped so
 * "bench-" + session always clears the 96-char draft ceiling. */
const SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
function benchIdOf(session) {
    return "bench-" + session;
}
const AUTHORS = ["agent", "user"];
function authorOk(v) {
    return v === "agent" || v === "user";
}
function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
export function benchBlockOf(doc) {
    const raw = doc["bench"];
    if (isRecord(raw) &&
        typeof raw["rev"] === "number" &&
        Array.isArray(raw["log"])) {
        return { rev: raw["rev"], log: raw["log"] };
    }
    return { rev: 0, log: [] };
}
function stagesOf(doc) {
    // The domain schema guarantees stages is an array of id-carrying
    // objects (DraftDocSchema; schema-failing records are backed up and
    // skipped at read) — no re-defense here.
    return doc["stages"];
}
/** Birth defaults per the composer's law (id, inputs, provenance)
 *  with the runner's object inputs. */
function normalizeStages(stagesIn, author) {
    if (!Array.isArray(stagesIn))
        return [];
    return stagesIn
        .filter((s) => isRecord(s))
        .map((s, idx) => {
        const src = s;
        const row = {};
        for (const k of Object.keys(src))
            row[k] = src[k];
        // Defaults fill AFTER the caller's data (a junk or missing id
        // must not ship an unaddressable row; the schema's id law).
        row["id"] = typeof src["id"] === "string" ? src["id"] : "s_" + idx;
        if (typeof row["engine"] !== "string" || row["engine"] === "")
            row["engine"] = "comfyui";
        if (!isRecord(row["inputs"]))
            row["inputs"] = {};
        if (!isRecord(row["params"]))
            row["params"] = {};
        if (!isRecord(row["outputs"]))
            row["outputs"] = { default: "image" };
        if (row["provenance"] !== "user")
            row["provenance"] = author;
        return row;
    });
}
const ENSURE_KEYS = ["session", "stages", "intent", "author", "expect_rev"];
function refuseUnknown(body, allowed) {
    const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
    if (unknown.length > 0) {
        throw new RemoteError("bench/bad-body", "unknown bench key(s): " +
            unknown.sort().join(", ") +
            " (want " +
            allowed.join(", ") +
            ")", {});
    }
}
/** ensure — create the bench (birth: rev 0, empty log) or LOAD onto
 *  it (replace stages, snapshot inverse). The only arm that may
 *  create; everything else refuses a missing bench. */
export async function ensureBench(drafts, body, admit) {
    refuseUnknown(body, ENSURE_KEYS);
    const session = body["session"];
    if (typeof session !== "string" || !SESSION_RE.test(session)) {
        throw new RemoteError("bench/bad-session", "bad session key (want [A-Za-z0-9_-]{1,64})", {});
    }
    const draftId = benchIdOf(session);
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const rec = drafts.table("docs").get(draftId);
    if (rec === undefined) {
        const stagesIn = Array.isArray(body["stages"]) ? body["stages"] : [];
        admitStages(admit, stagesIn);
        const doc = {
            draft_id: draftId,
            intent: typeof body["intent"] === "string" ? body["intent"] : "bench",
            stages: normalizeStages(stagesIn, author),
            status: "ready",
            createdAt: Date.now(),
            completedAt: null,
            bench: { rev: 0, log: [] },
        };
        await drafts.table("docs").put(draftId, {
            updated_at: Math.floor(Date.now() / 1000),
            doc: doc,
        });
        return {
            draft_id: draftId,
            session,
            rev: 0,
            intent: doc["intent"],
            stages: doc["stages"],
            created: true,
        };
    }
    const doc = rec.doc;
    const block = benchBlockOf(doc);
    if (body["stages"] === undefined) {
        return {
            draft_id: draftId,
            session,
            rev: block.rev,
            intent: doc["intent"],
            stages: doc["stages"],
            created: false,
        };
    }
    const expect = body["expect_rev"];
    if (typeof expect !== "number") {
        throw new RemoteError("bench/cas-conflict", "expect_rev is required (the CAS law)", { current_rev: block.rev });
    }
    if (expect !== block.rev) {
        throw new RemoteError("bench/cas-conflict", "bench moved: rev is " + block.rev + ", caller held " + expect, { current_rev: block.rev, expect_rev: expect });
    }
    const before = stagesOf(doc);
    admitStages(admit, body["stages"]);
    doc["stages"] = normalizeStages(body["stages"], author);
    if (typeof body["intent"] === "string")
        doc["intent"] = body["intent"];
    const entry = {
        author,
        kind: "load",
        summary: "load " + stagesOf(doc).length + " stages",
        inverse: { stages_before: before },
        rev: block.rev + 1,
        at: Math.floor(Date.now() / 1000),
    };
    block.rev = entry.rev;
    block.log.push(entry);
    doc["bench"] = block;
    await drafts.table("docs").put(draftId, {
        updated_at: Math.floor(Date.now() / 1000),
        doc: doc,
    });
    return {
        draft_id: draftId,
        session,
        rev: block.rev,
        intent: doc["intent"],
        stages: doc["stages"],
        created: false,
    };
}
/** get — one session's bench block as the served row. */
export function getBench(drafts, session) {
    if (!SESSION_RE.test(session)) {
        throw new RemoteError("bench/bad-session", "bad session key (want [A-Za-z0-9_-]{1,64})", {});
    }
    const draftId = benchIdOf(session);
    const rec = drafts.table("docs").get(draftId);
    if (rec === undefined) {
        throw new RemoteError("bench/not-found", "no such bench: " + session, {
            session,
        });
    }
    const doc = rec.doc;
    const block = benchBlockOf(doc);
    return {
        draft_id: draftId,
        session,
        rev: block.rev,
        intent: doc["intent"],
        stages: doc["stages"],
        log: block.log.map((e) => ({
            rev: e.rev,
            at: e.at,
            author: e.author,
            kind: e.kind,
            ...(e.stage !== undefined ? { stage: e.stage } : {}),
            ...(e.summary !== undefined ? { summary: e.summary } : {}),
            ...(e.reverted !== undefined ? { reverted: e.reverted } : {}),
        })),
    };
}
async function loadBench(drafts, session) {
    if (!SESSION_RE.test(session)) {
        throw new RemoteError("bench/bad-session", "bad session key (want [A-Za-z0-9_-]{1,64})", {});
    }
    const draftId = benchIdOf(session);
    let rec = drafts.table("docs").get(draftId);
    if (rec === undefined) {
        // THE BIRTH (stroke 46g, the operator's "is this a forever fix?"):
        // a conversation's bench is born at its FIRST write — never a
        // refusal. rev 0, empty stages, the session's own id.
        const doc0 = { draft_id: draftId, intent: "", stages: [], bench: { rev: 0, log: [] } };
        await drafts.table("docs").put(draftId, {
            updated_at: Math.floor(Date.now() / 1000),
            doc: doc0,
        });
        rec = drafts.table("docs").get(draftId);
        if (rec === undefined) {
            throw new RemoteError("bench/not-found", "could not birth bench: " + session, { session });
        }
    }
    const doc = rec.doc;
    return { draftId, doc, block: benchBlockOf(doc) };
}
/** The CAS law, one voice (missing expect_rev refuses too). */
function casCheck(block, expect, session) {
    if (typeof expect !== "number") {
        throw new RemoteError("bench/cas-conflict", "expect_rev is required (the CAS law)", { current_rev: block.rev });
    }
    if (expect !== block.rev) {
        throw new RemoteError("bench/cas-conflict", "bench " +
            session +
            " moved: rev is " +
            block.rev +
            ", caller held " +
            expect, { current_rev: block.rev, expect_rev: expect });
    }
    return block.rev;
}
/** Append one entry + persist; returns the new rev. */
async function appendAndSave(drafts, loaded, entry) {
    const full = {
        ...entry,
        rev: loaded.block.rev + 1,
        at: Math.floor(Date.now() / 1000),
    };
    loaded.block.rev = full.rev;
    loaded.block.log.push(full);
    loaded.doc["bench"] = loaded.block;
    await drafts.table("docs").put(loaded.draftId, {
        updated_at: Math.floor(Date.now() / 1000),
        doc: loaded.doc,
    });
    return full.rev;
}
function stageRow(doc, stageId) {
    // Schema law (see stagesOf): rows are records with string ids.
    const stages = doc["stages"];
    return stages.find((st) => st["id"] === stageId) ?? null;
}
const PATCH_KEYS = ["stage", "params", "result", "runStatus", "expect_rev", "author"];
/** patch — params merge with CAS + log (result/runStatus ride too:
 *  run-status writes from the tab land here, authored "user"). */
export async function patchBench(drafts, session, body, admit) {
    refuseUnknown(body, PATCH_KEYS);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const stageId = body["stage"];
    if (typeof stageId !== "string") {
        throw new RemoteError("bench/bad-body", "stage is required", {});
    }
    const st = stageRow(loaded.doc, stageId);
    if (st === null) {
        throw new RemoteError("bench/stage-not-found", "stage not found: " + stageId, { session, stage: stageId });
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const before = {};
    const added = [];
    const paramsIn = body["params"];
    if (paramsIn !== undefined) {
        if (!isRecord(paramsIn)) {
            throw new RemoteError("bench/bad-body", "params must be an object", {});
        }
        const cur = isRecord(st["params"])
            ? st["params"]
            : {};
        for (const k of Object.keys(paramsIn)) {
            if (Object.prototype.hasOwnProperty.call(cur, k))
                before[k] = cur[k];
            else
                added.push(k);
            cur[k] = paramsIn[k];
        }
        // admission on the MERGED view (the row's card + the params the
        // NEXT run would compose — a patch that lands poison is as bad
        // as an add that lands it)
        admitStage(admit, st["card"], cur);
        st["params"] = cur;
    }
    let touched = 0;
    if ("result" in body) {
        st["result"] = body["result"];
        touched++;
    }
    if ("runStatus" in body) {
        st["runStatus"] = body["runStatus"];
        touched++;
    }
    if (paramsIn === undefined && touched === 0) {
        throw new RemoteError("bench/bad-body", "nothing to patch (params|result|runStatus)", {});
    }
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "patch",
        stage: stageId,
        summary: "patch " +
            (paramsIn !== undefined
                ? Object.keys(paramsIn).sort().join(",")
                : "status"),
        inverse: { stage: stageId, params_before: before, params_added: added },
    });
    return {
        draft_id: loaded.draftId,
        session,
        rev: newRev,
        stage: stageId,
        patched: paramsIn !== undefined ? Object.keys(paramsIn).sort() : [],
    };
}
const ADD_KEYS = ["id", "card", "engine", "params", "inputs", "outputs", "expected", "expect_rev", "author"];
function admitStage(admit, card, params) {
    if (admit === undefined)
        return;
    if (typeof card !== "string" || card === "")
        return;
    if (!isRecord(params))
        return;
    admit(card, params);
}
/** Admission over a wholesale stage list (the load arm — every row
 *  passes the same door an add passes). */
function admitStages(admit, stages) {
    if (admit === undefined || !Array.isArray(stages))
        return;
    for (const s of stages) {
        if (!isRecord(s))
            continue;
        admitStage(admit, s["card"], s["params"]);
    }
}
/** add_stage — append a card stage with optional wiring (the
 *  runner's input convention rides the row). */
export async function addStageBench(drafts, session, body, admit) {
    refuseUnknown(body, ADD_KEYS);
    admitStage(admit, body["card"], body["params"]);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const card = body["card"];
    if (typeof card !== "string" || card === "") {
        throw new RemoteError("bench/bad-body", "card is required", {});
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const stages = stagesOf(loaded.doc);
    // THE MINT LAW (the collision fix, 2026-09-12): the count mint
    // ("s_" + stages.length) collides the moment any stage was ever
    // removed — [s_0..s_9] minus nine leaves s_1, and the count says
    // s_1 again. The mint takes MAX numeric suffix + 1 over the live
    // rows, so a fresh id is fresh against the bench AS IT STANDS.
    const stageId = typeof body["id"] === "string" && body["id"] !== ""
        ? body["id"]
        : "s_" +
            String(stages.reduce((max, row) => {
                const m = /^s_(\d+)$/.exec(String(row["id"] ?? ""));
                return m === null ? max : Math.max(max, Number(m[1]));
            }, -1) + 1);
    if (stageRow(loaded.doc, stageId) !== null) {
        throw new RemoteError("bench/duplicate-stage", "stage id already on the bench: " + stageId, { session, stage: stageId });
    }
    const row = {
        id: stageId,
        card,
        // The runner's engine id (flow_inline contract); comfyui is the
        // only served engine today.
        engine: typeof body["engine"] === "string" && body["engine"] !== ""
            ? body["engine"]
            : "comfyui",
        params: isRecord(body["params"]) ? body["params"] : {},
        inputs: isRecord(body["inputs"]) ? body["inputs"] : {},
        outputs: isRecord(body["outputs"]) ? body["outputs"] : { default: "image" },
        provenance: author,
    };
    if (isRecord(body["expected"]))
        row["expected"] = body["expected"];
    stages.push(row);
    loaded.doc["stages"] = stages;
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "add_stage",
        stage: stageId,
        summary: "add " + card,
        inverse: { stage: stageId },
    });
    return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}
const REMOVE_KEYS = ["stage", "expect_rev", "author"];
const REORDER_KEYS = ["stage", "to", "expect_rev", "author"];
/** reorder — move ONE stage to a new index in the bench's stage order
 *  (the drag-reorder door, 2026-09-11: the old system's reorderRange
 *  gesture; the reborn bench is SSOT so the door exists before the UX
 *  does). The inverse carries the ORIGINAL index for undo. `to` is
 *  clamped into [0, stages.length-1] AFTER the splice-out, so a move
 *  past either end parks at the end — the drag gesture's own
 *  semantics, not an error. */
export async function reorderBench(drafts, session, body) {
    refuseUnknown(body, REORDER_KEYS);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const stageId = body["stage"];
    if (typeof stageId !== "string") {
        throw new RemoteError("bench/bad-body", "stage is required", {});
    }
    const toRaw = body["to"];
    if (typeof toRaw !== "number" || !Number.isInteger(toRaw) || toRaw < 0) {
        throw new RemoteError("bench/bad-body", "to must be a non-negative integer index", {});
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const stages = stagesOf(loaded.doc);
    const from = stages.findIndex((s) => s["id"] === stageId);
    if (from < 0) {
        throw new RemoteError("bench/stage-not-found", "stage not found: " + stageId, { session, stage: stageId });
    }
    const [row] = stages.splice(from, 1);
    const to = Math.min(toRaw, stages.length);
    stages.splice(to, 0, row);
    loaded.doc["stages"] = stages;
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "reorder",
        stage: stageId,
        summary: "reorder " + String(row["card"] ?? stageId),
        inverse: { stage: stageId, from, to },
    });
    return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId, from, to };
}
const GROUP_KEYS = ["stages", "expect_rev", "author"];
/** group — the Group Cards sub-view's door (2026-09-11): 2+ stage ids
 *  collapse into ONE compound row at the FIRST member's bench position;
 *  the member rows ride INSIDE the compound (children, bench order) so
 *  the bench's stage list stays the projection-free truth — the grid
 *  renders the compound as a single tile and ungroup restores the
 *  members at the compound's index. The inverse carries both halves. */
export async function groupBench(drafts, session, body) {
    refuseUnknown(body, GROUP_KEYS);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const idsRaw = body["stages"];
    if (!Array.isArray(idsRaw) || idsRaw.length < 2
        || !idsRaw.every((x) => typeof x === "string")) {
        throw new RemoteError("bench/bad-body", "stages must be an array of 2+ stage ids", {});
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const stages = stagesOf(loaded.doc);
    // bench order (the ids arrive selection-order; the compound is the
    // bench's own order — the old law: "the compound parent lands at the
    // FIRST member's position, childIds in array order")
    const ids = idsRaw;
    const picked = [];
    for (const st of stages) {
        if (ids.includes(String(st["id"])))
            picked.push(st);
    }
    if (picked.length !== ids.length) {
        throw new RemoteError("bench/stage-not-found", "group: unknown stage id(s) — have " + String(picked.length) + " of " + String(ids.length), { session, stage: ids.join(",") });
    }
    const firstIndex = stages.indexOf(picked[0]);
    for (const row of picked) {
        // picked rows ARE stages members (built from the walk above) —
        // splice by identity, no guard.
        stages.splice(stages.indexOf(row), 1);
    }
    // id from the doc's own coordinates (rev + count) — no global RNG
    // dependency; unique per append by construction (rev advances).
    const gid = "g_r" + String(loaded.block.rev) + "c" + String(picked.length) + "_" + String(stages.length);
    const compound = {
        id: gid,
        card: "group",
        children: picked,
    };
    stages.splice(Math.min(firstIndex, stages.length), 0, compound);
    loaded.doc["stages"] = stages;
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "group",
        stage: gid,
        summary: "group " + String(ids.length) + " stages",
        inverse: { stage: gid, index: firstIndex, children: picked },
    });
    return { draft_id: loaded.draftId, session, rev: newRev, stage: gid };
}
const UNGROUP_KEYS = ["stage", "expect_rev", "author"];
/** ungroup — the compound's door: spill the children back at the
 *  compound's index, in their stored order. */
export async function ungroupBench(drafts, session, body) {
    refuseUnknown(body, UNGROUP_KEYS);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const stageId = body["stage"];
    if (typeof stageId !== "string") {
        throw new RemoteError("bench/bad-body", "stage is required", {});
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const stages = stagesOf(loaded.doc);
    const idx = stages.findIndex((s) => s["id"] === stageId);
    if (idx < 0 || stages[idx]["card"] !== "group") {
        throw new RemoteError("bench/stage-not-found", "ungroup: no group stage " + stageId, { session, stage: stageId });
    }
    const compound = stages[idx];
    const children = compound["children"];
    const rows = Array.isArray(children)
        ? children
        : [];
    stages.splice(idx, 1);
    stages.splice(Math.min(idx, stages.length), 0, ...rows);
    loaded.doc["stages"] = stages;
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "ungroup",
        stage: stageId,
        summary: "ungroup " + String(rows.length) + " stages",
        inverse: { row: compound, index: idx },
    });
    return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}
/** remove_stage — splice one stage out (the inverse carries row +
 *  index for undo). */
export async function removeStageBench(drafts, session, body) {
    refuseUnknown(body, REMOVE_KEYS);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const stageId = body["stage"];
    if (typeof stageId !== "string") {
        throw new RemoteError("bench/bad-body", "stage is required", {});
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const stages = stagesOf(loaded.doc);
    const idx = stages.findIndex((s) => s["id"] === stageId);
    if (idx < 0) {
        throw new RemoteError("bench/stage-not-found", "stage not found: " + stageId, { session, stage: stageId });
    }
    const row = stages[idx];
    stages.splice(idx, 1);
    loaded.doc["stages"] = stages;
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "remove_stage",
        stage: stageId,
        summary: "remove " + String(row["card"] ?? stageId),
        inverse: { stage: stageId, row, index: idx },
    });
    return { draft_id: loaded.draftId, session, rev: newRev, stage: stageId };
}
const REWIRE_KEYS = ["stage", "input", "from", "expect_rev", "author"];
/** rewire — set or clear one input binding. from:
 *  {stage, output} | {initial: "image"} | absent → clear. */
export async function rewireBench(drafts, session, body) {
    refuseUnknown(body, REWIRE_KEYS);
    const loaded = await loadBench(drafts, session);
    casCheck(loaded.block, body["expect_rev"], session);
    const stageId = body["stage"];
    const input = body["input"];
    if (typeof stageId !== "string" || typeof input !== "string") {
        throw new RemoteError("bench/bad-body", "stage and input are required", {});
    }
    const st = stageRow(loaded.doc, stageId);
    if (st === null) {
        throw new RemoteError("bench/stage-not-found", "stage not found: " + stageId, { session, stage: stageId });
    }
    const author = authorOk(body["author"])
        ? body["author"]
        : "agent";
    const from = body["from"];
    if (from !== undefined && !isRecord(from)) {
        throw new RemoteError("bench/bad-body", "from must be {stage,output} | {initial} | absent", {});
    }
    const inputs = isRecord(st["inputs"])
        ? st["inputs"]
        : {};
    const before = Object.prototype.hasOwnProperty.call(inputs, input)
        ? inputs[input]
        : undefined;
    if (from === undefined)
        delete inputs[input];
    else
        inputs[input] = from;
    st["inputs"] = inputs;
    const inverse = { stage: stageId, input };
    if (before !== undefined)
        inverse["before"] = before;
    else
        inverse["added"] = true;
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "rewire",
        stage: stageId,
        summary: "wire " + input,
        inverse,
    });
    return {
        draft_id: loaded.draftId,
        session,
        rev: newRev,
        stage: stageId,
        input,
    };
}
const UNDO_KEYS = ["n", "author", "expect_rev"];
/** undo — walk the log tail, skip already-reverted entries and
 *  entries the author filter excludes, apply inverses
 *  newest-first, append ONE undo entry carrying the pre-undo
 *  snapshot. Undo entries are NEVER candidates — a plain undo
 *  walks ACTIONS (targeting them would ping-pong). */
export async function undoBench(drafts, session, body) {
    refuseUnknown(body, UNDO_KEYS);
    const loaded = await loadBench(drafts, session);
    if (body["expect_rev"] !== undefined) {
        casCheck(loaded.block, body["expect_rev"], session);
    }
    const n = typeof body["n"] === "number" &&
        Number.isInteger(body["n"]) &&
        body["n"] > 0
        ? body["n"]
        : 1;
    const filter = authorOk(body["author"])
        ? body["author"]
        : null;
    // The already-reverted set (union of every undo entry's reverted).
    const revertedSet = new Set();
    for (const e of loaded.block.log) {
        if (e.kind === "undo" && Array.isArray(e.reverted)) {
            for (const r of e.reverted)
                revertedSet.add(r);
        }
    }
    const targets = [];
    for (let i = loaded.block.log.length - 1; i >= 0 && targets.length < n; i--) {
        const e = loaded.block.log[i];
        if (e.kind === "undo")
            continue;
        if (revertedSet.has(e.rev))
            continue;
        if (filter !== null && e.author !== filter)
            continue;
        targets.push(e);
    }
    if (targets.length === 0) {
        throw new RemoteError("bench/nothing-to-undo", "nothing to undo" + (filter !== null ? " (author " + filter + ")" : ""), {});
    }
    const stagesBefore = stagesOf(loaded.doc);
    for (const e of targets)
        applyInverse(loaded.doc, e);
    const undone = targets
        .map((e) => e.rev)
        .sort((a, b) => a - b);
    const newRev = await appendAndSave(drafts, loaded, {
        author: filter === "user" ? "user" : "agent",
        kind: "undo",
        summary: "undo r" + undone.join(",r"),
        inverse: { stages_before: stagesBefore },
        reverted: undone,
    });
    return {
        draft_id: loaded.draftId,
        session,
        rev: newRev,
        undone,
        stages: loaded.doc["stages"],
    };
}
/** Apply one entry's inverse payload to the doc (best-effort per
 *  entry; a stage an undo already removed is skipped loudly-free —
 *  the snapshot entries carry the coarse fallback). */
function applyInverse(doc, e) {
    const inv = isRecord(e.inverse)
        ? e.inverse
        : {};
    const stages = stagesOf(doc);
    if (e.kind === "patch") {
        const st = stageRow(doc, String(inv["stage"] ?? e.stage ?? ""));
        if (st === null)
            return;
        const cur = isRecord(st["params"])
            ? st["params"]
            : {};
        const before = isRecord(inv["params_before"])
            ? inv["params_before"]
            : {};
        for (const k of Object.keys(before))
            cur[k] = before[k];
        const added = inv["params_added"];
        if (Array.isArray(added)) {
            for (const k of added)
                delete cur[k];
        }
        st["params"] = cur;
        return;
    }
    if (e.kind === "add_stage") {
        const idx = stages.findIndex((s) => s["id"] === inv["stage"]);
        if (idx >= 0)
            stages.splice(idx, 1);
        doc["stages"] = stages;
        return;
    }
    if (e.kind === "remove_stage") {
        const row = inv["row"];
        const idx = typeof inv["index"] === "number" ? inv["index"] : stages.length;
        if (isRecord(row))
            stages.splice(Math.min(idx, stages.length), 0, row);
        doc["stages"] = stages;
        return;
    }
    if (e.kind === "group") {
        // undo(group) = ungroup: drop the compound row, spill children at
        // its index (bench order preserved inside the row).
        const idx = stages.findIndex((s) => s["id"] === inv["stage"]);
        const children = inv["children"];
        const rows = Array.isArray(children)
            ? children
            : [];
        if (idx >= 0) {
            stages.splice(idx, 1);
            stages.splice(Math.min(idx, stages.length), 0, ...rows);
            doc["stages"] = stages;
        }
        return;
    }
    if (e.kind === "ungroup") {
        // undo(ungroup) = re-group: splice the children back out, insert
        // the compound row at the recorded index.
        const row = inv["row"];
        if (!isRecord(row))
            return;
        const children = row["children"];
        if (Array.isArray(children)) {
            for (const child of children) {
                const idx = stages.findIndex((s) => s["id"] === child["id"]);
                if (idx >= 0)
                    stages.splice(idx, 1);
            }
        }
        const back = typeof inv["index"] === "number"
            ? Math.min(inv["index"], stages.length)
            : stages.length;
        stages.splice(back, 0, row);
        doc["stages"] = stages;
        return;
    }
    if (e.kind === "reorder") {
        // the inverse of a move is the move back: splice out at the CURRENT
        // (post-move) position, reinsert at the ORIGINAL index (clamped).
        const idx = stages.findIndex((s) => s["id"] === inv["stage"]);
        if (idx >= 0) {
            const [row] = stages.splice(idx, 1);
            const back = typeof inv["from"] === "number"
                ? Math.min(inv["from"], stages.length)
                : stages.length;
            stages.splice(back, 0, row);
            doc["stages"] = stages;
        }
        return;
    }
    if (e.kind === "rewire") {
        const st = stageRow(doc, String(inv["stage"] ?? ""));
        if (st === null)
            return;
        const inputs = isRecord(st["inputs"])
            ? st["inputs"]
            : {};
        const input = String(inv["input"] ?? "");
        if (inv["added"] === true)
            delete inputs[input];
        else if ("before" in inv)
            inputs[input] = inv["before"];
        st["inputs"] = inputs;
        return;
    }
    // load: the coarse fallback — restore the snapshot. (Undo entries
    // are never walk candidates — the skip at the top guarantees it —
    // so no "undo" disjunct here.)
    const snapshot = e.kind === "load" ? inv["stages_before"] : undefined;
    if (Array.isArray(snapshot))
        doc["stages"] = snapshot;
}
const benchChangeListeners = new Set();
/** Subscribe to bench writes; returns the unsubscribe. */
export function onBenchChange(fn) {
    benchChangeListeners.add(fn);
    return () => {
        benchChangeListeners.delete(fn);
    };
}
/** Fire the write event — the remote layer calls this after every
 *  successful bench write (the door seam: every in-process and
 *  host-routed write crosses the remote arms). */
export function notifyBenchChange(session) {
    for (const fn of benchChangeListeners) {
        try {
            fn(session);
        }
        catch {
            /* a listener's fault never breaks the write */
        }
    }
}
/** The public notify (the drafts-patch door writes bench docs from
 *  remote.ts — outside this module; it fires this with the session
 *  parsed from the bench-shaped draft id). */
export function notifyBenchDocWrite(draftId) {
    const m = /^bench-([A-Za-z0-9_-]{1,64})$/.exec(draftId);
    if (m !== null)
        notifyBenchChange(m[1]);
}
//# sourceMappingURL=bench.js.map