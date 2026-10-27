// music3-decode-tier.spec.ts — THE VRAM-AWARE DECODE TIER AT ESTATE
// DEPTH (audit 014 C3).
//
// @contract models-music-decode-tier
//
// The burn: the official template wires VAEDecodeAudioTiled with a
// hardcoded true while its own model note seats int8_convrot as the
// low-VRAM body — our compose hardcoded the plain decode, so a small
// box OOMs the VAE decode on a long track and no knob could flip it
// without re-composing the lane.
//
// DEPTH over the package spec (packages/models/music3/tests/
// decode-tier.spec.ts, the derivation's own home): this wall reads
// the ENGINE's own bounds for the tiled seats out of the hermetic
// boot fixture (derived from the live census — never a literal), and
// rides the REAL estate door per served address × knob — the decoder
// class is judged where the operator's run press lands it.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/music3-decode-tier.spec.ts
import "../../../helpers/hermetic-engine.ts";
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
// import order matters — boot-models first.
import "../../../helpers/boot-models.ts";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";

let door: CardRegistryService;

beforeAll(async () => {
  const ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "music3-decode-tier-")),
    stateRoots: [] as string[],
  };
  door = new CardRegistryService(ctx);
  await door.prime();
  assertHermeticRode();
  const storeRoot = installLaneStoreOverlay();
  // THE FP16 SEAT (audit 014 C5): the atom's body is provisioned but
  // not yet on this machine's disk — materialized inside the hermetic
  // temp root the overlay's own way (existence only).
  const fp16 = join(storeRoot, "data", "runtime", "comfyui", "models", "diffusion_models", "minimax_music3_dit_fp16.safetensors");
  if (!existsSync(fp16)) {
    mkdirSync(dirname(fp16), { recursive: true });
    writeFileSync(fp16, "");
  }
}, 120_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

type Graph = Record<string, { class_type?: unknown; inputs?: Record<string, unknown> }>;

const decodersOf = (graph: Graph): { plain: number; tiled: number } => {
  const classes = Object.values(graph).map((n) => n.class_type);
  return {
    plain: classes.filter((c) => c === "VAEDecodeAudio").length,
    tiled: classes.filter((c) => c === "VAEDecodeAudioTiled").length,
  };
};

describe("the tiled seats are the engine's own (audit 014 C3)", () => {
  it("the boot fixture's tiled row bounds the template's 1536/64 seats", () => {
    // DERIVED, never a literal: the hermetic boot double carries the
    // live census's own bounds for the tiled node — the template's
    // seats must sit inside them, or the engine build moved under us.
    const fixture = JSON.parse(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), "..", "..", "fixtures", "object_info.boot.json"),
        "utf8",
      ),
    ) as Record<string, { input?: { required?: Record<string, [string, { min?: number; max?: number }]> } }>;
    const tiled = fixture["VAEDecodeAudioTiled"]?.input?.required;
    expect(tiled, "the boot fixture serves the tiled decode class (the C3 bootstrap residue)").toBeDefined();
    const tile = tiled!["tile_size"]?.[1];
    const overlap = tiled!["overlap"]?.[1];
    expect(tile).toBeDefined();
    expect(overlap).toBeDefined();
    expect(1536 >= (tile!.min ?? 0) && 1536 <= (tile!.max ?? 0)).toBe(true);
    expect(64 >= (overlap!.min ?? 0) && 64 <= (overlap!.max ?? 0)).toBe(true);
  });
});

describe("the door serves the derived decoder per address and knob (audit 014 C3)", () => {
  it("family address, unstated short track: plain; stated true: tiled with the template's seats", async () => {
    const base = { model: "music3", prompt: "decode wall", lyrics: "", duration: 30, seed: 4242 };
    const p1 = await door.phase1Card(base, "music3");
    const ran = await door.phase2Card(p1, "music3_decode_plain");
    expect(decodersOf(ran.graph as Graph)).toEqual({ plain: 1, tiled: 0 });
    const q1 = await door.phase1Card({ ...base, tiled_decode: true }, "music3");
    const qran = await door.phase2Card(q1, "music3_decode_stated");
    const qgraph = qran.graph as Graph;
    expect(decodersOf(qgraph)).toEqual({ plain: 0, tiled: 1 });
    const node = Object.values(qgraph).find((n) => n.class_type === "VAEDecodeAudioTiled")!;
    expect({ tile_size: node.inputs!["tile_size"], overlap: node.inputs!["overlap"] }).toEqual({
      tile_size: 1536,
      overlap: 64,
    });
  });

  it("family address, unstated full-length track: tiled; stated false holds plain (the override wins)", async () => {
    const base = { model: "music3", prompt: "decode wall", lyrics: "", duration: 360, seed: 4242 };
    const p1 = await door.phase1Card(base, "music3");
    const ran = await door.phase2Card(p1, "music3_decode_long");
    expect(decodersOf(ran.graph as Graph)).toEqual({ plain: 0, tiled: 1 });
    const q1 = await door.phase1Card({ ...base, tiled_decode: false }, "music3");
    const qran = await door.phase2Card(q1, "music3_decode_held");
    expect(decodersOf(qran.graph as Graph)).toEqual({ plain: 1, tiled: 0 });
  });

  it("low-VRAM address at a short track decodes plain on its auditioned peak (the DECL's own number rules)", async () => {
    // The int8 cell's DECL-declared peak (20 GB) sits above the audit's
    // 16 GB floor — a roomy low-VRAM tier decodes plain at 30 s; the
    // derivation reads the cell's own number, never the box's name.
    const p1 = await door.phase1Card(
      { model: "music3", prompt: "decode wall", lyrics: "", duration: 30, seed: 4242 },
      "music3-int8",
    );
    const ran = await door.phase2Card(p1, "music3_decode_int8");
    expect(decodersOf(ran.graph as Graph)).toEqual({ plain: 1, tiled: 0 });
  });
});
