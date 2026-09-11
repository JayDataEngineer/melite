// drafts-remote — REBUILD-1/2 owner wall (2026-09-10).
//
// Requires `packages/estate/drafts` built (lib/ — decorator syntax
// cannot strip-types). In-process only: a real Context, the real DSH
// storage rows (json backend + domain facility) over scratch dirs,
// two legacy draft files (the one-time import), then the remotes'
// list/get/ensure over the domain. No HTTP, no server, no port.
//
// Framework values ride the drafts package's own node_modules (the
// engine-supervisor wall's idiom — walls carry no package.json, so
// bare DSH specifiers do not resolve from here). Failures assert
// through remoteErrorOf + code — discrimination is never instanceof
// (the protocol's own law).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/cordis/lib/index.js";
import { remoteErrorOf } from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-typert-protocol/lib/index.js";
// Storage composed AT THE COMPOSITION SITE — DSH's own rig shape
// (session-projection-cache/tests/fixtures.spec.ts l.27-104): the
// packages' pieces imported and the rows assembled inline. The
// estate re-packages nothing.
import draftsPlugin from "../../../../packages/estate/drafts/lib/index.js";
import Storage from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage/lib/index.js";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage-json/lib/index.js";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "../../../../packages/estate/drafts/node_modules/@deepseek-ai/dsh-storage-domain/lib/index.js";

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

async function boot(): Promise<Context> {
  const root = mkdtempSync(join(tmpdir(), "drafts-remote-"));
  const stateRoot = join(root, "state");
  mkdirSync(join(stateRoot, "drafts"), { recursive: true });
  // Two legacy docs: d_old (older mtime) + d_new (newer, carries
  // model/name display keys for the index row).
  writeFileSync(join(stateRoot, "drafts", "d_old.json"), doc("d_old"));
  writeFileSync(
    join(stateRoot, "drafts", "d_new.json"),
    doc("d_new", { model: "krea-2", name: "hero" }),
  );
  const old = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-09-01T00:00:00Z");
  utimesSync(join(stateRoot, "drafts", "d_old.json"), old, old);
  utimesSync(join(stateRoot, "drafts", "d_new.json"), now, now);
  process.env["MELITE_STATE_ROOT"] = stateRoot;
  process.env["MELITE_STORAGE_ROOT"] = "";

  const ctx = new Context();
  await ctx.plugin(Storage as never);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(stateRoot, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" },
  );
  await ctx.plugin(draftsPlugin as never);
  return ctx as unknown as Context;
}

/** Capture a rejection as a RemoteError via the protocol's structural
 *  identifier (never instanceof — cross-copy law). */
async function failureOf(p: Promise<unknown>): Promise<unknown> {
  return await p.then(
    (): null => null,
    (error: unknown): unknown => remoteErrorOf(error) ?? error,
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
  // Index row: first-seen model + name display keys.
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
    { session: "s1", stages: [{ id: "y" }], expect_rev: 0 },
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
    { session: "s1", stages: [{ id: "y" }], expect_rev: 0 },
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

test("bench/remove-stage splices; rewire binds inputs", async () => {
  const ctx = await boot();
  await ctx.benchRemote.ensure(
    { session: "s1", stages: [{ id: "a" }, { id: "b" }] },
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
  const patched = (await request(
    "POST",
    "/v1/bench/s1/patch",
    { stage: "s_1", params: { steps: 4 }, expect_rev: 1 },
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
  assert.match(loud!, /no remote serves POST \/v1\/flows\/start/);
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
  await ctx.draftsRemote.patch("d_new", "s_0", { params: { steps: 20 } }, sig);
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
    "d_missing", "s_0", { params: { steps: 1 } }, sig,
  );
  assert.equal(noDraft.delivered, false);
  assert.equal(noDraft.reason, "draft not found");
  const noStage = await ctx.draftsRemote.patch(
    "d_new", "s_absent", { params: { steps: 1 } }, sig,
  );
  assert.equal(noStage.delivered, false);
  assert.equal(noStage.reason, "stage not found");
});

test("drafts/patch refuses unknown keys with the door's old voice", async () => {
  const ctx = await boot();
  const failure = await failureOf(
    ctx.draftsRemote.patch("d_new", "s_0", { params: { steps: 1 }, bogus: 1 }, sig),
  );
  assert.equal(failure?.["code"], "draft/patch-unknown-keys");
  assert.match(
    String(failure?.["message"] ?? ""),
    /unknown stage patch key\(s\): bogus \(want params, result, runStatus, inputs, inputOutputs\)/,
  );
});

test("drafts/patch refuses bad ids and bad bodies as named codes", async () => {
  const ctx = await boot();
  const badId = await failureOf(
    ctx.draftsRemote.patch("bad id!", "s_0", { params: {} }, sig),
  );
  assert.equal(badId?.code, "draft/bad-id");
  const badPatch = await failureOf(
    ctx.draftsRemote.patch("d_new", "s_0", "params" as never, sig),
  );
  assert.equal(badPatch?.code, "draft/bad-patch");
});

test("drafts/patch lands the runStatus/result arms (the old door's other keys)", async () => {
  const ctx = await boot();
  await ctx.draftsRemote.patch(
    "d_new", "s_0", { runStatus: "done", result: { url: "x.png" } }, sig,
  );
  const doc = (await ctx.draftsRemote.get("d_new", sig)) as {
    stages: Array<{ id: string; runStatus?: string; result?: unknown }>;
  };
  const stage = doc.stages.find((s) => s.id === "s_0")!;
  assert.equal(stage.runStatus, "done");
  assert.deepEqual(stage.result, { url: "x.png" });
});
