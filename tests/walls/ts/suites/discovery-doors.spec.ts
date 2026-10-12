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
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  formSpecArm,
  formsArm,
  kindsDoorArm,
  cardToolsArm,
  modelCatalogArm,
  resolveSpecKey,
} from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { owningAtom } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
// THE ORACLE IS THE DECLARATION, NOT THE DOOR'S OWN SINGLETON (the
// wall audit's B-C3, 2026-09-28): `want` used to come from
// `theService().modCatalog(...)` — the same service the door serves
// from — so a corrupt catalog made both sides wrong TOGETHER and the
// equality stayed green. The family's own row declarations (the
// source files) are the oracle now: the door is judged against what
// the family DECLARED, through the service that composes it.
import { KREA_ROWS } from "../../../../packages/models/krea-2/mods/loras.ts";
import { ZIMAGE_CONTROLNET_ROWS } from "../../../../packages/models/z-image/mods/controlnet.ts";
import { ZIMAGE_IPADAPTER_ROWS } from "../../../../packages/models/z-image/mods/ip_adapter.ts";

describe("the discovery door arms (live /v1 derivation)", () => {
  it("a card that boards no models NEVER mints a model seat (THE MINTED-MODEL KILL, 2026-10-12)", async () => {
    // THE OPERATOR'S RUN REFUSAL: the mask card (boarded [], the
    // form card — rig is its sibling) resolved `model: 'mask'` —
    // the card id minted as a model — the client sent the phantom
    // seat, and the run door refused "model 'mask' is not offered
    // by card 'mask' (boards: none)". A model-less card serves NO
    // model, at the resolution, in the envelope, ever. The roster
    // is DERIVED from the live defs (never a hand-copied list) so
    // a future model-less card rides the same law unasked.
    const defs = await loadCardDefs();
    const boardedMap = new Map<string, string>();
    for (const [id, def] of defs) {
      for (const fam of def.boarded ?? []) boardedMap.set(fam, id);
    }
    const modelLess = [...defs.entries()].filter(([, def]) => (def.boarded ?? []).length === 0);
    assert.ok(modelLess.length > 0, "the census found model-less cards (mask, rig) — a judge over zero rows is a vacuous pass");
    for (const [id] of modelLess) {
      const res = resolveSpecKey(id, defs, boardedMap);
      assert.notEqual(res, null, `card-id alias key '${id}' resolves`);
      assert.equal(res!.model, undefined, `resolution for '${id}' carries no model (got '${String(res!.model)}')`);
      assert.equal(res!.service, id, `a model-less card IS its own service ('${id}')`);
      const spec = await formSpecArm(id);
      assert.notEqual(spec, null, `the door serves '${id}'`);
      assert.equal((spec as { model?: string | null }).model ?? null, null,
        `the served envelope for '${id}' carries NO model seat — a minted id is the run-door refusal the operator hit`);
    }
    // The boarded arm proves the same door still names real models:
    // the kill must narrow, never widen (a model-ful card keeps its seat).
    const res = resolveSpecKey("krea-2", defs, boardedMap);
    assert.equal(res !== null && res.model !== undefined && res.model.startsWith("krea-2"), true,
      "a boarded family still resolves a model id");
  });

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
    // options are EXACTLY the family's DECLARED rows (B-C3: the
    // oracle is KREA_ROWS — packages/models/krea-2/mods/loras.ts —
    // not the service's own catalog, which would agree with the door
    // even when both are wrong together).
    const modifiers = ((spec as { features: { modifiers: Record<string, unknown>[] } })
      .features.modifiers);
    const lora = modifiers.find((m) => m.kind === "lora");
    assert.notEqual(lora, undefined, "the lora modifier pack rides the spec");
    assert.ok(KREA_ROWS.length > 0, "krea-2 declares lora rows (census floor — the import rotted)");
    const want = KREA_ROWS.map((r) => r.id).sort();
    const got = [...(lora!.options as Array<{ value: string }>)]
      .map((o) => o.value).sort();
    assert.deepEqual(got, want, "lora option values == the family's DECLARED row ids (KREA_ROWS)");
    // EVERY declared default_strength rides its option — ALL rows,
    // not one exemplar (B-C4: the plural law was pinned on a single
    // .find() row, so eleven rows could silently drop their strength
    // while the wall stayed green). And the arm REQUIRES at least one
    // strength to exist (the walls audit's row 14, 2026-10-10: a
    // wall inside a conditional is a wall with no door).
    assert.ok(KREA_ROWS.some((r) => r.default_strength !== undefined),
      "krea-2's lora rows declare a default_strength (the wall requires the law to be there)");
    for (const row of KREA_ROWS) {
      const opt = (lora!.options as Array<{ value: string; defaults: { strength?: number } }>)
        .find((o) => o.value === row.id)!;
      assert.notEqual(opt, undefined, `${row.id} has an option (the declared rows all ride)`);
      if (row.default_strength === undefined) continue;
      assert.equal(opt?.defaults.strength, row.default_strength,
        `${row.id}: the option defaults carry the family's declared strength`);
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

  it("THE MINTED-FAMILY KILL (catalog face) — /v1/model-catalog never mints a card id as a family (PROOF-12's sibling, 2026-10-12)", async () => {
    // THE HUNT'S LIVE CAPTURE (audits/contracts/2026-10-12-hunt-spec-mints.md):
    // the same HTTP body that served capabilities.mask.resolved.model = "mask"
    // carried a families census in which "mask" did not exist — the catalog
    // disproved its own rows. The kill on THIS face: the catalog's
    // cards/capabilities sections serve NO family, NO default, and NO
    // resolved for a model-less card — the card-id alias is the RUN plane's
    // admission law (PROOF-13), never a served pick. The roster is DERIVED
    // from the live defs.
    const defs = await loadCardDefs();
    const modelLess = [...defs.entries()].filter(([, def]) => (def.boarded ?? []).length === 0);
    assert.ok(modelLess.length > 0, "the census found model-less cards — a judge over zero rows is a vacuous pass");
    const modelLessIds = new Set(modelLess.map(([id]) => id));

    // FACE 1 — the catalog's cards + capabilities sections
    const cat = await modelCatalogArm();
    const cards = cat.cards as Record<string, Record<string, unknown>>;
    const caps = cat.capabilities as Record<string, Record<string, unknown>>;
    const famKeys = new Set(Object.keys(cat.families as Record<string, unknown>));
    for (const id of modelLessIds) {
      const row = cards[id] as { families?: unknown } | undefined;
      assert.ok(row !== undefined, `the catalog serves the model-less card '${id}'`);
      assert.deepEqual(row!.families, [], `catalog.cards['${id}'].families is EMPTY — the card id is not a family`);
      const cap = caps[id];
      assert.ok(cap !== undefined, `the catalog serves capabilities for '${id}'`);
      assert.equal(cap!.default_family ?? null, null, `capabilities['${id}'].default_family is null — no minted default`);
      assert.deepEqual(cap!.families, [], `capabilities['${id}'].families is EMPTY`);
      assert.equal(cap!.resolved ?? null, null, `capabilities['${id}'].resolved is null — the minted model died here`);
    }
    // every served family on EVERY card row is a real families-census key
    // (the catalog never disproves its own rows, for any card)
    for (const [id, row] of Object.entries(cards)) {
      for (const f of (row.families as string[]) ?? []) {
        assert.ok(famKeys.has(f), `cards['${id}'] serves family '${f}' that the same body's families census does not carry`);
      }
    }
    // the boarded control: a model-ful card still serves its real family
    assert.ok((cards["image-gen"].families as string[]).length > 0, "a boarded card still serves its families");
  });

  it("THE DISPLAY FOLD (naming law) — a route address never displays as a family row (operator 2026-10-12 catch)", async () => {
    // THE QWEN-TTS DISPLAY DEFECT, verbatim: the fold (e596f0921)
    // collapsed the registry to ONE qwen3-tts atom with flavor
    // variants (customvoice/voicedesign/base) and size quants
    // (1_7b/0_6b) — but the tts card boards the retained ROUTE
    // ADDRESSES too (the offered-set law, 2026-09-23: the bench
    // door and the tool enum offer atoms + routes so an old draft
    // resolves), and every DISPLAY face mapped def.boarded
    // VERBATIM — the drill's Model axis served FIVE qwen rows.
    // THE NAMING LAW (operator 2026-10-26): MODEL = the family
    // atom, VARIANT = flavor, QUANT = size. A route address is a
    // CELL SELECTOR, never a display row. The route roster is
    // DERIVED from the live defs (axis 4) — every boarded id whose
    // owningAtom differs from itself — never a hand-list.
    const defs = await loadCardDefs();
    const routes = new Set<string>();
    for (const def of defs.values()) {
      for (const fam of def.boarded ?? []) {
        if (owningAtom(fam) !== fam) routes.add(fam);
      }
    }
    // the judge is live only when the tree boards routes: the tts
    // card boards five today. A tree that boards none makes this
    // wall vacuous — so the tts pin below carries the weight.
    assert.ok(routes.size > 0, `the census found retained route addresses boarded (found ${routes.size}) — the offered-set law is live`);
    assert.ok(routes.has("qwen3-tts-voicedesign"), "the qwen fold's retained addresses are in the census (the fold law is live)");

    // FACE 1 — /v1/model-catalog cards section: families = owning atoms
    const cat = await modelCatalogArm();
    const cardsRows = cat.cards as Record<string, Record<string, unknown>>;
    for (const [id, row] of Object.entries(cardsRows)) {
      for (const f of (row.families as string[]) ?? []) {
        assert.equal(owningAtom(f), f, `catalog.cards['${id}'] serves '${f}' — a route address displays as a family row (the naming law: MODEL = atom, VARIANT = flavor, QUANT = size)`);
      }
    }
    // FACE 2 — the catalog's agent models rows (buildCatalog): same law
    const modelsRows = Array.isArray(cat.models) ? (cat.models as Array<Record<string, unknown>>) : Object.values(cat.models as Record<string, Record<string, unknown>>);
    for (const row of modelsRows) {
      for (const f of (row.families as string[]) ?? []) {
        assert.equal(owningAtom(f), f, `catalog.models['${String(row.name)}'] serves '${f}' — a route address on the agent plane`);
      }
    }
    // FACE 3 — /v1/form-spec families block (the GUI's Model axis source)
    // + THE CONCRETE PIN: the tts card serves EXACTLY the one atom.
    const ttsSpec = await formSpecArm("tts");
    assert.ok(ttsSpec !== null, "the tts card's form-spec resolves");
    const specFamilies = ((ttsSpec as { families?: Array<{ id?: string }> }).families ?? []).map((r) => r.id ?? "");
    assert.deepEqual(specFamilies, ["qwen3-tts"], `the tts form-spec families block serves exactly the one atom — got [${specFamilies.join(", ")}]`);
    for (const [id] of defs.entries()) {
      const spec = await formSpecArm(id);
      if (spec === null) continue;
      for (const row of ((spec as { families?: Array<{ id?: string }> }).families ?? [])) {
        const f = row.id ?? "";
        assert.equal(owningAtom(f), f, `form-spec('${id}') families block serves '${f}' — a route address on the GUI's Model axis`);
      }
    }
  });

  it("THE MINTED-FAMILY KILL (card-tools face) — /v1/card-tools never mints a card id as a model (PROOF-12's sibling, 2026-10-12)", async () => {
    // THE HUNT'S LIVE CAPTURE (audits/contracts/2026-10-12-hunt-spec-mints.md
    // §2): cardToolsArm served model: "mask" / "rig" — the card id as a model
    // seat on the agent manifest face (melite-load's own render calls this
    // shape "the agent's card manifest"). The kill on THIS face: a model-less
    // card serves model null and families [] — the card-unit alias is the RUN
    // plane's admission law (PROOF-13), never a served pick. The roster is
    // DERIVED from the live defs, and the boarded control proves the kill
    // narrows (a model-ful card keeps its pick).
    const defs = await loadCardDefs();
    const modelLess = [...defs.entries()].filter(([, def]) => (def.boarded ?? []).length === 0);
    assert.ok(modelLess.length > 0, "the census found model-less cards — a judge over zero rows is a vacuous pass");
    const modelLessIds = new Set(modelLess.map(([id]) => id));

    // FACE 2 — /v1/card-tools
    const tools = (await cardToolsArm()) as Array<Record<string, unknown>>;
    assert.ok(tools.length > 0, "card-tools serves rows");
    for (const id of modelLessIds) {
      const row = tools.find((t) => t.name === id);
      assert.ok(row !== undefined, `card-tools serves the model-less card '${id}'`);
      assert.equal(row!.model ?? null, null, `card-tools['${id}'].model is null — the minted pick died here`);
      assert.deepEqual(row!.families, [], `card-tools['${id}'].families is EMPTY`);
    }
    const boardedTool = tools.find((t) => t.name === "image-gen");
    assert.ok(boardedTool !== null && typeof boardedTool.model === "string", "a boarded card still serves its model pick");
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
    // B-C3: the oracle is the DECLARATION (ZIMAGE_CONTROLNET_ROWS —
    // packages/models/z-image/mods/controlnet.ts), not the service's
    // own catalog; and the count derives from it too (the old `7`
    // was a hand number beside the derivation).
    assert.ok(ZIMAGE_CONTROLNET_ROWS.length > 0, "z-image declares controlnet rows (census floor — the import rotted)");
    const want = ZIMAGE_CONTROLNET_ROWS.map((r) => r.id).sort();
    const options = cn!.options as Array<{
      value: string; label: string; tooltip: string; defaults: { strength?: number };
      model: string; preprocessor?: string;
    }>;
    assert.deepEqual(options.map((o) => o.value).sort(), want, "option values == the DECLARED union rows (ZIMAGE_CONTROLNET_ROWS)");
    assert.equal(options.length, ZIMAGE_CONTROLNET_ROWS.length, "option count == the declared rows");
    for (const row of ZIMAGE_CONTROLNET_ROWS) {
      const opt = options.find((o) => o.value === row.id)!;
      assert.notEqual(opt, undefined, `${row.id} has an option (the declared rows all ride)`);
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
    // B-M7 (the wall audit, 2026-09-28): the option ids, the weight
    // table and the filename table were RE-TYPED copies of
    // ZIMAGE_IPADAPTER_ROWS — drift on either side moved together
    // and the arm could not fail. The DECLARATION is the oracle now,
    // field-by-field (the same law as the controlnet arm above).
    assert.deepEqual(options.map((o) => o.value), ZIMAGE_IPADAPTER_ROWS.map((r) => r.id),
      "the served options ARE the declared rows, in order");
    for (const row of ZIMAGE_IPADAPTER_ROWS) {
      const opt = options.find((o) => o.value === row.id);
      assert.notEqual(opt, undefined, `${row.id} has an option (the declared rows all ride)`);
      assert.equal(opt!.defaults.weight, row.default_weight, `${row.id} seeds its declared weight`);
      assert.equal(opt!.model, row.filename, `${row.id} stamps the retired filename as a catalog note`);
      assert.equal(opt!.label, row.label, `${row.id} serves its declared label`);
      assert.equal(opt!.tooltip, row.tooltip, `${row.id} serves its declared tooltip`);
    }
    const schemas = (spec as { mod_schemas: Record<string, unknown> }).mod_schemas;
    assert.ok("ip_adapter" in schemas, "the ip_adapter pack envelope rides mod_schemas");
  });

  it("serves the qwen-img-21 envelope with the mask pack envelope in mod_schemas (MASK-C)", async () => {
    // The cured family serves the region vocabulary on the gen
    // card: the mask pack envelope rides mod_schemas under the pack
    // name (the same seat the controlnet/ip_adapter arms pin for
    // z-image). Bare boarding (a DECL mods entry with no flavor
    // file) leaves the seat empty — the toggle that proves this arm
    // renames packages/models/qwen-img-21/mods/mask.ts away and
    // watches red.
    const spec = await formSpecArm("qwen-img-21");
    assert.notEqual(spec, null, "qwen-img-21 must resolve");
    const schemas = (spec as { mod_schemas: Record<string, unknown> }).mod_schemas;
    assert.ok("mask" in schemas, "the mask pack envelope rides mod_schemas for the cured family");
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
