// tests/coldstart/coldstart.spec.ts — THE COLD-START TIER. A scratch
// ComfyUI core at core.pin, Manager-seeded and nothing else, empty
// model tree, engine spawned by this spec on an ephemeral port. The
// arms prove, in order: the start really was cold; an extension lands
// through Manager's git door and loads; the smallest declared detector
// lands through Manager's model queue at its declared size and digest;
// the 21 consistency-lora provision does the same; and the landed lora
// is ENGINE-VISIBLE in /object_info afterwards. Every download rides
// the estate's own ComfyUiManagerProvider — a hand-rolled fetch here
// is the exact cheating the tier exists to catch.
import assert from "node:assert/strict";
import { afterAll, beforeAll, describe, test } from "vitest";
import {
  bootColdStartWorld,
  censusPackDirs,
  censusWeightFiles,
  declaredRows,
  gitHead,
  killScratchEngine,
  landedPackDir,
  newScratchRoot,
  preflightMisses,
  sha256File,
  sizeOf,
  teardownScratch,
  type ColdStartWorld,
} from "./harness.ts";

const misses = await preflightMisses();

describe.skipIf(misses.length > 0)("the cold-start tier (opt-in)", () => {
  let world: ColdStartWorld;
  let scratchRoot: string;
  let objectInfoBefore: ReadonlySet<string>;

  beforeAll(async () => {
    scratchRoot = newScratchRoot();
    world = await bootColdStartWorld(scratchRoot);
  });

  afterAll(async () => {
    if (world !== undefined) await killScratchEngine(world);
    if (scratchRoot !== undefined && process.env.COLDSTART_KEEP_SCRATCH !== "1") teardownScratch(scratchRoot);
  });

  test("the start is PROVEN cold: zero weights, one pack, tier-owned engine", async () => {
    // the engine answers, and only because this spec spawned it
    const stats = await fetch(world.engine.baseUrl + "/system_stats", { signal: AbortSignal.timeout(10_000) });
    assert.ok(stats.ok, "the scratch engine did not answer /system_stats");
    assert.notEqual(world.engine.port, 8188, "the tier must never touch the live engine's port");
    assert.equal(gitHead(world.engine.coreRoot), world.engine.corePin, "the scratch core is not at core.pin");
    assert.equal(
      gitHead(world.engine.coreRoot + "/custom_nodes/comfyui-manager"),
      world.engine.managerPin,
      "the Manager seed is not at manager.pin",
    );
    // THE MODEL TREE IS EMPTY: the core's shipped placeholders
    // (put_*_here, models/configs/*.yaml) are not weights; anything
    // else already fails this arm before a single provision call.
    assert.deepEqual(
      censusWeightFiles(world.engine.modelsRoot),
      [],
      "the scratch model tree must start with zero weight files",
    );
    // THE PACK TREE IS THE SEED AND NOTHING ELSE
    assert.deepEqual(
      censusPackDirs(world.engine.coreRoot),
      ["comfyui-manager"],
      "ComfyUI-Manager must be the ONLY installed pack at cold start",
    );
    objectInfoBefore = await objectInfoTypeNames(world.engine.baseUrl);
  });

  test("the extension arm: comfyui-impact-pack installs through Manager and loads", async () => {
    const result = await world.service.ensure({ kind: "extension", id: world.extension.name });
    assert.match(result.state, /restart_required|active/, "the extension install did not conclude: " + JSON.stringify(result.items));
    // Manager derives the landed directory from the repo url, not from
    // the declared name — the clone lands as `comfyui-impact-pack`
    // while the manifest names `ComfyUI-Impact-Pack`. The landing is
    // discovered by its pinned HEAD, never assumed by name.
    const landed = landedPackDir(world.engine.coreRoot + "/custom_nodes", world.extension.ref);
    assert.ok(landed !== undefined, "no landed pack at the pinned ref in custom_nodes");
    assert.equal(gitHead(landed), world.extension.ref, "the landed pack HEAD is not the pinned ref");
    // the Manager reboot door restarts the engine; the pack's own
    // node types must appear in /object_info afterwards
    await restartScratchEngine(world);
    const after = await objectInfoTypeNames(world.engine.baseUrl);
    const fresh = [...after].filter((name) => !objectInfoBefore.has(name));
    assert.ok(
      fresh.some((name) => name.startsWith("Impact")),
      "no Impact node type appeared in /object_info after the restart (fresh types: " + fresh.slice(0, 20).join(", ") + ")",
    );
    objectInfoBefore = after;
  });

  test("the model arm: hand_yolov8s.pt lands through Manager at declared size and sha256", async () => {
    const result = await world.service.ensure(
      { kind: "model", owner: "card", id: "image-edit" },
      { items: [world.hand.name] },
    );
    assert.equal(result.state, "active", "the model provision did not go active: " + JSON.stringify(result.items));
    const landed = world.engine.modelsRoot + "/" + world.hand.folder + "/" + world.hand.name;
    assert.equal(sizeOf(landed), world.hand.size_bytes, "the landed detector is not the declared size");
    assert.equal(sha256File(landed), world.hand.sha256, "the landed detector does not match the declared sha256");
  });

  test("the lora arm: the 21 consistency-lora provision lands through Manager at declared size and sha256", async () => {
    const result = await world.service.ensure(
      { kind: "model", owner: "family", id: "qwen-img-edit-21" },
      { items: [world.lora.name] },
    );
    assert.equal(result.state, "active", "the lora provision did not go active: " + JSON.stringify(result.items));
    const landed = world.engine.modelsRoot + "/" + world.lora.folder + "/" + world.lora.name;
    assert.equal(sizeOf(landed), world.lora.size_bytes, "the landed lora is not the declared size");
    assert.equal(sha256File(landed), world.lora.sha256, "the landed lora does not match the declared sha256");
  });

  test("the landed lora is engine-visible: LoraLoader's combo lists it after a restart", async () => {
    await restartScratchEngine(world);
    const info = await fetch(world.engine.baseUrl + "/object_info", { signal: AbortSignal.timeout(120_000) });
    assert.ok(info.ok, "/object_info refused after the restart");
    const doc = asRecord(await info.json());
    assert.ok(doc !== undefined, "/object_info answered a non-object body");
    const loraLoader = asRecord(doc["LoraLoader"]);
    assert.ok(loraLoader !== undefined, "LoraLoader vanished from /object_info");
    const choices = loraChoiceNames(loraLoader);
    const wanted = "qwen-img-edit-21/" + world.lora.name;
    assert.ok(
      choices.includes(wanted),
      "LoraLoader.lora_name does not list the Manager-landed lora (" + wanted + "); saw " + choices.filter((c) => c.includes("qwen-img-edit-21")).join(", "),
    );
  });
});

describe("the cold-start tier skip contract", () => {
  test("when the tier cannot run it names every reason", () => {
    if (misses.length === 0) return; // the tier ran — nothing to name
    console.warn(
      "\n[ Estrada ] the COLDSTART tier skipped — the machine cannot cold-start:\n" +
      misses.map((miss) => "  - " + miss).join("\n") + "\n" +
      "  the tier is opt-in (pnpm run test:coldstart) and never fails soft: fix the named gaps and re-run.\n",
    );
    assert.ok(misses.length > 0);
  });
});

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

async function objectInfoTypeNames(baseUrl: string): Promise<ReadonlySet<string>> {
  const response = await fetch(baseUrl + "/object_info", { signal: AbortSignal.timeout(120_000) });
  assert.ok(response.ok, "/object_info refused");
  const doc = asRecord(await response.json());
  assert.ok(doc !== undefined, "/object_info answered a non-object body");
  return new Set(Object.keys(doc));
}

function loraChoiceNames(loader: Record<string, unknown>): readonly string[] {
  const required = asRecord(asRecord(loader["input"])?.["required"]);
  const entry = required?.["lora_name"];
  if (!Array.isArray(entry) || !Array.isArray(entry[0])) return [];
  return entry[0].filter((choice): choice is string => typeof choice === "string");
}

async function restartScratchEngine(world: ColdStartWorld): Promise<void> {
  try {
    await world.client.post("/manager/reboot", {}, { timeoutMs: 15_000 });
  } catch (error: unknown) {
    if (!(error instanceof Error) || !/fetch failed|aborted|ECONNRESET|socket/i.test(error.message)) throw error;
  }
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(world.engine.baseUrl + "/system_stats", { signal: AbortSignal.timeout(5_000) });
      if (response.ok) return;
    } catch { /* rebooting */ }
    await new Promise((resolve) => { setTimeout(resolve, 1_000); });
  }
  throw new Error("the scratch engine did not come back after /manager/reboot");
}
