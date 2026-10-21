// served-face-stateability.spec.ts — THE RENDERER-TRUE FACE WALLS
// (operator order, 2026-10-21: "MAKE THE TESTS THAT CATCH THESE
// ISSUES. NOW. I EXPECT REDS").
//
// The lesion: the ghost-name wall (cards-relation-fields-render)
// judges a relation field stateable when it is a schema LEAF — and
// the qwen voice_name widget IS a leaf. But the RENDERER excludes
// every mod-owned name from the whole main face (form.tsx:
// `flatFields = fields.filter((f) => !owned.has(f.name))` — the
// qvoice_save pack's envelope declares voice_name, so the widget
// leaf is mod-owned and renders NOWHERE). The relation demanded the
// pair, the write refused every half-pair, and the studio bricked
// under a green wall. Stateability must be judged by the
// RENDERER'S OWN exclusion set, not by leaf presence.
//
// Arm A — THE PAIR-STATEABLE LAW (renderer-true): every field a
// lane's relation names must be stateable FROM THE RENDERED MAIN
// FACE of that lane: a schema leaf AND served by the lane surface
// AND NOT mod-owned. A field that is only stateable inside a mod
// modal is NOT stateable for a lane relation — relations judge
// top-level lane params.
//
// Arm B — THE NO-BLANK-DEFAULT LAW: a select field served on a
// lane must carry a default that is a MEMBER of its own options.
// A vocabulary with no blank member must never serve a blank
// default — the fresh face shows an empty picker no legal state
// produces (operator 2026-10-21: "YOU LEFT DEFAULT BLANK. IN
// CUSTOM VOICE. THERE IS NO BLANK IN CUSTOM VOICE").
//
// Arm C — THE RUNTIME-PRESENCE LAW: a family DECL that declares a
// runtime must have it provisioned on the operator path OR the
// card doc must serve its presence marked (the no-silent-drop law
// packs already ride). The anny burn: the estimator runtime is
// declared, nothing provisions it, the doc serves no marking, and
// the operator learned it at RUN PRESS (operator 2026-10-21: "the
// image to anny is completely broken").
//
// Run: npx vitest run tests/walls/ts/suites/served-face-stateability.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import {
  fieldOnLane,
  fieldsOfEnvelope,
  modOwnedFields,
  type FormSpecDoc,
  type SpecField,
} from "../../../../packages/web/card-base/src/spec.ts";

// The wall judges the REAL checkout's declarations — never a
// fixture root a sibling spec may have left in the env.
process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

/** One relation block's named fields — every word the relation
 *  grammar serves, walked shape-for-shape (the ghost-name wall's
 *  own walk, one spelling). */
function relationFields(rel: unknown): string[] {
  if (rel == null) return [];
  const r = rel as Record<string, unknown>;
  const out: string[] = [];
  for (const row of (r.requires as { field: string; needs: string[] }[] | undefined) ?? []) out.push(row.field, ...row.needs);
  for (const row of (r.conflicts as { a: string; b: string }[] | undefined) ?? []) out.push(row.a, row.b);
  for (const row of (r.together as { fields: string[] }[] | undefined) ?? []) out.push(...row.fields);
  for (const row of (r.required as { fields: string[] }[] | undefined) ?? []) out.push(...row.fields);
  for (const row of (r.either_or as { groups: string[][] }[] | undefined) ?? []) for (const g of row.groups) out.push(...g);
  return out;
}

interface VariantDecl {
  id: string;
  relations?: unknown;
  cells?: Array<{ relations?: unknown }>;
}

interface FamilyDeclShape {
  variants?: VariantDecl[];
  runtime?: { name: string; rel: string[]; sentinel: string[]; command: string };
}

const defs = await loadCardDefs();
/** The card roster (loadCardDefs' own map: card id → def) with the
 *  boarded edge resolved — one card per family, the ghost-name
 *  wall's own join. */
const CARDS: Array<{ cardId: string; families: string[] }> = [];
for (const [cardId, def] of defs) {
  CARDS.push({ cardId, families: [...(def.boarded ?? [])] });
}
const FAMILIES_BY_CARD = new Map(CARDS.map((c) => [c.cardId, c.families]));

describe("the rendered face can state every lane relation (pair-stateable, renderer-true)", () => {
  for (const { cardId } of CARDS) {
    it(`card '${cardId}' renders every relation field on its lane`, async () => {
      const doc = await formSpecArm(cardId);
      assert.ok(doc !== null, `form-spec: card '${cardId}' served no doc`);
      const spec = doc as unknown as FormSpecDoc;
      const leaves = new Set(fieldsOfEnvelope(spec.schema).map((f) => f.name));
      const owned = modOwnedFields(spec);
      // THE BAG HANDLES (the ghost-name wall's precedent): a mod
      // param_key is the bag's top-level handle — stateable through
      // the mod rail (the either_or source `qvoice` is exactly
      // this). INTERIOR knobs of a pack envelope are not: relations
      // judge top-level lane params, so an interior name is the
      // voice_name brick whatever the mod modal renders.
      const bagKeys = new Set(((spec.features?.modifiers ?? []) as Array<{ param_key?: unknown }>)
        .map((k) => (typeof k.param_key === "string" ? k.param_key : null))
        .filter((k): k is string => k !== null));
      const families = FAMILIES_BY_CARD.get(cardId) ?? [];
      const burns: string[] = [];
      for (const family of families) {
        const decl = getModel(family) as unknown as FamilyDeclShape | null;
        if (decl === null) continue;
        for (const variant of decl.variants ?? []) {
          const named = [...relationFields(variant.relations), ...(variant.cells ?? []).flatMap((c) => relationFields(c.relations))];
          if (named.length === 0) continue;
          for (const field of named) {
            if (bagKeys.has(field)) continue;
            if (!leaves.has(field)) {
              burns.push(`family '${family}' variant '${variant.id}' relation names '${field}' — not a schema leaf of the served doc`);
              continue;
            }
            if (owned.has(field)) {
              burns.push(
                `family '${family}' variant '${variant.id}' relation names '${field}' — the field is MOD-OWNED (a pack envelope declares it) so the renderer's flatFields excludes it from the whole main face: the pair can never be stated from the lane, every half-pair write refuses, the studio bricks`,
              );
              continue;
            }
            assert.equal(
              fieldOnLane(spec, field, { variant: variant.id } as never),
              true,
              `family '${family}' variant '${variant.id}': relation field '${field}' is not served by the lane surface`,
            );
          }
        }
      }
      assert.deepEqual(burns, [], `unstateable relation fields (the renderer-true walk):\n${burns.join("\n")}`);
    });
  }
});

describe("a served select carries a member default (no blank face)", () => {
  for (const { cardId } of CARDS) {
    it(`card '${cardId}' serves no blank select default`, async () => {
      const doc = await formSpecArm(cardId);
      assert.ok(doc !== null, `form-spec: card '${cardId}' served no doc`);
      const spec = doc as unknown as FormSpecDoc;
      const owned = modOwnedFields(spec);
      const burns: string[] = [];
      const variants = (spec.variants ?? []) as Array<{ id?: unknown }>;
      // A member test over the served rows: bare strings compare as
      // themselves, {value,label} rows by their VALUE (a "— none —"
      // row carrying "" is a legal resting seat — the h3 refine_lora
      // precedent).
      const memberValues = (opts: Array<string | { value: string; label: string }>): string[] =>
        opts.map((o) => (typeof o === "string" ? o : o.value));
      for (const f of fieldsOfEnvelope(spec.schema) as SpecField[]) {
        if ((f.options ?? []).length === 0) continue;
        if (owned.has(f.name)) continue;
        const servedOnSomeLane = variants.some(
          (v) => typeof v.id === "string" && fieldOnLane(spec, f.name, { variant: v.id } as never),
        );
        if (!servedOnSomeLane) continue;
        const def2 = (f as unknown as { default?: unknown }).default;
        const values = memberValues(f.options ?? []);
        if (def2 === undefined || def2 === null || def2 === "") {
          if (def2 === "" && values.includes("")) continue;
          burns.push(
            `field '${f.name}' serves options ${JSON.stringify(f.options)} with default ${JSON.stringify(def2)} — the fresh face renders a blank no legal state produces; the default must be a member of the served options`,
          );
          continue;
        }
        assert.ok(
          values.includes(String(def2)),
          `field '${f.name}' default '${String(def2)}' is not a member of its own options`,
        );
      }
      assert.deepEqual(burns, [], `blank select defaults:\n${burns.join("\n")}`);
    });
  }
});

describe("a declared runtime is provisioned or serves marked (no run-time surprise)", () => {
  for (const { cardId } of CARDS) {
    it(`card '${cardId}' marks every declared runtime`, async () => {
      const doc = await formSpecArm(cardId);
      assert.ok(doc !== null, `form-spec: card '${cardId}' served no doc`);
      const spec = doc as unknown as FormSpecDoc & { runtime?: unknown };
      const families = FAMILIES_BY_CARD.get(cardId) ?? [];
      const burns: string[] = [];
      for (const family of families) {
        const decl = getModel(family) as unknown as FamilyDeclShape | null;
        if (decl === null || decl.runtime === undefined) continue;
        const rt = decl.runtime;
        const engineRoot = process.env["MELITE_ENGINE_ROOT"] ?? "/home/user/tools/comfyui";
        const target = join(engineRoot, ...rt.rel);
        const present = rt.sentinel.every((s) => existsSync(join(target, s)));
        if (!present && spec.runtime === undefined) {
          burns.push(
            `family '${family}' declares runtime '${rt.name}' (sentinel ${rt.sentinel.join(", ")}) — ABSENT at ${target} and the served doc carries NO runtime presence block: the operator learns it at run press ('${rt.command}' never prompted), the no-silent-drop law packs already ride`,
          );
        }
      }
      assert.deepEqual(burns, [], `unmarked absent runtimes:\n${burns.join("\n")}`);
    });
  }
});
