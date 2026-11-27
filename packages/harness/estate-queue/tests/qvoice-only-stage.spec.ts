// qvoice-only-stage.spec.ts — THE ONE-STAGE QVOICE DOOR (operator
// 2026-11-13, the qwen-tts card dossier): "one add-stage with qvoice
// only, one run. Both doors should accept it; both currently don't."
//
// The two wire defects this wall judges, at the hops the operator's
// burn crosses (add-stage → saved doc → run params → compose door →
// serialized graph):
//   1. the customvoice lane's resolver stamp ('ryan') landed on every
//      stage, so stating a qvoice later met a both-stated body and the
//      card's B2 gate refused; a {voice: null} patch could not hold
//      (JSON-merge-patch deletes the key, the next compile re-stamps).
//   2. a bare persona name rode into the graph verbatim and died
//      engine-side as `preview_voice: no such file: qvoice-01` — the
//      node's load branch reads the input dir or a host path only.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { LifecycleLatch } from "../src/lifecycleLatch.ts";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "../../../engines/comfyui-cordis/src/cardDefs.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFactsRow } from "../src/cardsFacts.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { FlowsSeatService } from "../src/flowsData.ts";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { prepareCardParams } from "../src/cardsCompose.ts";

let svc: CardRegistryService;
let ctx: Context;
let def: CardDefinition;
let facts: Record<string, ModelFactsRow>;
let STATE_ROOT: string;
let ttsFacts: ModelFacts;
const FACTS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "engines", "comfyui-cordis", "data", "model-facts.json");

const BANK = "/mnt/data/models/audio/voices";

beforeAll(async () => {
  ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    lifecycleLatch: new LifecycleLatch(),
    stateRoot: (STATE_ROOT = mkdtempSync(join(tmpdir(), "qvoice-only-"))),
    stateRoots: [STATE_ROOT] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  installLaneStoreOverlay();
  def = (await loadCardDefs()).get("tts")!;
  const loaded = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
  facts = loaded.models as unknown as Record<string, ModelFactsRow>;
  ttsFacts = loaded.models["qwen3-tts"] as unknown as ModelFacts;
}, 120_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

/** The graph face of one composed doc: the studio's own inputs. */
function studioInputs(params: Record<string, unknown>): Record<string, unknown> {
  const g = new GraphBuilder({});
  def.compose(params, ttsFacts, g, "run_qvoice_only");
  const nodes = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
  const studio = Object.values(nodes).find((n) => n.class_type === "AudiocoreVoiceStudio");
  expect(studio, "a qvoice-only doc composes the studio lane").toBeDefined();
  return studio!.inputs;
}

describe("THE ONE-STAGE QVOICE DOOR — add-stage with qvoice only, one run", () => {
  it("DOOR 1 (estate prepare): a fresh qvoice-only body takes NO preset stamp", () => {
    const out = prepareCardParams(svc, { text: "hello there", qvoice: "qvoice-01" }, "qwen3-tts", "1", facts);
    expect(out.fam).toBe("qwen3-tts");
    expect(out.params["voice"], "the customvoice 'ryan' stamp must not land beside a stated persona").toBeUndefined();
    expect(out.params["qvoice"]).toBe("qvoice-01");
  });

  it("DOOR 1 (estate prepare): a PRE-STAMPED saved doc releases the derived preset when a qvoice arrives", () => {
    // the operator's exact order: the stage was compiled once (the
    // stamp landed in the doc), then a qvoice was added. The null
    // patch could not hold — the release is what makes it legal.
    const out = prepareCardParams(svc, {
      model: "qwen3-tts",
      params: { variant: "customvoice", text: "hello there", voice: "ryan", qvoice: "qvoice-01" },
    }, "qwen3-tts", "1", facts);
    expect(out.params["voice"], "the lane's own stamp value is derived currency — it never rides beside a persona").toBeUndefined();
    expect(out.params["qvoice"]).toBe("qvoice-01");
  });

  it("DOOR 2: an AUTHOR-stated preset beside a qvoice is RELEASED — the persona owns the voice (operator 2026-11-27: qvoice works WITH the CustomVoice)", () => {
    // THE OLD LAW REVERSED by the operator's own press: a preset
    // name beside a picked persona is the draft's leftover, never a
    // second voice. The prepared doc keeps the name (the write door
    // does not guess), and the card's compose releases it at the
    // judge so the studio performs the persona alone.
    const out = prepareCardParams(svc, {
      model: "qwen3-tts",
      params: { variant: "customvoice", text: "hello there", voice: "vivian", qvoice: "qvoice-01" },
    }, "qwen3-tts", "1", facts);
    expect(out.params["voice"], "the prepared doc keeps what the author wrote — release is the compose's judge").toBe("vivian");
    const g = new GraphBuilder({});
    def.compose(out.params, ttsFacts, g, "run_both");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const studio = Object.values(graph).find((n) => n.class_type === "AudiocoreVoiceStudio");
    expect(studio, "the persona performs through the studio").toBeDefined();
    expect(studio!.inputs["qvoice_path"]).toBe(BANK + "/qvoice-01.qvoice");
    expect(Object.values(graph).filter((n) => "voice" in n.inputs),
      "the released preset reaches no speaker seat").toEqual([]);
  });

  it("DOOR 2 (the operator press VERBATIM, 2026-11-27): customvoice + stale vivian + a Siren MK2 persona + Seductive composes — no refusal on the pickup path", () => {
    // The lane ledger's second press.refused row, byte for byte:
    // {"model":"qwen3-tts","variant":"customvoice","voice":"vivian",
    //  "qvoice":{"qvoice":"/melite-media/runs/.../Siren%20MK2.qvoice"},
    //  "text":"Hey, how you doing cowboy?","style_instruction":"Seductive "}.
    // THE JOURNEY HOP: the real prepare door, then the real tts card
    // compose over a real GraphBuilder — the graph the engine reads.
    const PERSONA = "/melite-media/runs/run-c77376c132c2-1b9afef8/tts/run-c77376c132c2-1b9afef8_voices_MeliteQVoiceCopy.0_Siren%20MK2.qvoice";
    // the ref is live on the swept tree (the real run's artifact
    // exists; this seat materializes it so the dangling sweep reads
    // the door the operator's press crossed, never a phantom)
    const liveFile = join(svc.stateRoots()[0]!, "output", decodeURIComponent(PERSONA.slice("/melite-media/runs/".length)));
    mkdirSync(dirname(liveFile), { recursive: true });
    writeFileSync(liveFile, "qvoice-wdelta");
    const out = prepareCardParams(svc, {
      model: "qwen3-tts",
      params: {
        variant: "customvoice",
        voice: "vivian",
        qvoice: [{ qvoice: PERSONA, voice_strength: 1 }],
        text: "Hey, how you doing cowboy?",
        style_instruction: "Seductive ",
      },
    }, "qwen3-tts", "1", facts);
    const g = new GraphBuilder({});
    def.compose(out.params, ttsFacts, g, "run_operator_press");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const studio = Object.values(graph).find((n) => n.class_type === "AudiocoreVoiceStudio");
    expect(studio, "the persona performs through the studio").toBeDefined();
    expect(studio!.inputs["qvoice_path"]).toBe(PERSONA);
    expect(studio!.inputs["instruct"], "the CustomVoice instruct rides WITH the persona").toBe("Seductive ");
    expect(Object.values(graph).filter((n) => "voice" in n.inputs),
      "the stale preset is released — the graph names no speaker").toEqual([]);
    expect(Object.values(graph).filter((n) => n.class_type === "AudiocoreTTS"),
      "no preset synth beside the persona").toEqual([]);
  });

  it("DOOR 2 (card compose): the prepared doc composes and the bare name reaches the studio as the bank path", () => {
    const out = prepareCardParams(svc, { text: "hello there", qvoice: "qvoice-01" }, "qwen3-tts", "1", facts);
    const inputs = studioInputs(out.params);
    expect(inputs["qvoice_path"], "the bare name resolves to the voice bank — never the raw string the engine dies on")
      .toBe(BANK + "/qvoice-01.qvoice");
    expect(inputs["voice"], "the studio's clone branch carries no speaker").toBeUndefined();
    expect(inputs["mode"]).toBe("generate");
  });

  it("DOOR 2: the bank path is idempotent — a path already spelled as one rides verbatim", () => {
    const inputs = studioInputs({ text: "hello there", qvoice: BANK + "/qvoice-01.qvoice" });
    expect(inputs["qvoice_path"]).toBe(BANK + "/qvoice-01.qvoice");
  });

  it("DOOR 2: an uploaded input leaf (the .qvoice extension, no dir) still rides verbatim", () => {
    const inputs = studioInputs({ text: "hello there", qvoice: "Cherry.qvoice" });
    expect(inputs["qvoice_path"]).toBe("Cherry.qvoice");
  });
});
