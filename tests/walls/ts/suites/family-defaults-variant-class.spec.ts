// family-defaults-variant-class.spec.ts — THE ONE DEFAULT TABLE,
// VARIANT-PARAMETERIZED (audit 013-edit-image-steps-envelope cure 3,
// the 25-on-Turbo banner burn).
// @contract models-family-defaults-variant-class
//
// The burn: the qwen-img-edit-21 family defaults block stamped
// `steps: 25` variant-blind while the DECL's default lane is the
// TURBO distill (resolver_defaults steps 8). Every unstated compose
// rode base's recipe over turbo's face, and the form's model_defaults
// prefilled 25 — the UI banner ("25 is outside [4,8]") over a compose
// the door had already stamped wrong. The root: ONE flat table
// answering for TWO lanes.
//
// THE PINNED INVARIANT, one sentence: A FAMILY WHOSE required_defaults
// DECLARE A KEY VARIANT-CLASS NEVER CARRIES A FAMILY-BLOCK VALUE FOR
// THAT KEY THAT CONTRADICTS ITS OWN DEFAULT ROW — the block is the
// default row's mirror or absent, and the audited edit family carries
// NO variant-class key at all (the stamp rides each row's own
// resolver_defaults tier).
//
// Arms, each its own firing path (the split-brain lesson):
//   1. THE ESTATE CENSUS (derived, every registered family): a
//      variant-class family block's steps/cfg equal the DEFAULT
//      ROW's resolver_defaults — a block speaking a sibling lane's
//      recipe reds naming family/block/default-row. (Pre-cure this
//      reds twice: qwen-img-edit-21 25-vs-8, qwen-img-edit-2511
//      20-vs-4 — the same disease one family over.)
//   2. THE AUDITED ADDRESS (the cure's own seat): the
//      qwen-img-edit-21 block carries NO variant-class key at all —
//      the family's recipe lives on the rows.
//   3. THE STAMP (the real door): prepareCardParams on the
//      image-edit card — unstated variant stamps TURBO's 8/1, a
//      stated base stamps 25/1, and the Recipe seat inherits NO
//      family recipe (the plane canon keeps Recipe rows
//      wire-params-only). Toggling the family block back reds
//      arms 1+2 and re-blinds the prefill, not the stamp (the rows
//      own the stamp — that is the cure).
//   4. THE PREFILL PLANE: neither the family block nor the card
//      carrier declares steps/cfg for this family — the served
//      model_defaults layer cannot prefill one lane's recipe over
//      the variant's own.
//
// Run: npx vitest run tests/walls/ts/suites/family-defaults-variant-class.spec.ts
import { describe, expect, it, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../../../tests/helpers/boot-models.ts";
import { getModel, theService } from "@melite/comfyui-cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import type { ModelFactsRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import type { ModelDecl } from "@melite/comfyui-card-kit/model-contract";

/** The knobs the variant-class law speaks (the audit's pair). */
const VARIANT_CLASS_KEYS = ["steps", "cfg"] as const;

type DeclRow = {
  id: string;
  defaults?: Record<string, unknown>;
  required_defaults?: Array<{ name?: string; class?: string }>;
  variants?: Array<{
    id: string;
    resolver_defaults?: Record<string, unknown>;
    hide_from_dropdown?: boolean;
  }>;
};

/** The family's default row — the DECL walk's own law (first
 *  declared = the default; the resolver and the walls pin it). */
function defaultRow(decl: DeclRow): DeclRow["variants"][number] | undefined {
  return (decl.variants ?? [])[0];
}

let svc: CardRegistryService;
let facts: Record<string, ModelFactsRow>;

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "family-defaults-vc-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  facts = svc.modelFacts() as Record<string, ModelFactsRow>;
}, 90_000);

describe("THE ONE DEFAULT TABLE, VARIANT-PARAMETERIZED (audit 013 cure 3)", () => {
  it("THE ESTATE CENSUS: a variant-class family block never contradicts the default row's own resolver_defaults", () => {
    const offenders: string[] = [];
    for (const id of theService().modelIds()) {
      const decl = getModel(id) as unknown as DeclRow | undefined;
      if (decl === undefined) continue;
      const required = new Set(
        (decl.required_defaults ?? [])
          .filter((r) => r.class === "variant" && typeof r.name === "string")
          .map((r) => r.name as string),
      );
      if (required.size === 0) continue;
      const row = defaultRow(decl);
      const rowTier = row?.resolver_defaults ?? {};
      for (const key of VARIANT_CLASS_KEYS) {
        if (!required.has(key)) continue;
        const block = decl.defaults?.[key];
        if (block === undefined) continue;
        const rowValue = rowTier[key];
        if (rowValue === undefined || rowValue !== block) {
          offenders.push(
            `${id}: family defaults ${key}=${String(block)} vs default row '${row?.id ?? "—"}' resolver_defaults ${key}=${String(rowValue)} — the block speaks a lane the default row does not`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
    if (offenders.length > 0) {
      throw new Error("variant-blind family defaults blocks:\n" + offenders.join("\n"));
    }
  });

  it("THE AUDITED ADDRESS: the qwen-img-edit-21 block carries NO variant-class key — the rows own the recipe", () => {
    const decl = getModel("qwen-img-edit-21") as unknown as DeclRow;
    expect(decl, "the booted registry serves qwen-img-edit-21").toBeTruthy();
    for (const key of VARIANT_CLASS_KEYS) {
      expect(
        decl.defaults?.[key],
        `qwen-img-edit-21 family defaults.${key} must be ABSENT (the audit's cure: the block is variant-clean; the rows' resolver_defaults own steps/cfg)`,
      ).toBeUndefined();
    }
    // the rows carry the tier: both Variant rows + every Recipe row
    // declare steps+cfg on themselves (a stated-variant compose
    // resolves the row it names and stamps THAT row's counts).
    for (const v of decl.variants ?? []) {
      for (const key of VARIANT_CLASS_KEYS) {
        expect(
          v.resolver_defaults?.[key],
          `qwen-img-edit-21/${v.id}: resolver_defaults.${key} declares (the variant-sampler-defaults law — the stamp's only tier)`,
        ).toBeDefined();
      }
    }
  });

  it("THE STAMP: the real door stamps the SELECTED ROW's own counts — unstated rides turbo 8/1, base 25/1; the Recipe seat inherits no family recipe", () => {
    const row = facts["qwen-img-edit-21"];
    expect(row, "the booted facts serve qwen-img-edit-21").toBeTruthy();
    const unstated = prepareCardParams(svc, { model: "qwen-img-edit-21", prompt: "a cat", input_images: ["/tmp/a.png"] }, "qwen-img-edit-21", "vc-unstated");
    expect((unstated.params as Record<string, unknown>)["steps"]).toBe(8);
    expect((unstated.params as Record<string, unknown>)["cfg"]).toBe(1);
    const base = prepareCardParams(svc, { model: "qwen-img-edit-21", variant: "base", prompt: "a cat", input_images: ["/tmp/a.png"] }, "qwen-img-edit-21", "vc-base");
    expect((base.params as Record<string, unknown>)["steps"]).toBe(25);
    expect((base.params as Record<string, unknown>)["cfg"]).toBe(1);
    // THE RECIPE SEAT (the plane canon's own law): a Recipe row
    // stamps wire params only — the variant coordinate resolving a
    // Recipe row inherits NO family steps/cfg (the block is dead;
    // the row cannot carry the tier by canon). The lawful recipe
    // PICK rides wire_defaults into the user layer and never
    // touches this seat.
    const recipe = prepareCardParams(svc, { model: "qwen-img-edit-21", variant: "remove-background", prompt: "a cat", input_images: ["/tmp/a.png"] }, "qwen-img-edit-21", "vc-recipe");
    expect((recipe.params as Record<string, unknown>)["steps"]).toBeUndefined();
    expect((recipe.params as Record<string, unknown>)["cfg"]).toBeUndefined();
  });

  it("THE PREFILL PLANE: no family-plane seat declares steps/cfg for the edit family — the served prefill cannot prefill one lane's recipe", () => {
    const decl = getModel("qwen-img-edit-21") as unknown as DeclRow;
    expect(decl.defaults?.["steps"]).toBeUndefined();
    expect(decl.defaults?.["cfg"]).toBeUndefined();
    // the card carrier: the served schema the model_defaults layer
    // walks — its steps/cfg fields carry NO default (the ride-the-
    // model law on the card plane).
    const def = theService().defsSync().get("image-edit") as
      | { schemaCarrier?: { dict?: Record<string, { default?: unknown }> } }
      | undefined;
    expect(def?.schemaCarrier?.dict, "the image-edit card exposes its carrier").toBeTruthy();
    for (const key of VARIANT_CLASS_KEYS) {
      const field = def?.schemaCarrier?.dict?.[key];
      expect(
        field?.default,
        `image-edit carrier.${key} declares no default (a carrier default is the same lane-blind prefill in a second spelling)`,
      ).toBeUndefined();
    }
  });
});
