// runs-remote.spec.ts — REBUILD-6 wall: the runs plane as a Typert
// remote over the queue seat (start/status/stop, the serial pump,
// the settle persist). Boots the FULL estate glue — timer, queue,
// storage, drafts, runs — over one mkdtemp state root. NO comfyui
// seat on purpose: the pump's engine seam must settle the run
// FAILED with the loud miswire text (never a silent accept).
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from '@deepseek-ai/cordis';
import { RemoteError, remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol';
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
// RunsRuntimeService rides the index only as an un-exported import
// (the runsRegistryPlugin closure news it up) — the type lives at
// its defining file; type-only, erased at runtime.
import type { RunsRuntimeService } from "../../../../packages/harness/estate-queue/src/runsRegistry.ts";
import { notifyRunChanged } from "../../../../packages/harness/estate-queue/src/runsChange.ts";
import { runsRemotePlugin, RunsRemoteService } from '@melite/estate-runs';
import type { RunStartDoc } from '@melite/estate-runs';

interface Booted {
  ctx: Context;
  runs: RunsRuntimeService;
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
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  const fiber = ctx.plugin(queuePlugin as unknown as Plugin, { repoRoot: root });
  await fiber;
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
  await ctx.plugin(cardRegistryProvider as unknown as Plugin);
  await ctx.plugin(runsRegistryPlugin as unknown as Plugin);
  await ctx.plugin(runsRemotePlugin as unknown as Plugin);
  const runs = (ctx as unknown as {
    runs: RunsRuntimeService;
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

/** One inline flow body (single comfyui stage) — pure JSON, so the
 *  adapter's RunStartDoc face accepts it verbatim (the seat's own
 *  start takes unknown and refuses bad envelopes at runtime). */
function inlineBody(draftId: string): RunStartDoc {
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
  assert.equal(await code({ test: "yes", draft_id: "d_ok" }), "runs/bad-envelope");
  assert.equal(await code({ test: true }), "runs/draft-required");
  assert.equal(await code({ test: true, draft_id: "bad/id" }), "runs/draft-malformed");
  assert.equal(await code({ test: true, draft_id: "d_missing" }), "runs/draft-unknown");
  assert.match(await msg({ test: true, draft_id: "d_missing" }), /^unknown draft_id "d_missing"/);
  const retired: RunStartDoc = { test: true, draft_id: "d_ok", flow_inline: inlineBody("d_ok")["flow_inline"], start_from: 2 };
  assert.equal(await code(retired), "runs/invalid-request");
  // The ADAPTER delegates verbatim (the thin remote over the seat):
  // the same refusal through the Typert face.
  try {
    await adapter.remoteExportStart(retired, sig);
    assert.fail("expected refusal through the adapter");
  } catch (e) {
    assert.equal(remoteErrorOf(e)?.code, "runs/invalid-request");
  }
  assert.match(await msg(retired), /retired runner knob\(s\) \[\"start_from\"\]/);
  const amb = { test: true, draft_id: "d_ok", flow: "x", model: "y" };
  assert.equal(await code(amb), "runs/invalid-request");
  assert.match(await msg(amb), /ambiguous request: names \[\"flow\",\"model\"\]/);
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
  // {flow:} unknown names refuse invalid_request (the start-door
  // envelope norm).
  assert.equal(
    await code({ test: true, draft_id: "d_ok", flow: "f" }),
    "runs/invalid-request",
  );
  assert.match(
    await msg({ test: true, draft_id: "d_ok", flow: "f" }),
    /no flow named f in the registry/,
  );
  // compile gates: unknown top key, no engine, non-comfyui
  const badTop = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [], extra: 1 } };
  assert.equal(await code(badTop), "runs/invalid-request");
  assert.match(await msg(badTop), /unknown keys \[\"extra\"\]/);
  const noEngine = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [{ id: "s" }] } };
  assert.equal(await code(noEngine), "runs/invalid-request");
  assert.match(await msg(noEngine), /no engine named/);
  // Stroke 53 (the engine-generics seam): "blender" is an
  // ungrammatical id (grammar refusal, invalid_request); a
  // grammatical-but-unregistered mcp id keeps preview_scope.
  const otherEngine = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [{ id: "s", engine: "blender" }] } };
  assert.equal(await code(otherEngine), "runs/invalid-request");
  assert.match(await msg(otherEngine), /engine ids are 'comfyui' or 'mcp:<server>'/);
  const unregistered = { test: true, draft_id: "d_ok", flow_inline: { id: "f", stages: [{ id: "s", engine: "mcp:blender" }] } };
  assert.equal(await code(unregistered), "runs/preview-scope");
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
    await new Promise((r) => setTimeout(r, 20));
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
  // The in-memory row reaches terminal before the (async) settle
  // persist commits — poll the sidecar, the persist's own commit
  // point, instead of assuming the two are one step. The sidecar
  // now carries 'running' at the CLAIM (the claim persist — the
  // wedge landing's durable 'running' on disk), so the poll waits
  // for a terminal word, never the first non-queued one.
  const dir = join(root, "test-output", receipt.run_id);
  const sidecarPath = join(dir, "_flow.json");
  let sidecar = { status: "queued" };
  for (let i = 0; i < 100; i++) {
    if (existsSync(sidecarPath)) {
      sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as { status: string };
      if (sidecar.status !== "queued" && sidecar.status !== "running") break;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.equal(existsSync(sidecarPath), true, "sidecar written");
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
    await new Promise((r) => setTimeout(r, 20));
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
    await new Promise((r) => setTimeout(r, 20));
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
    /no seat on this lane serves POST \/v1\/flows\/start/,
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
    assert.match(String(re["message"]), /no output named "nothere"/);
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
    assert.match(String((e as Error).message), /no flow named photo-glb in the registry/);
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
    assert.match(String((e as Error).message), /NoSuchNodeEver.*not in the engine's served node set/);
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
      assert.equal(re.message, "no flow named no-such-flow in the registry");
      return true;
    },
  );
  await assert.rejects(
    runs.validate({ flow: "no-such-flow" }, sig),
    (e: unknown) => {
      const re = remoteErrorOf(e);
      assert.ok(re, "a RemoteError");
      assert.equal(re.message, "no flow named no-such-flow in the registry");
      return true;
    },
  );
  // 2. a single-stage registry flow serves at BOTH arms (the
  //    skill's wire law): validate compiles it through the SAME
  //    inline arm — the wired registry's real pin carries this
  //    flow's classes, so the compile is ok (the cardGate wire,
  //    2026-09-13; the old wall pinned the null-registry gap —
  //    0 pinned classes).
  const skinApply = (await runs.validate({ flow: "skin-apply" }, sig)) as {
    ok?: boolean;
  };
  assert.equal(skinApply["ok"], true, "a family verb expands live through the same arm");
  // the fit verb composes when its bone rides (the seam is the
  // flow's required initial, not a kill switch in the action)
  const fitSeat = (await runs.validate({ flow: "fit-seat", bone: "hand_r" }, sig)) as {
    ok?: boolean;
  };
  assert.equal(fitSeat["ok"], true);
  // and START registers the run (validate alone is not the claim):
  // the door extracts the text initial, composes the verb, and the
  // run exists before the pump settles it.
  const bodyFile = join(tmpdir(), "fit-seat-body-" + Date.now() + ".glb");
  const propFile = join(tmpdir(), "fit-seat-prop-" + Date.now() + ".glb");
  writeFileSync(bodyFile, "glb");
  writeFileSync(propFile, "glb");
  try {
    const fitStarted = (await runs.start(
      { flow: "fit-seat", test: true, draft_id: "d_ok", bone: "hand_r",
        body: bodyFile, prop: propFile },
      sig,
    )) as Record<string, unknown>;
    assert.match(String(fitStarted["run_id"]), /^run-/);
  } finally {
    rmSync(bodyFile, { force: true });
    rmSync(propFile, { force: true });
  }
  // 3. start on a single-stage flow: expansion rides the inline
  //    pipeline and the run REGISTERS (the pin sweep is the
  //    validate gate; start's engine seam is the pump) — the run
  //    exists, then settles FAILED loud on the missing engine seat
  //    (this wall's own law).
  const started = (await runs.start(
    { flow: "skin-apply", test: true, draft_id: "d_ok" }, sig,
  )) as Record<string, unknown>;
  assert.match(String(started["run_id"]), /^run-/);
  // 4. a MULTI-stage registry flow (character — 7 stages incl. the
  //    z-image builder graph) serves at validate: the real pin
  //    carries its classes, so the multi-stage compile is ok. The
  //    door's own required initial rides the request — a bone the
  //    verb needs, carried as a text initial.
  const character = (await runs.validate({ flow: "character", bone: "hand_r" }, sig)) as {
    ok?: boolean;
  };
  assert.equal(character["ok"], true);
  await assert.rejects(
    runs.start({ flow: "character", test: true, draft_id: "d_ok", bone: "hand_r" }, sig),
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
  const badPhoto = { flow: "skin-apply", test: true, draft_id: "d_ok", body: "/no/such/file.glb" };
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
  // THE DISK IS THE ORACLE (the walls audit's H1, 2026-10-10): the
  // list rows surface only sidecar fields, so the old arm — scanning
  // the LIST for the refused path — passed even when start()
  // registered the run BEFORE the gate refused (both refused arms
  // stayed red-correct and the arm stayed green). The refused doc
  // carries test:true, and this wall's runs land under
  // test-output/ (which list() never scans), so the honest check
  // reads BOTH output roots on disk.
  const { readdirSync: rd, existsSync: ex } = await import("node:fs");
  const runRoots = [join(booted.root, "output"), join(booted.root, "test-output")];
  const registered = runRoots.flatMap((r) => (ex(r) ? rd(r) : []))
    .filter((name) => name.startsWith("run-"));
  assert.deepEqual(registered, [],
    `the refusal registered no run (found ${registered.join(", ") || "none"})`);
  const list = (await runs.list("500", sig)) as { runs?: unknown[] };
  assert.ok(!JSON.stringify(list).includes("no/such/file.png"), "and the list carries no trace of it");
  // 4. an on-disk file with a WRONG EXTENSION refuses the stageable
  //    check (the typed media vocab gate) — the body initial is a
  //    MESH, so the voice names a mesh.
  const badExt = { flow: "skin-apply", test: true, draft_id: "d_ok", body: "dev_docs/CONFORMANCE_LEDGER.md" };
  await assert.rejects(
    () => runs.validate(badExt, sig),
    (e: Error) => /is not a stageable mesh/.test(e.message),
  );
  // 5. a browser-local blob initial refuses with the upload voice.
  const blob = { flow: "skin-apply", test: true, draft_id: "d_ok", body: "blob:http://x/y" };
  await assert.rejects(
    () => runs.validate(blob, sig),
    (e: Error) => /browser-local/.test(e.message),
  );
  // 5b. a REQUIRED initial refuses AT THE DOOR, by name — the fit
  //     verb's bone: the vendor refuses an empty one, so a request
  //     without it learns that here, not at the engine.
  await assert.rejects(
    () => runs.validate({ flow: "fit-seat" }, sig),
    (e: unknown) => /"bone" is REQUIRED by the "fit-seat" flow/.test(remoteErrorOf(e)?.message ?? String(e)),
  );
  // 6. absent OPTIONAL initials ride PAST the initial gate (the $channel
  //    arms own them) — skin-apply then COMPILES through the wired
  //    registry's real pin, which PROVES the gate did not fire on
  //    absent initials (the ok, not a refusal, is the proof).
  const skinPastGate = (await runs.validate(
    { flow: "skin-apply", test: true, draft_id: "d_ok" },
    sig,
  )) as { ok?: boolean };
  assert.equal(skinPastGate["ok"], true);
});

test("the remote adapter speaks every registry arm (start/status/list/stop/validate)", async () => {
  const { adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  // start: the same inline body the seat test queues.
  const receipt = await adapter.remoteExportStart(inlineBody("d_ok"), sig);
  assert.match(receipt.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
  // status: the live row, adapter-verbatim.
  // F-L5 (the wall audit, 2026-09-28): the pin listed three of the
  // five statuses the run vocabulary declares ("completed" and
  // "stopped" sat outside the list), so it was a near-tautology —
  // it passed for any transient reading and could not tell "the row
  // is a live status" from "the row settled and nobody looked". The
  // arm now POLLS TO TERMINAL: it watches the row until it reaches a
  // terminal status (bounded), which is the fact the arm wanted.
  const terminal = new Set<string>(["completed", "failed", "stopped", "error"]);
  let seen: string | undefined;
  const deadline = Date.now() + 30_000;
  for (;;) {
    const row = await adapter.remoteExportStatus(receipt.run_id, sig);
    seen = String(row["status"]);
    if (terminal.has(seen)) break;
    if (Date.now() > deadline) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(seen !== undefined && terminal.has(seen),
    `the run reached a TERMINAL status (the vocabulary's own set), not a transient reading (saw ${String(seen)})`);
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

// THE WHOLE-BENCH RUN (the operator's live refusal, 2026-09-28:
// "compose-door: unknown param(s) on the image-gen card: card" —
// Run ALL was broken on the shipped lane). The bench run composes
// each card stage with `{ ...params, card }` (runsRegistry.ts:516),
// and `card` was in no envelope list, so the row's own coordinate
// rode the card's knob bag and the admission gate refused the
// operator's own Run press with a key the door had just added
// ITSELF.
//
// WHY NO WALL CAUGHT IT: every phase1Card test hands the door a
// body it built itself — the path that INJECTS the coordinate (the
// whole-bench run) was never driven. This arm drives it: a two-stage
// WIRED bench (the only bench shape that takes the composed-run
// path), through the real start door, and the composition must land.
test("the whole-bench run composes every card stage (the row's own coordinates never ride a card)", { timeout: 60_000 }, async () => {
  const { runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  // a bench with a cross-stage wire: s_1 takes s_0's image. The
  // wire is what routes the door through composeBenchStages — the
  // path that injects `card`.
  const bench = {
    draft_id: "d_ok",
    status: "draft",
    createdAt: 1700000000000,
    completedAt: null,
    intent: "bench run",
    stages: [
      { id: "s_0", card: "image-gen", params: { model: "krea-2", prompt: "a red boat" } },
      {
        id: "s_1",
        card: "image-gen",
        params: { model: "krea-2", prompt: "the same boat, closer" },
        inputs: { image1: { stage: "s_0", output: "default" } },
      },
    ],
  };
  const stateRoot = process.env["MELITE_STATE_ROOT"] as string;
  writeFileSync(join(stateRoot, "drafts", "d_ok.json"), JSON.stringify(bench));
  let refusal = "";
  let runId: string | null = null;
  try {
    // the model DOOR with a wired bench IS the bench run (the
    // door's own rule: "a bench with wires is a flow, whatever the
    // caller named") — this is the shape the operator's Run ALL sends
    const receipt = await runs.start({ model: "krea-2", test: true, draft_id: "d_ok" }, sig);
    runId = receipt.run_id;
  } catch (e) {
    refusal = String((e as Error).message);
  }
  // THE COMPOSE is this arm's subject. A LATER refusal (this rig has
  // no engine seat, so the run's declared source file does not exist
  // and the run refuses sourceless) is not the compose's business —
  // but the card-admission refusal IS, and that is the operator's.
  assert.doesNotMatch(
    refusal,
    /unknown param\(s\)/,
    `the whole-bench run composes — the operator's Run ALL must not be refused by the card's own admission gate: ${refusal}`,
  );
  // THE FORWARD REFERENCE IS THE RUN (the operator's second live
  // refusal, 2026-09-28: "run sources resolve nowhere (1 dead:
  // run-65dc3ee505ef-e6739954/gen)"). Every composed graph carries
  // its own `${runId}/gen` output prefix, and the run mints its id
  // ONCE — the bench-run path minted it twice (once to compose,
  // once to register), so every forward reference named a run that
  // was never created and the resolver, rightly, called them dead.
  //
  // The law, driven: a refused run may NOT be refused for a dead
  // source naming a run that does not exist. The self-chain
  // exemption covers a run's OWN outputs; anything else naming an
  // unknown run is a genuinely missing upstream, which is a
  // different door with a different voice. Here, the bench stages
  // declare no outside sources at all, so a dead-source refusal
  // means the id the graph was composed with is not the id the run
  // registered under.
  if (refusal !== "") {
    assert.doesNotMatch(refusal, /sources resolve nowhere/,
      `a bench run with no outside sources must never die of a dead one — ` +
      `that means the graph was composed under a DIFFERENT run id than the run registered ` +
      `(the forward references name a run that was never created): ${refusal}`);
  }
  assert.ok(runId !== null || refusal !== "",
    "the bench run got as far as registering a run id (or refused for a named reason)");
  // and when it DID register, its own forward references resolve:
  // the run dir exists and the graph's own `${runId}/gen` prefix is
  // exempt, never dead.
  if (runId !== null) {
    const dir = join(root, "test-output", runId);
    assert.ok(existsSync(dir), `the registered bench run has its own run dir (${dir})`);
  }
  await fiber.dispose();
});

test("the run id is minted ONCE: a composed graph's forward references name the run that registers", { timeout: 60_000 }, async () => {
  // The deterministic half. The bench run composes its stages with a
  // run id and registers the run with one; if they differ, every
  // `${runId}/gen` in the graph is a reference to a run that does
  // not exist. This arm reads the two mint sites in the source and
  // requires ONE `newRunId()` in the start path — the pin that makes
  // the double mint impossible to reintroduce, because a second mint
  // is a second id and a second id is this exact operator refusal.
  const src = readFileSync(
    join(import.meta.dirname, "..", "..", "..", "..", "packages", "harness", "estate-queue", "src", "runsRegistry.ts"),
    "utf8",
  );
  const start = src.slice(src.indexOf("async start("), src.indexOf("async status(") > 0 ? src.indexOf("async status(") : src.length);
  const mints = [...start.matchAll(/newRunId\(\)/g)].length;
  assert.equal(mints, 1,
    `the start path mints the run id exactly ONCE (found ${String(mints)} call sites) — ` +
    "a second mint composes the graph under one id and registers the run under another, " +
    "so every forward reference names a run that was never created");
  // and the id is composed into the same value the run registers
  // the branded declaration (B7): the reuse seam or the mint, never a
  // second value — and the value is the RunId the row carries
  assert.match(start, /const runId: RunId = reuse\?\.runId \?\? newRunId\(\)/,
    "the one mint IS the run's id (the reuse seam or the mint, never a second value)");
  assert.doesNotMatch(start, /const runIdSeed|runIdSeed\s*[,;]/,
    "the retired second mint is gone — one id, one derivation");
});

test("every coordinate the bench run injects is an ENVELOPE key (the same law, without the engine)", async () => {
  // The deterministic half of the regression above: the bench run
  // composes each stage as `{ ...params, card }`, and the card's
  // admission gate must see the KNOBS only. A row coordinate riding
  // the knob bag is the operator's refusal, so the envelope carries
  // the CONTRACT's wire stage keys by derivation — a new stage key
  // is filtered without anyone remembering to add it here.
  const { CARD_ENVELOPE_KEYS } = await import("../../../../packages/harness/estate-queue/src/cardsRegistry.ts");
  const { WIRE_STAGE_KEYS } = await import("../../../../packages/web-kit/contracts/src/benchStage.ts");
  // `params` is the one wire key that is NOT an envelope key, and the
  // exception is deliberate: it is the knob CONTAINER the stanza law
  // unwraps, so filtering it would drop every knob a caller sent.
  const missing = WIRE_STAGE_KEYS.filter((k) => k !== "params" && !CARD_ENVELOPE_KEYS.includes(k));
  assert.deepEqual(missing, [],
    `every wire stage coordinate is an envelope key (a coordinate that rides the knob bag refuses the operator's run: ${missing.join(", ")})`);
  assert.ok(CARD_ENVELOPE_KEYS.includes("card"),
    "the card id itself is an envelope key — the door's own injection must not become a knob");
  // and the injection the bench run performs is envelope-only: a
  // body carrying the row's own coordinates composes its knobs
  // `model` is a DOOR key (it selects the family) and `params` is the
  // container the stanza law unwraps — neither is a knob that rides.
  const knobs = { prompt: "a red boat" };
  const body = { ...knobs, ...Object.fromEntries(
    WIRE_STAGE_KEYS.map((k) => [k, k === "card" ? "image-gen" : k === "id" ? "s_0" : undefined]),
  ) };
  const lifted = Object.fromEntries(Object.entries(body)
    .filter(([k]) => !CARD_ENVELOPE_KEYS.includes(k) && body[k] !== undefined));
  assert.deepEqual(lifted, knobs,
    "a body carrying every row coordinate lifts to its KNOBS only — nothing else reaches a card");
  // and the stanza still rides: `params` is the CONTAINER, and its
  // keys are the knobs (the unwrap the exception above protects)
  const withStanza = { ...body, params: { prompt: "a red boat", steps: 30 } };
  const liftedStanza = Object.fromEntries(Object.entries(withStanza)
    .filter(([k]) => !CARD_ENVELOPE_KEYS.includes(k))
    .flatMap(([k, v]) => (k === "params" && typeof v === "object" && v !== null ? Object.entries(v as Record<string, unknown>) : [[k, v]])));
  assert.deepEqual(liftedStanza, { prompt: "a red boat", steps: 30 },
    "the params stanza still unwraps into the card's knobs (the container is not a knob, and filtering it would drop the whole body)");
});

test("a bench-composed run carries its OWN snapshot (restore never falls back to the living bench)", { timeout: 60_000 }, async () => {
  // The adversarial verification found the staleness the snapshot law
  // exists to kill: the card arm stamped cardSnapshot + benchSnapshot,
  // and the bench-run door passed NEITHER — so Run ALL registered a
  // run whose "restore the workflow that made this" re-read the
  // mutable bench draft, which has moved on by then.
  const { runs, fiber, root } = await boot();
  const sig = new AbortController().signal;
  const bench = {
    draft_id: "d_ok",
    status: "draft",
    createdAt: 1700000000000,
    completedAt: null,
    intent: "snapshot law",
    stages: [
      { id: "s_0", card: "image-gen", params: { model: "krea-2", prompt: "a red boat" } },
      { id: "s_1", card: "image-gen", params: { model: "krea-2", prompt: "closer" }, inputs: { image1: { stage: "s_0", output: "default" } } },
    ],
  };
  const stateRoot = process.env["MELITE_STATE_ROOT"] as string;
  writeFileSync(join(stateRoot, "drafts", "d_ok.json"), JSON.stringify(bench));
  let runId: string | null = null;
  try {
    runId = (await runs.start({ model: "krea-2", test: true, draft_id: "d_ok" }, sig)).run_id;
  } catch {
    // the rig has no engine: the sourceless refusal is the honest
    // verdict and it happens AFTER registration, so the run dir and
    // its snapshot are already on disk either way
  }
  const runsRoot = join(root, "test-output");
  const dirs = existsSync(runsRoot) ? readdirSync(runsRoot).filter((d) => d.startsWith("run-")) : [];
  const dir = runId ?? dirs[0];
  assert.ok(dir !== undefined, "the bench run registered (a run dir exists)");
  const flowPath = join(runsRoot, dir as string, "_flow.json");
  assert.ok(existsSync(flowPath), "the bench run wrote its sidecar");
  const flow = JSON.parse(readFileSync(flowPath, "utf8")) as {
    bench_snapshot?: { stages?: unknown[] };
    stages?: Array<{ id?: string }>;
  };
  assert.ok(Array.isArray(flow.bench_snapshot?.stages) && flow.bench_snapshot!.stages!.length === 2,
    `the run carries the bench it was composed from (saw ${String(flow.bench_snapshot?.stages?.length ?? "none")} stages) — ` +
    "a bench run with no snapshot restores from the LIVING bench, which is the staleness the law forbids");
  await fiber.dispose();
});

// ── runs/subscribe (1.8: the push source for the live row) ─────────
// The fake-this arms drive the generator straight off the prototype
// (the bench stream's own test law, estate/drafts
// tests/remote.spec.ts "zero-state and rethrow arms"): a hand seat
// decides what the status read answers and which run ids the change
// events carry — every watch arm without a boot. The last arm rides
// the REAL seat end-to-end.

type SeatScriptStep = { err?: unknown; row?: Record<string, unknown> };

function subscribeWithSeat(
  script: SeatScriptStep[],
  signal: AbortSignal,
): {
  gen: AsyncGenerator<Record<string, unknown>>;
  wakes: Array<(runId: string) => void>;
  calls: () => number;
} {
  const wakes: Array<(runId: string) => void> = [];
  let calls = 0;
  const fake = {
    ctx: {
      runs: {
        status: async (): Promise<Record<string, unknown>> => {
          calls += 1;
          const step = script[Math.min(calls - 1, script.length - 1)] ?? {};
          if (step.err !== undefined) throw step.err;
          return step.row ?? { run_id: "run-1", status: "running", stages: [] };
        },
        onRunChange: (fn: (runId: string) => void): (() => void) => {
          wakes.push(fn);
          return () => {
            const i = wakes.indexOf(fn);
            if (i >= 0) wakes.splice(i, 1);
          };
        },
      },
    },
  };
  const gen = RunsRemoteService.prototype.subscribe.call(
    fake as never,
    "run-1",
    signal,
  ) as AsyncGenerator<Record<string, unknown>>;
  return { gen, wakes, calls: () => calls };
}

const tick = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

test("runs/subscribe yields the row on open, a matching wake re-reads, abort ends clean", async () => {
  const controller = new AbortController();
  const { gen, wakes } = subscribeWithSeat([
    { row: { run_id: "run-1", status: "running", stages: [] } },
    { row: { run_id: "run-1", status: "failed", stages: [], error: "boom" } },
  ], controller.signal);
  const first = await gen.next();
  assert.equal(first.done, false);
  assert.deepEqual(first.value, { run_id: "run-1", status: "running", stages: [] });
  // parked: the wake resolves the park, the re-read serves the moved row
  const secondP = gen.next();
  await tick(25);
  wakes[0]("run-1");
  const second = await secondP;
  assert.equal(second.done, false);
  assert.deepEqual(second.value, { run_id: "run-1", status: "failed", stages: [], error: "boom" });
  // An abort that lands while suspended AT the yield has no listener
  // attached — the next resume parks with an already-aborted signal
  // (the pre-check arm) and ends done: never a hang, never a lost
  // row, never a second listener.
  controller.abort();
  const last = await gen.next();
  assert.equal(last.done, true);
});

test("an unknown-run open parks (the zero-state watch); a foreign run's wake never wakes it", async () => {
  const controller = new AbortController();
  const { gen, wakes } = subscribeWithSeat([
    { err: new RemoteError("runs/unknown-run", 'unknown run_id "run-1"', { runId: "run-1" }) },
    { row: { run_id: "run-1", status: "queued", stages: [] } },
  ], controller.signal);
  let settled = false;
  const firstP = gen.next();
  void firstP.then(() => { settled = true; }, () => { settled = true; });
  await tick(25);
  // PARKED, not served and not thrown: a rejected open is TERMINAL
  // at the gateway, so the watch degrades to a park (a start racing
  // the open, a boot replay re-birthing the row).
  assert.equal(settled, false);
  wakes[0]("run-other");
  await tick(25);
  // the mismatch arm: a foreign id never wakes the watch
  assert.equal(settled, false);
  wakes[0]("run-1");
  const first = await firstP;
  assert.equal(first.done, false);
  assert.deepEqual(first.value, { run_id: "run-1", status: "queued", stages: [] });
  controller.abort();
  assert.equal((await gen.next()).done, true);
});

test("a non-unknown RemoteError rethrows (never degrades to a park)", async () => {
  const { gen } = subscribeWithSeat(
    [{ err: new RemoteError("gateway/internal", "seat boom", {}) }],
    new AbortController().signal,
  );
  await assert.rejects(gen.next(), /seat boom/);
});

test("a foreign throw (not a RemoteError at all) rethrows untouched", async () => {
  const { gen } = subscribeWithSeat(
    [{ err: new Error("seat boom") }],
    new AbortController().signal,
  );
  await assert.rejects(gen.next(), /seat boom/);
});

test("an aborted signal refuses before the open (the status arm never runs)", async () => {
  const { gen, calls } = subscribeWithSeat(
    [{ row: { run_id: "run-1", status: "running", stages: [] } }],
    AbortSignal.abort(),
  );
  await assert.rejects(gen.next());
  assert.equal(calls(), 0);
});

test("runs/subscribe pushes the live row end-to-end over the REAL seat (the poll is dead)", async () => {
  const { runs, adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  const receipt = await runs.start(inlineBody("d_ok"), sig);
  const controller = new AbortController();
  const it = RunsRemoteService.prototype.subscribe.call(
    adapter as never,
    receipt.run_id,
    controller.signal,
  ) as AsyncGenerator<Record<string, unknown>>;
  const seen: Array<Record<string, unknown>> = [];
  const deadline = Date.now() + 10_000;
  for (;;) {
    if (Date.now() > deadline) break;
    const won = await Promise.race([
      it.next().then((r) => ({ r })),
      tick(200).then(() => "quiet" as const),
    ]);
    if (won === "quiet") break; // the park holds — no further movement
    if (won.r.done === true) break;
    seen.push(won.r.value);
    if (won.r.value["status"] === "failed") break;
  }
  controller.abort();
  assert.equal((await it.next()).done, true);
  const last = seen.at(-1);
  assert.ok(last !== undefined, "the stream served the settled row");
  assert.equal(last["status"], "failed");
  assert.match(String(last["error"]), /no ComfyUIHostService/);
  await fiber.dispose();
});

test("a park ended by ABORT finishes the park and returns (the abort listener arm)", async () => {
  // The unknown-run park's second exit: not a runs.changed wake but
  // the holder's own abort — the park's abort listener finishes it,
  // and the post-park signal check returns without another read.
  const controller = new AbortController();
  const { gen, wakes, calls } = subscribeWithSeat(
    [{ err: new RemoteError("runs/unknown-run", 'unknown run_id "run-1"', { runId: "run-1" }) }],
    controller.signal,
  );
  const opened = gen.next();
  await tick(2); // parked on the refusal (the wake + abort listener seated)
  assert.equal(wakes.length, 1);
  controller.abort(); // the abort listener finishes the park
  assert.equal((await opened).done, true);
  assert.equal(calls(), 1); // the re-read never ran
});

test("the runtime service's onRunChange seats the seam (the service wiring, not a second bus)", async () => {
  const { runs, fiber } = await boot();
  try {
    const seen: string[] = [];
    const off = runs.onRunChange((runId) => { seen.push(runId); });
    notifyRunChanged("run-z");
    off();
    notifyRunChanged("run-z");
    assert.deepEqual(seen, ["run-z"]);
  } finally {
    await fiber.dispose();
  }
});
