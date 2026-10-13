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
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
import { loadCardDefs } from "../src/cardDefs.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel, cascadeInit } from "../src/models/models.ts";

// li-m (the lazy-boot law): the import no longer boots models —
// the spec awaits the shared boot before the first sync read.
await cascadeInit();

const here = dirname(fileURLToPath(import.meta.url));
const factsDoc = loadFacts(
  join(here, "..", "data", "model-facts.json"),
  { getModel, registryIds, registryModel },
);

const defs: Map<string, CardDefinition> = await loadCardDefs();
// F-M2 (the wall audit, 2026-09-28): a >= N floor lets the roster
// SHRINK silently. The census is EXACT: the card set is named
// by count — a card dying or being born is a deliberate edit here.
// 14: the quad-remesh card left with the autoremesher excision
// (458c4001); voice-lock died earlier (2026-09-21).
assert.equal(defs.size, 14, `the registry serves exactly 14 cards (got ${defs.size}) — a card dying or being born is a deliberate edit (voice-lock died 2026-09-21, quad-remesh 2026-10-22)`);

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
          // A CRASH is an outright bug and fails the wall.
          // F-L6 (the wall audit, 2026-09-28): the old pin was a
          // four-alternative message REGEX — a crash whose message
          // said something else ("x is not iterable", "Assignment to
          // constant variable", a stack-overflow RangeError) rode
          // through. The law is now a SHAPE: a lawful refusal is
          // either the estate's named ComposeRefusal or a plain
          // Error/TypeError-free named throw — anything else (a
          // built-in runtime fault, a non-Error throw, a message
          // that reads like a runtime fault) is a crash, whatever
          // its wording.
          const crash = e instanceof TypeError || e instanceof ReferenceError
            || e instanceof RangeError || e instanceof SyntaxError
            || e instanceof URIError
            || !(e instanceof Error)
            || /cannot read|is not a function|is not iterable|is undefined|null pointer|not assignable|Assignment to constant/i.test(err.message);
          assert.ok(!crash, `compose crashed (not a refusal): ${err.message}`);
        }
      });
    }
  }
});
