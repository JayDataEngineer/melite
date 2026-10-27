// music3-step-tier.spec.ts — THE STEP↔CHECKPOINT TIER AT ESTATE DEPTH
// (audit 014 C4).
//
// @contract models-music-step-tier
//
// The burn: the official template marries each checkpoint to its step
// count — full-schedule bodies (fp16, int8_convrot) sample 30, and a
// distilled body is the ONLY tier allowed below 30. A divergent
// pairing composes today and lets the engine answer with garbage
// while every suite stays green.
//
// DEPTH over the package spec (packages/models/music3/tests/
// step-tier.spec.ts, the derivation's own home): this wall reads the
// BOOTED registry's DECL (the same row the run door dispatches —
// never the imported module), derives the roster over the REAL
// variant cells (no hand list), and rides the REAL estate door
// (phase1Card+phase2Card) per served address — the tier is judged
// where the operator's run press lands it, not where it is authored.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/music3-step-tier.spec.ts
import "../../../helpers/hermetic-engine.ts";
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
// import order matters — boot-models first.
import "../../../helpers/boot-models.ts";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import {
  getModel,
  registryIds,
  registryModel,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { MUSIC3_FULL_STEPS, music3StepTier } from "@melite/models-music3";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let door: CardRegistryService;
let music3: ModelFacts;

beforeAll(async () => {
  music3 = facts.models.music3!;
  expect(music3).toBeDefined();
  const ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "music3-step-tier-")),
    stateRoots: [] as string[],
  };
  door = new CardRegistryService(ctx);
  await door.prime();
  assertHermeticRode();
  const storeRoot = installLaneStoreOverlay();
  // THE FP16 SEAT (audit 014 C5): the atom's body is provisioned but
  // not yet on this machine's disk — the overlay mirrors the store,
  // so the hermetic temp root materializes the provisioned row the
  // overlay's own way (existence only; no run loads these bytes).
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

const stepsOf = (graph: Graph): unknown =>
  Object.values(graph).find((n) => n.class_type === "KSampler")!.inputs!["steps"];

describe("the served tier stamps match the served checkpoints (audit 014 C4)", () => {
  it("the booted DECL's every offered cell pairs its tier stamps to its own load", () => {
    // THE DERIVED ROSTER: the booted registry's music3 row (the run
    // door's own read), every offered Variant row, every offered cell
    // — the unet folded the resolver's way (cell ∪ variant ∪ atom),
    // the tier derived from that filename, the stamps judged against
    // the tier. A distilled row landing without its bound reds here.
    const decl = getModel("music3") as unknown as {
      lane_inputs?: Record<string, unknown>;
      variants?: Array<{
        id: string;
        group: string;
        hide_from_dropdown?: boolean;
        lane_inputs?: Record<string, unknown>;
        sampler_envelope?: { steps?: readonly number[] };
        resolver_defaults?: Record<string, unknown>;
        cells?: Array<{
          quant?: string;
          hide_from_dropdown?: boolean;
          lane_inputs?: Record<string, unknown>;
        }>;
      }>;
    };
    const offered = (decl.variants ?? []).filter((v) => v.group === "Variant" && !v.hide_from_dropdown);
    expect(offered.length).toBeGreaterThan(0);
    for (const v of offered) {
      const cells = (v.cells ?? []).filter((c) => !c.hide_from_dropdown);
      expect(cells.length, `variant '${v.id}': the tier wall needs a served cell`).toBeGreaterThan(0);
      for (const c of cells) {
        const unet = (
          c.lane_inputs?.["unet"] ?? v.lane_inputs?.["unet"] ?? decl.lane_inputs?.["unet"]
        ) as string;
        const tier = music3StepTier(unet);
        expect(v.sampler_envelope?.steps, `variant '${v.id}' cell '${String(c.quant)}' (${unet}): the envelope span IS the tier domain`).toEqual([tier.min, tier.max]);
        expect(v.resolver_defaults?.["n_diffusion_steps"], `variant '${v.id}' cell '${String(c.quant)}' (${unet}): the resolver default IS the tier default`).toBe(tier.default);
      }
    }
  });

  it("the door serves the tier default unstated and the ceiling stated, at the family address", async () => {
    const base = { model: "music3", prompt: "tier wall", lyrics: "", duration: 30, seed: 4242 };
    const p1 = await door.phase1Card(base, "music3");
    const ran = await door.phase2Card(p1, "music3_step_tier_default");
    expect(stepsOf(ran.graph as Graph)).toBe(MUSIC3_FULL_STEPS.default);
    const q1 = await door.phase1Card({ ...base, n_diffusion_steps: 200 }, "music3");
    const qran = await door.phase2Card(q1, "music3_step_tier_ceiling");
    expect(stepsOf(qran.graph as Graph)).toBe(200);
  });

  it("the door refuses a below-tier stamp loud, naming the pairing", async () => {
    await expect(
      door.phase1Card(
        { model: "music3", prompt: "tier wall", lyrics: "", duration: 30, n_diffusion_steps: 20, seed: 4242 },
        "music3",
      ),
    ).rejects.toThrow(/n_diffusion_steps 20 is outside the full tier's \[30, 200\] window/);
  });
});
