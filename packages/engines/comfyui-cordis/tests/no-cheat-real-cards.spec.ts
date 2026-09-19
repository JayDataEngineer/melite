// THE REAL-CARD NO-CHEAT WALL (2026-09-20). The schema-enforcement
// wall probes def.compose DIRECTLY — it never crosses the service
// door, which is exactly how h3-timeline's walk-nulls hid for days:
// the wall bypassed the one hop the no-cheat law lives in. This wall
// composes EVERY registered card through the REAL door
// (ComfyUIService.compose) with every boarded model and empty params:
//
//   no card may refuse 'unwalked-param' or 'nulled-param'
//
// A refusal here means the card's own walk function drops a declared
// default (or nulls what it declared) — a broken declaration, fixed
// at the declaration, never by a renderer floor. Other lawful
// refusals (missing extension, not-boarded, bad-params on required
// runtime inputs) are the door doing its job and pass this wall.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, ComposeRefusal } from "../src/service.ts";
import type { CardDefinition } from "../src/service.ts";
import { loadCardDefs } from "../src/cardDefs.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../src/models/models.ts";

const here = dirname(fileURLToPath(import.meta.url));
const factsDoc = loadFacts(
  join(here, "..", "data", "model-facts.json"),
  { getModel, registryIds, registryModel },
);

const defs: Map<string, CardDefinition> = await loadCardDefs();
assert.ok(defs.size >= 16, `the registry serves every card (got ${defs.size})`);

const boot = async (): Promise<ComfyUIService> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  return ctx.comfyui;
};

describe("THE REAL-CARD NO-CHEAT WALL (every card, every boarded model, through the service door)", () => {
  for (const [id, def] of [...defs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const boarded = def.boarded.length > 0 ? [...def.boarded] : [null];
    for (const model of boarded) {
      it(`${id}${model === null ? " (model-less)" : ` / ${model}`} composes through the door with no unwalked declared default`, async () => {
        const svc = await boot();
        svc.registerCard(def);
        svc.setFacts(factsDoc);
        try {
          const graph = svc.compose(id, model, {}, "wall_probe");
          assert.equal(typeof graph, "object", "a lawful compose returns the graph");
        } catch (e) {
          const err = e as Error;
          // the door may refuse for lawful reasons — but NEVER the
          // no-cheat codes: those name a broken declaration
          assert.ok(
            !(e instanceof ComposeRefusal && (e.code === "unwalked-param" || e.code === "nulled-param")),
            `${id} broke the no-cheat law: ${err.message}`,
          );
          // cards also voice their own loud required-param refusals
          // as plain named Errors (the estate's convention) — lawful.
          // A CRASH (TypeError/ReferenceError or crash-shaped message)
          // is an outright bug and fails the wall
          const crash = e instanceof TypeError || e instanceof ReferenceError
            || /cannot read|is not a function|is undefined|null pointer/i.test(err.message);
          assert.ok(!crash, `compose crashed (not a refusal): ${err.message}`);
        }
      });
    }
  }
});
