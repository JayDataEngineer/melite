// discovery-doors.spec.ts — THE DISCOVERY DOOR WALL: the /v1 arms
// (discovery.ts — the port of the dead gateway door) derive LIVE
// from the engine truth, and the LoRA options ride the family-owned
// catalog composed server-side (LORA LAW: no loras remote — the
// options ARE the modCatalog rows).
//
// Pins:
//   1. formSpecArm('<served family>') — the envelope shape + the
//      lora modifier whose option VALUES are exactly the family's
//      modCatalog('loras') row ids (strengths ride defaults).
//   2. modelCatalogArm — models/families/cards/capabilities/input_
//      vocabulary all live-non-empty.
//   3. formsArm — card rows with the sidebar shape.
//   4. kindsDoorArm — the CARD_KINDS projection.
//   5. resolveSpecKey law — an unknown/unoffered key resolves null
//      (the door 404s, never an invented envelope).
//
// Run: npx vitest run tests/walls/ts/suites/discovery-doors.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  formSpecArm,
  formsArm,
  kindsDoorArm,
  modelCatalogArm,
  resolveSpecKey,
} from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

describe("the discovery door arms (live /v1 derivation)", () => {
  it("serves the krea-2 envelope with the family-owned lora options (LORA LAW)", async () => {
    const spec = await formSpecArm("krea-2");
    assert.notEqual(spec, null, "krea-2 must resolve");
    // The envelope shape (the parameter audit, 2026-09-14): the
    // flat rows are gone — the schema envelope + mod_schemas +
    // model_defaults replace fields/schema_groups/defaults.
    for (const key of [
      "engine", "features", "form", "genre", "label", "mod_schemas",
      "model", "model_defaults", "schema", "service", "variants",
    ]) {
      assert.ok(key in (spec as object), `envelope key '${key}'`);
    }
    for (const gone of ["fields", "schema_groups", "defaults"]) {
      assert.ok(!(gone in (spec as object)), `the dead key '${gone}' never rides`);
    }
    const env = (spec as { schema: { uid: number; refs: object } }).schema;
    assert.equal(typeof env.uid, "number", "the card's own toJSON rides");
    assert.equal((spec as { model: string }).model, "krea-2");
    assert.equal((spec as { engine: string }).engine, "comfyui");
    // THE LORA LAW: features.modifiers carries the lora pack whose
    // options are EXACTLY modCatalog('loras','krea-2') — the family
    // rows in packages/models/krea-2/mods/loras.ts, composed here.
    const modifiers = ((spec as { features: { modifiers: Record<string, unknown>[] } })
      .features.modifiers);
    const lora = modifiers.find((m) => m.kind === "lora");
    assert.notEqual(lora, undefined, "the lora modifier pack rides the spec");
    const cat = theService().modCatalog("loras", "krea-2");
    const want = cat.rows.map((r) => r.id).sort();
    const got = [...(lora!.options as Array<{ value: string }>)]
      .map((o) => o.value).sort();
    assert.deepEqual(got, want, "lora option values == the family's modCatalog row ids");
    // A declared default_strength rides the option defaults.
    const withStrength = cat.rows.find((r) => r.default_strength !== undefined);
    if (withStrength !== undefined) {
      const opt = (lora!.options as Array<{ value: string; defaults: { strength?: number } }>)
        .find((o) => o.value === withStrength.id);
      assert.equal(opt?.defaults.strength, withStrength.default_strength);
    }
  });

  it("serves the live catalog section (models/families/cards/vocabulary)", async () => {
    const cat = await modelCatalogArm();
    const models = cat.models as Record<string, unknown>;
    const families = cat.families as Record<string, unknown>;
    const cards = cat.cards as Record<string, unknown>;
    assert.ok(Object.keys(models).length > 0, "models non-empty");
    assert.ok(Object.keys(families).length > 0, "families non-empty");
    assert.ok(Object.keys(cards).length > 0, "cards non-empty");
    assert.ok("krea-2" in families, "krea-2 family present");
  });

  it("serves the z-image envelope with the hybrid controlnet entry (THE HYBRID LAW)", async () => {
    // THE WIRE IS PLURAL (the retired bag params.controlnets[]):
    // kind stays singular, param_key is plural, schema_key names
    // the pack envelope; the entry mode is served (never
    // client-switched); every option stamps the row's resolved
    // facts (model + preprocessor) with its own tooltip and
    // strength default.
    const spec = await formSpecArm("z-image");
    assert.notEqual(spec, null, "z-image must resolve");
    const modifiers = ((spec as { features: { modifiers: Record<string, unknown>[] } })
      .features.modifiers);
    const cn = modifiers.find((m) => m.kind === "controlnet");
    assert.notEqual(cn, undefined, "the controlnet modifier pack rides the spec");
    assert.equal(cn!.param_key, "controlnets");
    assert.equal(cn!.schema_key, "controlnet");
    assert.equal(cn!.entry, "hybrid");
    assert.equal(cn!.option_key, "type");
    assert.equal(cn!.max_stack, 5);
    const cat = theService().modCatalog("controlnet", "z-image");
    const want = cat.rows.map((r) => r.id).sort();
    const options = cn!.options as Array<{
      value: string; label: string; tooltip: string; defaults: { strength?: number };
      model: string; preprocessor?: string;
    }>;
    assert.deepEqual(options.map((o) => o.value).sort(), want, "option values == the union type ids");
    assert.equal(options.length, 7);
    for (const row of cat.rows) {
      const opt = options.find((o) => o.value === row.id)!;
      assert.equal(opt.model, row.filename, `${row.id} stamps the union file`);
      assert.equal(opt.preprocessor, row.preprocessor, `${row.id} stamps the upstream-map note`);
      assert.equal(opt.defaults.strength, row.default_strength, `${row.id} seeds its declared strength`);
      assert.ok((opt.tooltip ?? "").length > 0, `${row.id} serves its tooltip`);
    }
    // the pack envelope rides mod_schemas under the pack name (the
    // schema_key), carrying the bag + the floor — the client's
    // hybrid walk reads THIS, never the card envelope.
    const schemas = (spec as { mod_schemas: Record<string, unknown> }).mod_schemas;
    assert.ok("controlnet" in schemas, "the controlnet pack envelope rides mod_schemas");
  });

  it("serves the z-image envelope with the hybrid ip_adapter entry (THE REFUSED-FATE OFFER)", async () => {
    // The same hybrid law, vocabulary-only arm: param_key plural
    // (ip_adapters), schema_key the pack name, option_key 'kind',
    // scalar_key 'weight' (the pack's own dial — the leaf never
    // guesses). Four options stamp the retired filenames + weight
    // defaults; NO source is claimed (none exists). The firing
    // gate refuses every stated entry loud — the offer is truth,
    // not a promise of execution.
    const spec = await formSpecArm("z-image");
    const modifiers = ((spec as { features: { modifiers: Record<string, unknown>[] } })
      .features.modifiers);
    const ipa = modifiers.find((m) => m.kind === "ip_adapter");
    assert.notEqual(ipa, undefined, "the ip_adapter modifier pack rides the spec");
    assert.equal(ipa!.param_key, "ip_adapters");
    assert.equal(ipa!.schema_key, "ip_adapter");
    assert.equal(ipa!.entry, "hybrid");
    assert.equal(ipa!.option_key, "kind");
    assert.equal(ipa!.scalar_key, "weight");
    assert.equal(ipa!.max_stack, 5);
    const options = ipa!.options as Array<{
      value: string; label: string; tooltip: string;
      defaults: { weight?: number }; model: string;
    }>;
    assert.deepEqual(options.map((o) => o.value), ["style", "composition", "face", "generic"]);
    const weights: Record<string, number> = { style: 1, composition: 1, face: 0.85, generic: 1 };
    const files: Record<string, string> = {
      style: "ip-adapter-light_v11.safetensors",
      composition: "ip-adapter-plus_sd15.safetensors",
      face: "ip-adapter-faceid-plusv2_sd15.safetensors",
      generic: "ip-adapter_sd15.safetensors",
    };
    for (const o of options) {
      assert.equal(o.defaults.weight, weights[o.value], `${o.value} seeds its declared weight`);
      assert.equal(o.model, files[o.value], `${o.value} stamps the retired filename as a catalog note`);
      assert.ok((o.tooltip ?? "").length > 0, `${o.value} serves its tooltip`);
    }
    const schemas = (spec as { mod_schemas: Record<string, unknown> }).mod_schemas;
    assert.ok("ip_adapter" in schemas, "the ip_adapter pack envelope rides mod_schemas");
  });

  it("serves the forms table with the sidebar shape", async () => {
    const forms = await formsArm();
    assert.ok(Object.keys(forms as Record<string, unknown>).length > 0);
    for (const row of Object.values(forms as Record<string, Record<string, unknown>>)) {
      for (const key of ["label", "genre", "order", "plugin", "sidebar_key", "default_service", "hidden", "covers"]) {
        assert.ok(key in row, `forms row key '${key}'`);
      }
    }
  });

  it("serves the kinds arm (the CARD_KINDS projection)", async () => {
    const kinds = await kindsDoorArm();
    const rows = (kinds as { kinds: unknown[] }).kinds;
    assert.ok(rows.length > 0, "kinds non-empty");
  });

  it("refuses unknown keys (null — the door 404s, never an invented envelope)", async () => {
    assert.equal(await formSpecArm("not-a-model"), null);
    const defs = await loadCardDefs();
    assert.equal(resolveSpecKey("not-a-model", defs, new Map()), null);
  });
});
