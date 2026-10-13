// @melite/image-image-gen — the third live break's death
// certificate (2026-09-29: 'no-model-facts: krea-2-raw').
//
// THE INCIDENT: the raw variant stamps its route as the model
// (resolver_defaults {model: krea-2-raw}) and the hand roster in
// model-facts.json never listed the address — compose phase 1
// refused a route the registry itself resolves. Born 2026-09-09,
// silent for 20 days: every wall proved the BENCH WRITE (the raw
// pick lands, the marriage sits in-envelope) and no wall ever
// drove the raw route THROUGH compose. These pins are the missing
// wall:
//
//  1. THE EXPORTER RULE, TOTAL over the real registry: every
//     address the registry claims whose owning family serves a
//     roster row derives its own facts row — a hand-maintained
//     roster can never again silently drop a claimed route;
//  2. the krea-2-raw row carries raw's truth — card image-gen, the
//     52-step/3.5-cfg marriage, RAW's checkpoint in lane_inputs
//     (the atom spells turbo's — the family default view — and the
//     variant's lane_inputs override composes the route view);
//  3. the run composes: no refusal, and the graph carries raw's
//     steps AND raw's unet file — never turbo's weights under a
//     raw stamp (the silent half of the break: a refusal is loud,
//     wrong weights are not).
//
// Run: npx vitest run --project node
import "../../../../tests/helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'
import { registerCard } from "../src/card.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { FactsFile } from "@melite/comfyui-card-kit/facts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

const graphText = (g: unknown): string => JSON.stringify(g);

describe("the third live break is dead (krea-2-raw serves)", () => {
  it("THE EXPORTER RULE IS TOTAL: every claimed address of a rostered family serves a row", () => {
    // the hand roster, read raw — the derivation fills OVER it
    const slices = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as { rows: Record<string, { frozen?: unknown }> }
    const rostered = new Set(Object.keys(slices.rows ?? {}))
    for (const [address, owner] of Object.entries(facts.owners ?? {})) {
      const ownerRostered = rostered.has(owner) && slices.rows[owner]!.frozen === undefined
      if (!ownerRostered) continue // an unserved family is a serving decision, never drift
      assert.ok(
        facts.models[address] !== undefined,
        `address '${address}' (owner '${owner}') is claimed and its family serves — the address must serve too (the hand roster drifted)`,
      )
    }
    // and the derivation never mints rows for UNSERVED families
    assert.equal(facts.models["moss-tts"], undefined, "an unrostered family's routes stay absent (a serving decision, not drift)")
  });

  it("the krea-2-raw row serves, on the image-gen card, carrying raw's truth", () => {
    const row = facts.models["krea-2-raw"];
    assert.ok(row, "krea-2-raw serves a facts row (the roster never listed it — loadFacts derives it)");
    assert.equal(row.card, "image-gen");
    assert.equal(row.defaults.steps, 52, "raw's 52-step reference marriage");
    assert.equal(row.defaults.cfg, 3.5, "raw's cfg marriage");
    assert.equal(row.lane_inputs.unet, "krea2_raw_int8_convrot.safetensors", "RAW's checkpoint — never turbo's");
    // the FAMILY view is untouched: the atom spells the default
    // (turbo, first-declared — the matrix law)
    const family = facts.models["krea-2"];
    assert.equal(family.lane_inputs.unet, "krea2_turbo_int8_convrot.safetensors", "the family default view keeps turbo's spelling");
  });

  it("the raw run composes — raw's steps AND raw's weights, no refusal", async () => {
    const ctx = new Context();
    const svc = new ComfyUIService(ctx);
    registerCard(ctx, svc);
    svc.setFacts(facts as FactsFile);
    const graph = svc.compose("image-gen", "krea-2-raw", { prompt: "a cat" }, "run-raw-1");
    const text = graphText(graph);
    assert.ok(text.includes('"steps":52'), "the graph carries raw's 52-step marriage");
    assert.ok(text.includes("krea2_raw_int8_convrot.safetensors"), "the graph loads RAW's checkpoint");
    assert.ok(!text.includes("krea2_turbo_int8_convrot.safetensors"), "turbo's distilled weights never ride a raw run");
    await ctx.fiber.dispose();
  });
});
