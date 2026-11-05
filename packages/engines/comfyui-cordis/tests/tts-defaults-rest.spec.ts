// @contract cards-tts-defaults-rest
// tts-defaults-rest.spec.ts — THE DEFAULTS MERGE IS THE LANE'S REST,
// NEVER A STATED PRESET (qa8 F31).
//
// THE BURN: CustomVoice refused `qvoice` while the lane's DEFAULT
// preset counted as fired — "params 'voice' and 'qvoice' fire
// together" — for a caller who NEVER stated `voice`. The engine
// service's defaults merge (service.compose: model.defaults spread
// over the doc before def.compose) wrote `voice: "ryan"` into every
// doc, and the card's exclusivity judges read the fill as the
// caller's word. The doc cure (aeedff573) only taught the
// workaround (`voice: null`); the law is judge-side: a value equal
// to `model.defaults.voice` is the lane's rest — indistinguishable
// from the compile's own write — and never a stated preset.
//
// THE LAW at the real service door: a qvoice-only doc composes
// clean; the fresh press still rests on the lane's real speaker
// (the no-default-voice law, unchanged); an explicit NON-rest
// preset beside a .qvoice still refuses with the B2 voice.
// Spec-side facts resolve through the REAL registry rows
// (getModel/registryModel) — the same defaults the merge spreads.
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService } from "../src/service.ts";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
import { loadCardDefs } from "../src/cardDefs.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel, cascadeInit } from "../src/models/models.ts";

await cascadeInit();

const here = dirname(fileURLToPath(import.meta.url));
const factsDoc = loadFacts(
  join(here, "..", "data", "model-facts.json"),
  { getModel, registryIds, registryModel },
);
const defs: Map<string, CardDefinition> = await loadCardDefs();

const boot = async (): Promise<ComfyUIService> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  return ctx.comfyui as ComfyUIService;
};

// the atom row's own rest (the registry's resolver_defaults): the
// lane the merge fills when the caller states nothing. defaults is
// optional on the row face — an absent bag reads undefined and the
// fixture assert below still fires loud.
const atom = getModel("qwen3-tts");
const rest = atom.defaults?.["voice"];
assert.equal(rest, "ryan", "the fixture law: the atom lane rests on 'ryan' (the fresh-press speaker)");

describe("the defaults merge is the lane's rest, never a stated preset (F31)", () => {
  it("THE BURN FACE: a qvoice-only doc through the REAL service door composes clean — the fill is not a stated preset", async () => {
    const svc = await boot();
    svc.registerCard(defs.get("tts")!);
    svc.setFacts(factsDoc);
    const graph = svc.compose(
      "tts",
      "qwen3-tts",
      { text: "hello", qvoice: [{ qvoice: "/v/ann.qvoice", voice_strength: 1 }] },
      "run_f31_qvoice_only",
    );
    const studio = graph["AudiocoreVoiceStudio.0"] as { inputs: Record<string, unknown> };
    assert.ok(studio, "the persona's studio composes through the door");
    assert.equal(studio.inputs["qvoice_path"], "/v/ann.qvoice", "the persona wires through");
  });

  it("THE FRESH PRESS still rests on the lane's real speaker (the no-default-voice law, unchanged)", async () => {
    const svc = await boot();
    svc.registerCard(defs.get("tts")!);
    svc.setFacts(factsDoc);
    const graph = svc.compose("tts", "qwen3-tts", { text: "hello" }, "run_f31_fresh");
    const synth = graph["AudiocoreTTS.0"] as { inputs: Record<string, unknown> };
    assert.equal(synth.inputs["voice"], rest, "the fresh compose rides the lane's rest verbatim");
  });

  it("THE STATED PRESET still refuses: an explicit non-rest speaker beside a .qvoice dies with the B2 voice", async () => {
    const svc = await boot();
    svc.registerCard(defs.get("tts")!);
    svc.setFacts(factsDoc);
    expect(() =>
      svc.compose(
        "tts",
        "qwen3-tts",
        { text: "hello", voice: "vivian", qvoice: [{ qvoice: "/v/ann.qvoice", voice_strength: 1 }] },
        "run_f31_stated",
      ),
    ).toThrow(
      /params 'voice' and 'qvoice' fire together on the tts card \(ONE voice performs — the saved persona rides the qvoice mod bag and the engine's clone branch carries no speaker; drop the preset or the \.qvoice\)/,
    );
  });

  it("THE EXPLICIT REST rides beside a .qvoice: a caller who types the lane's own default is indistinguishable from the merge's write", async () => {
    const svc = await boot();
    svc.registerCard(defs.get("tts")!);
    svc.setFacts(factsDoc);
    const graph = svc.compose(
      "tts",
      "qwen3-tts",
      { text: "hello", voice: rest, qvoice: [{ qvoice: "/v/ann.qvoice", voice_strength: 1 }] },
      "run_f31_explicit_rest",
    );
    assert.ok(graph["AudiocoreVoiceStudio.0"], "the persona composes (the rest value never states a preset)");
  });
});
