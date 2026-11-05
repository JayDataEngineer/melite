// bench-generation-inheritance.spec.ts — THE ONE-SEAT IDENTITY WALL
// (audit 2026-10-31-one-seat-bench-identity, the sixteenth report:
// "IT NEVER EVER RELOADS FROM HISTORY … IT IS ONE SEAT").
//
// THE INVARIANT, arms on their OWN paths:
//
//   SEED (ensure path) — DSH conversations seed NEW session
//   generations (the child's header carries parentSession); a child
//   generation's FIRST bench touch inherits the nearest ancestor
//   generation's WHOLE state: every row verbatim (each row's own
//   result is its own truth — the preview continuity), live run
//   states normalized to '' (a fresh generation re-observes), one
//   'seed' log entry naming the ancestor. A chain naming no ancestor
//   WITH state keeps the clean-birth law. The lineage source is the
//   host sessions service, probed like every optional seat — absent
//   service, no inheritance, clean birth.
//
//   SEED (load path — the depth BLOCKER's own arms) — EVERY creating
//   arm inherits, not only ensure's pure touch: the mutation doors
//   birth through loadBench, so the operator's GUI-first-touch on a
//   seeded child (subscribe → empty → add_stage, a stated-rev: 0
//   write) birthed the empty doc and defeated the inheritance
//   permanently. The load-path birth keeps the LOAD shape (status
//   draft, rev 0 — a rev-1 birth would CAS-conflict the first
//   touch's own expect_rev: 0) with the seed entry stamped rev 0.
//
//   SEED (read path — TAB-FIRST) — a READ inherits too: bench/get on
//   a missing child whose lineage carries state read-through-seeds
//   (getBenchSeeded) and SERVES the built state — the tab's first
//   frame after a reload carries the rows with no write and no
//   client change, at rev 0 (a read never mints a rev the first
//   write's CAS would conflict with). subscribe's first frame rides
//   the same read, so the stream's zero-state fallback can never be
//   the tab's first truth while an ancestor holds state.
//
//   RESTORE EXEMPTION — a caller POSTING stages names its own load
//   (the restore rides ensure WITH stages + overwrite): no
//   inheritance, no seed birth under it, and the next add appends
//   without duplicate-stage (the exemption must not seed rows the
//   caller's load then collides with).
//
//   DELEGATION FORWARD — the tool stamps the delegation signal:
//   benchKeyOfExec forwards a bare subagent uuid as `delegate:<uuid>`
//   (never a bench-<subagent> doc no tab watches), keeps the
//   conversation id's own bench, and leaves the genuinely
//   unattributed seat's fallback alive (absent id → main).
//
//   DELEGATION RE-SEAT — the estate door owns the seat: a
//   delegate:<uuid> key re-seats to the PARENT conversation's
//   CURRENT generation (the writer lineage[0] — the doc the tab
//   watches) on writes AND reads; no orphan bench-<uuid> doc is
//   ever born.
//
//   DELEGATION UNRESOLVABLE — a delegate: key whose host sessions
//   record resolves no parent refuses loud (bench/unseated), reads
//   and writes alike; never a silent birth on the orphan key.
//
//   THE PREFIX IS THE SIGNAL — a bare uuid WITHOUT the delegate:
//   prefix is the seat's own explicit key (headless scripts): no
//   walk, no refusal, its own bench — the audit leaves genuinely
//   unattributed seats alive ('main' and explicit keys).
//
//   CORRUPT-BYTES SEPARATOR (F4) — the one-seat law and the store's
//   invalidRecords: backup-and-skip read differently: a child whose
//   bytes are unreadable reads ABSENT, and the lineage still seats
//   the ancestor's state (the cause is the identity, never silence,
//   never junk); a key with no lineage in the same corrupt world
//   keeps the loud bench/not-found voice.
//
//   JUNK-CHAIN LINEAGE — the chain is HOST data: a generation whose
//   key is not a session id (SESSION_RE refuses it) rides the chain
//   and the seed walk SKIPS it — the nearest well-formed ancestor
//   with state still seats, never the junk; a session- key that
//   fails SESSION_RE itself never materializes a doc (the seeded
//   read keeps the caller's own bad-session refusal, byte-identical
//   to a plain get, even while an ancestor holds state).
//
// Red-proofs: toggle the inheritance arm out of ensureBench → the
// ensure-path SEED reds; gate loadBench's seed birth off → the
// load-path SEED reds alone; toggle getBenchSeeded out of the get
// read-through → the read-path arms red (the tab's first frame
// empties); toggle seatOf's delegate re-seat out → the RE-SEAT arm
// reds (an orphan bench-<uuid> doc appears); remove ensure's
// stages-undefined gate → the RESTORE EXEMPTION reds alone.
import { describe, expect, it } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { BenchRemoteService } from "@melite/estate-drafts";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import {
  bootCtx, bootCtxAt, failureOf, mintRoot, sig,
} from "../../../../packages/estate/drafts/tests/bench-helpers.ts";
import { benchKeyOfExec } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";
import { getBenchSeeded } from "../../../../packages/estate/drafts/src/bench.ts";

const PARENT = "session-4461c496-parent";
const CHILD = "session-6b561044-child";
const CHILD_NO_CHAIN = "session-2f7a3b9c-orphan";
const BARE = "8f0f5d31-b7d1-4c9f-9f8d-b7bca36a8257";
const STRANGER = "0f0e1d2c-3b4a-4c5d-8e9f-001122334455";

/** The host sessions service as the audit found the live chain:
 *  CHILD's header names PARENT as its parentSession; PARENT is a
 *  root (no parent). Records are validated at the boundary by the
 *  walker — this fake spells the DSH Session surface it reads. */
const sessionsService = {
  get(id: string): unknown {
    if (id === CHILD) {
      return { id: CHILD, header: { id: CHILD, parentSession: PARENT } };
    }
    if (id === PARENT) {
      return { id: PARENT, header: { id: PARENT } };
    }
    return undefined;
  },
};

/** The delegated lane's host record: the subagent's agent.id is the
 *  BARE uuid (the tool forwards delegate:<uuid>), while the host
 *  session record keys it verbatim — the walker's first probe. */
const delegatedSessions = {
  get(id: string): unknown {
    if (id === BARE) {
      return { id: BARE, header: { id: BARE, parentSession: PARENT } };
    }
    return sessionsService.get(id);
  },
};

/** The corrupt-chain host: CHILD's parent names a generation whose
 *  key is not a session id (a space rides it) — the walker carries
 *  it (host strings pass the chain's own checks) and the seed walk
 *  must skip it. */
const JUNK_GEN = "not a session gen";
const junkChainSessions = {
  get(id: string): unknown {
    if (id === CHILD) {
      return { id: CHILD, header: { id: CHILD, parentSession: JUNK_GEN } };
    }
    if (id === JUNK_GEN) {
      return { id: JUNK_GEN, header: { id: JUNK_GEN, parentSession: PARENT } };
    }
    return sessionsService.get(id);
  },
};

/** The malformed generation: a `session-` key that fails SESSION_RE
 *  (the space) whose host record still resolves a parent WITH state
 *  — the key never owns a bench doc. */
const BAD_SESSION = "session-bad gen";
const badSessionSessions = {
  get(id: string): unknown {
    if (id === BAD_SESSION) {
      return { id: BAD_SESSION, header: { id: BAD_SESSION, parentSession: PARENT } };
    }
    return sessionsService.get(id);
  },
};

interface Rig {
  bench: BenchRemoteService;
  domain: Domain<never>;
}

/** Boot the real doors with the card registry and the host sessions
 *  service seated — the operator's host shape in miniature. */
async function rig(sessions?: typeof sessionsService): Promise<Rig> {
  const { ctx, domain } = await bootCtx();
  return seat(ctx, domain, sessions);
}

/** Seat the bench doors onto a booted ctx (the card registry and the
 *  host sessions service — the operator's host shape in miniature). */
function seat(ctx: Context, domain: Domain<never>, sessions?: typeof sessionsService): Rig {
  ctx.provide("cardRegistry", {
    resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
    admitStageModel: (): { ok: true } => ({ ok: true }),
  });
  if (sessions !== undefined) ctx.provide("sessions", sessions);
  return { bench: new BenchRemoteService(ctx), domain };
}

/** The parent generation's settled state, through the real doors:
 *  birth first (the birth arm strips runStatus by law), then the
 *  wholesale load posting the settled rows — the run-state writer's
 *  own shape. */
async function buildParent(bench: BenchRemoteService): Promise<number> {
  await bench.ensure({
    session: PARENT,
    author: "user",
    stages: [{ id: "s_17", card: "h3-timeline" }, { id: "s_18", card: "tagger" }],
  }, sig);
  const parentRev = (await bench.get(PARENT, sig)).rev;
  await bench.ensure({
    session: PARENT,
    author: "user",
    overwrite: true,
    expect_rev: parentRev,
    stages: [
      {
        id: "s_17", card: "h3-timeline", runStatus: "done",
        result: { run_id: "run-d618b3323465-8f0f5d31", url: "/infer-gallery/artifact?path=film.mp4" },
      },
      { id: "s_18", card: "tagger", runStatus: "running" },
    ],
  }, sig);
  return (await bench.get(PARENT, sig)).rev;
}

describe("the one-seat bench identity (generation inheritance + the agent seat's refusals)", () => {
  it("SEED — a child generation's first touch inherits the parent bench whole (the operator's reload-from-history)", async () => {
    const { bench } = await rig(sessionsService);
    await buildParent(bench);
    // the child generation's FIRST touch — the reload-from-history
    const born = await bench.ensure({ session: CHILD, author: "agent" }, sig);
    expect(born.created, "the child bench is born").toBe(true);
    expect(born.rev, "the seed entry is the first rev").toBe(1);
    const stages = born.stages as Array<Record<string, unknown>>;
    expect(stages, "the WHOLE parent state rides forward").toHaveLength(2);
    const settled = stages.find((s) => s["id"] === "s_17")!;
    expect(settled["result"], "each row's own result is its own truth — the preview continuity").toBeDefined();
    expect(settled["runStatus"]).toBe("done");
    const live = stages.find((s) => s["id"] === "s_18")!;
    expect(live["runStatus"], "a fresh generation re-observes — a stale running is a lie").toBe("");
    const read = await bench.get(CHILD, sig);
    const log = (read as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(log[0]?.["kind"], "the log names the inheritance").toBe("seed");
    expect(String(log[0]?.["summary"] ?? "")).toContain(PARENT);
  });

  it("SEED (negative) — a chain with no ancestor state keeps the clean-birth law", async () => {
    // the parent session exists in the host but owns NO bench doc
    const { bench } = await rig(sessionsService);
    const born = await bench.ensure({
      session: CHILD,
      author: "user",
      stages: [{ id: "s_1", card: "tagger" }],
    }, sig);
    const stages = born.stages as Array<Record<string, unknown>>;
    expect(stages.map((s) => s["id"]), "no ancestor inheritance — the birth is the caller's own stages").toEqual(["s_1"]);
    expect(born.rev).toBe(0);
  });

  it("SEED (absent host) — no sessions service on the lane, no inheritance: clean birth unchanged", async () => {
    const { bench } = await rig();
    await bench.ensure({ session: PARENT, author: "user", stages: [{ id: "s_1", card: "tagger" }] }, sig);
    const born = await bench.ensure({ session: CHILD, author: "agent" }, sig);
    expect((born.stages as Array<Record<string, unknown>>), "no lineage resolved → the clean birth").toEqual([]);
    expect(born.rev).toBe(0);
  });

  it("SEED (load path — THE DEPTH BLOCKER) — the GUI-first-touch add_stage on a seeded child inherits, not just ensure's pure touch", async () => {
    const { bench } = await rig(sessionsService);
    await buildParent(bench);
    // THE OPERATOR'S OWN DEFEAT, NOW THE WALL: the seeded child's tab
    // subscribes (get → not-found), the user's FIRST press is an
    // add_stage carrying the stated rev 0 — loadBench births, and the
    // birth must inherit instead of minting the empty doc.
    const row = (await bench.addStage(CHILD, { card: "tagger", expect_rev: 0, author: "user" } as never, sig)) as { rev: number; stage: string };
    expect(row.stage, "the add landed — minted PAST the inherited ids (max+1 over s_17/s_18), the mint itself proves the rows were present").toBe("s_19");
    expect(row.rev, "the seed birth is rev 0 — the add is the FIRST append (a rev-1 birth would CAS-conflict this very press)").toBe(1);
    const read = await bench.get(CHILD, sig);
    const stages = read.stages as Array<Record<string, unknown>>;
    expect(stages, "the WHOLE parent state rides under the added row").toHaveLength(3);
    const settled = stages.find((s) => s["id"] === "s_17")!;
    expect(settled["result"], "the preview continuity survives the GUI-first-touch").toBeDefined();
    expect(settled["runStatus"]).toBe("done");
    expect(stages.find((s) => s["id"] === "s_18")!["runStatus"], "a stale running never seeds forward").toBe("");
    const log = (read as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(log[0]?.["kind"], "the log names the inheritance first").toBe("seed");
    expect(String(log[0]?.["summary"] ?? "")).toContain(PARENT);
    expect(log[1]?.["kind"], "the add follows the seed").toBe("add_stage");
  });

  it("SEED (load path negative) — a child with no ancestor state births clean through the mutation doors too", async () => {
    const { bench } = await rig(sessionsService);
    const row = (await bench.addStage(CHILD, { card: "tagger", expect_rev: 0, author: "user" } as never, sig)) as { rev: number };
    expect(row.rev).toBe(1);
    const read = await bench.get(CHILD, sig);
    expect((read.stages as Array<Record<string, unknown>>).map((s) => s["id"]), "the clean birth mints from zero (s_0)").toEqual(["s_0"]);
    const log = (read as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(log[0]?.["kind"], "no seed entry — the clean birth").toBe("add_stage");
  });

  it("SEED (read path — TAB-FIRST) — a READ seats the ancestor's state: the tab's first frame after a reload carries the rows", async () => {
    const { bench } = await rig(sessionsService);
    await buildParent(bench);
    const parentRevBefore = (await bench.get(PARENT, sig)).rev;
    // THE PURE READ: no write, no client change — the reopen-and-look
    // the audit burned on (bench/get refused not-found; subscribe
    // served ZERO; the tab's first frame was empty).
    const row = await bench.get(CHILD, sig);
    const stages = row.stages as Array<Record<string, unknown>>;
    expect(stages, "the built state serves on the FIRST read").toHaveLength(2);
    expect(stages.find((s) => s["id"] === "s_17")!["result"], "the preview continuity rides the read").toBeDefined();
    expect(stages.find((s) => s["id"] === "s_18")!["runStatus"], "a stale running never seeds forward").toBe("");
    expect(row.rev, "the read-through birth keeps the LOAD shape (rev 0) — a read never mints a rev the first write's CAS would conflict with").toBe(0);
    const log = (row as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(log[0]?.["kind"], "the log names the inheritance").toBe("seed");
    expect(String(log[0]?.["summary"] ?? "")).toContain(PARENT);
    // the read is a READ: the ancestor's doc is untouched
    expect((await bench.get(PARENT, sig)).rev, "no write landed on the ancestor").toBe(parentRevBefore);
    // idempotent: the second read serves the same state, rev unmoved
    const again = await bench.get(CHILD, sig);
    expect((again.stages as Array<Record<string, unknown>>)).toHaveLength(2);
    expect(again.rev).toBe(0);
  });

  it("SEED (read path — TAB-FIRST, the stream) — subscribe's FIRST frame carries the state, never the zero-state fallback", async () => {
    const { bench } = await rig(sessionsService);
    await buildParent(bench);
    const ac = new AbortController();
    const iter = bench.subscribe(CHILD, ac.signal)[Symbol.asyncIterator]();
    const first = await iter.next();
    expect(first.done, "the stream opened with a frame").toBe(false);
    const stages = (first.value as { stages: unknown }).stages as Array<Record<string, unknown>>;
    expect(stages, "the tab's first frame is the BUILT state — the zero-state fallback ([]) is never the first truth while an ancestor holds state").toHaveLength(2);
    expect((first.value as { rev: number }).rev).toBe(0);
    await iter.return?.(undefined as never);
    ac.abort();
  });

  it("RESTORE EXEMPTION — a caller POSTING stages names its own load: no inheritance, no seed birth under it, and the next add never collides", async () => {
    const { bench } = await rig(sessionsService);
    await bench.ensure({ session: PARENT, author: "user", stages: [{ id: "s_17", card: "h3-timeline" }] }, sig);
    // the restore's own shape: ensure WITH stages + overwrite
    const born = await bench.ensure({
      session: CHILD, author: "user", overwrite: true,
      stages: [{ id: "s_17", card: "h3-timeline", runStatus: "done", result: { run_id: "run-restore", url: "/infer-gallery/artifact?path=restore.mp4" } }],
    }, sig);
    expect(born.rev).toBe(0);
    expect((born.stages as Array<Record<string, unknown>>).map((s) => s["id"]), "the caller's own load, verbatim — no inherited rows").toEqual(["s_17"]);
    // the exemption must not seed shadow rows the caller's next add
    // would collide with
    const second = (await bench.addStage(CHILD, { card: "tagger", expect_rev: 0, author: "user" } as never, sig)) as { rev: number };
    expect(second.rev).toBe(1);
    const read = await bench.get(CHILD, sig);
    expect((read.stages as Array<Record<string, unknown>>).map((s) => s["id"]), "the add mints s_18 — no inherited s_18 shadow row to collide with").toEqual(["s_17", "s_18"]);
    const log = (read as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(log.some((e) => e["kind"] === "seed"), "no seed entry on the restore path").toBe(false);
  });

  it("DELEGATION FORWARD — the tool stamps the delegate: signal on a bare subagent uuid", () => {
    expect(benchKeyOfExec({ agent: { id: BARE } }), "a bare uuid forwards under the seat prefix — never its own bench-<uuid> doc").toBe("delegate:" + BARE);
    expect(benchKeyOfExec({ agent: { id: CHILD } }), "a conversation id keeps its own bench").toBe(CHILD);
  });

  it("THE UNATTRIBUTED SEAT — a missing id falls to the explicit/main bench (the fallback the audit leaves alive)", () => {
    expect(benchKeyOfExec({}), "no agent id → the headless seat's own key").toBe("main");
    expect(benchKeyOfExec({ agent: {} })).toBe("main");
    expect(benchKeyOfExec({ agent: { id: "" } })).toBe("main");
  });

  it("DELEGATION RE-SEAT — a delegate:<uuid> write lands on the PARENT conversation's bench; the agent's reads ride the same seat; no orphan doc", async () => {
    const { bench, domain } = await rig(delegatedSessions);
    const parentRev = await buildParent(bench);
    // THE DELEGATED LANE'S WRITE, forwarded by the tool as
    // delegate:<uuid>: the door re-seats to the parent's CURRENT
    // generation — the doc the tab watches.
    const row = (await bench.addStage("delegate:" + BARE, { card: "tagger", expect_rev: parentRev, author: "agent" } as never, sig)) as { rev: number; stage: string };
    expect(row.stage, "the row minted on the PARENT's rows (max+1 over s_17/s_18) — the seat is the parent, not the caller key").toBe("s_19");
    expect(row.rev).toBe(parentRev + 1);
    // the agent's own read re-seats the same way: one seat, both faces
    const agentRead = await bench.get("delegate:" + BARE, sig);
    expect((agentRead.stages as Array<Record<string, unknown>>).map((s) => s["id"])).toEqual(["s_17", "s_18", "s_19"]);
    // and the tab (the parent conversation) sees the lane's work
    const tabRead = await bench.get(PARENT, sig);
    expect((tabRead.stages as Array<Record<string, unknown>>).map((s) => s["id"])).toEqual(["s_17", "s_18", "s_19"]);
    // no orphan bench-<uuid> doc was ever born
    expect(domain.table("docs" as never).get("bench-" + BARE as never), "no bench-<subagent> doc exists — the split is dead").toBeUndefined();
  });

  it("DELEGATION UNRESOLVABLE — a delegate: key with no resolvable parent refuses loud (bench/unseated), reads and writes alike", async () => {
    const { bench, domain } = await rig(delegatedSessions);
    const writeFail = await failureOf(bench.addStage("delegate:" + STRANGER, { card: "tagger", expect_rev: 0, author: "agent" } as never, sig));
    expect(writeFail?.code, "the write refuses — never a silent birth on the orphan key").toBe("bench/unseated");
    const readFail = await failureOf(bench.get("delegate:" + STRANGER, sig));
    expect(readFail?.code, "the read refuses the same voice").toBe("bench/unseated");
    expect(domain.table("docs" as never).get("bench-" + STRANGER as never)).toBeUndefined();
  });

  it("THE PREFIX IS THE SIGNAL — a bare uuid WITHOUT delegate: is the seat's own explicit key: its own bench, no walk, no refusal", async () => {
    const { bench, domain } = await rig(delegatedSessions);
    // the same uuid that re-seats under the prefix, WITHOUT it: a
    // headless script's own explicit key — the audit's lawful
    // unattributed seat
    const row = (await bench.addStage(BARE, { card: "tagger", expect_rev: 0, author: "agent" } as never, sig)) as { rev: number; stage: string };
    expect(row.rev, "its own bench, clean birth").toBe(1);
    expect(row.stage).toBe("s_0");
    expect(domain.table("docs" as never).get("bench-" + BARE as never), "the un-prefixed key owns its doc").toBeDefined();
    // 'main' — the headless fallback key — composes the same way
    const main = (await bench.addStage("main", { card: "tagger", expect_rev: 0, author: "agent" } as never, sig)) as { rev: number };
    expect(main.rev, "the main fallback stays alive at the door").toBe(1);
  });

  it("CORRUPT-BYTES SEPARATOR (F4) — unreadable child bytes read ABSENT and the lineage still seats the ancestor's state; no lineage keeps the loud voice", async () => {
    // THE TWO-BOOT PLANT: the child's bench bytes are corrupt on
    // disk; the reopen's record judgment reads it ABSENT
    // (invalidRecords: backup-and-skip — never a brick). The F4 burn:
    // the served state was pixel-identical to an orphan — the wall
    // separates the causes.
    const root = mintRoot();
    const first = await bootCtxAt(root);
    await first.domain.table("docs" as never).put("bench-" + CHILD as never, {
      updated_at: 1,
      doc: { NOT_A_BENCH: true },
    } as never);
    const reopened = await bootCtxAt(root);
    const { bench } = seat(reopened.ctx, reopened.domain, sessionsService);
    // the parent's state is healthy; only the child's bytes are gone
    await buildParent(bench);
    // the tab's read STILL seats the built state — the cause is the
    // identity law, not the bytes, and never silence or junk
    const row = await bench.get(CHILD, sig);
    const stages = row.stages as Array<Record<string, unknown>>;
    expect(stages, "the ancestor's state serves past the corrupt bytes").toHaveLength(2);
    expect(stages.find((s) => s["id"] === "s_17")!["result"]).toBeDefined();
    const log = (row as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(log[0]?.["kind"], "the seed entry names the cause — the inheritance, not a silent absence").toBe("seed");
    // THE SEPARATOR'S OTHER EDGE: the same corrupt world, a key the
    // law cannot seed (no lineage) keeps the loud refusal — the
    // absence is honest, never a zero-state lie
    const orphanFail = await failureOf(bench.get(CHILD_NO_CHAIN, sig));
    expect(orphanFail?.code, "no lineage → bench/not-found, byte-identical").toBe("bench/not-found");
  });

  it("JUNK-CHAIN LINEAGE — a chain generation that is not a session id is skipped; the nearest well-formed ancestor with state still seats", async () => {
    const { bench, domain } = await rig(junkChainSessions);
    await buildParent(bench);
    // the chain: CHILD → <junk gen> → PARENT; the junk generation
    // owns no seat — the seed walk skips it and lands on PARENT
    const row = await bench.get(CHILD, sig);
    const stages = row.stages as Array<Record<string, unknown>>;
    expect(stages, "the walk seeded past the junk generation").toHaveLength(2);
    expect(stages.find((s) => s["id"] === "s_17")!["result"], "the preview continuity rides past the junk").toBeDefined();
    const log = (row as unknown as { log?: Array<Record<string, unknown>> }).log ?? [];
    expect(String(log[0]?.["summary"] ?? ""), "the seed names the WELL-FORMED ancestor, never the junk").toContain(PARENT);
    expect(String(log[0]?.["summary"] ?? "")).not.toContain(JUNK_GEN);
    expect(domain.table("docs" as never).get("bench-" + JUNK_GEN as never), "the junk generation owns no doc").toBeUndefined();
  });

  it("MALFORMED GENERATION — a session- key that fails SESSION_RE never materializes a doc: the seeded read keeps the caller's own bad-session refusal", async () => {
    const { bench, domain } = await rig(badSessionSessions);
    await buildParent(bench);
    // the read-through itself (the door the remote get rides):
    // the lineage resolves an ancestor WITH state, the key is a
    // session- key, and the walk still refuses to birth — the guard
    // is the key's own shape law
    const fail = await failureOf(getBenchSeeded(domain as never, BAD_SESSION, [PARENT]));
    expect(fail?.code, "the caller's own refusal, byte-identical — never a silent birth").toBe("bench/bad-session");
    expect(domain.table("docs" as never).get("bench-" + BAD_SESSION as never), "the ancestor's state never seeds a malformed key").toBeUndefined();
    // the remote get rides the same law: its own face refuses first
    const viaDoor = await failureOf(bench.get(BAD_SESSION, sig));
    expect(viaDoor?.code).toBe("bench/bad-session");
  });
});
