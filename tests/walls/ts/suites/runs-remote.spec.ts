// runs-remote.spec.ts — REBUILD-6 wall: the runs plane as a Typert
// remote over the queue seat (start/status/stop, the serial pump,
// the settle persist). Boots the FULL estate glue — timer, queue,
// storage, drafts, runs — over one mkdtemp state root. NO comfyui
// seat on purpose: the pump's engine seam must settle the run
// FAILED with the loud miswire text (never a silent accept).
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import assert from "node:assert/strict";
import { Context } from '@deepseek-ai/cordis';
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol';
import timerPlugin from '@deepseek-ai/cordis-plugin-timer';
// The storage stack composed AT THE COMPOSITION SITE, mirroring DSH's
// own rig (session-projection-cache/tests/fixtures.spec.ts l.27-104):
// pieces imported from the packages, rows assembled inline. No
// re-exporting wrapper package (the estate never re-packages DSH
// plugin pieces as its own surface).
import draftsPlugin from '@melite/estate-drafts';
import Storage from '@deepseek-ai/dsh-storage';
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from '@deepseek-ai/dsh-storage-json';
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from '@deepseek-ai/dsh-storage-domain';
import queuePlugin, {
  cardRegistryProvider,
  runsRegistryPlugin,
} from "../../../../packages/harness/estate-queue/src/index.ts";
import { runsRemotePlugin } from '@melite/estate-runs';
import type { RunsRemoteService } from '@melite/estate-runs';

interface Booted {
  ctx: Context;
  runs: import("../../../../packages/harness/estate-queue/src/index.ts").RunsRegistryService;
  adapter: RunsRemoteService;
  fiber: { dispose(): Promise<void> };
  root: string;
}


function doc(id: string): string {
  return JSON.stringify({
    draft_id: id,
    status: "draft",
    createdAt: 1700000000000,
    completedAt: null,
    intent: "test " + id,
    stages: [{ id: "s_0", inputs: [""], provenance: "agent" }],
  });
}

async function boot(withDraft = true): Promise<Booted> {
  const root = mkdtempSync(join(tmpdir(), "runs-remote-"));
  const stateRoot = join(root, "state");
  mkdirSync(join(stateRoot, "drafts"), { recursive: true });
  if (withDraft) writeFileSync(join(stateRoot, "drafts", "d_ok.json"), doc("d_ok"));
  process.env["MELITE_STATE_ROOT"] = stateRoot;
  process.env["MELITE_STORAGE_ROOT"] = "";
  const ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  const fiber = ctx.plugin(queuePlugin as never, { repoRoot: root });
  await fiber;
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
  await ctx.plugin(cardRegistryProvider as never);
  await ctx.plugin(runsRegistryPlugin as never);
  await ctx.plugin(runsRemotePlugin as never);
  const runs = (ctx as unknown as {
    runs: import("../../../../packages/harness/estate-queue/src/index.ts").RunsRegistryService;
    runsRemote: RunsRemoteService;
  });
  return { ctx, runs: runs.runs, adapter: runs.runsRemote, fiber, root: stateRoot };
}

/** Place a queued row straight into the queue seat's core (the
 *  deterministic live-stop probe — the pump is never kicked). */
function bootInsertRun(ctx: Context, row: unknown): void {
  const core = (ctx as unknown as {
    queue: { core: { runs: Map<string, unknown>; order: string[] } };
  }).queue.core;
  core.runs.set((row as { runId: string }).runId, row);
  core.order.push((row as { runId: string }).runId);
}

/** One inline flow body (single comfyui stage). */
function inlineBody(draftId: string): Record<string, unknown> {
  return {
    draft_id: draftId,
    test: true,
    flow_inline: {
      id: "f_test",
      stages: [
        { id: "s_0", engine: "comfyui", params: { workflow: { "1": { class_type: "KSampler" } } } },
      ],
    },
  };
}

test("the refusal chain, byte-pinned and in py order", async () => {
  const { runs, adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  const code = async (doc: unknown): Promise<string> => {
    try {
      await runs.start(doc, sig);
      return "NO-REFUSAL";
    } catch (e) {
      return remoteErrorOf(e)?.code ?? "NOT-REMOTE";
    }
  };
  const msg = async (doc: unknown): Promise<string> => {
    try {
      await runs.start(doc, sig);
      return "";
    } catch (e) {
      return remoteErrorOf(e)?.message ?? String(e);
    }
  };
  assert.equal(await code([]), "runs/bad-envelope");
  assert.equal(await msg([]), "request body must be a JSON object");
  assert.equal(await code({ test: "yes", draft_id: "d_ok" }), "runs/bad-envelope");
  assert.match(await msg({ test: "yes", draft_id: "d_ok" }), /^test flag must be a boolean \(got str 'yes'\)$/);
  assert.equal(await code({ test: true }), "runs/draft-required");
  assert.match(await msg({ test: true }), /^draft_id is required/);
  assert.equal(await code({ test: true, draft_id: "bad/id" }), "runs/draft-malformed");
  assert.equal(await code({ test: true, draft_id: "d_missing" }), "runs/draft-unknown");
  assert.match(await msg({ test: true, draft_id: "d_missing" }), /^unknown draft_id 'd_missing'/);
  const retired = { test: true, draft_id: "d_ok", flow_inline: inlineBody("d_ok")["flow_inline"], start_from: 2 } as Record<string, unknown>;
  assert.equal(await code(retired), "runs/invalid-request");
  // The ADAPTER delegates verbatim (the thin remote over the seat):
  // the same refusal through the Typert face.
  try {
    await adapter.remoteExportStart(retired, sig);
    assert.fail("expected refusal through the adapter");
  } catch (e) {
    assert.equal(remoteErrorOf(e)?.code, "runs/invalid-request");
  }
  assert.match(await msg(retired), /retired runner knob\(s\) \['start_from'\]/);
  const amb = { test: true, draft_id: "d_ok", flow: "x", model: "y" };
  assert.equal(await code(amb), "runs/invalid-request");
  assert.match(await msg(amb), /ambiguous request: names \['flow', 'model'\]/);
  assert.equal(await code({ test: true, draft_id: "d_ok" }), "runs/invalid-request");
  assert.match(await msg({ test: true, draft_id: "d_ok" }), /^no flow selected/);
  // The {model:} arm is REAL now (the card stroke): an unknown
  // model refuses with the door's no-unit voice.
  assert.equal(
    await code({ test: true, draft_id: "d_ok", model: "card-1" }),
    "runs/invalid-request",
  );
  assert.match(
    await msg({ test: true, draft_id: "d_ok", model: "card-1" }),
    /no model unit for model: card-1/,
  );
  // {flow:} now rides the named-flow shim (REBUILD-13): unknown
  // names answer the dead door's own voice (invalid_request — the
  // start-door envelope norm), not the retired placeholder refusal.
  assert.equal(
    await code({ test: true, draft_id: "d_ok", flow: "f" }),
    "runs/invalid-request",
  );
  assert.match(
    await msg({ test: true, draft_id: "d_ok", flow: "f" }),
    /no flow at flows\/f\/flow\.py/,
  );
  // compile gates: unknown top key, no engine, non-comfyui
  const badTop = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [], extra: 1 } };
  assert.equal(await code(badTop), "runs/invalid-request");
  assert.match(await msg(badTop), /unknown keys \['extra'\]/);
  const noEngine = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [{ id: "s" }] } };
  assert.equal(await code(noEngine), "runs/invalid-request");
  assert.match(await msg(noEngine), /no engine named/);
  const otherEngine = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [{ id: "s", engine: "blender" }] } };
  assert.equal(await code(otherEngine), "runs/preview-scope");
  await fiber.dispose();
});

test("a valid start queues, the pump settles FAILED loud (no engine seat), the persist lands", async () => {
  const { runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  const receipt = await runs.start(inlineBody("d_ok"), sig);
  assert.equal(receipt.status, "queued");
  assert.match(receipt.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
  assert.equal(receipt.queue_position, 0);
  // The pump settles async — poll for the terminal state (the
  // miswire must land as FAILED with the loud text).
  let status: Record<string, unknown> = {};
  for (let i = 0; i < 100; i++) {
    status = await runs.status(receipt.run_id, sig);
    if (status["status"] !== "queued" && status["status"] !== "running") break;
    await new Promise((r): void => setTimeout(r, 20));
  }
  assert.equal(status["status"], "failed");
  assert.match(String(status["error"]), /no ComfyUIHostService for runsRemote worker/);
  const stages = status["stages"] as { status: string; error?: string }[];
  assert.equal(stages[0]?.status, "failed");
  assert.match(String(stages[0]?.error), /no ComfyUIHostService/);
  // The card-back-into-flow key (2026-09-11): the status names the
  // producing draft — the tab restores through it.
  assert.equal(status["draft_id"], "d_ok");
  // The settle persist: _flow.json sidecar + terminal ledger row.
  const dir = join(root, "test-output", receipt.run_id);
  assert.equal(existsSync(join(dir, "_flow.json")), true, "sidecar written");
  const sidecar = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as { status: string };
  assert.equal(sidecar.status, "failed");
  const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
  assert.match(ledger, /run\.failed/);
  await fiber.dispose();
});

test("status/stop on unknown ids refuse with their codes; a stop receipt answers immediately", async () => {
  const { ctx, runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  const unknown = async (): Promise<string> => {
    try {
      await runs.status("run-nope", sig);
      return "NO-REFUSAL";
    } catch (e) {
      return remoteErrorOf(e)?.code ?? "NOT-REMOTE";
    }
  };
  assert.equal(await unknown(), "runs/unknown-run");
  try {
    await runs.stop("run-nope", sig);
    assert.fail("expected refusal");
  } catch (e) {
    assert.equal(remoteErrorOf(e)?.code, "runs/run-unknown");
    assert.match(remoteErrorOf(e)?.message ?? "", /unknown run_id "run-nope"/);
  }
  // The live-stop receipt, DETERMINISTICALLY: without an engine the
  // pump settles instantly, so the live row is placed straight into
  // the queue core (no kick — the pump never sees it) and stop
  // answers on it, door-verbatim.
  const liveRow = {
    runId: "run-live-0000000000-00000000",
    status: "queued" as const,
    stages: [],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId: "d_ok",
    dir: join(root, "output", "run-live-0000000000-00000000"),
    testFlag: false,
    stopFlag: false,
    params: [],
    outputNodes: [],
    createdAt: Date.now() / 1000,
    pipeline: "flow_inline",
    graphRows: [],
  };
  bootInsertRun(ctx, liveRow);
  const stop = await runs.stop(liveRow.runId, sig);
  assert.deepEqual(stop, { run_id: liveRow.runId, status: "stopping" });
  // terminal-state stop refuses with the door's message (a start
  // that settles without an engine lands failed).
  const receipt = await runs.start(inlineBody("d_ok"), sig);
  let final: Record<string, unknown> = {};
  for (let i = 0; i < 100; i++) {
    final = await runs.status(receipt.run_id, sig);
    if (final["status"] !== "queued" && final["status"] !== "running") break;
    await new Promise((r): void => setTimeout(r, 20));
  }
  assert.equal(final["status"], "failed", "settled without an engine");
  const after = await runs.stop(receipt.run_id, sig);
  assert.deepEqual(after, { error: "cannot stop run in state failed" });
  await fiber.dispose();
});

test("the tools' runs lane grammar rides the seat end-to-end (the un-kill)", async () => {
  const { ctx, fiber, root } = await boot();
  const sig = new AbortController().signal;
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  // 1. the press: POST /v1/flows/start (flow_inline) → receipt.
  const receipt = (await request(
    "POST",
    "/v1/flows/start",
    inlineBody("d_ok"),
    sig,
    15000,
  )) as { run_id: string; status: string; queue_position: number };
  assert.match(receipt.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
  assert.equal(receipt.status, "queued");
  assert.equal(receipt.queue_position, 0);
  // 2. the live row through the lane (settles failed — no engine).
  let row: Record<string, unknown> = {};
  for (let i = 0; i < 100; i++) {
    row = (await request(
      "GET",
      `/v1/flows/status/${receipt.run_id}`,
      undefined,
      sig,
      15000,
    )) as Record<string, unknown>;
    if (row["status"] !== "queued" && row["status"] !== "running") break;
    await new Promise((r): void => setTimeout(r, 20));
  }
  assert.equal(row["status"], "failed");
  assert.match(String(row["error"]), /no ComfyUIHostService for runsRemote worker/);
  // 3. the log tail lane (?include_log).
  const withLog = (await request(
    "GET",
    `/v1/flows/status/${receipt.run_id}?include_log=1`,
    undefined,
    sig,
    15000,
  )) as Record<string, unknown>;
  assert.ok("log_tail" in withLog, "include_log surfaces log_tail");
  // 4. stop through the lane on a terminal run → the door's message.
  const stop = (await request(
    "POST",
    `/v1/flows/stop/${receipt.run_id}`,
    undefined,
    sig,
    15000,
  )) as Record<string, unknown>;
  assert.deepEqual(stop, { error: "cannot stop run in state failed" });
  // 5. QUEUE LANE LAW: a ctx WITHOUT the seat still refuses LOUD
  //    (no fallback absorbs the lane).
  const { Context: BareCtx } = await import(
    '@deepseek-ai/cordis'
  );
  const bare = makeEstateRequest(new BareCtx());
  await assert.rejects(
    () => bare("POST", "/v1/flows/start", inlineBody("d_ok"), sig, 15000),
    /no remote serves POST \/v1\/flows\/start/,
  );
  await fiber.dispose();
  void root;
});

test("runs/list — the restore-port envelope: media-first sort, skip laws, truncation, limit quirks", async () => {
  const { ctx, runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  const out = join(root, "output");
  // run-media: 4 images (cap 3 → truncated marker), draft d_ok, newest.
  mkdirSync(join(out, "run-aaaaaaaaaaaa-00000001"), { recursive: true });
  const runA = join(out, "run-aaaaaaaaaaaa-00000001");
  writeFileSync(
    join(runA, "_flow.json"),
    JSON.stringify({
      status: "completed",
      pipeline: "p_media",
      draft_id: "d_ok",
      seed: 7,
      created_at: 1700000100,
    }),
  );
  for (const n of ["img_1.png", "img_2.png", "img_3.png", "img_4.png"]) {
    writeFileSync(join(runA, n), "x");
  }
  // run-bare: no media, older, orphan draft (cleared, row survives).
  mkdirSync(join(out, "run-bbbbbbbbbbbb-00000002"), { recursive: true });
  writeFileSync(
    join(join(out, "run-bbbbbbbbbbbb-00000002"), "_flow.json"),
    JSON.stringify({
      status: "error",
      pipeline: "p_bare",
      draft_id: "d_gone",
      seed: 1,
      created_at: 1700000000,
    }),
  );
  // run-zombie: sidecar says running → failed (read-time override).
  mkdirSync(join(out, "run-cccccccccccc-00000003"), { recursive: true });
  writeFileSync(
    join(join(out, "run-cccccccccccc-00000003"), "_flow.json"),
    JSON.stringify({ status: "running", pipeline: "p_z", seed: 0, created_at: 1700000050 }),
  );
  // run-hidden: _-pipeline — user-surface law (skipped, counted).
  mkdirSync(join(out, "run-dddddddddddd-00000004"), { recursive: true });
  writeFileSync(
    join(join(out, "run-dddddddddddd-00000004"), "_flow.json"),
    JSON.stringify({ status: "completed", pipeline: "_secret", seed: 0, created_at: 1700000200 }),
  );

  const env = await runs.list("200", sig, true);
  // count keeps ALL FOUR (incl. the skipped _-pipeline run).
  assert.equal(env.count, 4);
  // media-first: run-media leads; hidden run absent (skipped).
  assert.equal(env.runs.length, 3);
  const first = env.runs[0] as Record<string, unknown>;
  assert.equal(first["run_id"], "run-aaaaaaaaaaaa-00000001");
  assert.equal(first["name"], "p_media");
  assert.equal(first["status"], "completed");
  assert.equal(first["seed"], 7);
  assert.equal(first["draft_id"], "d_ok");
  assert.ok(Array.isArray(first["artifacts"]));
  const arts = first["artifacts"] as Record<string, unknown>[];
  assert.equal(arts.length, 4, "3 listed + truncated marker");
  const marker = arts[3] as Record<string, unknown>;
  assert.deepEqual(
    { truncated: marker["truncated"], listed: marker["listed"], total: marker["total"] },
    { truncated: true, listed: 3, total: 4 },
  );
  const a1 = arts[0] as Record<string, unknown>;
  // run-RELATIVE url (the /v1 prefix died with the app).
  assert.equal(a1["url"], "run-aaaaaaaaaaaa-00000001/img_1.png");
  assert.equal(a1["path"], "./output/run-aaaaaaaaaaaa-00000001/img_1.png");
  // bare tier: newest-first within the tier — zombie run (1700000050)
  // before the orphan run (1700000000); zombie → failed; orphan
  // draft cleared (row survives).
  const second = env.runs[1] as Record<string, unknown>;
  assert.equal(second["run_id"], "run-cccccccccccc-00000003");
  assert.equal(second["status"], "failed", "read-time zombie override");
  const third = env.runs[2] as Record<string, unknown>;
  assert.equal(third["run_id"], "run-bbbbbbbbbbbb-00000002");
  assert.equal(third["status"], "failed", "error → failed");
  assert.equal(third["draft_id"], "", "orphan draft cleared");

  // limit quirks: "1_0" parses (py int()); junk refuses with the
  // door's text as the runs face's invalid-request.
  const env10 = await runs.list("1_0", sig, true);
  assert.equal(env10.count, 4);
  await assert.rejects(
    () => runs.list("x", sig, true),
    (e: unknown): boolean => {
      const re = (e as { code?: string }).code;
      return re === "runs/invalid-request";
    },
  );
  try {
    await runs.list("x", sig, true);
    assert.fail("unreachable");
  } catch (e) {
    assert.equal(
      (e as Error).message,
      "limit must be an integer (got 'x')",
    );
  }

  // the lane: GET /v1/flows/runs?limit=2 (raw string rides) and
  // the junk lane refuses the same way.
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  const viaLane = (await request(
    "GET",
    "/v1/flows/runs?limit=2",
    undefined,
    sig,
    15000,
  )) as { count: number; runs: unknown[] };
  assert.equal(viaLane.count, 4);
  // Skip-after-slice (the door's law): limit=2 slices to [media,
  // hidden] and the hidden run STILL skips — 1 row served, count 4.
  assert.equal(viaLane.runs.length, 1);
  await assert.rejects(
    () => request("GET", "/v1/flows/runs?limit=x", undefined, sig, 15000),
    /limit must be an integer \(got 'x'\)/,
  );
  await fiber.dispose();
});

test("runs/validate — the pure compile pipeline, door-verbatim voices", async () => {
  const { ctx, runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  // 1. a valid inline body: two stages, one wired edge — the 200
  //    row (ok, skipped, cost preview, compiled stage faces).
  const ok = (await runs.validate(
    {
      flow_inline: {
        id: "gen_chain",
        description: "",
        stages: [
          { id: "s0", engine: "comfyui", params: { workflow: "w" }, outputs: { default: "image" } },
          { id: "s1", engine: "comfyui", params: {}, inputs: { default: { stage: "s0", output: "default" } }, expected: { default: "image" } },
        ],
      },
    },
    sig,
  )) as Record<string, unknown>;
  assert.equal(ok["ok"], true);
  assert.equal(ok["flow"], "gen_chain");
  const cost = ok["cost"] as Record<string, unknown>;
  assert.equal(cost["queue_depth"], 0);
  assert.equal(cost["eta_queue_s"], null);
  const stages200 = ok["stages"] as Record<string, unknown>[];
  assert.equal(stages200.length, 2);
  assert.equal((stages200[1] as Record<string, unknown>)["id"], "s1");

  // 2. a wire refusal: edge into a stage that lacks the input —
  //    runs/flow-compile, the door's flow.py voice, batch rows.
  try {
    // s0 rides the engine default outputs (default:image) — an edge
    // naming an UNDECLARED output ("nothere") cannot resolve.
    await runs.validate(
      {
        flow_inline: {
          id: "bad_wire",
          stages: [
            { id: "s0", engine: "comfyui", params: {}, outputs: { default: "image" } },
            { id: "s1", engine: "comfyui", params: {}, inputs: { frame: { stage: "s0", output: "nothere" } }, expected: { frame: "image" } },
          ],
        },
      },
      sig,
    );
    assert.fail("expected wire refusal");
  } catch (e) {
    const re = e as { code?: string; message?: string };
    assert.equal(re["code"], "runs/flow-compile");
    assert.match(String(re["message"]), /no output named 'nothere'/);
  }

  // 3. the {model:} arm composes for real now (the card stroke,
  //    pinned by the card-arm test); the {flow:} arm rides the
  //    named-flow shim (REBUILD-13) — unknown names answer the
  //    door's voice.
  try {
    await runs.validate({ flow: "photo-glb" }, sig);
    assert.fail("expected the door refusal");
  } catch (e) {
    assert.equal((e as { code?: string })["code"], "runs/invalid-request");
    assert.match(String((e as Error).message), /no flow at flows\/photo-glb\/flow\.py/);
  }

  // 4. the pin sweep reads the WIRED registry's real pin (the
  //    cardGate wire, 2026-09-13: the arm threads ctx.cardRegistry,
  //    so the sweep sees the estate's 1330-class pin — KSampler
  //    compiles). The refusal voice is pinned with a class no pin
  //    ever carries.
  const pinnedOk = (await runs.validate(
    {
      flow_inline: {
        id: "pinned",
        stages: [
          {
            id: "s0",
            engine: "comfyui",
            params: { workflow: { "1": { class_type: "KSampler" } } },
          },
        ],
      },
    },
    sig,
  )) as { ok?: boolean };
  assert.equal(pinnedOk["ok"], true);
  try {
    await runs.validate(
      {
        flow_inline: {
          id: "pinned",
          stages: [
            {
              id: "s0",
              engine: "comfyui",
              params: { workflow: { "1": { class_type: "NoSuchNodeEver" } } },
            },
          ],
        },
      },
      sig,
    );
    assert.fail("expected pin refusal");
  } catch (e) {
    assert.equal((e as { code?: string })["code"], "runs/workflow-pin");
    assert.match(String((e as Error).message), /NoSuchNodeEver.*not in the pinned object_info/);
  }

  // 5. the lane + the construct caller's compiles flag.
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  const r = (await request(
    "POST",
    "/v1/flows/validate",
    { flow_inline: { id: "c", stages: [{ id: "s0", engine: "comfyui", params: {} }] } },
    sig,
    20000,
  )) as Record<string, unknown>;
  assert.equal(r["ok"], true, "the construct verb's compiles flag");
  await fiber.dispose();
  void root;
});

test("runs {model:} — the card arm: real compose (phase-1/phase-2), voices, registration", async () => {
  const { ctx, runs, adapter, fiber, root } = await boot();
  const sig = new AbortController().signal;

  // 1. the unknown-model refusal (the door's byte voice).
  try {
    await runs.start({ model: "no-such-model", test: true, draft_id: "d_ok" }, sig);
    assert.fail("expected model refusal");
  } catch (e) {
    assert.equal((e as { code?: string })["code"], "runs/invalid-request");
    assert.match(String((e as Error).message), /no model unit for model: no-such-model/);
  }

  // 2. the illegal-id refusal.
  try {
    await runs.start({ model: "NOT_LEGAL", test: true, draft_id: "d_ok" }, sig);
    assert.fail("expected id refusal");
  } catch (e) {
    assert.equal((e as { code?: string })["code"], "runs/invalid-request");
    assert.match(String((e as Error).message), /is not a legal identifier/);
  }

  // 3. the REAL compose: krea-2 over the primed registry — phase-1
  //    + phase-2 + registration + the queued ledger row + sidecars.
  const started = await runs.start(
    { model: "krea-2", test: true, draft_id: "d_ok", params: { prompt: "a red boat on glass water" } },
    sig,
  );
  assert.match(started.run_id, /^run-/);
  assert.equal(started.status, "queued");
  const flowDoc = JSON.parse(
    readFileSync(join(root, "test-output", started.run_id, "_flow.json"), "utf8"),
  ) as Record<string, unknown>;
  // the pump may already settle FAILED (no engine seat in this
  // boot — the loud law the earlier test pins); the registration
  // facts are the identity: pipeline + the composed graph.
  assert.ok(
    flowDoc["status"] === "queued" || flowDoc["status"] === "failed",
  );
  assert.equal(flowDoc["pipeline"], "krea-2");
  const graph = (flowDoc["graph"] as Record<string, unknown>[])[0] as {
    params?: { workflow?: Record<string, unknown> };
  };
  const wf = (graph.params as { workflow?: Record<string, unknown> }).workflow;
  assert.ok(wf !== undefined && Object.keys(wf).length > 0, "the composed graph rides the row");
  const req = JSON.parse(
    readFileSync(join(root, "test-output", started.run_id, "_request.json"), "utf8"),
  ) as Record<string, unknown>;
  assert.equal(req["model"], "krea-2");
  const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
  assert.match(ledger, /run.queued/);
  assert.match(ledger, new RegExp(started.run_id));

  // 4. the validate arm: the same compose, phase-1 voice, the 200 row.
  const v = (await runs.validate(
    { model: "krea-2", test: true, draft_id: "d_ok", params: { prompt: "a red boat" } },
    sig,
  )) as Record<string, unknown>;
  assert.equal(v["ok"], true);
  assert.equal(v["model"], "krea-2");
  assert.equal(v["card"], true);
  assert.deepEqual(v["cost"], { queue_depth: 0, eta_queue_s: null, stages: [] });

  // 5. the validate unknown-model refusal (same voice as start).
  try {
    await runs.validate({ model: "no-such-model" }, sig);
    assert.fail("expected model refusal");
  } catch (e) {
    assert.equal((e as { code?: string })["code"], "runs/invalid-request");
    assert.match(String((e as Error).message), /no model unit/);
  }

  // 6. the lane rides the seat (the estate-drive verb's address).
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  const lane = (await request(
    "POST",
    "/v1/flows/start",
    { model: "krea-2", test: true, draft_id: "d_ok", params: { prompt: "lane leg" } },
    sig,
    20000,
  )) as { run_id: string; status: string };
  assert.match(lane.run_id, /^run-/);
  void adapter;
  await fiber.dispose();
});

test("runs {flow:} — the named-flow shim: live expansion, the door's voices (REBUILD-13)", async () => {
  const { ctx, runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  // 1. unknown names keep the dead door's voice (flowsRun.ts:756 —
  //    the retired address, rendered invalid_request).
  await assert.rejects(
    runs.start({ test: true, draft_id: "d_ok", flow: "no-such-flow" }, sig),
    (e: unknown) => {
      const re = remoteErrorOf(e);
      assert.ok(re, "a RemoteError");
      assert.equal(re.code, "runs/invalid-request");
      assert.equal(re.message, "no flow at flows/no-such-flow/flow.py");
      return true;
    },
  );
  await assert.rejects(
    runs.validate({ flow: "no-such-flow" }, sig),
    (e: unknown) => {
      const re = remoteErrorOf(e);
      assert.ok(re, "a RemoteError");
      assert.equal(re.message, "no flow at flows/no-such-flow/flow.py");
      return true;
    },
  );
  // 2. a single-stage registry flow serves at BOTH arms (the
  //    skill's wire law): validate compiles it through the SAME
  //    inline arm — the wired registry's real pin carries FitRow,
  //    so the compile is ok (the cardGate wire, 2026-09-13; the
  //    old wall pinned the null-registry gap — 0 pinned classes).
  const fitSeat = (await runs.validate({ flow: "fit-seat" }, sig)) as {
    ok?: boolean;
  };
  assert.equal(fitSeat["ok"], true);
  // 3. start on a single-stage flow: expansion rides the inline
  //    pipeline and the run REGISTERS (the pin sweep is the
  //    validate gate; start's engine seam is the pump) — the run
  //    exists, then settles FAILED loud on the missing engine seat
  //    (this wall's own law).
  const started = (await runs.start(
    { flow: "fit-seat", test: true, draft_id: "d_ok" }, sig,
  )) as Record<string, unknown>;
  assert.match(String(started["run_id"]), /^run-/);
  // 4. a MULTI-stage registry flow (character — 7 stages) serves at
  //    validate; start refuses with the preview_scope voice at the
  //    EXISTING single-stage gate (never widened quietly).
  // character (7 stages incl. the z-image builder graph) rides the
  // SAME law at validate: the real pin carries UNETLoader, so the
  // multi-stage compile is ok (structurally legal at validate —
  // the compile reaches the pin through the wired registry).
  const character = (await runs.validate({ flow: "character" }, sig)) as {
    ok?: boolean;
  };
  assert.equal(character["ok"], true);
  await assert.rejects(
    runs.start({ flow: "character", test: true, draft_id: "d_ok" }, sig),
    (e: unknown) => {
      const re = remoteErrorOf(e);
      assert.ok(re, "a RemoteError");
      // the FIRST gate that names an unported shape refuses — for
      // character that is its skip_when branches (the inline
      // pipeline's own voice, never widened quietly).
      assert.match(re.message, /skip_when is unported/);
      return true;
    },
  );
});

test("the compile-time initial gate — both {flow:} doors refuse before registration (REBUILD-21)", async () => {
  const booted = await boot(true);
  const runs = booted.runs as {
    validate(doc: unknown, signal: AbortSignal): Promise<unknown>
    start(doc: unknown, signal: AbortSignal): Promise<unknown>
    list(limit: string, signal: AbortSignal): Promise<unknown>
  };
  const sig = new AbortController().signal;
  // 1. a photo initial that is not on disk refuses at VALIDATE with
  //    the door's text (before any compile).
  const badPhoto = { flow: "character", test: true, draft_id: "d_ok", starter_image: "/no/such/file.png" };
  await assert.rejects(
    () => runs.validate(badPhoto, sig),
    (e: Error & { code?: string }) => /is not on disk/.test(e.message) && e.code === "runs/invalid-request",
  );
  // 2. the same doc refuses at START with the same voice — start
  //    can never queue what validate refuses.
  await assert.rejects(
    () => runs.start(badPhoto, sig),
    (e: Error & { code?: string }) => /is not on disk/.test(e.message) && e.code === "runs/invalid-request",
  );
  // 3. no run registered (the gate fired before registration).
  const list = (await runs.list("500", sig)) as { runs?: unknown[] };
  assert.ok(!JSON.stringify(list).includes("no/such/file.png"), "nothing queued from the refusal");
  // 4. an on-disk photo with a WRONG EXTENSION refuses the stageable
  //    check (the typed media vocab gate).
  const badExt = { flow: "character", test: true, draft_id: "d_ok", starter_image: "docs/CONFORMANCE_LEDGER.md" };
  await assert.rejects(
    () => runs.validate(badExt, sig),
    (e: Error) => /is not a stageable image/.test(e.message),
  );
  // 5. a browser-local blob initial refuses with the upload voice.
  const blob = { flow: "character", test: true, draft_id: "d_ok", starter_image: "blob:http://x/y" };
  await assert.rejects(
    () => runs.validate(blob, sig),
    (e: Error) => /browser-local/.test(e.message),
  );
  // 6. absent initials ride PAST the initial gate (the $channel
  //    arms own them) — fit-seat then COMPILES through the wired
  //    registry's real pin, which PROVES the gate did not fire on
  //    absent initials (the ok, not a refusal, is the proof).
  const fitPastGate = (await runs.validate(
    { flow: "fit-seat", test: true, draft_id: "d_ok" },
    sig,
  )) as { ok?: boolean };
  assert.equal(fitPastGate["ok"], true);
});

test("the remote adapter speaks every registry arm (start/status/list/stop/validate)", async () => {
  const { adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  // start: the same inline body the seat test queues.
  const receipt = await adapter.remoteExportStart(inlineBody("d_ok"), sig);
  assert.match(receipt.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
  // status: the live row, adapter-verbatim.
  const row = await adapter.remoteExportStatus(receipt.run_id, sig);
  assert.ok(["queued", "running", "failed"].includes(String(row["status"])));
  // list: the raw-limit envelope rides the adapter (py int()
  // semantics). The queued run carries test: true — the door's skip
  // law hides it, so the envelope serves 0.
  const env = await adapter.remoteExportList("10", sig);
  assert.equal(env.count, 0);
  assert.equal(env.runs.length, 0);
  // stop: resolves (coverage of the arm) with the door's terminal
  // refusal — the run already settled FAILED, never "stopping".
  const stopped = await adapter.remoteExportStop(receipt.run_id, sig);
  assert.deepEqual(stopped, { error: "cannot stop run in state failed" });
  // validate: the happy compile (200 row), adapter-verbatim.
  const ok = (await adapter.remoteExportValidate(
    {
      flow_inline: {
        id: "gen_chain",
        description: "",
        stages: [
          { id: "s0", engine: "comfyui", params: { workflow: "w" }, outputs: { default: "image" } },
          { id: "s1", engine: "comfyui", params: {}, inputs: { default: { stage: "s0", output: "default" } }, expected: { default: "image" } },
        ],
      },
    },
    sig,
  )) as Record<string, unknown>;
  assert.equal(ok["ok"], true);
  await fiber.dispose();
});
