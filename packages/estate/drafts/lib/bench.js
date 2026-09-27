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
import { unwrapItemArrays } from '@melite/comfyui-card-kit';
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
/** THE SEED RECEIPT (2026-09-21, ledger #41: a concrete seed rode
 *  a wholesale load while the summary said only "load N stages" —
 *  the operator re-ran one image believing they were on random).
 *  One incoming stage's seed state: a concrete number rides
 *  VERBATIM at compose (pinned — the value on record); -1 is the
 *  random sentinel; anything else is absent. The load entry names
 *  every stage's state, so a pin can never arrive silently again. */
function seedStateOf(row) {
    // Post-normalize rows ALWAYS carry a record params (normalizeStages
    // replaces junk/missing params with {}) — no re-defense here.
    const seed = row["params"]["seed"];
    if (typeof seed === "number" && seed !== -1)
        return `${row["id"]} seed ${seed} (pinned)`;
    if (seed === -1)
        return `${row["id"]} seed random`;
    return `${row["id"]} seed absent`;
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
        // the load arm's rows cross the same remote encoding — the
        // store-seat unwrap applies here too (wireParams law)
        row["params"] = wireParams(row["params"]);
        if (!isRecord(row["params"]))
            row["params"] = {};
        if (!isRecord(row["outputs"]))
            row["outputs"] = { default: "image" };
        if (row["provenance"] !== "user")
            row["provenance"] = author;
        return row;
    });
}
const ENSURE_KEYS = ["session", "stages", "intent", "author", "expect_rev", "overwrite"];
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
 *  it (replace stages, snapshot inverse; a non-empty bench demands
 *  overwrite: true — the overwrite law). The only arm that may
 *  create; everything else refuses a missing bench. */
/** THE INTENT-SYNC LAW (roadmap 2026-09-26 — BRIEF14 finding #3,
 *  the stale `bench_snapshot.intent`): a bench born in card mode
 *  carries the card id as its intent, and the studio consult keys
 *  cardName off it — so an intent that names a card MUST name a
 *  card the bench still holds. A wholesale load left the old card
 *  id riding: a bench that ran tts and now holds an h3 stage still
 *  said "tts", and every run's bench_snapshot inherited the lie.
 *  The sync keys on ORPHANING, the only signal the domain owns:
 *  a label that named a card the PREVIOUS composition held and the
 *  NEXT composition dropped was true and just went stale — it
 *  re-derives (the last card-carrying stage wins; a card-less
 *  result keeps the label, inert with nothing to mislabel).
 *  Everything else rides untouched: a STATED intent wins (the
 *  caller owns the label), free prose never matched a held card id
 *  so it never orphans, a pure add_stage grows the card set and
 *  cannot orphan, and a label that was already wrong before the
 *  change is not this law's to rewrite. */
function syncIntent(doc, before, after) {
    const cur = typeof doc["intent"] === "string" ? doc["intent"] : "";
    if (cur === "" || cur === "bench")
        return;
    const prevCards = new Set();
    for (const row of before) {
        const c = row["card"];
        if (typeof c === "string" && c !== "")
            prevCards.add(c);
    }
    if (!prevCards.has(cur))
        return;
    const nextCards = new Set();
    for (const row of after) {
        const c = row["card"];
        if (typeof c === "string" && c !== "")
            nextCards.add(c);
    }
    if (nextCards.has(cur))
        return;
    for (let i = after.length - 1; i >= 0; i--) {
        const c = after[i]["card"];
        if (typeof c === "string" && c !== "") {
            doc["intent"] = c;
            return;
        }
    }
}
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
        // A BENCH IS BORN CLEAN OF ARCHIVES (the cross-bench history
        // leak, 2026-09-23 — live proof bench-session-2bd2a61f): the
        // wand restores onto fresh sessions carrying stage rows from a
        // FOREIGN bench's run snapshot; archives (history,
        // resultParams, runStatus, resolved — the observe state THIS
        // bench's own runs earn) never survive a birth. The one lawful
        // birth memory is `result` — the wand's preview stamp for the
        // ran card. The LOAD arm keeps the stage memory law whole
        // (same-id carry + fill-never-clobber).
        const born = normalizeStages(stagesIn, author);
        for (const row of born) {
            delete row["history"];
            delete row["resultParams"];
            delete row["runStatus"];
            delete row["resolved"];
        }
        admitWiringList(born, session);
        const doc = {
            draft_id: draftId,
            intent: typeof body["intent"] === "string" ? body["intent"] : "bench",
            stages: born,
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
    // THE OVERWRITE LAW (2026-09-15 — a compose agent wiped a live
    // image card with a wholesale load): replacing a NON-EMPTY bench
    // is a destructive act and must say so. expect_rev proves the
    // caller read the bench, not that the user agreed to lose it —
    // pass overwrite: true to confirm (flow landings and the
    // gallery's draft-click already do; the undo log still records
    // stages_before either way).
    if (before.length > 0 && body["overwrite"] !== true) {
        throw new RemoteError("bench/overwrite-required", "bench holds " + before.length + " stage(s) at rev " + block.rev +
            " — a wholesale load would discard them; confirm with overwrite: true, " +
            "or grow the bench with add_stage / patch, or undo if this was a mistake", { current_rev: block.rev, stages: before.length });
    }
    admitStages(admit, body["stages"]);
    // (the no-leak law: admit on the LOCAL normalized list, assign to
    // the cached doc only after the gates pass.)
    const staged = normalizeStages(body["stages"], author);
    // THE STAGE MEMORY LAW (2026-09-20, the operator's catch: "why
    // does it never track history?"): a stage's OUTPUT MEMORY — its
    // landed result and archived history — belongs to the STAGE'S
    // IDENTITY, not to the doc revision it happened to land in. A
    // wholesale load rebuilding the bench with the SAME stage ids
    // (a chat agent re-loading the card the operator is iterating
    // on) CARRIES the memory forward: result, runStatus, history,
    // resultParams ride from the outgoing row onto the incoming row
    // of the same id. A genuinely new stage id starts clean. The
    // bench is composed state; the gallery is the stage's own.
    const MEMORY_KEYS = ["result", "runStatus", "history", "resultParams"];
    for (const row of staged) {
        const prev = before.find((b) => b["id"] === row["id"]);
        if (prev === undefined)
            continue;
        for (const key of MEMORY_KEYS) {
            if (prev[key] !== undefined && row[key] === undefined) {
                row[key] = prev[key];
            }
        }
    }
    admitWiringList(staged, session);
    doc["stages"] = staged;
    syncIntent(doc, before, staged);
    if (typeof body["intent"] === "string")
        doc["intent"] = body["intent"];
    const entry = {
        author,
        kind: "load",
        summary: "load " + stagesOf(doc).length + " stages | " + staged.map(seedStateOf).join(" | "),
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
    // THE SERVE-TIME CRIME GATE (2026-10-10, the operator's live
    // report: a bench doc born BEFORE the bench/self-wire law
    // persisted its crime and served silently until a run tripped a
    // generic wall). Scoped NARROW, by design: the read path is
    // deliberately tolerant of loose-but-harmless shapes (junk cells
    // and dead wires are refused with precise voices at the run door
    // and at the next write door; the patch-tolerance laws pin that
    // they serve). The two crimes refused HERE are the ones that
    // compose degenerately: a SELF-WIRE (a cycle — the run's generic
    // no-FromStage voice hid it) and a wire to a DEAD STAGE (its
    // source removed after the fact). Whatever wrote the doc — an
    // older door, a hand edit — the store is held at read.
    if (Array.isArray(doc["stages"])) {
        for (const st of doc["stages"]) {
            if (typeof st !== "object" || st === null)
                continue;
            const row = st;
            const id = typeof row["id"] === "string" ? row["id"] : undefined;
            const ins = row["inputs"];
            if (typeof ins !== "object" || ins === null || Array.isArray(ins))
                continue;
            for (const [chan, ref] of Object.entries(ins)) {
                const rr = ref;
                if (typeof rr !== "object" || rr === null || typeof rr["stage"] !== "string")
                    continue;
                const up = rr["stage"];
                if (id !== undefined && up === id) {
                    throw new RemoteError("bench/self-wire", "input '" + chan + "' wires its own stage '" + id + "' — a cycle composes nothing. " +
                        "This wire predates the bench door's self-wire law and persisted; clear it (rewire the input with no source, or wire a real prior stage).", { session, stage: id, input: chan });
                }
                // A wire to a stage NOT on the bench (its source removed
                // later, or a crafted-log doc) stays the write doors' and
                // the run door's voice — crafted-undo docs may hold one
                // legitimately between mutations (bench-undo's inverse
                // table); serve must not brick the bench a fix needs to
                // open.
            }
        }
    }
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
/** patch — params merge with CAS + log. THE ONE OUTCOME DOOR
 *  (the telemetry law's other half, 2026-10-08): run outcomes ride
 *  drafts/patch — the archive's door, the poll's door. This verb
 *  authors PARAMS only (the construct tool's patch grammar is
 *  {stage, params}; the tab's outcome observer writes through the
 *  drafts door). The old result/runStatus arms wrote ARCHIVE-LESS —
 *  a landing here destroyed the previous result with no supersede —
 *  under the old every-write-bumps law, so every outcome here also
 *  ticked the rev. Outcomes refuse with the redirect voice. */
export async function patchBench(drafts, session, body, admit) {
    refuseUnknown(body, PATCH_KEYS);
    if ("result" in body || "runStatus" in body) {
        throw new RemoteError("bench/bad-body", "run outcomes ride the drafts/patch door (result/runStatus refused on the bench verb — it authors params only)", {});
    }
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
    const paramsIn = wireParams(body["params"]);
    if (paramsIn !== undefined) {
        if (!isRecord(paramsIn)) {
            throw new RemoteError("bench/bad-body", "params must be an object", {});
        }
        // THE MERGE IS A COPY (2026-09-15, the no-leak law): the merged
        // view is a NEW object — a refused admission must not leave the
        // patch's writes on the domain's cached doc (the live record is
        // assigned only after every gate passes).
        const cur = isRecord(st["params"])
            ? { ...st["params"] }
            : {};
        for (const k of Object.keys(paramsIn)) {
            if (Object.prototype.hasOwnProperty.call(cur, k))
                before[k] = cur[k];
            else
                added.push(k);
            // THE NULL-UNSET ARM (2026-09-24, commission 033's gap: "patch
            // can't unset a param — a lane switch forced remove_stage +
            // add_stage where one clear-semantics patch would do"). The
            // drafts door has ALWAYS deleted null keys (JSON Merge Patch
            // law, draft.ts's own doc: "null params values ride VERBATIM —
            // the door's JSON Merge Patch arm deletes those keys"); this
            // door landed them as literal nulls instead — a key that could
            // never be cleared, only overwritten. Null now deletes here
            // too: one law, two doors. The inverse restores from
            // params_before, so undo resurrects a deleted key.
            const v = paramsIn[k];
            if (v === null)
                delete cur[k];
            else
                cur[k] = v;
        }
        // admission on the MERGED view (the row's card + the params the
        // NEXT run would compose — a patch that lands poison is as bad
        // as an add that lands it); the row's own provenance rides (a
        // restored row patches under restore law)
        admitStage(admit, st["card"], cur, st["provenance"]);
        // THE WIRING ADMISSION (phantom-wire cure): a params patch can
        // orphan a spell (drop the $image binding while the wire stays)
        // or strand a wire (introduce $image with no channel) — the
        // merged pair admits together, exactly as the run consumes them.
        admitWiring(st, cur, isRecord(st["inputs"]) ? st["inputs"] : {}, 
        // (the domain schema pins stages[].id: string with
        // backup-and-skip at read — a nullish id never reaches here)
        stagesOf(loaded.doc).map((r) => String(r["id"])), stageId, session);
        st["params"] = cur;
    }
    if (paramsIn === undefined) {
        throw new RemoteError("bench/bad-body", "nothing to patch (params)", {});
    }
    const newRev = await appendAndSave(drafts, loaded, {
        author,
        kind: "patch",
        stage: stageId,
        summary: "patch " + Object.keys(paramsIn).sort().join(","),
        inverse: { stage: stageId, params_before: before, params_added: added },
    });
    return {
        draft_id: loaded.draftId,
        session,
        rev: newRev,
        stage: stageId,
        patched: Object.keys(paramsIn).sort(),
    };
}
const ADD_KEYS = ["id", "card", "engine", "params", "inputs", "outputs", "expected", "expect_rev", "author"];
/** THE WIRE UNWRAP AT THE STORE SEAT (attempt-035's Probe B
 * receipt, 2026-09-24): the remote transport encodes free-form
 * arrays as `{item:[…]}` — the tool seat unwraps what IT sees, but
 * the encoded shape re-forms crossing the remote boundary and
 * storage held the wrap (the live bench read showed it verbatim).
 * Every params-bearing WRITE walks the unwrap — the doc stores
 * clean, reads and compose never see the poison, Probe B reads a
 * true array. */
const wireParams = (v) => (isRecord(v) ? unwrapItemArrays(v) : v);
/** Admit one RESTORED stage state (the undo arms): the same seat,
 *  no restored carve — an undo rewrites live-authored params, so it
 *  is judged like any other write. A stage with no card row (an mcp
 *  or flow id) is not this seat's business. */
function admitRestored(admit, stage, params) {
    if (admit === undefined)
        return;
    const card = stage["card"];
    if (typeof card !== 'string' || card === '')
        return;
    admit(card, params, stage["provenance"]);
}
function admitStage(admit, card, params, provenance = undefined) {
    if (admit === undefined)
        return;
    if (typeof card !== "string" || card === "")
        return;
    // A param-less row still names its card (2026-09-15: a stageless
    // add sailed past admission entirely) — admit the card against
    // empty params; the model check passes vacuous, the card check
    // still bites.
    admit(card, isRecord(params) ? params : {}, provenance);
}
/** Admission over a wholesale stage list (the load arm — every row
 *  passes the same door an add passes). */
function admitStages(admit, stages) {
    if (admit === undefined || !Array.isArray(stages))
        return;
    for (const s of stages) {
        if (!isRecord(s))
            continue;
        admitStage(admit, s["card"], s["params"], s["provenance"]);
    }
}
// ── THE WIRING ADMISSION (2026-09-15, the phantom-wire cure) ───────
// The bench's wiring vocabulary is the RUN's: `inputs` name channels,
// params bind them via `$channel` spells (rewriteSpells is the
// consumer — a string param starting with "$" IS a spell). Three
// construction violations used to land silent and starve compose at
// run time, far from the write that caused them:
//   a) a channel no param spells (dead wire — the agent's
//      inputs:{image:{stage,...}} with no $image anywhere);
//   b) a spell no channel binds (runs refuse at rewriteSpells);
//   c) an upstream stage id that is not on the bench (the mint
//      mints s_N; "stage-1" never existed).
// All three now refuse AT WRITE TIME, named.
/** Collect the `$channel` spell names a params body carries
 *  (rewriteSpells semantics verbatim: a string STARTING with "$" is
 *  one spell named slice(1) — "costs $5" is text, "$image" is a
 *  spell). */
function spellsOf(params, out = new Set()) {
    if (typeof params === "string") {
        if (params.startsWith("$"))
            out.add(params.slice(1));
    }
    else if (Array.isArray(params)) {
        for (const v of params)
            spellsOf(v, out);
    }
    else if (typeof params === "object" && params !== null) {
        for (const v of Object.values(params))
            spellsOf(v, out);
    }
    return out;
}
/** One wiring binding's declared shape: {stage, output} (FromStage),
 *  {initial} (the request's initial), or anything else (garbage —
 *  the run maps only these two). */
function wireUpstreamOf(ref) {
    if (typeof ref !== "object" || ref === null || Array.isArray(ref))
        return {};
    const r = ref;
    if (typeof r["stage"] === "string")
        return { stage: r["stage"] };
    if (typeof r["initial"] === "string")
        return { initial: true };
    return {};
}
/** The wiring admission over ONE row (params = the MERGED view the
 *  next run composes; inputs = the MERGED wiring; liveIds = the
 *  bench's stage ids after the write; selfId = the row's own id —
 *  self-wiring is a cycle, refused). Throws bench/* named. */
function admitWiring(row, params, inputs, liveIds, selfId, session) {
    const spells = spellsOf(params);
    for (const [chan, ref] of Object.entries(inputs)) {
        const up = wireUpstreamOf(ref);
        if (up.stage === undefined && up.initial !== true) {
            throw new RemoteError("bench/bad-wire", "input '" + chan + "' is neither {stage, output} nor {initial} — the run maps only those two shapes", { session, stage: selfId, input: chan });
        }
        if (up.stage !== undefined) {
            if (up.stage === selfId) {
                throw new RemoteError("bench/self-wire", "input '" + chan + "' wires its own stage '" + selfId + "' — a cycle composes nothing", { session, stage: selfId, input: chan });
            }
            if (!liveIds.includes(up.stage)) {
                throw new RemoteError("bench/wire-stage-not-found", "input '" + chan + "' wires stage '" + up.stage + "' — no such stage on the bench (live: " +
                    (liveIds.join(", ") || "none") + ")", { session, stage: selfId, input: chan, live: liveIds });
            }
        }
        if (!spells.has(chan)) {
            throw new RemoteError("bench/dead-wire", "input '" + chan + "' is bound by no '$" + chan + "' spell in params — the wiring would feed nothing " +
                "(bind it, e.g. params: {image: \"$" + chan + "\"}, or drop the wire)", { session, stage: selfId, input: chan });
        }
    }
    // NOTE: the reverse (a $spell with no channel) is NOT a write-time
    // refusal — it is a legal INTERMEDIATE state (spell first, wire
    // second; the two-step construction). The run refuses a stray
    // spell LOUD at merge (rewriteSpells' own voice), so nothing is
    // silent either way.
}
/** Wiring admission over a wholesale stage list (the load arm —
 *  every row checks against the list it lands in). Both call sites
 *  pass normalizeStages() output — non-arrays collapse to [] there,
 *  non-record rows filter out, and every surviving row carries a
 *  string id plus record params/inputs (the coerce arms at
 *  normalizeStages) — so no re-defense here. */
function admitWiringList(stages, session) {
    const liveIds = stages.map((r) => r["id"]);
    for (const r of stages) {
        admitWiring(r, r["params"], r["inputs"], liveIds, r["id"], session);
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
        params: isRecord(wireParams(body["params"])) ? wireParams(body["params"]) : {},
        inputs: isRecord(body["inputs"]) ? body["inputs"] : {},
        outputs: isRecord(body["outputs"]) ? body["outputs"] : { default: "image" },
        provenance: author,
    };
    if (isRecord(body["expected"]))
        row["expected"] = body["expected"];
    // THE WIRING ADMISSION (phantom-wire cure) — BEFORE the push: the
    // row's wiring admits against a PROJECTED live set (current ids +
    // this row's). Never push-then-check: the loaded doc is the
    // domain's cached object, and a refusal after the push LEAKS the
    // refused row into the cache (live-fired 2026-09-15: two refused
    // adds persisted as s_1/s_2 on the next good write — a refusal
    // that lies). Mutate only after every gate passes.
    admitWiring(row, row["params"], row["inputs"], [...stages.map((r) => String(r["id"] ?? "")), stageId], stageId, session);
    stages.push(row);
    loaded.doc["stages"] = stages;
    // add_stage never syncs the intent (the orphaning law): a pure
    // add grows the card set — a label true before stays true after.
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
    const before = [...stages];
    stages.splice(idx, 1);
    loaded.doc["stages"] = stages;
    syncIntent(loaded.doc, before, stages);
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
        ? { ...st["inputs"] }
        : {};
    const before = Object.prototype.hasOwnProperty.call(st["inputs"] === undefined ? {} : st["inputs"], input)
        ? st["inputs"][input]
        : undefined;
    if (from === undefined)
        delete inputs[input];
    else
        inputs[input] = from;
    // THE PHANTOM-WIRE CURE (2026-09-15): rewire is THE wiring door —
    // the CANDIDATE wiring (a copy, never the live record: a refusal
    // must not leak the write into the domain's cached doc) admits
    // against the row's params and the live bench BEFORE anything
    // moves (a channel nothing spells, an upstream that doesn't
    // exist — all refuse here, named, instead of starving compose at
    // run time).
    admitWiring(st, isRecord(st["params"]) ? st["params"] : {}, inputs, 
    // (the domain schema pins stages[].id: string with
    // backup-and-skip at read — a nullish id never reaches here)
    stagesOf(loaded.doc).map((r) => String(r["id"])), stageId, session);
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
export async function undoBench(drafts, session, body, admit) {
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
        applyInverse(loaded.doc, e, admit);
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
function applyInverse(doc, e, admit) {
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
        // UNDO IS A WRITE (2026-10-10, the door audit's HIGH-3): the
        // inverse restores params wholesale, so without this an undo was
        // the laundering path — plant a poison through a door that is not
        // judged, patch it clean, then undo back onto the poison. The
        // restored state walks the same composed admission BEFORE it
        // lands, and NO restored exemption applies: these were
        // live-authored states, so re-judging is safe and a refusal is
        // loud.
        admitRestored(admit, st, cur);
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