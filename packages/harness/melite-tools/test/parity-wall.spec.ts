// THE PARITY WALL (2026-09-20, the missing error catch): for every
// card and every boarded family, the DECLARED DEFAULTS the compose
// door enforces must be exactly what the form-spec SERVES as
// model_defaults (under the family row's own overrides). This is
// the wall whose absence let the UI serve {seed: 42} while the door
// walked 30+ real defaults — every surface telling a different
// truth, all of them green. One enumeration feeds the door, the
// tool face, and the serve; this wall pins the third leg to the
// first two, forever.
//
// REBUILT 2026-10-11 (the dead-wall audit, finding #1). The first cut
// computed `served` HERE — `{...walked, ...filtered decl.defaults}` —
// and then asserted that `walked` survived it. Both arms were true by
// the spread's own construction, so 28 tests passed without ever
// reading the serve. Proven: cutting the `declaredDefaults(...)` spread
// out of production `discovery.ts` — restoring exactly the pre-fix
// blank-knob shape this wall's header says it exists to forbid — left
// all 28 GREEN.
//
// It now drives `specBody`, the real row builder, and reads
// `model_defaults` off what it returns. The expectation is still
// derived (one enumeration, two readers) but the SUBJECT is
// production's, which is the whole difference: the door and the serve
// are two seats, and a wall that only looks at one of them is a note.
// THE PER-FILE BOOT (li-m): this wall reads the model table
// (getModel) and the serve (specBody -> owningAtom), so it owns its
// world by booting the models service as its FIRST import — the
// contract tests/helpers/boot-models.ts states. Inherited worker
// state is not a world: in a full-project run this file landed in a
// worker whose models service was never booted and refused loud.
import '../../../../tests/helpers/boot-models.ts'
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, declaredDefaults, getModel, theService } from "@melite/comfyui-cordis";
import { specBody } from "../src/discovery.ts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

function hasRequiredField(def: CardDefinition): boolean {
  const carrier = ((def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema) as {
    toJSON?: () => { uid: number; refs: Record<number, { dict?: Record<string, number>; meta?: { extra?: { required?: boolean } } }> };
  };
  const env = carrier.toJSON?.();
  const root = env?.refs[env.uid];
  return Object.values(root?.dict ?? {}).some((id) => env?.refs[id]?.meta?.extra?.required === true);
}

const defs = await loadCardDefs();
assert.ok(defs.size >= 14, `the registry serves every card (got ${defs.size})`); // 14: voice-lock died 2026-09-21 (its design moved into the tts card's mods), the quad-remesh card died with the autoremesher excision 458c4001 (the vendored pack the owner removed — the object-forge flow serves the lift tri mesh)

describe("THE PARITY WALL (walked defaults ≡ served model_defaults, every card)", () => {
  for (const [id, def] of [...defs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const boarded = def.boarded.length > 0 ? [...def.boarded] : [id];
    for (const family of boarded) {
      it(`${id} / ${family}: the form-spec serves the door's declared defaults (family overrides layered)`, () => {
        const carrier = ((def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema) as never;
        const walked = declaredDefaults(carrier, def.boarded);
        // STROKE 95 (the two-bars law): a card may own ZERO flat
        // knobs because every knob rides its MODS — each kind's bag
        // entries carry the field defaults (mask: input_image
        // only on the flat form; sam_threshold/refine/dilation/…
        // live on the sam3/sam2/draw entries). Count them: a card
        // is knob-less only when BOTH planes are empty.
        const modKnobs = (def.mods ?? []).flatMap((k) => (
          (((k as { fields?: Array<{ name?: unknown; default?: unknown }> }).fields) ?? [])
            .filter((f) => f.default !== undefined && f.default !== null)
            .map((f) => `${String((k as { param_key?: unknown }).param_key)}.${String(f.name)}`)
        ));
        // Model-owned defaults are declarations too; required-only
        // cards (such as transfer_rig) legitimately have no fills.
        const decl = (() => { try { return getModel(family) } catch { return null } })();
        const modelDefaults = decl?.defaults ?? {};
        const exempt = id === 'input-prep';
        if (!exempt) {
          assert.ok(Object.keys(walked).length > 0 || Object.keys(modelDefaults).length > 0 || modKnobs.length > 0 || hasRequiredField(def),
            `${id} declares no defaults or required fields (neither flat nor mod-owned) — a knob-less card is a wall failure`);
        }

        // THE SERVE, DRIVEN (not recomputed). `specBody` is the
        // production row builder: give it the same card and family
        // and read what it actually serves. A divergence between the
        // door's walk and the serve's row is exactly what this wall
        // exists to catch, so the subject must be the serve itself.
        const body = specBody(
          theService(),
          defs,
          { card: id, service: "comfyui", model: family },
        ) as { model_defaults?: Record<string, unknown> };
        assert.equal(typeof body["model_defaults"], "object",
          `${id}/${family}: the serve carries no model_defaults object`);
        const served = body["model_defaults"] as Record<string, unknown>;

        // The door's walk, spelled independently here — ONE
        // enumeration that both seats are supposed to share, and the
        // assertion is that the two AGREE, not that a spread of one
        // into the other is a superset of itself.
        assert.deepEqual(
          served,
          {
            ...walked,
            ...Object.fromEntries(
              Object.entries(modelDefaults).filter(([, v]) => v !== null && !Array.isArray(v)),
            ),
          },
          `${id}/${family}: the serve's model_defaults disagree with the door's walked defaults`,
        );
        // and the blank-knob crime, stated on the SERVE's own values
        for (const [k, v] of Object.entries(served)) {
          assert.notEqual(v, null, `${id}/${family}.${k} served null — the blank-knob crime`);
          assert.notEqual(v, undefined, `${id}/${family}.${k} served undefined — the blank-knob crime`);
        }
      });
    }
  }
});
