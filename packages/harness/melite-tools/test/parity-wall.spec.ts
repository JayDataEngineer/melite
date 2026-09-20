// THE PARITY WALL (2026-09-20, the missing error catch): for every
// card and every boarded family, the DECLARED DEFAULTS the compose
// door enforces must be exactly what the form-spec SERVES as
// model_defaults (under the family row's own overrides). This is
// the wall whose absence let the UI serve {seed: 42} while the door
// walked 30+ real defaults — every surface telling a different
// truth, all of them green. One enumeration feeds the door, the
// tool face, and the serve; this wall pins the third leg to the
// first two, forever.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, declaredDefaults, getModel } from "@melite/comfyui-cordis";

const defs = await loadCardDefs();
assert.ok(defs.size >= 15, `the registry serves every card (got ${defs.size})`); // 15: the voice-lock card died 2026-09-21 (design moved into the tts card's mods)

describe("THE PARITY WALL (walked defaults ≡ served model_defaults, every card)", () => {
  for (const [id, def] of [...defs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const boarded = def.boarded.length > 0 ? [...def.boarded] : [id];
    for (const family of boarded) {
      it(`${id} / ${family}: the form-spec serves the door's declared defaults (family overrides layered)`, () => {
        const carrier = ((def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema) as never;
        const walked = declaredDefaults(carrier, def.boarded);
        // EXEMPT-BY-NATURE (named inline, never silently skipped):
        // input-prep — a pure staging tool whose ONLY declared knob
        // (source) is required with no default; every other key rides
        // the explicit-params overlay by declaration. Zero defaults
        // is its honest truth (verified: no renderer floors).
        const exempt = id === 'input-prep';
        if (!exempt) {
          assert.ok(Object.keys(walked).length > 0, `${id} declares no defaults at all — a knob-less card is a wall failure`);
        }

        // the serve layer (discovery's row, verbatim): walked under
        // the family row's own non-null, non-array defaults
        const decl = (() => { try { return getModel(family) } catch { return null } })();
        const served = {
          ...walked,
          ...Object.fromEntries(
            Object.entries(decl?.defaults ?? {}).filter(([, v]) => v !== null && !Array.isArray(v)),
          ),
        };

        // EVERY declared default must survive the serve — the UI
        // prefills exactly what the door walks
        for (const [k, v] of Object.entries(walked)) {
          assert.ok(k in served, `${id}.${k} declared default ${JSON.stringify(v)} is missing from the served model_defaults`);
          assert.ok(served[k] !== undefined && served[k] !== null, `${id}.${k} served null/undefined — the blank-knob crime`);
        }
        // and the serve invents NOTHING the door doesn't know (a
        // served default with no declaration is a second owner)
        for (const k of Object.keys(served)) {
          assert.ok(k in walked || k in (decl?.defaults ?? {}), `${id}.${k} is served but declared NOWHERE — a second owner`);
        }
      });
    }
  }
});
