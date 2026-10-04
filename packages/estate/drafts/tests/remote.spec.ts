// remote.spec.ts — the REMOTE layer's own laws (REBUILD-1's doors).
//
// The bench-domain functions are owned by the bench-*.spec.ts siblings; this file owns
// everything remote.ts adds on top: resultOutputUrls/sameResultOutputs,
// resolverOf/admissionOf/withResolvedStages/docIndexFields, the
// drafts list/get/patch doors (admission voices, delivered:false DOMAIN
// outcomes, CAS join), the BenchRemoteService in-process verbs + their
// @Remote adapters + abort-at-entry refusals, the drafts @Remote
// adapters, and the subscribe stream's zero-state/rethrow arms.
//
// Harness: the REAL json+domain storage stack, no mocks — fakes are
// hand-rolled objects provided via ctx.provide (the cardRegistry seat).
import { describe, expect, onTestFinished, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";
import { ensureBench, onBenchChange, notifyBenchChange } from "../src/bench.ts";
import {
  BenchRemoteService,
  DraftsRemoteService,
  RESTORED_PROVENANCE,
  STAGE_PATCH_KEYS,
  resultOutputUrls,
  sameResultOutputs,
} from "../src/remote.ts";
import type { BenchDoc } from "../src/remote.ts";
import { installBenchChangeSeam } from "../src/remote.ts";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";

const sig = new AbortController().signal;


/** OWN the env this rig sets (2026-10-13, the flake audit): the two
 *  roots were set and never restored, so a later spec in the same fork
 *  inherited a root whose tree its own onTestFinished had already
 *  deleted. Capture at set time, restore with the test. */
function ownEnv(): void {
  const keys = ["MELITE_STATE_ROOT", "MELITE_STORAGE_ROOT"] as const;
  const previous = new Map(keys.map((k) => [k, process.env[k]] as const));
  onTestFinished(() => {
    for (const [k, v] of previous) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

// TMP OWNERSHIP (stroke 13): every bootCtx tree is owned — the
// disposer runs through onTestFinished so a leaked tree can never
// outlive its test.
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "remote-spec-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

async function bootCtx(): Promise<{ ctx: Context; domain: Domain<DraftsDomainSpec> }> {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  ownEnv();
  process.env["MELITE_STATE_ROOT"] = root;
  process.env["MELITE_STORAGE_ROOT"] = "";
  const ctx = new Context();
  await ctx.plugin(Storage as never, undefined as never); // Storage takes no config; cordis Spread<GetPluginConfig> keeps the config arg positional
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") } as never, // the plugin is cast to never so its Config schema cannot name the static type; the backend validates the shape at mount
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" } as never, // same never-plugin law as the json backend above
  );
  // The typed `bench.changed` seam (the hand-roll row 1.2): this file
  // boots its own Context rather than the shared helper, so it
  // installs the same seam the plugin installs.
  installBenchChangeSeam(ctx);
  return { ctx, domain: await openDraftsDomain(ctx) };
}

async function boot(): Promise<Domain<DraftsDomainSpec>> {
  return (await bootCtx()).domain;
}

/** One bench doc seeded straight into the domain (log = data). */
async function seed(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  doc: Record<string, unknown>,
): Promise<void> {
  await drafts.table("docs").put("bench-" + session, {
    updated_at: 1,
    doc: {
      draft_id: "bench-" + session,
      intent: "seeded",
      status: "ready",
      createdAt: 1,
      completedAt: null,
      ...doc,
    } as never,
  });
}

/** One draft doc seeded straight into the domain at a fixed recency.
 *  The intent defaults to "" so the name-fallback arms stay honest:
 *  a test that wants the intent face passes it explicitly. */
async function seedDraft(
  drafts: Domain<DraftsDomainSpec>,
  draftId: string,
  mt: number,
  doc: Record<string, unknown>,
): Promise<void> {
  await drafts.table("docs").put(draftId, {
    updated_at: mt,
    doc: {
      draft_id: draftId,
      intent: "",
      status: "ready",
      createdAt: 1,
      completedAt: null,
      stages: [],
      ...doc,
    } as never,
  });
}

/** The refusal's code, or NO-REFUSAL on resolve. */
async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO-REFUSAL";
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return (err.code ?? "NOT-REMOTE") + "|" + String(err.message);
  }
}

/** The refusal itself (for details deep-equal). */
async function errOf(p: Promise<unknown>): Promise<{ code?: string; message?: string; details?: unknown }> {
  try {
    await p;
  } catch (e) {
    return e as { code?: string; message?: string; details?: unknown };
  }
  throw new Error("expected a refusal, the call landed");
}

/** An already-aborted signal (every public verb refuses it at entry). */
function aborted(): AbortSignal {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
}

// ── resultOutputUrls (the output-history harvest, one spelling) ────

describe("resultOutputUrls: artifacts map first, flat list second, lone url third", () => {
  test("non-objects harvest nothing", () => {
    assert.deepEqual(resultOutputUrls("nope"), []);
    assert.deepEqual(resultOutputUrls(42), []);
    assert.deepEqual(resultOutputUrls(null), []);
    assert.deepEqual(resultOutputUrls(undefined), []);
    assert.deepEqual(resultOutputUrls(["/a.png"]), []);
  });

  test("the artifacts map wins; non-string and empty values skip", () => {
    assert.deepEqual(
      resultOutputUrls({
        artifacts: { a: "/runs/a/out.png", b: 42, c: "", d: null },
        assetUrls: ["/runs/flat.png"],
        url: "/runs/lone.png",
      }),
      ["/runs/a/out.png"],
    );
  });

  test("a null artifacts map falls through to the flat list", () => {
    assert.deepEqual(
      resultOutputUrls({ artifacts: null, assetUrls: ["/runs/flat.png"], url: "/runs/lone.png" }),
      ["/runs/flat.png"],
    );
  });

  test("the flat list serves when no artifacts landed; junk entries skip", () => {
    assert.deepEqual(
      resultOutputUrls({ assetUrls: ["/a.png", 9, "", null, "/b.png"] }),
      ["/a.png", "/b.png"],
    );
  });

  test("a served list suppresses the lone url; the lone url serves last", () => {
    assert.deepEqual(resultOutputUrls({ assetUrls: ["/a.png"], url: "/u.png" }), ["/a.png"]);
    assert.deepEqual(resultOutputUrls({ url: "/u.png" }), ["/u.png"]);
    assert.deepEqual(resultOutputUrls({ url: "" }), []);
    assert.deepEqual(resultOutputUrls({ run_id: "a" }), []);
  });
});

describe("sameResultOutputs: the uniqueness key is the url SET", () => {
  test("equal sets match across spellings and orders; different sets refuse", () => {
    assert.equal(sameResultOutputs({ url: "/a.png" }, { assetUrls: ["/a.png"] }), true);
    assert.equal(
      sameResultOutputs({ artifacts: { x: "/a.png", y: "/b.png" } }, { assetUrls: ["/b.png", "/a.png"] }),
      true,
    );
    assert.equal(sameResultOutputs({ url: "/a.png" }, { url: "/b.png" }), false);
    assert.equal(sameResultOutputs({ url: "/a.png" }, { assetUrls: ["/a.png", "/b.png"] }), false);
    // two output-less faces are the same empty set (the patch door's
    // length guard decides archiving, never this key alone)
    assert.equal(sameResultOutputs({ run_id: "a" }, { run_id: "b" }), true);
  });
});

// ── drafts/list (the domain index, recency DESC) ────────────────────

describe("drafts/list: the index row is first-seen display strings", () => {
  async function seedIndex(drafts: Domain<DraftsDomainSpec>): Promise<void> {
    await seedDraft(drafts, "doc-a", 30, { model: "short-m", name: "Short Name" });
    await seedDraft(drafts, "doc-b", 10, { empty: {} });
    await seedDraft(drafts, "doc-c", 20, { intent: "Do the thing", service: "svc-9" });
    await seedDraft(drafts, "doc-title", 5, { title: "Only Title" });
    await seedDraft(drafts, "doc-long", 40, { model: "m".repeat(100), name: "n".repeat(200) });
    await seedDraft(drafts, "doc-types", 25, {
      model: 7,
      name: ["x"],
      extra: "y",
      nested: { model: "deep-m", name: "deep-n" },
    });
    await seedDraft(drafts, "doc-dup", 15, {
      model: "top-m",
      name: "top-n",
      nested: { model: "deep-m", name: "deep-n" },
      arr: [{ model: "arr-m" }],
    });
  }

  test("rows carry first-seen model/name, recency DESC, count total", async () => {
    const { ctx, domain } = await bootCtx();
    await seedIndex(domain);
    const svc = new DraftsRemoteService(ctx);
    const out = await svc.list(sig);
    assert.equal(out.count, 7);
    assert.deepEqual(out.drafts, [
      // the long strings are capped (model 80, name 160 — slice to n-1)
      { draft_id: "doc-long", model: "m".repeat(79), name: "n".repeat(159) },
      { draft_id: "doc-a", model: "short-m", name: "Short Name" },
      // non-string display values skip; the nested first-seen strings win
      { draft_id: "doc-types", model: "deep-m", name: "deep-n" },
      // no name: intent; no model: service
      { draft_id: "doc-c", model: "svc-9", name: "Do the thing" },
      // the top-level first-seen wins over nested and array rows
      { draft_id: "doc-dup", model: "top-m", name: "top-n" },
      // nothing displayable: both faces empty
      { draft_id: "doc-b", model: "", name: "" },
      // no name and no intent: title
      { draft_id: "doc-title", model: "", name: "Only Title" },
    ]);
  });

  test("an empty store lists zero rows", async () => {
    const { ctx } = await bootCtx();
    assert.deepEqual(await new DraftsRemoteService(ctx).list(sig), { count: 0, drafts: [] });
  });

  test("the list adapter delegates to the in-process arm", async () => {
    const { ctx, domain } = await bootCtx();
    await seedIndex(domain);
    const svc = new DraftsRemoteService(ctx);
    assert.deepEqual(await svc.remoteExportList(sig), await svc.list(sig));
  });

  test("an aborted signal refuses at entry", async () => {
    const { ctx } = await bootCtx();
    await assert.rejects(new DraftsRemoteService(ctx).list(aborted()));
  });

  test("a failed open wraps as draft/store-failed (bare ctx, no facility)", async () => {
    const svc = new DraftsRemoteService(new Context());
    assert.equal(
      await codeOf(svc.list(sig)),
      "draft/store-failed|[estate-drafts] storage domain facility not mounted (ctx.storageDomain)",
    );
  });
});

// ── drafts/get (one doc by id, stages resolved for the wire) ───────

describe("drafts/get: id law, not-found voice, resolved serve", () => {
  test("a malformed id refuses LOUD with the id in the details", async () => {
    const { ctx } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    for (const bad of ["", "has space!", "slash/no", "x".repeat(97)]) {
      const err = await errOf(svc.get(bad, sig));
      assert.equal(err.code, "draft/bad-id");
      assert.deepEqual(err.details, { draftId: bad });
    }
  });

  test("a well-formed but missing id refuses draft/not-found", async () => {
    const { ctx } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    const err = await errOf(svc.get("ghost-1", sig));
    assert.equal(err.code, "draft/not-found");
    assert.deepEqual(err.details, { draftId: "ghost-1" });
  });

  test("a failed open wraps as draft/store-failed", async () => {
    const svc = new DraftsRemoteService(new Context());
    assert.match(await codeOf(svc.get("bench-x", sig)), /^draft\/store-failed\|/);
  });

  test("an aborted signal refuses at entry", async () => {
    const { ctx } = await bootCtx();
    await assert.rejects(new DraftsRemoteService(ctx).get("bench-x", aborted()));
  });

  test("the get adapter delegates to the in-process arm", async () => {
    const { ctx, domain } = await bootCtx();
    await seedDraft(domain, "ad-draft", 1, { model: "m", name: "n" });
    const svc = new DraftsRemoteService(ctx);
    assert.deepEqual(await svc.remoteExportGet("ad-draft", sig), await svc.get("ad-draft", sig));
  });

  test("a doc whose stages are not an array rides through unresolved", async () => {
    const { ctx, domain } = await bootCtx();
    await domain.table("docs").put("odd-doc", {
      updated_at: 1,
      doc: {
        draft_id: "odd-doc",
        intent: "seeded",
        status: "ready",
        createdAt: 1,
        completedAt: null,
        stages: "nope",
      } as never,
    });
    const doc = await new DraftsRemoteService(ctx).get("odd-doc", sig);
    assert.equal(doc["stages"], "nope");
  });

  test("a non-object stage entry rides through untouched beside a resolved row", async () => {
    const { ctx, domain } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null =>
        typeof body["model"] === "string" && body["model"] !== ""
          ? { ...body, steps: 52 }
          : null,
    });
    await domain.table("docs").put("mix-doc", {
      updated_at: 1,
      doc: {
        draft_id: "mix-doc",
        intent: "seeded",
        status: "ready",
        createdAt: 1,
        completedAt: null,
        stages: [{ id: "s_0", params: { model: "anima" } }, "junk"],
      } as never,
    });
    const doc = await new DraftsRemoteService(ctx).get("mix-doc", sig);
    const stages = doc["stages"] as unknown[];
    assert.equal(stages.length, 2);
    assert.deepEqual((stages[0] as Record<string, unknown>)["resolved"], { model: "anima", steps: 52 });
    assert.equal(stages[1], "junk");
  });

  test("a stage whose params are not an object rides un-resolved (params preserved)", async () => {
    const { ctx, domain } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (): Record<string, unknown> | null => ({ steps: 52 }),
    });
    await domain.table("docs").put("strparams-doc", {
      updated_at: 1,
      doc: {
        draft_id: "strparams-doc",
        intent: "seeded",
        status: "ready",
        createdAt: 1,
        completedAt: null,
        stages: [{ id: "s_0", params: "junk-params" }],
      } as never,
    });
    const doc = await new DraftsRemoteService(ctx).get("strparams-doc", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.deepEqual(stage, { id: "s_0", params: "junk-params" });
  });

  test("a seat without resolveStageParams serves stages un-resolved (no throw on the serve path)", async () => {
    const { ctx, domain } = await bootCtx();
    ctx.provide("cardRegistry", {});
    await seedDraft(domain, "seat-doc", 1, { stages: [{ id: "s_0", params: { model: "anima" } }] });
    const doc = await new DraftsRemoteService(ctx).get("seat-doc", sig);
    assert.ok(!("resolved" in ((doc["stages"] as Array<Record<string, unknown>>)[0] as object)));
  });
});

// ── drafts/patch admission (the door's fixed key set) ──────────────

describe("drafts/patch admission: fixed keys, loud refusals", () => {
  test("a malformed draft id refuses LOUD", async () => {
    const { ctx } = await bootCtx();
    const err = await errOf(new DraftsRemoteService(ctx).patch("bad id!", "s_0", { params: {} }, null, sig));
    assert.equal(err.code, "draft/bad-id");
    assert.deepEqual(err.details, { draftId: "bad id!" });
  });

  test("an empty or non-string stage id refuses with the id in the details", async () => {
    const { ctx } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    const empty = await errOf(svc.patch("bench-main", "", { params: {} }, null, sig));
    assert.equal(empty.code, "draft/bad-stage-id");
    assert.deepEqual(empty.details, { stageId: "" });
    const num = await errOf(
      svc.patch("bench-main", 42 as unknown as string, { params: {} }, null, sig),
    );
    assert.equal(num.code, "draft/bad-stage-id");
    assert.deepEqual(num.details, { stageId: 42 });
  });

  test("a non-object patch body refuses draft/bad-patch", async () => {
    const { ctx } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    assert.equal(
      await codeOf(svc.patch("bench-main", "s_0", null as unknown as Record<string, unknown>, null, sig)),
      "draft/bad-patch|patch must be a plain object",
    );
    assert.equal(
      await codeOf(svc.patch("bench-main", "s_0", ["params"] as unknown as Record<string, unknown>, null, sig)),
      "draft/bad-patch|patch must be a plain object",
    );
    assert.equal(
      await codeOf(svc.patch("bench-main", "s_0", "params" as unknown as Record<string, unknown>, null, sig)),
      "draft/bad-patch|patch must be a plain object",
    );
  });

  test("unknown keys refuse with the door's ordered voice", async () => {
    const { ctx } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    const err = await errOf(
      svc.patch("bench-main", "s_0", { params: {}, bogus: 1, zzz: 2 }, null, sig),
    );
    assert.equal(err.code, "draft/patch-unknown-keys");
    assert.equal(
      err.message,
      `unknown stage patch key(s): bogus, zzz (want ${STAGE_PATCH_KEYS.join(", ")})`,
    );
    assert.deepEqual(err.details, { unknown: ["bogus", "zzz"] });
    // every door key rides: the full set admits (against a live doc)
    const { ctx: ctx2, domain } = await bootCtx();
    await ensureBench(domain, { session: "keys", stages: [{ id: "s_0" }] });
    const svc2 = new DraftsRemoteService(ctx2);
    const answer = await svc2.patch(
      "bench-keys",
      "s_0",
      { params: { a: 1 }, result: { url: "/u" }, runStatus: "done", inputs: {}, inputOutputs: {} },
      null,
      sig,
    );
    assert.deepEqual(answer.patched, ["inputOutputs", "inputs", "params", "result", "runStatus"]);
  });

  test("a failed open wraps as draft/store-failed", async () => {
    const svc = new DraftsRemoteService(new Context());
    assert.match(await codeOf(svc.patch("bench-x", "s_0", { params: {} }, null, sig)), /^draft\/store-failed\|/);
  });

  test("an aborted signal refuses at entry", async () => {
    const { ctx } = await bootCtx();
    await assert.rejects(new DraftsRemoteService(ctx).patch("bench-x", "s_0", { params: {} }, null, aborted()));
  });

  test("the patch adapter delegates to the in-process arm", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "ad", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    assert.deepEqual(
      await svc.remoteExportPatch("bench-ad", "s_0", { params: { a: 1 } }, null, sig),
      { draftId: "bench-ad", stageId: "s_0", delivered: true, patched: ["params"], rev: 1 },
    );
  });
});

// ── drafts/patch delivered:false (DOMAIN outcomes, never errors) ───

describe("drafts/patch: missing doc/stage is delivered:false + reason", () => {
  test("a missing doc rides the old door's envelope", async () => {
    const { ctx } = await bootCtx();
    assert.deepEqual(
      await new DraftsRemoteService(ctx).patch("ghost-9", "s_0", { params: { a: 1 } }, null, sig),
      { draftId: "ghost-9", stageId: "s_0", delivered: false, reason: "draft not found" },
    );
  });

  test("a missing stage rides the envelope; the find walks past earlier rows", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, {
      session: "two",
      stages: [{ id: "s_0", params: { keep: 1 } }, { id: "s_1", params: { keep: 2 } }],
    });
    const svc = new DraftsRemoteService(ctx);
    assert.deepEqual(
      await svc.patch("bench-two", "s_9", { params: { a: 1 } }, null, sig),
      { draftId: "bench-two", stageId: "s_9", delivered: false, reason: "stage not found" },
    );
    // the second row lands (the find's equality arm runs true there)
    const answer = await svc.patch("bench-two", "s_1", { params: { extra: 9 } }, null, sig);
    assert.deepEqual(answer, {
      draftId: "bench-two",
      stageId: "s_1",
      delivered: true,
      patched: ["params"],
      rev: 1,
    });
    const doc = await svc.get("bench-two", sig);
    const stages = doc["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages[1]?.["params"], { keep: 2, extra: 9 });
  });
});

// ── drafts/patch write arms (merge law, history, CAS join) ─────────

describe("drafts/patch writes: per-key merge, inputs arms, history edges", () => {
  test("inputs + inputOutputs land; a SELF-wire refuses (the wiring arm admits, 2026-10-10)", async () => {
    // This door used to write the inputs arm with NO admission while
    // the params arm walked it — so a keystroke through the GUI's
    // param editor could persist a self-wire (a cycle) that the
    // agent's bench/patch refuses on the identical body. The arms
    // now agree: a real edge lands, a cycle is named.
    const { ctx, domain } = await bootCtx();
    // s_0 declares the SPELL its wire feeds (the wiring law: an edge
    // bound by no $spell in params is a dead wire), so the cross-stage
    // edge below is a lawful one
    await ensureBench(domain, { session: "io", stages: [
      { id: "s_0", params: { image: "$image" } },
      { id: "s_1" },
    ] });
    const svc = new DraftsRemoteService(ctx);
    const cycle = await codeOf(svc.patch(
      "bench-io",
      "s_0",
      { inputs: { image: { stage: "s_0", output: "image" } } },
      null,
      sig,
    ));
    // (the spell rides already, so this refusal is the CYCLE arm alone)
    assert.ok(cycle.startsWith("bench/self-wire|"), "a self-wire names the cycle: " + cycle);
    const answer = await svc.patch(
      "bench-io",
      "s_0",
      { inputs: { image: { stage: "s_1", output: "image" } }, inputOutputs: { image: ["/a.png"] } },
      null,
      sig,
    );
    assert.deepEqual(answer, {
      draftId: "bench-io",
      stageId: "s_0",
      delivered: true,
      patched: ["inputOutputs", "inputs"],
      rev: 1,
    });
    const doc = await svc.get("bench-io", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    // the CROSS-STAGE edge landed (the self-wire above refused)
    assert.deepEqual(stage["inputs"], { image: { stage: "s_1", output: "image" } });
    assert.deepEqual(stage["inputOutputs"], { image: ["/a.png"] });
  });

  test("a non-object params value never merges (null, array, string ride past)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "np", stages: [{ id: "s_0", params: { keep: 1 } }] });
    const svc = new DraftsRemoteService(ctx);
    for (const params of [null, ["a"], "junk"]) {
      const answer = await svc.patch("bench-np", "s_0", { params: params as never }, null, sig);
      assert.equal(answer.delivered, true);
      assert.deepEqual(answer.patched, ["params"]);
    }
    const doc = await svc.get("bench-np", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.deepEqual(stage["params"], { keep: 1 });
    assert.equal((doc["bench"] as Record<string, unknown>)["rev"], 3);
  });

  test("an empty patch body refuses draft/bad-patch (vacuous telemetry is a caller bug, never a write)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "empty", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    const refusal = await codeOf(svc.patch("bench-empty", "s_0", {}, null, sig));
    assert.match(refusal, /^draft\/bad-patch\|patch is empty/);
    const doc = await svc.get("bench-empty", sig);
    assert.equal((doc["bench"] as Record<string, unknown>)["rev"], 0);
  });

  test("an empty params object logs the stable params summary", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, {
      session: "empty-params",
      stages: [{ id: "s_0", params: { keep: 1 } }],
    });
    const svc = new DraftsRemoteService(ctx);
    const answer = await svc.patch("bench-empty-params", "s_0", { params: {} }, null, sig);
    assert.equal(answer.rev, 1);
    const doc = await svc.get("bench-empty-params", sig);
    const bench = doc["bench"] as { log: Array<Record<string, unknown>> };
    assert.equal(bench.log.at(-1)?.["summary"], "params");
  });

  test("THE TELEMETRY LAW: a runStatus-only patch lands the status and NEVER bumps rev nor logs (operator 2026-10-08: rev kept ticking while merely generating)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "rs", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    const answer = await svc.patch("bench-rs", "s_0", { runStatus: "running" }, null, sig);
    assert.deepEqual(answer.patched, ["runStatus"]);
    assert.equal(answer.rev, 0, "telemetry serves the CURRENT rev — the CAS handle never moved");
    const doc = await svc.get("bench-rs", sig);
    assert.equal((doc["stages"] as Array<Record<string, unknown>>)[0]?.["runStatus"], "running");
    const bench = doc["bench"] as { rev: number; log: unknown[] };
    assert.equal(bench.rev, 0, "a run face is not an author move");
    assert.deepEqual(bench.log, [], "the undo log collects actions — telemetry is not one");
  });

  test("THE HEALTH CHANNEL (LOW-23): the transport word lands on its own field, null DELETES it, and neither bumps rev nor logs", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "health", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    // the escalation: the transport word rides health, never runStatus
    const escalation = await svc.patch("bench-health", "s_0", { health: "unreachable" }, null, sig);
    assert.deepEqual(escalation.patched, ["health"]);
    assert.equal(escalation.rev, 0, "the transport word is telemetry — the CAS handle never moves");
    let doc = await svc.get("bench-health", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage["health"], "unreachable");
    assert.equal("runStatus" in stage, false, "the escalation writes NO status word — a resource signal is not run vocabulary");
    // the recovery: the clear deletes the field entirely (a stage
    // that never escalated never carries it)
    const clear = await svc.patch("bench-health", "s_0", { runStatus: "running", health: null }, null, sig);
    assert.deepEqual(clear.patched, ["health", "runStatus"]);
    doc = await svc.get("bench-health", sig);
    const cleared = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.equal(cleared["runStatus"], "running");
    assert.equal("health" in cleared, false, "null is the merge-patch DELETE — the field is gone, not null-valued");
    const bench = doc["bench"] as { rev: number; log: unknown[] };
    assert.equal(bench.rev, 0, "escalation and recovery are both telemetry");
    assert.deepEqual(bench.log, []);
  });

  test("the whole generation never moves the rev: run start + EVERY progress frame + terminal all land silent", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "gen", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    // run start, two progress frames, terminal — the poll's own cadence
    await svc.patch("bench-gen", "s_0", { runStatus: "running", result: { run_id: "r1" } }, null, sig);
    await svc.patch("bench-gen", "s_0", { result: { run_id: "r1", progress: 0.25 } }, null, sig);
    await svc.patch("bench-gen", "s_0", { result: { run_id: "r1", progress: 0.9 } }, null, sig);
    await svc.patch("bench-gen", "s_0", { runStatus: "completed", result: { run_id: "r1", url: "/song.mp3" } }, null, sig);
    const doc = await svc.get("bench-gen", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage["runStatus"], "completed");
    assert.deepEqual(stage["result"], { run_id: "r1", url: "/song.mp3" });
    assert.deepEqual(stage["history"], [{ run_id: "r1", url: "/song.mp3" }], "the landed gen still enters the trail — the archive rides telemetry writes");
    const bench = doc["bench"] as { rev: number; log: unknown[] };
    assert.equal(bench.rev, 0, "four poll states, zero author moves");
    assert.deepEqual(bench.log, []);
  });

  test("telemetry with a STALE expect_rev lands anyway (the fence is authorship's, not the poll's)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "stale", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    const answer = await svc.patch("bench-stale", "s_0", { runStatus: "running" }, 999, sig);
    assert.equal(answer.delivered, true);
    const doc = await svc.get("bench-stale", sig);
    assert.equal((doc["stages"] as Array<Record<string, unknown>>)[0]?.["runStatus"], "running");
    assert.equal((doc["bench"] as Record<string, unknown>)["rev"], 0);
  });

  test("one author key in the body restores the full law: mixed params+runStatus fences, bumps, and logs", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "mix", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    const stale = await errOf(svc.patch("bench-mix", "s_0", { params: { seed: 7 }, runStatus: "running" }, 999, sig));
    assert.equal(stale.code, "bench/cas-conflict");
    const answer = await svc.patch("bench-mix", "s_0", { params: { seed: 7 }, runStatus: "running" }, null, sig);
    assert.equal(answer.rev, 1, "the params key makes the body an author move — rev walks");
    const doc = await svc.get("bench-mix", sig);
    const bench = doc["bench"] as { rev: number; log: Array<Record<string, unknown>> };
    assert.equal(bench.log.length, 1);
    assert.equal(bench.log[0]?.["kind"], "patch");
    assert.equal(bench.log[0]?.["summary"], "params:seed,runStatus");
  });

  test("a params patch against a non-object stored params starts from empty", async () => {
    const { ctx, domain } = await bootCtx();
    await domain.table("docs").put("bench-mp", {
      updated_at: 1,
      doc: {
        draft_id: "bench-mp",
        intent: "seeded",
        status: "ready",
        createdAt: 1,
        completedAt: null,
        stages: [{ id: "s_0", params: "junk" }],
        bench: { rev: 0, log: [] },
      } as never,
    });
    const svc = new DraftsRemoteService(ctx);
    await svc.patch("bench-mp", "s_0", { params: { a: 1 } }, null, sig);
    const doc = await svc.get("bench-mp", sig);
    assert.deepEqual((doc["stages"] as Array<Record<string, unknown>>)[0]?.["params"], { a: 1 });
  });

  test("the archive entry carries no params key when the landing had none (empty {} snapshot)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, {
      session: "np2",
      stages: [{ id: "s_0", params: {}, result: { url: "/old.png", run_id: "o" } }],
    });
    const svc = new DraftsRemoteService(ctx);
    await svc.patch("bench-np2", "s_0", { result: { url: "/new.png", run_id: "n" } }, null, sig);
    const doc = await svc.get("bench-np2", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    const hist = stage["history"] as Array<Record<string, unknown>>;
    // [landing (new), superseded (old)] — head is the current gen
    assert.equal(hist.length, 2);
    assert.deepEqual(hist[0], { url: "/new.png", run_id: "n" });
    assert.deepEqual(hist[1], { url: "/old.png", run_id: "o" });
    assert.ok(!("params" in hist[0]!), "an empty {} snapshot carries no params key");
    assert.ok(!("params" in hist[1]!), "an empty {} snapshot carries no params key");
  });

  test("a history that already holds the urls never double-archives (already-head skip)", async () => {
    const { ctx, domain } = await bootCtx();
    // A bench is BORN CLEAN OF ARCHIVES (2026-09-23) — the head
    // shape (a history head whose url matches the current result)
    // is reached through the LOAD arm's fill-never-clobber carry,
    // never a birth.
    await ensureBench(domain, {
      session: "ah",
      stages: [{ id: "s_0", result: { url: "/cur.png", run_id: "c" } }],
    });
    await ensureBench(domain, {
      session: "ah",
      overwrite: true,
      expect_rev: 0,
      stages: [{
        id: "s_0",
        result: { url: "/cur.png", run_id: "c" },
        history: [{ url: "/cur.png", run_id: "old" }],
      }],
    });
    const svc = new DraftsRemoteService(ctx);
    await svc.patch("bench-ah", "s_0", { result: { url: "/new.png", run_id: "n" } }, null, sig);
    const doc = await svc.get("bench-ah", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    const hist = stage["history"] as Array<Record<string, unknown>>;
    // the superseded /cur.png is ALREADY the trail — it rides once;
    // the landing /new.png joins at head
    assert.deepEqual(hist, [{ url: "/new.png", run_id: "n" }, { url: "/cur.png", run_id: "old" }]);
    assert.deepEqual(stage["result"], { url: "/new.png", run_id: "n" });
  });

  // THE LANDING-ARCHIVE LAW (operator 2026-09-21, the lost-gen
  // disease: "when I make a new gen it doesn't appear in history —
  // clicking a history item overwrites the preview and I can't
  // recover the most recent gen"): the supersede-only archive kept
  // the CURRENT generation out of history — it lived only in the
  // row's result slot, one view-pick away from unreachable. The
  // landing itself must enter the trail: every result that CARRIES
  // outputs is history's head the moment it lands. These walls pin
  // the full run cycle through the REAL patch door.
  test("a landed result enters history at its own landing (the latest gen is never outside the trail)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "land", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    // run A starts: the observer's start patch clears the row
    await svc.patch("bench-land", "s_0", { runStatus: "running", result: { run_id: "a" } }, null, sig);
    // run A lands (the terminal patch carries the outputs)
    await svc.patch("bench-land", "s_0", { runStatus: "done", result: { url: "/a.png", run_id: "a" } }, null, sig);
    const doc = await svc.get("bench-land", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    const hist = stage["history"] as Array<Record<string, unknown>>;
    assert.equal(hist.length, 1, "the landing is the trail's head — no member yet");
    assert.deepEqual(hist[0], { url: "/a.png", run_id: "a" });
    assert.deepEqual(stage["result"], { url: "/a.png", run_id: "a" });
  });

  test("the full cycle: gen2's landing holds head, gen1 sits beneath (no view-pick can lose a gen)", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "cyc", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    // gen1 cycle
    await svc.patch("bench-cyc", "s_0", { runStatus: "running", result: { run_id: "g1" } }, null, sig);
    await svc.patch("bench-cyc", "s_0", { runStatus: "done", result: { url: "/g1.png", run_id: "g1" } }, null, sig);
    // gen2 cycle (start clears the row, terminal lands gen2)
    await svc.patch("bench-cyc", "s_0", { runStatus: "running", result: { run_id: "g2" } }, null, sig);
    await svc.patch("bench-cyc", "s_0", { runStatus: "done", result: { url: "/g2.png", run_id: "g2" } }, null, sig);
    const doc = await svc.get("bench-cyc", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    const hist = stage["history"] as Array<Record<string, unknown>>;
    assert.equal(hist.length, 2, "both distinct runs are members");
    assert.deepEqual(hist[0], { url: "/g2.png", run_id: "g2" }, "newest first — the head is the CURRENT gen");
    assert.deepEqual(hist[1], { url: "/g1.png", run_id: "g1" });
    assert.deepEqual(stage["result"], { url: "/g2.png", run_id: "g2" });
  });

  test("a live mid-run patch ({run_id, progress} — no outputs) never archives", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "live", stages: [{ id: "s_0" }] });
    const svc = new DraftsRemoteService(ctx);
    await svc.patch("bench-live", "s_0", { runStatus: "running", result: { run_id: "r", progress: { value: 3, max: 8 } } }, null, sig);
    const doc = await svc.get("bench-live", sig);
    const stage = (doc["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage["history"], undefined, "no urls — nothing to trail");
  });

  test("a drafts patch fans out to bench-change listeners under the session key", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "fan", stages: [{ id: "s_0" }] });
    const heard: string[] = [];
    const off = onBenchChange((session) => { heard.push(session); });
    const svc = new DraftsRemoteService(ctx);
    await svc.patch("bench-fan", "s_0", { params: { a: 1 } }, null, sig);
    // a foreign draft id never parses to a session — no fan-out
    await domain.table("docs").put("plain-draft", {
      updated_at: 1,
      doc: {
        draft_id: "plain-draft",
        intent: "seeded",
        status: "ready",
        createdAt: 1,
        completedAt: null,
        stages: [{ id: "s_0" }],
      } as never,
    });
    await svc.patch("plain-draft", "s_0", { params: { a: 2 } }, null, sig);
    assert.deepEqual(heard, ["fan"]);
    off();
  });
});

// ── the registry seat behind the remote (resolve + admission) ──────

describe("the remote registry seat: resolve attaches, admission refuses", () => {
  function resolveOnly(ctx: Context): void {
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null =>
        typeof body["model"] === "string" && body["model"] !== ""
          ? { ...body, steps: 52 }
          : null,
    });
  }

  test("a seat that explodes on read is treated as absent (the resolver catch)", async () => {
    const { ctx, domain } = await bootCtx();
    // a degenerate seat: cordis reads the tracker's global symbol off
    // every provided seat (Symbol.for('cordis.tracker') — the same
    // global-registry contract Context.is is keyed on); this seat
    // explodes on that read, so ctx.get itself throws and the
    // resolver's catch treats the seat as missing — the serve skips,
    // never throws, and admission admits everything.
    const seat = {
      get [Symbol.for("cordis.tracker")](): unknown {
        throw new Error("seat tracker boom");
      },
    };
    ctx.provide("cardRegistry", seat);
    await seedDraft(domain, "boom-doc", 1, { stages: [{ id: "s_0", params: { model: "anima" } }] });
    const doc = await new DraftsRemoteService(ctx).get("boom-doc", sig);
    assert.ok(!("resolved" in ((doc["stages"] as Array<Record<string, unknown>>)[0] as object)));
    const bench = new BenchRemoteService(ctx);
    const row = await bench.ensure(
      { session: "boom", stages: [{ id: "s_0", card: "image-gen", params: { model: "junk-net" } }] },
      sig,
    );
    assert.equal(row.created, true);
  });

  test("a registry WITHOUT admitStageModel admits everything (the local derive)", async () => {
    const { ctx } = await bootCtx();
    resolveOnly(ctx);
    const bench = new BenchRemoteService(ctx);
    // a model no card offers still lands — no admission seat, no refusal
    const row = await bench.ensure(
      { session: "free", stages: [{ id: "s_0", card: "image-gen", params: { model: "junk-net" } }] },
      sig,
    );
    assert.equal(row.created, true);
    const got = await bench.get("free", sig);
    assert.deepEqual(
      (got.stages as Array<Record<string, unknown>>)[0]?.["resolved"],
      { model: "junk-net", steps: 52 },
    );
  });

  test("admit ok:true lands the row and records the (card, model) call", async () => {
    const { ctx } = await bootCtx();
    const seen: Array<{ card: string; model: unknown }> = [];
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (
        card: string,
        model: unknown,
      ): { ok: true } | { ok: false; error: string; offered: string[] } => {
        seen.push({ card, model });
        return { ok: true };
      },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "okm" }, sig);
    const row = await bench.addStage(
      "okm",
      { card: "image-gen", params: { model: "good-net" }, expect_rev: 0 },
      sig,
    );
    assert.equal(row.stage, "s_0");
    assert.deepEqual(seen, [{ card: "image-gen", model: "good-net" }]);
  });

  test("admit ok:false refuses add_stage with bench/bad-model — the row never lands", async () => {
    const { ctx } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (
        card: string,
        model: unknown,
      ): { ok: true } | { ok: false; error: string; offered: string[] } =>
        model === "poison-net"
          ? { ok: false, error: `model 'poison-net' is not offered by card '${card}'`, offered: ["good-net"] }
          : { ok: true },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "adm" }, sig);
    const err = await errOf(
      bench.addStage("adm", { card: "image-gen", params: { model: "poison-net" }, expect_rev: 0 }, sig),
    );
    assert.equal(err.code, "bench/bad-model");
    assert.equal(err.message, "model 'poison-net' is not offered by card 'image-gen'");
    assert.deepEqual(err.details, { card: "image-gen", offered: ["good-net"] });
    assert.equal(((await bench.get("adm", sig)).stages as unknown[]).length, 0);
  });

  test("landing poison via bench/patch is as refused as via add_stage", async () => {
    const { ctx } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (
        card: string,
        model: unknown,
      ): { ok: true } | { ok: false; error: string; offered: string[] } =>
        model === "poison-net"
          ? { ok: false, error: `model 'poison-net' is not offered by card '${card}'`, offered: ["good-net"] }
          : { ok: true },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "padm" }, sig);
    await bench.addStage("padm", { card: "image-gen", params: { prompt: "x" }, expect_rev: 0 }, sig);
    const refusal = await codeOf(
      bench.patch("padm", { stage: "s_0", params: { model: "poison-net" }, expect_rev: 1 }, sig),
    );
    assert.match(refusal, /^bench\/bad-model\|/);
    const got = await bench.get("padm", sig);
    assert.deepEqual((got.stages as Array<Record<string, unknown>>)[0]?.["params"], { prompt: "x" });
  });

  test("a poisoned wholesale load refuses at ensure (the load-path admission)", async () => {
    const { ctx } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (
        card: string,
        model: unknown,
      ): { ok: true } | { ok: false; error: string; offered: string[] } =>
        model === "poison-net"
          ? { ok: false, error: `model 'poison-net' is not offered by card '${card}'`, offered: ["good-net"] }
          : { ok: true },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "load" }, sig);
    const refusal = await codeOf(
      bench.ensure({
        session: "load",
        stages: [{ id: "s_0", card: "image-gen", params: { model: "poison-net" } }],
        expect_rev: 0,
        overwrite: true,
      }, sig),
    );
    assert.match(refusal, /^bench\/bad-model\|/);
  });
});

// ── BenchRemoteService: get/ensure doors ────────────────────────────

describe("bench/get + bench/ensure over the remote", () => {
  test("get refuses a missing bench with bench/not-found", async () => {
    const { ctx } = await bootCtx();
    assert.match(
      await codeOf(new BenchRemoteService(ctx).get("ghost", sig)),
      /^bench\/not-found\|/,
    );
  });

  test("get wraps a failed open as bench/store-failed", async () => {
    assert.match(await codeOf(new BenchRemoteService(new Context()).get("x", sig)), /^bench\/store-failed\|/);
  });

  test("get refuses an aborted signal at entry", async () => {
    const { ctx } = await bootCtx();
    await assert.rejects(new BenchRemoteService(ctx).get("x", aborted()));
  });

  test("the get adapter delegates to the in-process arm", async () => {
    const { ctx, domain } = await bootCtx();
    await ensureBench(domain, { session: "adg", stages: [{ id: "s_0" }] });
    const svc = new BenchRemoteService(ctx);
    assert.deepEqual(await svc.remoteExportGet("adg", sig), await svc.get("adg", sig));
  });


  test("ensure wraps a failed open as bench/store-failed", async () => {
    assert.match(
      await codeOf(new BenchRemoteService(new Context()).ensure({ session: "x" }, sig)),
      /^bench\/store-failed\|/,
    );
  });

  test("ensure refuses an aborted signal at entry", async () => {
    const { ctx } = await bootCtx();
    await assert.rejects(new BenchRemoteService(ctx).ensure({ session: "x" }, aborted()));
  });

  test("the ensure adapter delegates to the in-process arm", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    const via = await svc.remoteExportEnsure({ session: "ade", intent: "hello" }, sig);
    assert.deepEqual(via, {
      draft_id: "bench-ade",
      session: "ade",
      rev: 0,
      intent: "hello",
      stages: [],
      created: true,
    });
  });

  test("a non-object ensure body refuses bench/bad-body at the service door", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    // the wire is honest JSON all the way down — a junk body (string,
    // array, null) meets the door's own voice, never a type accident
    for (const junk of ["x", [1], null] as never[]) {
      const refusal = await codeOf(svc.ensure(junk, sig));
      assert.match(refusal, /^bench\/bad-body\|body must be a JSON object/);
    }
  });
});

// ── BenchRemoteService: the mutating verbs (live rows) ─────────────

describe("the bench verbs' rows over the remote", () => {
  test("patch/add-stage/remove-stage walk rev and report their rows", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.ensure({ session: "v" }, sig);
    const added = await svc.addStage("v", { card: "hero", params: { prompt: "x" }, expect_rev: 0 }, sig);
    assert.deepEqual(added, { draft_id: "bench-v", session: "v", rev: 1, stage: "s_0" });
    const patched = await svc.patch("v", { stage: "s_0", params: { steps: 8 }, expect_rev: 1 }, sig);
    assert.deepEqual(patched, {
      draft_id: "bench-v",
      session: "v",
      rev: 2,
      stage: "s_0",
      patched: ["steps"],
    });
    const removed = await svc.removeStage("v", { stage: "s_0", expect_rev: 2 }, sig);
    assert.deepEqual(removed, { draft_id: "bench-v", session: "v", rev: 3, stage: "s_0" });
    assert.deepEqual((await svc.get("v", sig)).stages, []);
  });

  test("rewire sets one binding and reports stage+input", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.ensure({
      session: "w",
      stages: [{ id: "s_0" }, { id: "s_1", params: { image1: "$image" } }],
    }, sig);
    const row = await svc.rewire(
      "w",
      { stage: "s_1", input: "image", from: { stage: "s_0", output: "image" }, expect_rev: 0 },
      sig,
    );
    assert.deepEqual(row, { draft_id: "bench-w", session: "w", rev: 1, stage: "s_1", input: "image" });
    const got = await svc.get("w", sig);
    assert.deepEqual((got.stages as Array<Record<string, unknown>>)[1]?.["inputs"], {
      image: { stage: "s_0", output: "image" },
    });
  });

  test("reorder moves one stage and reports from/to", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.ensure({ session: "r", stages: [{ id: "a" }, { id: "b" }] }, sig);
    const row = await svc.remoteExportReorder("r", { stage: "b", to: 0, expect_rev: 0 }, sig);
    assert.deepEqual(row, { draft_id: "bench-r", session: "r", rev: 1, stage: "b", from: 1, to: 0 });
    const got = await svc.get("r", sig);
    assert.deepEqual(
      (got.stages as Array<{ id: string }>).map((s) => s.id),
      ["b", "a"],
    );
  });

  test("group collapses two rows into a compound; ungroup spills them back", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.ensure({ session: "g", stages: [{ id: "a" }, { id: "b" }] }, sig);
    const grouped = await svc.remoteExportGroup("g", { stages: ["a", "b"], expect_rev: 0 }, sig);
    assert.deepEqual(grouped, { draft_id: "bench-g", session: "g", rev: 1, stage: "g_r0c2_0" });
    const ungrouped = await svc.remoteExportUngroup("g", { stage: "g_r0c2_0", expect_rev: 1 }, sig);
    assert.deepEqual(ungrouped, { draft_id: "bench-g", session: "g", rev: 2, stage: "g_r0c2_0" });
    const got = await svc.get("g", sig);
    assert.deepEqual(
      (got.stages as Array<{ id: string }>).map((s) => s.id),
      ["a", "b"],
    );
  });

  test("undo walks the last write back and reports the undone revs", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.ensure({ session: "u" }, sig);
    await svc.addStage("u", { card: "hero", expect_rev: 0 }, sig);
    const undone = await svc.undo("u", {}, sig);
    assert.deepEqual(undone.undone, [1]);
    assert.equal(undone.rev, 2);
    assert.deepEqual((await svc.get("u", sig)).stages, []);
  });

  test("a failed open wraps as bench/store-failed (the shared open seam)", async () => {
    const svc = new BenchRemoteService(new Context());
    // patch crosses the private open() — its catch is the seam's voice
    assert.match(await codeOf(svc.patch("x", { stage: "s_0" }, sig)), /^bench\/store-failed\|/);
  });

  test("every mutating verb refuses an aborted signal at entry", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    const no = aborted();
    await assert.rejects(svc.patch("x", {}, no));
    await assert.rejects(svc.addStage("x", {}, no));
    await assert.rejects(svc.removeStage("x", {}, no));
    await assert.rejects(svc.rewire("x", {}, no));
    await assert.rejects(svc.undo("x", {}, no));
    await assert.rejects(svc.remoteExportReorder("x", {}, no));
    await assert.rejects(svc.remoteExportGroup("x", {}, no));
    await assert.rejects(svc.remoteExportUngroup("x", {}, no));
  });

  test("every bench write fans out on the session key (one notify per verb)", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    const heard: string[] = [];
    const off = onBenchChange((session) => { heard.push(session); });
    let rev = 0;
    rev = (await svc.ensure({ session: "fan" }, sig)).rev;
    rev = (await svc.addStage("fan", { card: "card-a", expect_rev: rev }, sig)).rev;
    rev = (await svc.addStage("fan", { card: "card-b", expect_rev: rev }, sig)).rev;
    rev = (await svc.patch("fan", { stage: "s_0", params: { steps: 4 }, expect_rev: rev }, sig)).rev;
    rev = (await svc.patch("fan", { stage: "s_1", params: { image1: "$image" }, expect_rev: rev }, sig)).rev;
    const moved = await svc.remoteExportReorder("fan", { stage: "s_1", to: 0, expect_rev: rev }, sig);
    assert.deepEqual([moved.from, moved.to], [1, 0]);
    rev = moved.rev;
    const grouped = await svc.remoteExportGroup("fan", { stages: ["s_1", "s_0"], expect_rev: rev }, sig);
    rev = grouped.rev;
    rev = (await svc.remoteExportUngroup("fan", { stage: grouped.stage, expect_rev: rev }, sig)).rev;
    // THE WIRE LANDS AFTER THE SPILL (2026-10-10, the bench audit's
    // gap 6): the run's wiring walk reads the FLAT stages only, so a
    // wire naming a grouped child feeds nothing — group and ungroup
    // now judge the whole bench they leave behind and refuse the
    // phantom. The fan-out bench therefore wires after the spill,
    // which is the order the law allows (same verbs, same count).
    rev = (await svc.rewire(
      "fan",
      { stage: "s_1", input: "image", from: { stage: "s_0", output: "image" }, expect_rev: rev },
      sig,
    )).rev;
    // UNWIRE BEFORE REMOVE (2026-10-10, the write-seat audit's row
    // 5): removing s_0 would orphan s_1's wire — a state the rewire
    // door refuses to create — so the removal refuses it too. The
    // honest order is the honest UI's order: clear the wire, then
    // remove the stage. (One more verb rides the fanout count.)
    rev = (await svc.rewire("fan", { stage: "s_1", input: "image", expect_rev: rev }, sig)).rev;
    rev = (await svc.removeStage("fan", { stage: "s_0", expect_rev: rev }, sig)).rev;
    const undone = await svc.undo("fan", {}, sig);
    assert.deepEqual(undone.undone, [rev]);
    assert.deepEqual(heard, Array.from({ length: 12 }, () => "fan"));
    off();
  });
});

// ── the @Remote adapters (thin delegates, signal always final) ─────

describe("the bench @Remote adapters delegate with row fidelity", () => {
  test("patch/add-stage/remove-stage/rewire adapters match the in-process rows", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.remoteExportEnsure({ session: "p" }, sig);
    const added = await svc.remoteExportAddStage("p", { card: "hero", expect_rev: 0 }, sig);
    assert.deepEqual(added, { draft_id: "bench-p", session: "p", rev: 1, stage: "s_0" });
    const patched = await svc.remoteExportPatch("p", { stage: "s_0", params: { prompt: "$prompt" }, expect_rev: 1 }, sig);
    assert.deepEqual(patched, {
      draft_id: "bench-p",
      session: "p",
      rev: 2,
      stage: "s_0",
      patched: ["prompt"],
    });
    const rewired = await svc.remoteExportRewire(
      "p",
      { stage: "s_0", input: "prompt", from: { initial: "prompt" }, expect_rev: 2 },
      sig,
    );
    // the channel is spelled ($prompt rode the patch) so the
    // initial-bound wire is a legal landing, not a phantom
    assert.deepEqual(rewired, { draft_id: "bench-p", session: "p", rev: 3, stage: "s_0", input: "prompt" });
    const removed = await svc.remoteExportRemoveStage("p", { stage: "s_0", expect_rev: 3 }, sig);
    assert.deepEqual(removed, { draft_id: "bench-p", session: "p", rev: 4, stage: "s_0" });
  });

  test("the undo adapter reports the undone revs", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.remoteExportEnsure({ session: "ua" }, sig);
    await svc.remoteExportAddStage("ua", { card: "hero", expect_rev: 0 }, sig);
    const undone = await svc.remoteExportUndo("ua", {}, sig);
    assert.deepEqual(undone.undone, [1]);
    assert.equal(undone.rev, 2);
  });

  test("a bare-ctx adapter still wraps the open failure (store-failed, not a throw-through)", async () => {
    const svc = new BenchRemoteService(new Context());
    assert.match(await codeOf(svc.remoteExportGet("x", sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportEnsure({ session: "x" }, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportPatch("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportAddStage("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportRemoveStage("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportRewire("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportReorder("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportGroup("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportUngroup("x", {}, sig)), /^bench\/store-failed\|/);
    assert.match(await codeOf(svc.remoteExportUndo("x", {}, sig)), /^bench\/store-failed\|/);
  });

  // ── the clear adapter (batch-6 closure, 2026-10-14 — O25o): the
  // nuclear seat is a thin delegate like its siblings — row
  // fidelity in-process, and the store-failed wrap on a bare ctx.
  test("the clear adapter delegates with row fidelity (and wraps the open failure)", async () => {
    const { ctx } = await bootCtx();
    const svc = new BenchRemoteService(ctx);
    await svc.remoteExportEnsure({ session: "cl" }, sig);
    await svc.remoteExportAddStage("cl", { card: "hero", expect_rev: 0 }, sig);
    await svc.remoteExportAddStage("cl", { card: "hero", expect_rev: 1 }, sig);
    const cleared = await svc.remoteExportClear("cl", { expect_rev: 2 }, sig);
    assert.equal(cleared.session, "cl");
    assert.equal(cleared.rev, 3);
    assert.equal(cleared.cleared, 2);
    // the bench stands empty and still serves
    const after = await svc.remoteExportGet("cl", sig);
    assert.deepEqual(after.stages, []);
    // the bare-ctx wrap
    const bare = new BenchRemoteService(new Context());
    assert.match(await codeOf(bare.remoteExportClear("x", {}, sig)), /^bench\/store-failed\|/);
  });
});

// ── bench/subscribe (the push source: zero-state + rethrow arms) ───

describe("the bench/subscribe stream remote: zero-state and rethrow arms", () => {
  type Row = { draft_id: string; session: string; rev: number; intent: unknown; stages: unknown[]; log: unknown[] };

  test("a bench/not-found open serves the ZERO STATE, then the born bench", async () => {
    const controller = new AbortController();
    let calls = 0;
    const born: Row = { draft_id: "bench-main", session: "main", rev: 1, intent: "b", stages: [], log: [] };
    const fake = {
      get: async (): Promise<Row> => {
        calls += 1;
        if (calls === 1) {
          throw new RemoteError("bench/not-found", "no such bench: main", { session: "main" });
        }
        return born;
      },
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    if (first.done !== false) throw new Error("no initial frame");
    // the zero state: rev 0, empty stages — the watch stays open
    assert.deepEqual(first.value, {
      draft_id: "bench-main",
      session: "main",
      rev: 0,
      intent: "",
      stages: [],
      log: [],
    });
    // the birth (ensure's notifyBenchChange) wakes the park: next read
    // serves the born bench
    const secondP = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 25));
    notifyBenchChange("main");
    const second = await secondP;
    if (second.done !== false) throw new Error("no birth frame");
    assert.deepEqual(second.value, born);
    controller.abort();
    const last = await gen.next();
    if (last.done !== true) throw new Error("abort must end the stream");
  });

  test("a non-not-found RemoteError rethrows (never degrades to zero)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => {
        throw new RemoteError("bench/store-failed", "storage domain facility not mounted", {});
      },
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    await assert.rejects(gen.next(), /storage domain facility not mounted/);
    controller.abort();
  });

  test("a foreign throw (not a RemoteError at all) rethrows untouched", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => {
        throw new Error("seat boom");
      },
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    await assert.rejects(gen.next(), /seat boom/);
    controller.abort();
  });

  test("an aborted signal refuses before the open (the get arm never runs)", async () => {
    const calls: string[] = [];
    const fake = {
      get: async (): Promise<Row> => {
        calls.push("get");
        return { draft_id: "bench-main", session: "main", rev: 1, intent: null, stages: [], log: [] };
      },
    };
    const gen = BenchRemoteService.prototype.subscribe.call(
      fake as never,
      "main",
      aborted(),
    ) as AsyncGenerator<Row>;
    await assert.rejects(gen.next());
    assert.deepEqual(calls, []);
  });
});

// ── the bench side of the domain boot (one law, recorded here) ─────

test("boot() still opens the domain (the harness smoke arm)", async () => {
  const drafts = await boot();
  await seed(drafts, "smoke", { stages: [{ id: "s_0" }] });
  assert.ok(drafts.table("docs").get("bench-smoke") !== undefined);
});

// ── THE STAGE MEMORY LAW (2026-09-20, the operator's catch: "why
// does it never track history?") — through the REAL service write
// path (the same verbs the client's observer rides): the archive
// law lands history on result overwrites, and a wholesale LOAD
// rebuilding the bench with the SAME stage id carries the stage's
// OUTPUT MEMORY (result, runStatus, history, resultParams)
// forward. A new id starts clean. The gallery is the stage's own,
// never the doc revision's.
test("the stage memory law: load rebuilds the bench but a same-id stage KEEPS its landed result + archived history", async () => {
  const { ctx } = await bootCtx();
  ctx.provide("cardRegistry", {
    resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
    admitStageModel: (): { ok: true } => ({ ok: true }),
  });
  const bench = new BenchRemoteService(ctx);
  const drafts = new DraftsRemoteService(ctx);
  await bench.ensure({ session: "mem", stages: [{ id: "s_0", card: "image-gen" }] }, sig);
  // run A lands, run B overwrites — through the SAME door the
  // client's observer rides (drafts/patch, the archive-law door)
  await drafts.patch("bench-mem", "s_0", {
    params: { seed: -1 },
    result: { run_id: "run-a", url: "/runs/run-a/out.png" },
    runStatus: "done",
  }, 0, sig);
  // THE TELEMETRY LAW (2026-10-08): the second write is result+
  // runStatus ONLY — a run face, no author key — so the rev the
  // first (author) write advanced to is STILL the current one.
  await drafts.patch("bench-mem", "s_0", {
    result: { run_id: "run-b", url: "/runs/run-b/out.png" },
    runStatus: "done",
  }, 1, sig);
  const before = await bench.get("mem", sig);
  const beforeRow = (before.stages as Array<Record<string, unknown>>).find((r) => r["id"] === "s_0")!;
  assert.ok(Array.isArray(beforeRow["history"]) && (beforeRow["history"] as unknown[]).length === 2,
    "the archive law trailed BOTH landings — run-b at head (the current gen), run-a beneath");
  // THE LOAD (a chat agent re-loads the card mid-iteration)
  await bench.ensure({
    session: "mem", overwrite: true, expect_rev: before.rev,
    stages: [{ id: "s_0", card: "image-gen" }, { id: "s_new", card: "image-edit" }],
  }, sig);
  const after = await bench.get("mem", sig);
  const rows = after.stages as Array<Record<string, unknown>>;
  const same = rows.find((r) => r["id"] === "s_0")!;
  const fresh = rows.find((r) => r["id"] === "s_new")!;
  assert.equal((same["result"] as Record<string, unknown>)["run_id"], "run-b",
    "the same-id stage KEEPS its landed result across the load");
  assert.equal(same["runStatus"], "done", "and its run status");
  const hist = same["history"] as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(hist) && hist.length === 2, "and its archived history (both landings)");
  assert.ok(String((hist[0]?.["url"]) as string).includes("run-b"), "the head is the CURRENT gen (run-b)");
  assert.ok(String((hist[1]?.["url"]) as string).includes("run-a"), "the RIGHT predecessor beneath (run-a)");
  assert.equal(fresh["result"], undefined, "a genuinely new stage starts clean");
  assert.equal(fresh["history"], undefined);
  // THE NON-CLOBBER ARM: an incoming row that CARRIES its own
  // memory keeps it (the carry fills gaps, never overwrites) —
  // and a prev row with NO history contributes none. (expect_rev
  // rides the CURRENT rev — the load above walked it once.)
  const landed2 = await bench.ensure({
    session: "mem", overwrite: true, expect_rev: after.rev,
    stages: [
      { id: "s_0", card: "image-gen", result: { run_id: "run-x" } },
      { id: "s_histless", card: "image-gen", result: { run_id: "run-y", url: "/runs/run-y/o.png" } },
    ],
  }, sig);
  void landed2;
  const after2 = await bench.get("mem", sig);
  const rows2 = after2.stages as Array<Record<string, unknown>>;
  assert.equal(
    (rows2.find((r) => r["id"] === "s_0")!["result"] as Record<string, unknown>)["run_id"],
    "run-x",
    "the load's OWN result wins over the carried one (fill, never clobber)",
  );
  assert.equal(
    rows2.find((r) => r["id"] === "s_histless")!["history"],
    undefined,
    "a prev row with no history carries none",
  );
});

// ── THE SEAM TOGGLE LANDING WALL (operator 2026-09-23: the toggle
//    flashed, the run composed the OLD seam, the doc never moved) ──
test("a params patch carrying calls[].transition LANDS and persists (the seam toggle's full door)", async () => {
  const { ctx, domain } = await bootCtx();
  await seed(domain, "seam", {
    bench: { rev: 0, log: [] },
    stages: [{
      id: "s_0", card: "h3-timeline", engine: "comfyui",
      params: {
        calls: [
          { text: "one", start_frame: 0, end_frame: 124 },
          { text: "two", start_frame: 124, end_frame: 243, transition: "cut" },
        ],
        seed: 7,
      },
    }] as never,
  });
  const svc = new DraftsRemoteService(ctx);
  const answer = await svc.patch("bench-seam", "s_0", {
    params: {
      calls: [
        { text: "one", start_frame: 0, end_frame: 124 },
        { text: "two", start_frame: 124, end_frame: 243, transition: "extend" },
      ],
    },
  }, null, sig);
  assert.equal(answer.delivered, true);
  assert.deepEqual(answer.patched, ["params"]);
  const row = await domain.table("docs").get("bench-seam") as unknown as { doc: { stages: Array<{ id: string; params: { calls: Array<{ transition?: string }> } }>; bench: { log: Array<{ summary: string }> } } }; // the stored row is the full DraftRecord; the wall reads only the seam + receipt slice
  const calls = row.doc.stages.find((s) => s.id === "s_0")!.params.calls;
  assert.equal(calls[1]!.transition, "extend", "the landed doc carries the toggled seam");
  // THE INNER-KEY RECEIPT (2026-09-23): the seam night proved the
  // summary "params" worthless — four revs of UI edits and four model
  // stamps all spelled the same. The log entry NAMES the merged keys:
  // a seam toggle is forever distinguishable from a quant stamp.
  assert.equal(row.doc.bench.log.at(-1)!.summary, "params:calls",
    "the bench log names the merged inner keys");
});

// ── THE LANE ADMISSION SEAT (2026-10-10, the YOU_ARE_A_LIAR fix
// shape 3: "bench-write enforces the DECL's relations — refusal in
// the field's voice at the moment a state is built"). The registry
// judges the stage's declared lane (surface + relation words); this
// is the DOOR's wiring law — the refusal shape, the composed
// admission, and the restored-archive carve. The declaration's own
// judgment walls live in estate-queue (cards-lane-law.spec.ts).
describe("laneAdmissionOf (the DECL's words at the write door)", () => {
  test("a lane refusal refuses add_stage with bench/lane-refusal — the row never lands", async () => {
    const { ctx } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (): { ok: true } => ({ ok: true }),
      admitStageRelations: (card: string, params: Record<string, unknown>):
        { ok: true } | { ok: false; error: string } =>
        params["design_prompt"] !== undefined && params["voice_name"] === undefined
          ? {
              ok: false,
              error: "lane 'qwen3-tts/customvoice' refuses the state: fields 'voice_name' + 'design_prompt' ride together on this lane (state all or none) — the persona export needs both halves — name the voice and describe it, or drop both",
            }
          : { ok: true },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "lane-a" }, sig);
    const err = await errOf(bench.addStage("lane-a", {
      card: "tts",
      params: { model: "qwen3-tts", text: "hello", design_prompt: "a warm narrator" },
      expect_rev: 0,
    }, sig));
    assert.equal(err.code, "bench/lane-refusal");
    assert.match(err.message ?? "", /voice_name/);
    assert.match(err.message ?? "", /design_prompt/);
    assert.deepEqual(err.details, { card: "tts" });
    assert.equal(((await bench.get("lane-a", sig)).stages as unknown[]).length, 0,
      "the refused row never lands");
    // the CURED state lands (the refused write never bumped the rev)
    const row = await bench.addStage("lane-a", {
      card: "tts",
      params: { model: "qwen3-tts", text: "hello", design_prompt: "a warm narrator", voice_name: "warm_1" },
      expect_rev: 0,
    }, sig);
    assert.equal(row.stage, "s_0");
  });

  test("the composed admission: model board first, lane words second — patch lands poison as refused as add", async () => {
    const { ctx } = await bootCtx();
    const seenModels: unknown[] = [];
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (card: string, model: unknown): { ok: true } => { seenModels.push(model); return { ok: true }; },
      admitStageRelations: (card: string, params: Record<string, unknown>):
        { ok: true } | { ok: false; error: string } =>
        params["voice"] !== undefined && params["ref_audio"] !== undefined
          ? { ok: false, error: "lane 'qwen3-tts/base' refuses the state: field 'voice' fires nothing on this lane — drop it or switch lane" }
          : { ok: true },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "lane-p" }, sig);
    await bench.addStage("lane-p", {
      card: "tts", params: { model: "qwen3-tts", variant: "base", text: "x", ref_audio: "/a.flac", ref_text: "t" },
      expect_rev: 0,
    }, sig);
    const refusal = await codeOf(bench.patch("lane-p", {
      stage: "s_0", params: { voice: "vivian" }, expect_rev: 1,
    }, sig));
    assert.ok(refusal.startsWith("bench/lane-refusal|"),
      "the patch refusal is the lane seat's voice: " + refusal);
    assert.deepEqual(seenModels, ["qwen3-tts", "qwen3-tts"],
      "the model admission ran on both writes (composed, in order)");
  });

  test("a RESTORE REQUEST is honored on the wire (the bypass audit's CRITICAL-1: the carve was dead)", async () => {
    // The forge the audit found: `provenance: "restored"` arrives in
    // the request body and used to exempt the state outright. It is
    // now just a string; the carve rides a server symbol nothing over
    // the wire can carry.
    const { ctx } = await bootCtx();
    let judged = 0;
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (): { ok: true } => ({ ok: true }),
      admitStageRelations: (card: string, params: Record<string, unknown>):
        { ok: true } | { ok: false; error: string } => {
        judged += 1;
        return params["design_prompt"] !== undefined
          ? { ok: false, error: "lane refuses: the persona export needs both halves" }
          : { ok: true };
      },
    });
    const bench = new BenchRemoteService(ctx);
    // THE CARVE FIRES ON THE WIRE (2026-10-10: the two comparisons
    // tested for a SYMBOL no request can carry, so the carve never
    // fired — a restored row was judged like a live one and the
    // model-REPAIR arm it also guards was dead). A restore is a
    // REQUEST; the run seat re-judges the state anyway (li-s), which
    // is what bounds the request's power.
    const requested = await bench.ensure({
      session: "lane-forge",
      stages: [{
        id: "s_0", card: "tts", provenance: "restored",
        params: { model: "qwen3-tts", text: "hello", design_prompt: "a warm narrator" },
      }],
    }, sig);
    assert.equal(requested.created, true, "a restore request loads the archive row");
    assert.equal(judged, 0, "the restore did not reach the lane judge (the archive loads; the run teaches)");
  });

  test("a SERVER-ARMED restore is exempt (the archive loads; the Run seat teaches)", async () => {
    const { ctx } = await bootCtx();
    let judged = 0;
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (): { ok: true } => ({ ok: true }),
      admitStageRelations: (card: string, params: Record<string, unknown>):
        { ok: true } | { ok: false; error: string } => {
        judged += 1;
        return { ok: true };
      },
    });
    const bench = new BenchRemoteService(ctx);
    const row = await bench.ensure({
      session: "lane-r",
      stages: [{
        id: "s_0", card: "tts", provenance: RESTORED_PROVENANCE as never, // the server's in-process restore stamp (unforgeable over the wire by design); the door types the body as JSON, so the test names the stamp never — the runtime row is untouched
        params: { model: "qwen3-tts", text: "hello", design_prompt: "a warm narrator" },
      }],
    }, sig);
    assert.equal(row.created, true);
    assert.equal(judged, 0, "the server-armed restore never reached the lane judge");
  });

  test("a registry without the lane seat admits as before (registry-less lanes never throw)", async () => {
    const { ctx } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (): { ok: true } => ({ ok: true }),
    });
    const bench = new BenchRemoteService(ctx);
    const row = await bench.addStage("lane-free", {
      card: "tts", params: { model: "qwen3-tts", text: "hello", design_prompt: "wound" },
      expect_rev: 0,
    }, sig);
    assert.equal(row.stage, "s_0");
  });
});

// ── THE DRAFTS DOOR IS A BENCH DOOR (2026-10-10, the door audit's
// CRITICAL): bench docs live in the drafts table ("bench-<session>"
// satisfies DRAFT_ID_RE) and the GUI's param editor rides THIS door
// (card-view's patchStageParams), so before the composed admission
// reached it, every keystroke edited a live stage with the model
// board and the lane relations unjudged — while the agent's
// bench/patch refused the identical body.
describe("drafts.patch admits the MERGED view (the GUI param editor's door)", () => {
  test("a keystroke that completes the export pair's wound refuses; the cured edit lands", async () => {
    const { ctx, domain } = await bootCtx();
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (): { ok: true } => ({ ok: true }),
      admitStageRelations: (card: string, params: Record<string, unknown>):
        { ok: true } | { ok: false; error: string } =>
        params["design_prompt"] !== undefined && params["voice_name"] === undefined
          ? { ok: false, error: "lane 'qwen3-tts/customvoice' refuses the state: fields 'voice_name' + 'design_prompt' ride together on this lane — the persona export needs both halves" }
          : { ok: true },
    });
    // seed a bench-shaped draft with one stage (the same table the
    // bench verbs write)
    await domain.table("docs").put("bench-main", {
      rev: 1,
      doc: {
        stages: [{ id: "s_0", card: "tts", params: { model: "qwen3-tts", variant: "customvoice", text: "hello" } }],
      },
    } as never); // a stages-only fixture on the legacy row envelope (row-level 'rev' predates 'updated_at'); the door under test tolerates it — the fixture stays byte-identical
    const drafts = new DraftsRemoteService(ctx);
    const poison = await codeOf(drafts.patch("bench-main", "s_0", {
      params: { design_prompt: "a warm narrator" },
    }, null, sig));
    assert.ok(poison.startsWith("bench/lane-refusal|"), "the GUI door refuses: " + poison);
    // the refused edit did NOT land (the domain's cached record is
    // mutated in place — the admission must precede the assignment)
    const row = await domain.table("docs").get("bench-main") as unknown as { doc: { stages: Array<{ params: Record<string, unknown> }> } }; // same partial-row read as the seam wall above
    assert.equal(row.doc.stages[0]!.params["design_prompt"], undefined, "the refused merge leaked nothing");
    // the cured edit lands
    const ok = await drafts.patch("bench-main", "s_0", {
      params: { design_prompt: "a warm narrator", voice_name: "warm_1" },
    }, null, sig);
    assert.equal(ok.delivered, true);
  });

  test("the store-seat unwrap rides drafts/patch too (the same body stores the same row through either door — the bench audit's gap 10)", async () => {
    // 2026-10-10: add, patch and load unwrap the wire's {item:[…]}
    // array shape before storing; drafts/patch merged the raw body,
    // so the identical patch produced two different stored rows and
    // the wrapped shape is poison for every reader downstream.
    const { ctx, domain } = await bootCtx();
    await domain.table("docs").put("bench-unwrap", {
      rev: 1,
      doc: { stages: [{ id: "s_0", card: "card-a", params: {} }] },
    } as never);
    const drafts = new DraftsRemoteService(ctx);
    const ok = await drafts.patch("bench-unwrap", "s_0", {
      params: { image: { item: ["a.png", "b.png"] } },
    } as never, null, sig);
    assert.equal(ok.delivered, true);
    const row = await domain.table("docs").get("bench-unwrap") as unknown as {
      doc: { stages: Array<{ params: Record<string, unknown> }> };
    };
    assert.deepEqual(row.doc.stages[0]!.params["image"], ["a.png", "b.png"],
      "storage holds the clean array (the wrapped shape never lands)");
  });

  test("a REFUSED patch writes NO telemetry (a result patch that also carried a bad model left a result behind — the bench audit's gap 1)", async () => {
    // 2026-10-10: the result/history/runStatus arms assigned into the
    // CACHED record ABOVE the model and wiring gates, so a body
    // carrying a result AND a bad model wrote the result and then
    // threw — a result with no rev and no log, i.e. a refused write
    // that mutated. The arms now run after both gates.
    const { ctx, domain } = await bootCtx();
    // the admission seat that refuses a model no family declares
    ctx.provide("cardRegistry", {
      resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
      admitStageModel: (): { ok: true } | { ok: false; error: string; offered: string[] } => ({
        ok: false, error: "bench/bad-model", offered: [],
      }),
      admitStageRelations: (): { ok: true } | { ok: false; error: string } => ({ ok: true }),
    });
    await domain.table("docs").put("bench-tel", {
      rev: 3,
      doc: { stages: [{ id: "s_0", card: "card-a", params: {} }] },
    } as never);
    const drafts = new DraftsRemoteService(ctx);
    // the refused body: a result AND a model no family declares
    const refused = await codeOf(drafts.patch("bench-tel", "s_0", {
      result: { url: "https://x/y.png", artifacts: { default: "https://x/y.png" } },
      params: { model: "gibberish-net" },
    } as never, null, sig));
    assert.ok(refused.startsWith("bench/bad-model"), "the model gate refuses: " + refused);
    const row = await domain.table("docs").get("bench-tel") as unknown as {
      rev: number;
      doc: { stages: Array<Record<string, unknown>> };
    };
    assert.equal(row.doc.stages[0]!["result"], undefined,
      "the refused write left NO result (the cached record is the domain's own object)");
    assert.equal(row.doc.stages[0]!["history"], undefined, "and no history entry");
    assert.equal(row.rev, 3, "and no rev bump — the write never happened");
    // the honest patch DOES land its result
    const ok = await drafts.patch("bench-tel", "s_0", {
      result: { url: "https://x/z.png", artifacts: { default: "https://x/z.png" } },
    } as never, null, sig);
    assert.equal(ok.delivered, true);
    const after = await domain.table("docs").get("bench-tel") as unknown as {
      doc: { stages: Array<Record<string, unknown>> };
    };
    assert.ok(after.doc.stages[0]!["result"] !== undefined, "the lawful result landed");
  });

  test("a params-only keystroke that orphans a wire refuses bench/dead-wire (the PAIR is judged, not the half)", async () => {
    // 2026-10-10, the write-seat audit's row 3: the wiring gate ran
    // only when the body carried `inputs`, so a params-only edit
    // that dropped the "$image" spell left the wire bound to nothing
    // — silently, while bench/patch refuses the identical body. The
    // gate now judges the MERGED pair whenever either half changes.
    const { ctx, domain } = await bootCtx();
    await domain.table("docs").put("bench-pair", {
      rev: 1,
      doc: {
        stages: [
          { id: "s_0", card: "card-a", params: {} },
          { id: "s_1", card: "card-b", params: { image: "$image" }, inputs: { image: { stage: "s_0", output: "image" } } },
        ],
      },
    } as never);
    const drafts = new DraftsRemoteService(ctx);
    // the spell leaves; the wire stays — the exact orphan
    const refused = await codeOf(drafts.patch("bench-pair", "s_1", {
      params: { image: null },
    }, null, sig));
    assert.ok(refused.startsWith("bench/dead-wire|"), "the params-only orphan refuses: " + refused);
    // nothing leaked: the spell is still there (the refused merge
    // never landed)
    const row = await domain.table("docs").get("bench-pair") as unknown as { doc: { stages: Array<{ params: Record<string, unknown> }> } };
    assert.equal(row.doc.stages[1]!.params["image"], "$image");
    // the honest cure lands: drop the wire FIRST (an inputs null),
    // then the spell may leave
    const unwired = await drafts.patch("bench-pair", "s_1", {
      inputs: { image: null },
    }, null, sig);
    assert.equal(unwired.delivered, true);
    const unwired2 = await drafts.patch("bench-pair", "s_1", {
      params: { image: null },
    }, null, sig);
    assert.equal(unwired2.delivered, true);
  });
});
