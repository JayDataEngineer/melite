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
import { mkdtempSync } from "node:fs";
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
let ttsFacts: ModelFacts;
const FACTS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "engines", "comfyui-cordis", "data", "model-facts.json");

const BANK = "/mnt/data/models/audio/voices";

beforeAll(async () => {
  ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "qvoice-only-")),
    stateRoots: [] as string[],
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

  it("DOOR 2: an AUTHOR-stated preset beside a qvoice still refuses (ONE voice performs)", () => {
    const out = prepareCardParams(svc, {
      model: "qwen3-tts",
      params: { variant: "customvoice", text: "hello there", voice: "vivian", qvoice: "qvoice-01" },
    }, "qwen3-tts", "1", facts);
    expect(out.params["voice"], "an authored preset is not derived currency — it rides").toBe("vivian");
    expect(() => def.compose(out.params, ttsFacts, new GraphBuilder({}), "run_both")).toThrow(
      /voice.*qvoice|qvoice.*voice/i,
    );
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
