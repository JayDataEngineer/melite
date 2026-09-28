// drafts-remote — REBUILD-1/2 owner wall (2026-09-10).
//
// Rides the source-plane facade (@melite/estate-drafts -> src; the
// standard-decorator plugin lowers @Remote). In-process only: a real
// Context, the real DSH storage rows (json backend + domain facility)
// over scratch dirs, two legacy draft files (the one-time import),
// then the remotes' list/get/ensure over the domain. No HTTP, no
// server, no port.
//
// Framework values ride the resolution facade (vitest.shared.ts):
// workspace packages -> src, DSH runtime libs -> the estate-anchored
// copies (one cordis realpath across every anchor). Failures assert
// through remoteErrorOf + code — discrimination is never instanceof
// (the protocol's own law).
import { test, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, type Plugin } from '@deepseek-ai/cordis';
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol';
// Storage composed AT THE COMPOSITION SITE — DSH's own rig shape
// (session-projection-cache/tests/fixtures.spec.ts l.27-104): the
// packages' pieces imported and the rows assembled inline. The
// estate re-packages nothing.
import draftsPlugin from '@melite/estate-drafts';
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
// BenchDoc rides its defining file (the package index never
// re-exports it) — type-only, erased at runtime.
import type { BenchDoc } from "../../../../packages/estate/drafts/src/remote.ts";
import Storage from '@deepseek-ai/dsh-storage';
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from '@deepseek-ai/dsh-storage-json';
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from '@deepseek-ai/dsh-storage-domain';

/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "drafts-remote-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}


const sig = new AbortController().signal;

function doc(id: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    draft_id: id,
    status: "draft",
    createdAt: 1700000000000,
    completedAt: null,
    intent: "test " + id,
    stages: [{ id: "s_0", inputs: [""], provenance: "agent" }],
    ...extra,
  });
}

async function boot(extraLegacy: Record<string, string> = {}): Promise<Context> {
  const root = mintRoot();
  const stateRoot = join(root, "state");
  mkdirSync(join(stateRoot, "drafts"), { recursive: true });
  // Two legacy docs: d_old (older mtime) + d_new (newer, carries
  // model/name display keys for the index row).
  writeFileSync(join(stateRoot, "drafts", "d_old.json"), doc("d_old"));
  writeFileSync(
    join(stateRoot, "drafts", "d_new.json"),
    doc("d_new", { model: "krea-2", name: "hero" }),
  );
  for (const [name, body] of Object.entries(extraLegacy)) {
    writeFileSync(join(stateRoot, "drafts", name), body);
  }
  const old = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-09-01T00:00:00Z");
  utimesSync(join(stateRoot, "drafts", "d_old.json"), old, old);
  utimesSync(join(stateRoot, "drafts", "d_new.json"), now, now);
  process.env["MELITE_STATE_ROOT"] = stateRoot;
  process.env["MELITE_STORAGE_ROOT"] = "";

  const ctx = new Context();
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin,
    { root: join(stateRoot, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin,
    { backend: "json" },
  );
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  return ctx as unknown as Context;
}

/** Capture a rejection as a RemoteError via the protocol's structural
 *  identifier (never instanceof — cross-copy law). The wall's domain
 *  is RemoteError-object-or-null (fulfilled), so the return pins the
 *  indexable rows the assertions read — byte-identical at runtime. */
async function failureOf(p: Promise<unknown>): Promise<Record<string, unknown> | null> {
  return await p.then(
    (): null => null,
    (error: unknown): Record<string, unknown> | null => (remoteErrorOf(error) ?? error) as Record<string, unknown> | null,
  );
}

test("drafts/list serves the legacy import, recency DESC", async () => {
  const ctx = await boot();
  const out = await ctx.draftsRemote.list(sig);
  assert.equal(out.count, 2);
  assert.equal(out.drafts.length, 2);
  // Newer mtime first.
  assert.equal(out.drafts[0]!.draft_id, "d_new");
  assert.equal(out.drafts[1]!.draft_id, "d_old");
  // B-L11 (the wall audit, 2026-09-28): these reads were non-null
  // ASSERTED (`drafts[0]!.model`) — a missing row threw a TypeError
  // instead of failing with the law's name, and `!` reads as "the
  // row is there" without ever saying it. The row's existence is
  // asserted, then its fields.
  assert.ok(out.drafts[0] !== undefined, "the newer draft row rides (recency DESC)");
  assert.equal(out.drafts[0]!.model, "krea-2");
  assert.equal(out.drafts[0]!.name, "hero");
});

test("drafts/get serves one doc verbatim", async () => {
  const ctx = await boot();
  const got = await ctx.draftsRemote.get("d_new", sig);
  assert.equal(got["draft_id"], "d_new");
  assert.equal(got["intent"], "test d_new");
  assert.ok(Array.isArray(got["stages"]));
});

test("drafts/get classifies unknown id as draft/not-found", async () => {
  const ctx = await boot();
  const failure = await failureOf(ctx.draftsRemote.get("d_missing", sig));
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "draft/not-found");
  assert.deepEqual((failure as { details: unknown }).details, {
    draftId: "d_missing",
  });
});

test("drafts/get classifies a malformed id as draft/bad-id", async () => {
  const ctx = await boot();
  const failure = await failureOf(ctx.draftsRemote.get("bad id!", sig));
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "draft/bad-id");
});

test("bench/ensure births a bench doc with normalized stages", async () => {
  const ctx = await boot();
  const out = await ctx.benchRemote.ensure(
    { session: "s1", intent: "hero", stages: [{ id: "s_0", model: "krea-2" }] },
    sig,
  );
  assert.equal(out.created, true);
  assert.equal(out.rev, 0);
  assert.equal(out.draft_id, "bench-s1");
  const stages = out.stages as Record<string, unknown>[];
  // The composer's birth defaults ride (engine/inputs/params/outputs).
  assert.equal(stages[0]!["engine"], "comfyui");
  assert.deepEqual(stages[0]!["inputs"], {});
  assert.equal(stages[0]!["provenance"], "agent");
});

test("bench/ensure without stages reads existing state (no CAS needed)", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1", intent: "hero" }, sig);
  const again = await ctx.benchRemote.ensure({ session: "s1" }, sig);
  assert.equal(again.created, false);
  assert.equal(again.rev, 0);
});

test("bench/ensure load replaces stages under CAS, rev walks", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1", intent: "a" }, sig);
  const loaded = await ctx.benchRemote.ensure(
    { session: "s1", intent: "b", stages: [{ id: "x" }], expect_rev: 0 },
    sig,
  );
  assert.equal(loaded.created, false);
  assert.equal(loaded.rev, 1);
  assert.equal(loaded.intent, "b");
  assert.equal((loaded.stages as Record<string, unknown>[])[0]!["id"], "x");
  // The bench doc IS a draft doc — the domain table carries it.
  const got = await ctx.draftsRemote.get("bench-s1", sig);
  assert.equal((got["bench"] as { rev: number }).rev, 1);
});

test("bench/ensure load with a stale expect_rev refuses as bench/cas-conflict", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure(
    { session: "s1", stages: [{ id: "x" }] },
    sig,
  );
  await ctx.benchRemote.ensure(
    // THE OVERWRITE LAW (2026-09-15): a wholesale load onto a live
    // bench confirms the discard — CAS alone is not consent.
    { session: "s1", stages: [{ id: "y" }], expect_rev: 0, overwrite: true },
    sig,
  );
  const failure = await failureOf(
    ctx.benchRemote.ensure(
      { session: "s1", stages: [{ id: "z" }], expect_rev: 0 },
      sig,
    ),
  );
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "bench/cas-conflict");
  assert.equal((failure as { details: { current_rev: number } }).details.current_rev, 1);
});

test("bench/get serves the row with log HEADS only", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1", stages: [{ id: "x" }] }, sig);
  await ctx.benchRemote.ensure(
    // THE OVERWRITE LAW (2026-09-15): wholesale loads confirm.
    { session: "s1", stages: [{ id: "y" }], expect_rev: 0, overwrite: true },
    sig,
  );
  const row = await ctx.benchRemote.get("s1", sig);
  assert.equal(row.draft_id, "bench-s1");
  assert.equal(row.rev, 1);
  assert.equal(row.log.length, 1);
  const entry = row.log[0]!;
  assert.equal(entry["kind"], "load");
  assert.equal(entry["rev"], 1);
  // The inverse payload never leaves the domain.
  assert.equal("inverse" in entry, false);
});

test("bench/get classifies an unknown session as bench/not-found", async () => {
  const ctx = await boot();
  const failure = await failureOf(ctx.benchRemote.get("nope", sig));
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "bench/not-found");
});

test("bench/get classifies a malformed session as bench/bad-session", async () => {
  const ctx = await boot();
  const failure = await failureOf(ctx.benchRemote.get("bad session!", sig));
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "bench/bad-session");
});

// ── REBUILD-4: the bench mutation arms ─────────────────────────

test("bench/patch merges params under CAS and walks the rev", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure(
    { session: "s1", stages: [{ id: "s_0", card: "hero" }] },
    sig,
  );
  const out = await ctx.benchRemote.patch(
    "s1",
    { stage: "s_0", params: { steps: 30 }, expect_rev: 0 },
    sig,
  );
  assert.equal(out.rev, 1);
  assert.deepEqual(out.patched, ["steps"]);
  const doc = await ctx.draftsRemote.get("bench-s1", sig);
  const stage = (doc["stages"] as Record<string, unknown>[])[0]!;
  assert.deepEqual(stage["params"], { steps: 30 });
});

test("bench/patch refuses a missing stage as bench/stage-not-found", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1" }, sig);
  const failure = await failureOf(
    ctx.benchRemote.patch(
      "s1",
      { stage: "nope", params: { a: 1 }, expect_rev: 0 },
      sig,
    ),
  );
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "bench/stage-not-found");
  assert.deepEqual((failure as { details: unknown }).details, {
    session: "s1",
    stage: "nope",
  });
});

test("bench/add-stage appends a normalized row; duplicate ids refuse", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1" }, sig);
  const added = await ctx.benchRemote.addStage(
    "s1",
    { card: "hero", expect_rev: 0 },
    sig,
  );
  assert.equal(added.stage, "s_0");
  assert.equal(added.rev, 1);
  const dup = await failureOf(
    ctx.benchRemote.addStage(
      "s1",
      { card: "hero", id: "s_0", expect_rev: 1 },
      sig,
    ),
  );
  assert.ok(dup !== null && typeof dup === "object");
  assert.equal((dup as { code: string }).code, "bench/duplicate-stage");
});

test("THE ADMISSION SEAT IS LIVE (the walls audit's severest row, 2026-10-10): a real card registry rides the bench write door", async () => {
  // Every bench arm above runs REGISTRY-LESS — the admission seat
  // stands down (benchAdmissionOf finds no registry) and the wall
  // proves storage mechanics only, never that the write door
  // refuses what the run refuses. This arm boots the REAL registry
  // (the same service the estate composes with) and pins the
  // refusal voice: a model no family declares refuses at the write
  // door, in the admission's own code.
  const ctx = await boot();
  const registry = new CardRegistryService(new Context());
  await registry.prime();
  ctx.provide("cardRegistry", registry);
  await ctx.benchRemote.ensure({ session: "s1" }, sig);
  const refused = await failureOf(
    ctx.benchRemote.addStage(
      "s1",
      { card: "image-gen", params: { model: "frobnicate-net" } as never, expect_rev: 0 },
      sig,
    ),
  );
  assert.ok(refused !== null && typeof refused === "object", "the write refuses");
  // THE EXACT ADMISSION CODE (the walls audit's H2, 2026-10-10: the
  // first cut accepted ANY bench/* — a bench/cas-conflict for an
  // unknown model passed this arm). The code is pinned, and the
  // model is named, as two separate hard asserts.
  const code = (refused as { code: string }).code;
  assert.equal(code, "bench/bad-model",
    "the write refuses the unknown model in the admission's own code: " + JSON.stringify(refused).slice(0, 200));
  assert.match(String((refused as { message: string }).message ?? JSON.stringify(refused)),
    /frobnicate-net/,
    "the refusal NAMES the model it refused");
  // and the honest row lands: a declared family admits
  const okAdd = await ctx.benchRemote.addStage(
    "s1",
    { card: "image-gen", expect_rev: 0 },
    sig,
  );
  assert.equal(okAdd.stage, "s_0");
});

test("bench/remove-stage splices; rewire binds inputs", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure(
    // THE PHANTOM-WIRE CURE (2026-09-15): rewire admits the channel
    // against the row's params — stage b is born spelling $image so
    // the bind below feeds something.
    { session: "s1", stages: [{ id: "a" }, { id: "b", params: { image: "$image" } }] },
    sig,
  );
  const removed = await ctx.benchRemote.removeStage(
    "s1",
    { stage: "a", expect_rev: 0 },
    sig,
  );
  assert.equal(removed.rev, 1);
  const wired = await ctx.benchRemote.rewire(
    "s1",
    { stage: "b", input: "image", from: { initial: "image" }, expect_rev: 1 },
    sig,
  );
  assert.equal(wired.rev, 2);
  const doc = await ctx.draftsRemote.get("bench-s1", sig);
  const stages = doc["stages"] as Record<string, unknown>[];
  assert.equal(stages.length, 1);
  assert.equal(stages[0]!["id"], "b");
  assert.deepEqual(stages[0]!["inputs"], { image: { initial: "image" } });
});

test("bench/undo walks the log newest-first and restores stages", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1", stages: [{ id: "a" }] }, sig);
  await ctx.benchRemote.addStage("s1", { card: "x", expect_rev: 0 }, sig);
  // Birth logs nothing (rev 0, empty log); the add is rev 1 — undo
  // walks back to [a].
  const undone = await ctx.benchRemote.undo("s1", { n: 1 }, sig);
  assert.deepEqual(undone.undone, [1]);
  const stages = undone.stages as Record<string, unknown>[];
  assert.equal(stages.length, 1);
  assert.equal(stages[0]!["id"], "a");
  // The second undo with nothing live refuses loud.
  const none = await failureOf(ctx.benchRemote.undo("s1", { n: 1 }, sig));
  assert.ok(none !== null && typeof none === "object");
  assert.equal((none as { code: string }).code, "bench/nothing-to-undo");
});

test("bench mutation arms refuse a stale expect_rev as bench/cas-conflict", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure({ session: "s1" }, sig);
  const failure = await failureOf(
    ctx.benchRemote.addStage(
      "s1",
      { card: "x", expect_rev: 99 },
      sig,
    ),
  );
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "bench/cas-conflict");
  assert.equal(
    (failure as { details: { current_rev: number } }).details.current_rev,
    0,
  );
});

test("the tools' lane grammar rides the seats end-to-end (glue)", async () => {
  const ctx = await boot();
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  // ensure → add_stage → patch → undo, all through the lane grammar.
  const ensured = (await request(
    "POST",
    "/v1/bench/ensure",
    { session: "s1", stages: [{ id: "a" }] },
    sig,
    15000,
  )) as Record<string, unknown>;
  assert.equal(ensured["created"], true);
  const added = (await request(
    "POST",
    "/v1/bench/s1/add_stage",
    { card: "hero", expect_rev: 0 },
    sig,
    15000,
  )) as Record<string, unknown>;
  assert.equal(added["rev"], 1);
  assert.equal(added["stage"], "s_0"); // THE MINT LAW: 'a' is not s_-shaped → s_0
  const patched = (await request(
    "POST",
    "/v1/bench/s1/patch",
    { stage: "s_0", params: { steps: 4 }, expect_rev: 1 },
    sig,
    15000,
  )) as Record<string, unknown>;
  assert.deepEqual(patched["patched"], ["steps"]);
  const undone = (await request(
    "POST",
    "/v1/bench/s1/undo",
    { n: 1 },
    sig,
    15000,
  )) as Record<string, unknown>;
  assert.deepEqual(undone["undone"], [2]);
  // A lane with no remote still refuses LOUD (QUEUE LANE LAW).
  const loud = await request(
    "POST",
    "/v1/flows/start",
    {},
    sig,
    15000,
  ).then(
    (): null => null,
    (error: unknown): string =>
      error instanceof Error ? error.message : String(error),
  );
  assert.match(loud!, /no seat on this lane serves POST \/v1\/flows\/start/);
});

// ── drafts/patch — the stage patch door (2026-09-11 rebirth) ──────
// The shared-state arm: per-key params merge, the old door's fixed
// key admission + voice, the delivered envelope, domain persistence.

test("drafts/patch merges params per-key and persists through the domain", async () => {
  const ctx = await boot();
  await ctx.draftsRemote.patch(
    "d_new",
    "s_0",
    { params: { steps: 12, prompt: "a red cube" } },
    null,
    sig,
  );
  // The get arm reads the SAME domain — the merge is observable.
  const doc = (await ctx.draftsRemote.get("d_new", sig)) as {
    stages: Array<{ id: string; params?: Record<string, unknown> }>;
  };
  const stage = doc.stages.find((s) => s.id === "s_0")!;
  assert.equal(stage.params?.["steps"], 12);
  assert.equal(stage.params?.["prompt"], "a red cube");
  // A second patch merges INTO the first (per-key, never replace).
  await ctx.draftsRemote.patch("d_new", "s_0", { params: { steps: 20 } }, null, sig);
  const again = (await ctx.draftsRemote.get("d_new", sig)) as {
    stages: Array<{ id: string; params?: Record<string, unknown> }>;
  };
  const stage2 = again.stages.find((s) => s.id === "s_0")!;
  assert.equal(stage2.params?.["steps"], 20);
  assert.equal(stage2.params?.["prompt"], "a red cube");
});

test("drafts/patch answers the delivered envelope for missing doc/stage", async () => {
  const ctx = await boot();
  const noDraft = await ctx.draftsRemote.patch(
    "d_missing", "s_0", { params: { steps: 1 } }, null, sig,
  );
  assert.equal(noDraft.delivered, false);
  assert.equal(noDraft.reason, "draft not found");
  const noStage = await ctx.draftsRemote.patch(
    "d_new", "s_absent", { params: { steps: 1 } }, null, sig,
  );
  assert.equal(noStage.delivered, false);
  assert.equal(noStage.reason, "stage not found");
});

test("drafts/patch refuses unknown keys with the door's old voice", async () => {
  const ctx = await boot();
  const failure = await failureOf(
    ctx.draftsRemote.patch("d_new", "s_0", { params: { steps: 1 }, bogus: 1 }, null, sig),
  );
  assert.equal(failure?.["code"], "draft/patch-unknown-keys");
  // B-M9 (the wall audit, 2026-09-28): the voice was re-typed here
  // AND at runsGates.ts:76 — a new patch key landed in the contract
  // and this arm kept passing against its stale sentence. The voice
  // is COMPOSED from the contract's own list now, in its declared
  // order, and the list is pinned exactly (a new key is a conscious
  // edit of the pin, never a silent divergence).
  // the list is the CONTRACT's (one spelling) — and BOTH doors take
  // it: the drafts admission and the runs gate import the same
  // const, so they can never disagree about what the door wants.
  const { STAGE_PATCH_KEYS } = await import("../../../../packages/web-kit/contracts/src/benchStage.ts");
  assert.deepEqual([...STAGE_PATCH_KEYS],
    ["params", "result", "runStatus", "inputs", "inputOutputs"],
    "the accepted stage-patch keys, exact and in the voice's order");
  const { STAGE_PATCH_KEYS: GATE_LIST } = await import("../../../../packages/harness/estate-queue/src/runsGates.ts");
  assert.deepEqual([...GATE_LIST], [...STAGE_PATCH_KEYS], "the runs gate's list IS the contract's (no second copy)");
  assert.equal(
    String(failure?.["message"] ?? ""),
    `unknown stage patch key(s): bogus (want ${STAGE_PATCH_KEYS.join(", ")})`,
    "the refusal voice is the contract's list, joined — never a retyped sentence",
  );
});

test("drafts/patch refuses bad ids and bad bodies as named codes", async () => {
  const ctx = await boot();
  const badId = await failureOf(
    ctx.draftsRemote.patch("bad id!", "s_0", { params: {} }, null, sig),
  );
  assert.equal(badId?.code, "draft/bad-id");
  const badPatch = await failureOf(
    ctx.draftsRemote.patch("d_new", "s_0", "params" as never, null, sig),
  );
  assert.equal(badPatch?.code, "draft/bad-patch");
});

test("drafts/patch lands the runStatus/result arms (the old door's other keys)", async () => {
  const ctx = await boot();
  await ctx.draftsRemote.patch(
    "d_new", "s_0", { runStatus: "done", result: { url: "x.png" } }, null, sig,
  );
  const doc = (await ctx.draftsRemote.get("d_new", sig)) as {
    stages: Array<{ id: string; runStatus?: string; result?: unknown }>;
  };
  const stage = doc.stages.find((s) => s.id === "s_0")!;
  assert.equal(stage.runStatus, "done");
  assert.deepEqual(stage.result, { url: "x.png" });
});

test("the wire arms speak: every remoteExportX delegates verbatim", async () => {
  const ctx = await boot();
  // drafts/list + drafts/get BEFORE the bench draft exists — the
  // legacy pair only.
  const listed = await ctx.draftsRemote.remoteExportList(sig);
  assert.equal(listed.count, 2);
  assert.equal(listed.drafts[0]!.draft_id, "d_new");
  const got = await ctx.draftsRemote.remoteExportGet("d_new", sig);
  assert.equal(got["draft_id"], "d_new");
  // The bench chain, rev-exact: birth (rev 0) → patch → addStage →
  // rewire → reorder → group → ungroup → removeStage → undo.
  const ensured = await ctx.benchRemote.remoteExportEnsure(
    // THE PHANTOM-WIRE CURE (2026-09-15): the rewire below binds
    // b.image — stage b is born spelling $image.
    { session: "s1", stages: [{ id: "a" }, { id: "b", params: { image: "$image" } }, { id: "c" }] },
    sig,
  );
  assert.ok(ensured, "birth");
  const bench = await ctx.benchRemote.remoteExportGet("s1", sig);
  assert.ok(bench, "get serves the session's bench row");
  // B-L11: the birth row's rev is 0 EXACTLY (a truthy check would
  // pass at 1, and the whole CAS chain below is numbered from it).
  assert.equal(bench.rev, 0, "a born bench sits at rev 0 (the CAS chain's origin)");
  const patched = await ctx.benchRemote.remoteExportPatch(
    "s1",
    { stage: "a", params: { x: 1 }, expect_rev: 0 },
    sig,
  );
  assert.equal(patched.rev, 1);
  const added = await ctx.benchRemote.remoteExportAddStage(
    "s1",
    { card: "hero", expect_rev: 1 },
    sig,
  );
  // THE MINT LAW (2026-09-12): max LIVE numeric suffix + 1 — the
  // seeded rows a/b/c are not s_-shaped, so the mint starts at s_0
  // (the old count mint said s_3; ids that never left cannot be
  // re-minted, and ids that DID leave must never be re-served).
  assert.equal(added.stage, "s_0");
  const rewired = await ctx.benchRemote.remoteExportRewire(
    "s1",
    { stage: "b", input: "image", from: { initial: "image" }, expect_rev: 2 },
    sig,
  );
  assert.equal(rewired.rev, 3);
  const reordered = await ctx.benchRemote.remoteExportReorder(
    "s1",
    { stage: "c", to: 0, expect_rev: 3 },
    sig,
  );
  assert.equal(reordered.rev, 4);
  // THE WIRE COMES OFF BEFORE THE GROUP (2026-10-10, the bench
  // audit's gap 6): the run's wiring walk reads the flat stage list,
  // so a member's wire dies when it is parked — group now refuses a
  // wired member instead of hiding the wire. The honest order: clear
  // the wire, group, ungroup, then re-wire (one more verb rides the
  // delegation count).
  const unwired = await ctx.benchRemote.remoteExportRewire(
    "s1",
    { stage: "b", input: "image", expect_rev: 4 },
    sig,
  );
  assert.equal(unwired.rev, 5);
  const grouped = await ctx.benchRemote.remoteExportGroup(
    "s1",
    { stages: ["a", "b"], expect_rev: 5 },
    sig,
  );
  assert.equal(grouped.rev, 6);
  const ungrouped = await ctx.benchRemote.remoteExportUngroup(
    "s1",
    { stage: grouped.stage, expect_rev: 6 },
    sig,
  );
  assert.equal(ungrouped.rev, 7);
  const removed = await ctx.benchRemote.remoteExportRemoveStage(
    "s1",
    { stage: "c", expect_rev: 7 },
    sig,
  );
  assert.equal(removed.rev, 8);
  const undone = await ctx.benchRemote.remoteExportUndo("s1", { n: 1 }, sig);
  assert.deepEqual(undone.undone, [8]);
  // drafts/patch through the wire: per-key params merge on the bench
  // draft's stage (already carrying {x: 1} from the bench patch).
  const dpatched = await ctx.draftsRemote.remoteExportPatch(
    "bench-s1",
    "a",
    { params: { y: 2 } },
    null,
    sig,
  );
  assert.equal(dpatched.draftId, "bench-s1");
  assert.equal(dpatched.stageId, "a");
  assert.deepEqual(dpatched.patched, ["params"]);
  const after = await ctx.draftsRemote.remoteExportGet("bench-s1", sig);
  const stageRow = (after["stages"] as Array<{ id: string; params?: Record<string, unknown> }>)
    .find((s) => s.id === "a")!;
  assert.deepEqual(stageRow.params, { x: 1, y: 2 }, "merge per-key, never replace");
});

test("unbooted storage: every open-wrapping arm refuses draft/store-failed|bench/store-failed", async () => {
  // The drafts plugin with NO storage rows mounted: each arm's open
  // throws, and the wrap is the remote voice (never a bare stack).
  const ctx = new Context();
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  const draftCode = async (p: Promise<unknown>): Promise<string | undefined> =>
    await p.then(
      (): string | undefined => "NO-REFUSAL",
      (e: unknown): string | undefined => remoteErrorOf(e)?.code,
    );
  assert.equal(await draftCode(ctx.draftsRemote.remoteExportList(sig)), "draft/store-failed");
  assert.equal(await draftCode(ctx.draftsRemote.remoteExportGet("d_new", sig)), "draft/store-failed");
  assert.equal(
    await draftCode(ctx.draftsRemote.remoteExportPatch("d_new", "s_0", { runStatus: "running" }, null, sig)),
    "draft/store-failed",
  );
  // validation precedes storage (the telemetry law's edge,
  // 2026-10-08): an EMPTY body is shape-invalid and refuses
  // draft/bad-patch without ever reaching the open — the arm's
  // wrap is intact, there is simply no open to wrap
  assert.equal(
    await draftCode(ctx.draftsRemote.remoteExportPatch("d_new", "s_0", {}, null, sig)),
    "draft/bad-patch",
  );
  assert.equal(await draftCode(ctx.benchRemote.remoteExportGet("s1", sig)), "bench/store-failed");
  assert.equal(
    await draftCode(ctx.benchRemote.remoteExportEnsure({ session: "s1" }, sig)),
    "bench/store-failed",
  );
  assert.equal(
    await draftCode(ctx.benchRemote.remoteExportPatch("s1", { stage: "a" }, sig)),
    "bench/store-failed",
  );
});

test("bench/ensure bad-body: the admission refuses before any storage word", async () => {
  const ctx = await boot();
  const failure = await failureOf(
    ctx.benchRemote.remoteExportEnsure("not-an-object" as unknown as BenchDoc, sig),
  );
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "bench/bad-body");
});

test("drafts/patch bad-stage-id: the empty id refuses with the door's voice", async () => {
  const ctx = await boot();
  const failure = await failureOf(ctx.draftsRemote.remoteExportPatch("d_new", "", {}, null, sig));
  assert.ok(failure !== null && typeof failure === "object");
  assert.equal((failure as { code: string }).code, "draft/bad-stage-id");
});

test("index fallbacks: title when name/intent are empty, service when model is absent, caps slice long strings", async () => {
  const bare = (extra: Record<string, unknown>): string =>
    JSON.stringify({
      draft_id: "d_x",
      status: "draft",
      createdAt: 1,
      completedAt: null,
      intent: "",
      stages: [{ id: "s_0", inputs: [""] }],
      ...extra,
    });
  const ctx = await boot({
    // No name, empty intent → the title carries the display; no model
    // → the service carries the model face.
    "d_title.json": bare({ draft_id: "d_title", title: "the title", service: "svc" }).replace(
      '"d_x"',
      '"d_title"',
    ),
    // A name past the 160 cap → sliced to 159.
    "d_long.json": bare({ draft_id: "d_long", name: "L".repeat(200) }).replace(
      '"d_x"',
      '"d_long"',
    ),
  });
  const out = await ctx.draftsRemote.remoteExportList(sig);
  assert.equal(out.count, 4);
  const byId = new Map(out.drafts.map((r): [string, { model: string; name: string }] => [r.draft_id, r]));
  assert.equal(byId.get("d_title")!.name, "the title", "title fallback");
  assert.equal(byId.get("d_title")!.model, "svc", "service fallback");
  assert.equal(byId.get("d_long")!.name.length, 159, "the cap slices, never truncates mid-law");
});

test("drafts/patch delivers inputs and inputOutputs keys; a missing stage answers the envelope", async () => {
  const ctx = await boot();
  const wired = await ctx.draftsRemote.remoteExportPatch(
    "d_new",
    "s_0",
    { inputs: { image: { stage: "x", output: "default" } } },
    null,
    sig,
  );
  assert.equal(wired.delivered, true);
  const after = (await ctx.draftsRemote.remoteExportGet("d_new", sig)) as {
    stages: Array<{ id: string; inputs?: unknown; inputOutputs?: unknown }>;
  };
  assert.deepEqual(after.stages.find((s) => s.id === "s_0")!.inputs, {
    image: { stage: "x", output: "default" },
  });
  const io = await ctx.draftsRemote.remoteExportPatch(
    "d_new",
    "s_0",
    { inputOutputs: { mask: { stage: "y", output: "mask" } } },
    null,
    sig,
  );
  assert.equal(io.delivered, true);
  const after2 = (await ctx.draftsRemote.remoteExportGet("d_new", sig)) as {
    stages: Array<{ id: string; inputOutputs?: unknown }>;
  };
  assert.deepEqual(after2.stages.find((s) => s.id === "s_0")!.inputOutputs, {
    mask: { stage: "y", output: "mask" },
  });
  // A stage id that exists nowhere: the delivered:false envelope (a
  // DOMAIN outcome, not an error).
  const miss = await ctx.draftsRemote.remoteExportPatch(
    "d_new",
    "no_such_stage",
    { result: 1 },
    null,
    sig,
  );
  assert.equal(miss.delivered, false);
  assert.equal(miss.reason, "stage not found");
});
