// mod-interlock.spec.ts — THE MOD/VERB INTERLOCK WALL.
//
// Pins (the melite_cards interlock):
//   - REGISTRATION: mods and verbs register through the
//     ComfyUIService (registerPack/registerFlavor/registerVerb —
//     the pack/flavor split) under src/mods/ — the Model.mods
//     declarations as code, PORT LAW shape (never frozen JSON +
//     walkers);
//   - ABSORPTION: the absorbed envelope is pinned by live
//     literals (field order IS the contract — schemastery
//     preserves declaration order) for the two hardest keys —
//     image-edit/qwen-img-edit-2511 (3 packs) and
//     image-gen/krea-2 (loras with rows);
//   - FAMILY SCOPING: krea-2's loras never leak onto other
//     families (the interlock's whole point);
//   - THE LOUD LAWS ported as registration gates: duplicate verb
//     id refuses, two-shape same-pack refuses, the verb plane law
//     (exactly one engine arm), min>max / step<=0 / out-of-range
//     default refuse at the gate;
//   - VERBS: the anny card mounts all five verbs with their
//     flow ids; SubActionMod knobs NEVER join the card surface.
//
// Run: npx vitest run tests/walls/ts/suites/mod-interlock.spec.ts

import assert from "node:assert/strict";
// THE PER-FILE BOOT, first import (li-bp's battery red): this spec
// reads registryIds()/getModel() — the models service singleton —
// but never booted it, inheriting whatever boot a SIBLING suite in
// the same fork had left (scoped runs rode a neighbor's boot; the
// battery's alphabetical order ran this file first, met an unbooted
// singleton, and five tests died on "models service not booted").
// The shared helper is the house pattern — same guarantee as every
// models-* sibling, scoped to the files that ask for it.
import "../../../helpers/boot-models.ts";
import { test } from "vitest";
import z from "../../../../packages/engines/comfyui-cordis/src/_z.ts"; // re-export of the pinned schemastery (walls cannot import node_modules TS)
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/index.ts";
import { loadFacts } from "../../../../packages/engines/comfyui-card-kit/src/facts.ts";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
// THE LANES ARE FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// consumption gate walks the composed graph of the segment under test,
// and those segments are the families' declared actions now — the kit's
// arm twins are deleted, so the wall composes through the same actions
// the cards dispatch.
import { instantiateAction } from "../../../../packages/engines/comfyui-card-kit/src/action.ts";
// the firing GATE stays kit admission (the lane it guards is family-owned now)
import { refuseImageEditFiring } from "../../../../packages/engines/comfyui-card-kit/src/kit.ts";
import { t2i as zImageT2i } from "../../../../packages/models/z-image/src/actions.ts";
import { speak as qwenSpeak } from "../../../../packages/models/qwen3-tts/src/actions.ts";


/** Registry reads for the derivation (facts.ts renders through injected reads). */
const reads = { getModel, registryIds, registryModel };

/** field names of a mod contract (the dict is the field table). */
const names = (a: { fields: { dict?: Record<string, unknown> } }): string[] =>
  Object.keys(a.fields.dict ?? {});

await loadCardDefs();
const svc = theService();

test("mods registered through the service as plugins (PORT LAW: Schemastery contracts)", () => {
  // the absorption is non-empty for all four families
  const edit = svc.cardModFields("image-edit");
  // D-M13 (the wall audit, 2026-09-28): this arm used has() over a
  // set while both siblings deepEqual the EXACT absorbed surface —
  // a dropped or added field walked past. The exact list is pinned
  // (field order IS the contract — schemastery preserves
  // declaration order).
  assert.deepEqual(edit.flatMap(names), [
    // (D-M13: the exact absorbed surface, declaration order — the
    // old arm's has() over six names let twenty fields drift past)
    "image1",
    "lanpaint_enabled", "lanpaint_num_steps", "lanpaint_step_size", "lanpaint_lambda",
    "lanpaint_beta", "lanpaint_friction", "lanpaint_prompt_mode",
    "outpaint_top", "outpaint_right", "outpaint_bottom", "outpaint_left", "outpaint_overlap",
    "loras",
    "mask", "input_mask", "mask_mode", "mask_detector", "mask_context_pad",
    "mask_grow", "mask_feather", "mask_threshold", "mask_invert", "mask_detail_size", "mask_denoise",
  ], "image-edit absorbs the edit packs' surface, exactly and in order");
  // every mod's fields ARE a z.object contract (the dual-decl pattern)
  for (const a of edit) {
    assert.ok(a.fields.dict !== undefined, `pack ${a.pack} carries a Schemastery object contract`);
  }
  const gen = svc.cardModFields("image-gen");
  assert.deepEqual(gen.flatMap(names), ["controlnets", "controlnet_strength_floor",
    "ip_adapters", "loras",
    // MASK-C (the image-gen region gap): the mask pack contract
    // absorbs onto the gen card for the cured qwen-img-21 boarding
    // (the bag + the ten scalar riders, pack-sorted after loras).
    "mask", "input_mask", "mask_mode", "mask_detector", "mask_context_pad",
    "mask_grow", "mask_feather", "mask_threshold", "mask_invert",
    "mask_detail_size", "mask_denoise",
  ],
    "image-gen absorbs loras + the controlnet stack (the z-image restoration) + the ip_adapter bag (the refused-fate restoration: vocabulary served, entries refuse loud) + the mask contract (MASK-C: the 2.1 checkpoint's region vocabulary)");
  const tts = svc.cardModFields("tts");
  assert.deepEqual(tts.flatMap(names).sort(), ["qvoice", "repetition_penalty", "seed", "speed", "temperature", "top_p", "voice_name", "voice_strength"], "tts absorbs the qvoice pack + the qvoice_save pack (the README stroke — save lives on the tts card's mods; the DESIGN PROMPT moved to the lane's own card row design_prompt 2026-09-23, one knob one owner — the pack keeps the export name + design sampling)");
});

// THE ENVELOPE PARITY: formSchemas serves the card's own toJSON
// and the envelope's dict names are pinned as live literals (order
// + set: schemastery preserves declaration order). Group/zone facts
// derive client-side off meta.extra (card-base fieldsOf owns that
// walk), so the node-side wall pins names + mod scoping only.
const envelopeNames = (card: string, fam: string): string[] => {
  const out = svc.formSchemas(card, fam);
  if (out === null || out.schema === null) return [];
  const env = out.schema as { refs: Record<string, { type?: string; dict?: Record<string, unknown> }> };
  const root = Object.values(env.refs).find((n) => n.type === "object" && n.dict !== undefined);
  return Object.keys(root?.dict ?? {});
};

test("absorption: image-edit/qwen-img-edit-2511 envelope pinned (declaration order)", () => {
  const live = envelopeNames("image-edit", "qwen-img-edit-2511");
  assert.deepEqual(live, [
    // THE ONE LIST (the merge, 2026-10-10): input_images is the one
    // visible face; every legacy spelling rides after it, hidden.
    "input_images",
    "image1", // legacy anchor (hidden — card-owned since the 2.1 rework)
    "image2", "image3", "reference_images", // legacy spellings (hidden)
    "input_mask", // the mask-seat gate key (hidden, validation-only — the mask pack owns the visible row)
    "prompt", "negative_prompt",
    "width", "height", "match_input_resolution", // the resolution group: 2.1's target pair + the card-owned match toggle (ON by default; 2511 holds it as a no-op)
    "seed", "steps", "cfg", "sampler", "scheduler", "use_stock_nodes",
    "double_reference",
  ]);
});

test("absorption: image-gen/krea-2 envelope pinned (declaration order)", () => {
  const live = envelopeNames("image-gen", "krea-2");
  assert.deepEqual(live, [
    "prompt", "negative_prompt", "width", "height",
    "seed", "steps", "cfg", "sampler", "scheduler",
    // reference_images (audit 004/C4, 2026-10-22): the image-gen
    // card's reference seat, served LAST so the frozen form_spec
    // field order holds; it fires only on the qwen-img-21 lane (a
    // stated list on another family refuses at compose — the
    // phantom-port law).
    "reference_images",
  ]);
});

test("family scoping: krea-2's loras never leak", () => {
  // z-image boards loras too since the restoration — the leak test
  // covers families boarding NEITHER pack.
  // THE SERVED-COUNT FLOOR (the walls audit's row 9, 2026-10-10):
  // the arm `continue`d on a null serve — a family renamed off the
  // card emptied the leak test into a silent pass. The count is
  // pinned: the leak is only proved on families that SERVED.
  let served = 0;
  for (const fam of ["flux-schnell", "sd-35-large"]) {
    const out = svc.formSchemas("image-gen", fam);
    if (out === null) continue;
    served++;
    assert.ok(!("loras" in out.mods), `${fam} must not carry krea-2's loras contract`);
    assert.ok(!("controlnet" in out.mods), `${fam} must not carry z-image's controlnet contract`);
  }
  assert.equal(served, 2,
    `the leak arm proved itself on real serves (${String(served)} of 2 — a renamed family empties the leak test)`);
  // the boarded families DO see them (the scoping half)
  const krea = svc.formSchemas("image-gen", "krea-2")!;
  assert.ok("loras" in krea.mods, "krea-2's own family sees the loras contract");
  assert.ok(!("controlnet" in krea.mods), "krea-2 boards no controlnet — the stack never leaks");
  const zim = svc.formSchemas("image-gen", "z-image")!;
  assert.ok("loras" in zim.mods, "z-image boards loras since the restoration");
  assert.ok("controlnet" in zim.mods, "z-image's own family sees the controlnet contract");
});

test("krea lora rows: the 12 rows pinned (id/label/strength)", () => {
  const rows = svc.modRows("loras", "krea-2");
  // source_url is optional-statically but the wall's own law (no
  // link, no row) pins it present on every row — the rows below prove it.
  assert.ok(rows.every((r) => r.source_url!.startsWith("https://")), "no link, no row");
  assert.deepEqual(
    rows.map((r) => ({ id: r.id, label: r.label, s: r.default_strength })),
    [
      { id: "krea2_realism_lora", label: "Realism", s: 0.7 },
      { id: "krea2_turbo_lora_rank_64_bf16", label: "Turbo Rank-64 (BF16)", s: 1 },
      { id: "krea2_darkbrush", label: "Dark Brush", s: 0.8 },
      { id: "krea2_dotmatrix", label: "Dot Matrix", s: 0.8 },
      { id: "krea2_kidsdrawing", label: "Kids Drawing", s: 0.8 },
      { id: "krea2_neondrip", label: "Neon Drip", s: 0.8 },
      { id: "krea2_rainywindow", label: "Rainy Window", s: 0.8 },
      { id: "krea2_retroanime", label: "Retro Anime", s: 0.8 },
      { id: "krea2_softwatercolor", label: "Soft Watercolor", s: 0.8 },
      { id: "krea2_sunsetblur", label: "Sunset Blur", s: 0.8 },
      { id: "krea2_vintagetarot", label: "Vintage Tarot", s: 0.8 },
      { id: "krea2filterbypass3", label: "Filter Bypass 3", s: 0.8 },
    ],
  );
});

test("THE OWN-ROWS LAW: qwen serves its own rows; family rows win", () => {
  // 2026-10-15 (the lora audit's B4): qwen registered an EMPTY
  // runtime flavor, so the picker served the union of OTHER
  // families' rows while the LoRAs actually on disk for qwen were
  // offered to no one — a family with an empty runtime flavor
  // serves an empty picker. The rows are declared now (Lightning
  // 4-step distill, fal's Multiple Angles camera control, the MCNL
  // multi-concept) and family rows ALWAYS WIN over the union (the
  // runtimeCatalog arm only serves a family that declares none).
  const own = svc.modRows("loras", "qwen-img-edit-2511");
  assert.deepEqual(
    own.map((r) => ({ id: r.id, s: r.default_strength })),
    [
      { id: "qwen_edit_lightning_4step", s: 1 },
      { id: "qwen_edit_multiple_angles", s: 0.8 },
      { id: "qwen_edit_plus_mcnsfw", s: 0.8 },
    ],
  );
  // no link, no row — the wall's own law, now for qwen too
  assert.ok(own.every((r) => r.source_url!.startsWith("https://")), "no link, no row");
  // the union is RETIRED for qwen: another family's row must not
  // serve here, and qwen's rows must not serve there
  assert.ok(!own.some((r) => r.id === "krea2_realism_lora"), "krea's rows stay krea's");
  const krea = svc.modRows("loras", "krea-2");
  assert.ok(!krea.some((r) => r.id === "qwen_edit_lightning_4step"), "qwen's rows stay qwen's");
  assert.equal(krea.length, 12, "family rows unchanged");
});

test("the anny card mounts all five verbs; knobs never join the surface", () => {
  const verbs = svc.cardVerbs("anny");
  assert.deepEqual(verbs.map((v) => v.id).sort(),
    ["dress", "hmr-estimate", "preset-load", "preset-save", "prop"]);
  const byId = new Map(verbs.map((v) => [v.id, v]));
  assert.equal(byId.get("hmr-estimate")?.engines[0]?.flow, "anny-hmr-estimator");
  assert.equal(byId.get("preset-load")?.engines[0]?.flow, "anny-params");
  assert.equal(byId.get("preset-save")?.engines[0]?.local, "save-preset");
  assert.equal(byId.get("dress")?.engines[0]?.flow, "fit-seat");
  // SubActionMod law: verb fields stay OFF the card surface
  const surface = svc.cardModFields("anny").flatMap(names);
  for (const knob of ["person_index", "preset_id", "fit_ratio"]) {
    assert.ok(!surface.includes(knob), `verb knob ${knob} leaked onto the card surface`);
  }
  // verb knobs are contracts too (the tool-contract pattern)
  for (const v of verbs) {
    assert.ok(v.fields.dict !== undefined, `verb ${v.id} knobs are a Schemastery contract`);
  }
});

test("the loud laws: registration gates refuse", () => {
  assert.throws(() => svc.registerVerb({
    id: "hmr-estimate", label: "dup", families: ["anny"], engines: [{ id: "x", flow: "f" }],
    writes: [], requires: [], fields: z.object({}) as never,
  }), /registered twice/);
  assert.throws(() => svc.registerVerb({
    id: "two-arms", label: "x", families: ["anny"],
    engines: [{ id: "e", flow: "f", local: "l" }], writes: [], requires: [], fields: z.object({}) as never,
  }), /exactly one/);
  // PACK gates: one shape per pack name (the category contract)
  assert.throws(() => svc.registerPack({
    pack: "loras",
    fields: z.object({ wrong_shape: z.string() }) as never,
  }), /two shapes/);
  assert.throws(() => svc.registerPack({
    pack: "broken",
    fields: z.object({ bad: z.number().min(10).max(1) }) as never,
  }), /min 10 > max 1/);
  assert.throws(() => svc.registerPack({
    pack: "broken",
    fields: z.object({ bad: z.number().step(0) }) as never,
  }), /step 0 <= 0/);
  assert.throws(() => svc.registerPack({
    pack: "broken",
    fields: z.object({ bad: z.number().min(0).max(1).default(5) }) as never,
  }), /outside/);
  // FLAVOR gates: the category lands first (unknown pack = drift);
  // a flavor rides a model (no empty families)
  assert.throws(() => svc.registerFlavor({
    pack: "no-such-pack", families: ["krea-2"],
  }), /no such pack/);
  assert.throws(() => svc.registerFlavor({
    pack: "loras", families: [],
  }), /no families/);
});

test("the correction stroke: flavors are family-owned and the boarding is bidirectional", async () => {
  // the flavor set ≡ the DECL.mods boardings, both planes read
  // (the boot interlock enforces this loudly; this pin reads the
  // settled state so a silent regression shows as drift)
  const { modelIds, registryIds, getModel } = await import(
    "../../../../packages/engines/comfyui-cordis/src/models/models.ts"
  );
  const packs = new Set(svc.packNames());
  const verbs = new Set(svc.verbIds());
  // every DECL.mods entry is a live pack or verb id (the MODEL
  // plane — variant routes inherit the boarding, never re-declare).
  // THE MARRIAGE GRAMMAR (#36): entries are pack names or
  // {pack, marries} declarations — the boarding test reads the
  // pack name either way (one normalizer, the service's own law)
  // D-M13 (the wall audit, 2026-09-28): both walks were `?? []` +
  // continue with NO census — a mods/flavor table emptied at the
  // source judged ZERO rows and passed vacuously. Both are counted.
  let judgedBoardings = 0;
  for (const id of registryIds()) {
    for (const entry of (getModel(id).mods ?? []).map((m) => (typeof m === "string" ? m : m.pack))) {
      judgedBoardings++;
      assert.ok(packs.has(entry) || verbs.has(entry),
        `${id} boards '${entry}' — dead boarding (the amnesty is over)`);
    }
  }
  // every flavor's family boards its pack (undeclared mutation —
  // the marriage grammar normalizes to pack names, the same law)
  let judgedFlavors = 0;
  for (const flavor of svc.flavorRegistrations()) {
    for (const fam of flavor.families) {
      judgedFlavors++;
      assert.ok((getModel(fam).mods ?? []).map((m) => (typeof m === "string" ? m : m.pack)).includes(flavor.pack),
        `${fam} carries a '${flavor.pack}' flavor its DECL does not board`);
    }
  }
  assert.ok(judgedBoardings >= 5,
    `the boarding walk judged real rows (${String(judgedBoardings)} — a mods table emptied at the source is an empty pass)`);
  assert.ok(judgedFlavors >= 5,
    `the flavor walk judged real rows (${String(judgedFlavors)} — a flavor registry emptied at the source is an empty pass)`);
  // every DECLARED pack boarding HAS a flavor for that family (the
  // satisfaction law's third edge — a boarding whose flavor file
  // was lost is a silent dead mutation, the boot gate refuses it)
  for (const id of registryIds()) {
    for (const entry of (getModel(id).mods ?? []).map((m) => (typeof m === "string" ? m : m.pack))) {
      if (verbs.has(entry)) continue;
      assert.ok(
        svc.flavorRegistrations().some((f) => f.pack === entry && f.families.includes(id)),
        `${id} boards '${entry}' with no flavor file — families/<genre>/${id}/mods/${entry}.ts must exist`,
      );
    }
  }
  // the pack taxonomy is the distinct category (controlnet LANDED
  // its boarder with the z-image restoration — seven union types;
  // ip_adapter boards refused — the ray receipt, four vocabulary
  // rows, every stated entry refuses loud at fire time)
  assert.deepEqual(svc.packNames(), ["controlnet", "ip_adapter", "lanpaint", "loras", "mask", "qvoice", "qvoice_save"]);
  const boarded = new Set(svc.flavorRegistrations().flatMap((f) => [f.pack]));
  assert.ok(boarded.has("controlnet"), "z-image boards controlnet — the pack serves its seven union types");
  assert.equal(svc.modRows("controlnet", "z-image").length, 7);
  assert.ok(boarded.has("ip_adapter"), "z-image boards ip_adapter — vocabulary only, fate refused");
  assert.equal(svc.modRows("ip_adapter", "z-image").length, 4);
  // krea-2's rows are FAMILY-OWNED (the flavor file, not the DECL)
  const krea = getModel("krea-2") as unknown as Record<string, unknown>;
  assert.ok(!("loras" in krea), "the DECL carries no loras data — rows live in the family's mods/ file");
  assert.equal(svc.modRows("loras", "krea-2").length, 12);
});

test("the correction stroke: a flavor disposal retracts the mutation", async () => {
  const before = svc.cardModFields("image-gen");
  assert.ok(before.some((a) => a.pack === "loras"));
  // the registration returns the inverse disposer (revertible
  // effects, paper §3.1): calling it retracts the flavor — the
  // fiber-coupled form is the same law (an effect on the family's
  // fiber dies with it)
  const retract = svc.registerFlavor({ pack: "mask", families: ["krea-2"] });
  assert.ok(svc.flavorRegistrations().some((f) => f.pack === "mask" && f.families.includes("krea-2")));
  retract();
  // THE MASK ORDER (2026-11-07): krea-2's OWN mask flavor now rides
  // the real boot, so the retraction is judged as a DELTA — the
  // count returns to the boot's own baseline (the synthetic
  // registration vanishes; the family's own boarding remains).
  const baseline = svc.flavorRegistrations().filter((f) => f.pack === "mask" && f.families.includes("krea-2")).length;
  assert.equal(baseline, 1, "the family's own mask flavor rides the boot");
  const after = svc.flavorRegistrations().filter((f) => f.pack === "mask" && f.families.includes("krea-2"));
  assert.equal(after.length, baseline, "fiber dispose retracts its flavor (back to the boot baseline)");
  assert.ok(svc.cardModFields("image-gen").some((a) => a.pack === "loras"));
});

test("THE CONSUMPTION GATE (paper §3.2.2): a smuggled mutation on a non-boarding atom refuses LOUD", async () => {
  // the z-image history: absorption is family-scoped but compose
  // stacked p.loras onto WHATEVER atom resolved. The gate fires
  // the mutation only where the atom boarded the pack
  // (ModelFacts.mods ≡ DECL.mods, pinned by the flows wall).
  // z-image boards loras + controlnet since the restoration — the
  // refusal atom is the z-image row with its boarding retracted
  // (the qvoice leg's counterfactual shape).
  const { GraphBuilder } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const facts = loadFacts(
    new URL("../../../../packages/engines/comfyui-cordis/data/model-facts.json", import.meta.url).pathname,
    reads,
  );
  const zim = facts.models["z-image"];
  const bare = { ...zim, mods: [] };
  const base = { seed: 1, width: 1024, height: 1024, steps: 8, cfg: 4.5, prompt: "x", negative_prompt: "" };
  const smuggled = { ...base, loras: [{ name: "foo.safetensors", strength: 0.8 }] };

  // z-image boards loras — the mutation fires (LoraLoader in graph)
  const gb = new GraphBuilder({});
  instantiateAction(zImageT2i, smuggled, zim, gb, "wall");
  assert.ok(JSON.stringify(gb.toJSON()).includes("LoraLoaderModelOnly"), "boarding atom must fire the mutation");
  // the retracted atom refuses, naming atom + pack
  assert.throws(
    () => instantiateAction(zImageT2i, smuggled, bare, new GraphBuilder(), "wall"),
    (err: unknown): boolean =>
      err instanceof Error &&
      String(err.message).includes("model 'z-image' does not board the 'loras' pack"),
  );
  // THE CONTROLNET LEG (the restoration): the resolved pick fires
  // the union chain on the boarding atom, refuses on the retracted
  // one — a smuggled stack is drift, not a skip.
  const cn = {
    type: "depth",
    model: "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors",
    image_b64: "map.png",
    strength: 1.0,
  };
  const wired = new GraphBuilder({});
  instantiateAction(zImageT2i, { ...base, controlnets: [cn] }, zim, wired, "wall");
  const graph = JSON.stringify(wired.toJSON());
  assert.ok(graph.includes("ZImageFunControlnet"), "boarding atom must fire the controlnet node");
  assert.ok(graph.includes("ModelPatchLoader"), "boarding atom must load the union patch");
  assert.throws(
    () => instantiateAction(zImageT2i, { ...base, controlnets: [cn] }, bare, new GraphBuilder(), "wall"),
    (err: unknown): boolean =>
      err instanceof Error &&
      String(err.message).includes("model 'z-image' does not board the 'controlnet' pack"),
  );
  // empty picks = no mutation = no gate (both planes pass through)
  instantiateAction(zImageT2i, base, bare, new GraphBuilder(), "wall");
  instantiateAction(zImageT2i, base, zim, new GraphBuilder(), "wall");
});

test("THE CONSUMPTION GATE, qvoice leg: a stated artifact fires only on boarding atoms", async () => {
  // the ttsT1 lane routes a stated .qvoice (bag or flat) into the
  // studio's clone pipeline — the second z-image-class site
  // (ungated composition). Counterfactual shape: the qwen row with
  // its boarding retracted must refuse, naming atom + pack.
  const { GraphBuilder } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const facts = loadFacts(
    new URL("../../../../packages/engines/comfyui-cordis/data/model-facts.json", import.meta.url).pathname,
    reads,
  );
  const qwen = facts.models["qwen3-tts"];
  const base = { text: "hi", voice: "", style_instruction: "", temperature: 0.7, seed: 1, qvoice: "" };
  // flat legacy path smuggle
  assert.throws(
    () => instantiateAction(qwenSpeak, { ...base, qvoice: "stolen.wav" }, { ...qwen, mods: [] }, new GraphBuilder({}), "wall"),
    (err: unknown): boolean =>
      err instanceof Error &&
      String(err.message).includes("model 'qwen3-tts' does not board the 'qvoice' pack"),
  );
  // bag smuggle (the surface's real form)
  assert.throws(
    () => instantiateAction(qwenSpeak, { ...base, qvoice: [{ qvoice: "stolen.qvoice" }] }, { ...qwen, mods: [] }, new GraphBuilder({}), "wall"),
    /does not board the 'qvoice' pack/,
  );
  // boarding atom, stated artifact → fires into the studio
  const gb = new GraphBuilder({});
  instantiateAction(qwenSpeak, { ...base, qvoice: [{ qvoice: "maria.qvoice" }] }, qwen, gb, "wall");
  assert.ok(JSON.stringify(gb.toJSON()).includes("maria.qvoice"), "boarding atom must fire the artifact");
  // blank knobs = no mutation = no gate
  instantiateAction(qwenSpeak, base, { ...qwen, mods: [] }, new GraphBuilder({}), "wall");
});

test("THE REVIVED LANPAINT, refused remainder: what the arm cannot carry refuses LOUD on the image-edit lane", async () => {
  // lanpaint + mask board qwen-img-edit-2511 and this plane BUILDS
  // the arm now (revived 2026-09-15, operator order "bring them
  // back") — the firing gate refuses only what no graph carries:
  // forcing with no region, the upstream-retired knobs, malformed
  // bags, and the unbuilt chains. Everything the arm wires rides
  // inert through the gate (never a silent plain run that drops a
  // stated knob — the law that never changed).
  // the refused remainder refuses field-named
  for (const [key, val] of [
    ["lanpaint_enabled", true],
    ["lanpaint_beta", 0.1],
    ["lanpaint_friction", 0.1],
    ["mask", "some.png"],
    ["mask", [{ input_mask: "a.png" }, { input_mask: "b.png" }]],
    ["mask_mode", "bbox"],
    ["mask_context_pad", 1],
    ["mask_threshold", 1],
  ] as Array<[string, unknown]>) {
    assert.throws(
      () => refuseImageEditFiring({ [key]: val }),
      (err: unknown): boolean => err instanceof Error && String(err.message).includes(`'${key}' fires on the image-edit card`),
    );
  }
  // the revived set rides inert — the arm (not the gate) owns it
  for (const params of [
    { lanpaint_num_steps: 99 },
    { lanpaint_step_size: 2.5 },
    { lanpaint_lambda: 0.1 },
    { lanpaint_prompt_mode: "positive" },
    { input_mask: "region.png" },
    { mask: [{ input_mask: "region.png" }] },
    { mask_grow: 1 },
    { mask_feather: 1 },
    { mask_invert: true },
    { lanpaint_enabled: true, input_mask: "region.png" },
  ] as Array<Record<string, unknown>>) {
    refuseImageEditFiring(params);
  }
  // lane promises ride inert (the stock plain-edit run)
  refuseImageEditFiring({});
});

test("THE REFUSED FATE, ip_adapter leg: stated entries refuse LOUD on the image-gen lane (the ray receipt)", async () => {
  // ip_adapter boards z-image but NO lane builds it in this plane —
  // ray's apply_ipadapters silently skipped used entries (except-
  // break, no-image skip, weight<=0 skip) on SD1.5 weights that
  // never stood on disk. This plane refuses every stated entry
  // LOUD, before any node renders — never a silent plain run that
  // drops the reference image.
  const guard = await import("../../../../packages/engines/comfyui-card-kit/src/mods/guard.ts");
  const zimage = { id: "z-image", mods: ["loras", "controlnet", "ip_adapter"] };
  // the gate direct: a stated bag refuses with the receipt
  assert.throws(
    () => guard.refuseIPAdapterFiring(zimage, { ip_adapters: [{ kind: "style", weight: 1 }] }),
    (err: unknown): boolean => err instanceof Error
      && /ip_adapters \[style\] refuses: no executable IP-Adapter lane/.test(String(err.message))
      && /SD1\.5-era files that never stood on disk/.test(String(err.message))
      && /ray lane silently skipped/.test(String(err.message)),
  );
  // an empty bag is the lane promise — rides inert (the plain run)
  guard.refuseIPAdapterFiring(zimage, {});
  guard.refuseIPAdapterFiring(zimage, { ip_adapters: [] });
  // a smuggled bag on a NON-boarding atom is drift, not a skip
  assert.throws(
    () => guard.refuseIPAdapterFiring({ id: "krea-2", mods: ["loras"] }, { ip_adapters: [{ kind: "face" }] }),
    (err: unknown): boolean => err instanceof Error && /does not board the 'ip_adapter' pack/.test(String(err.message)),
  );
  // the fate table row (boot gate (d) reads it)
  assert.equal(guard.PACK_FATE["ip_adapter"], "refused");
});

test("§3.1 REVERTIBLE, every registration: card/pack/verb disposers retract (no residue)", () => {
  // paper §3.1: every effect pairs its transformation with its
  // inverse; the runtime holds the inverse. Every registration
  // returns its disposer — flavor retraction is pinned above;
  // card, pack, and verb retraction here (self-cleaning probes on
  // the live service: register → assert → dispose → assert gone).
  const retractCard = svc.registerCard({
    id: "wall-probe-card",
    skeleton: "wall-probe",
    boarded: [],
    schema: z.object({}) as never,
    compose: (): void => {},
    // THE EMPTY CONTRACT (the flow-contract law: registration pins
    // every card's flowKinds — this arm's subject is disposal, not
    // contracts, so the probe declares the empty one; the contract's
    // own walls live in flows-wiring + service-plane).
    flowKinds: { inputs: {}, outputs: {} },
  } as never);
  assert.ok(svc.cardIds().includes("wall-probe-card"));
  retractCard();
  assert.ok(!svc.cardIds().includes("wall-probe-card"), "card disposal must retract");

  const retractPack = svc.registerPack({ pack: "wall-probe-pack", fields: z.object({}) as never });
  assert.ok(svc.packNames().includes("wall-probe-pack"));
  retractPack();
  assert.ok(!svc.packNames().includes("wall-probe-pack"), "pack disposal must retract");

  const retractVerb = svc.registerVerb({
    id: "wall-probe-verb",
    label: "probe",
    families: ["anny"],
    engines: [{ id: "probe", local: "wall-probe" }],
    writes: [],
    requires: [],
    fields: z.object({}) as never,
  });
  assert.ok(svc.verbIds().includes("wall-probe-verb"));
  retractVerb();
  assert.ok(!svc.verbIds().includes("wall-probe-verb"), "verb disposal must retract");
});

test("gate (d), the pack fate: every boarded pack is fired or refused-loud", async () => {
  // controlnet LANDED its fate with the z-image restoration (the
  // ModelPatchLoader → ZImageFunControlnet lane) — all five packs
  // pass. Live pin: every DECL pack entry has a fate (the boot
  // refuses otherwise, so this wall and the boot read one table).
  const guard = await import("../../../../packages/engines/comfyui-card-kit/src/mods/guard.ts");
  // D-M13 (the wall audit, 2026-09-28): the loop named FIVE packs by
  // hand while PACK_FATE carries SEVEN — qvoice_save and ip_adapter
  // walked past unchecked. The check DERIVES from the fate table
  // itself now (one truth, no second list), and the table's own
  // census is exact: seven fates stand.
  for (const p of Object.keys(guard.PACK_FATE)) guard.assertPackFate(p);
  assert.equal(Object.keys(guard.PACK_FATE).length, 7,
    `the fate table carries its packs (${String(Object.keys(guard.PACK_FATE).length)} — a pack landed or retired without touching this census is drift)`);
  const { registryIds, registryModel } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
  const verbs = new Set(svc.verbIds());
  // D-M13: the boarding walk was `?? []` + continue with no census —
  // a mods table emptied at the source judged ZERO boardings and
  // passed vacuously. Judged boardings are counted now.
  let judgedBoardings = 0;
  for (const id of registryIds()) {
    for (const entry of ((registryModel(id).mods ?? []) as readonly (string | { pack: string })[])
      .map((m) => (typeof m === "string" ? m : m.pack))) {
      if (verbs.has(entry)) continue;
      judgedBoardings++;
      assert.ok(
        (guard.PACK_FATE as Record<string, string>)[entry] !== undefined,
        `model '${id}' boards fateless pack '${entry}' — land the lane or the loud refusal first`,
      );
    }
  }
  assert.ok(judgedBoardings >= 5,
    `the fate walk judged real boardings (${String(judgedBoardings)} — a mods table emptied at the source is an empty pass)`);
});

test("the verb mirror: every mounted verb is boarded by its families' DECLs", async () => {
  // boot interlock (b)-for-verbs, walled live: a verb claiming a
  // family that never boarded it is an undeclared mutation. The
  // boot refuses; this wall pins the agreement on the live table.
  const { registryModel } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
  for (const verb of svc.verbRegistrations()) {
    assert.ok(verb.families.length > 0, `verb '${verb.id}' claims no family`);
    for (const fam of verb.families) {
      const mods = ((registryModel(fam).mods ?? []) as readonly (string | { pack: string })[])
        .map((m) => (typeof m === "string" ? m : m.pack));
      assert.ok(mods.includes(verb.id), `verb '${verb.id}' claims '${fam}' but its DECL never boarded it`);
    }
  }
  // and the reverse direction is total: every DECL verb entry names
  // a mounted verb (dead verb boardings refuse at boot gate (a)).
  const mounted = new Set(svc.verbIds());
  const { registryIds } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
  for (const id of registryIds()) {
    const { registryModel: rm } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
    for (const entry of ((rm(id).mods ?? []) as readonly (string | { pack: string })[])
      .map((m) => (typeof m === "string" ? m : m.pack))) {
      if (svc.packNames().includes(entry)) continue;
      assert.ok(mounted.has(entry), `model '${id}' boards verb '${entry}' no verb registers`);
    }
  }
});

test("THE MASK ORDER (operator 2026-11-07): every img-gen family boards mask; stated masks still refuse loud on the gen plane", async () => {
  // THE ORDER: the MASK mod serves on EVERY img-gen model — MASK-C's
  // per-family no-boards (the pure-t2i verdicts) are superseded. The
  // region vocabulary rides every gen card (the crop_stitch
  // detailer, the Impact pattern); the gen plane still builds no
  // region arm, so a stated mask refuses LOUD at admission — the
  // refused-fate honesty survives the wider boarding.
  const modsOf = (id: string): string[] =>
    ((registryModel(id).mods ?? []) as readonly (string | { pack: string })[])
      .map((m) => (typeof m === "string" ? m : m.pack));
  assert.ok(modsOf("qwen-img-21").includes("mask"),
    "qwen-img-21 boards 'mask' (the first cure — the region contract rode the 2.1 checkpoint on both cards)");
  // the flavor half of the interlock: a mask flavor scopes each
  // boarding family (boarding without it refuses at boot — the
  // toggle that proves this arm renames a family's mods/mask.ts
  // away and watches red).
  assert.ok(svc.flavorRegistrations().some((f) => f.pack === "mask" && f.families.includes("qwen-img-21")),
    "a 'mask' flavor scopes qwen-img-21 (the boarding's flavor file)");
  // THE ORDER'S REACH: the four pure-t2i families board too — each
  // with its own bare flavor (the DECL comments carry the operator
  // order; the superseded MASK-C verdicts are history, not law).
  for (const fam of ["anima", "flux-klein", "krea-2", "z-image"]) {
    assert.ok(modsOf(fam).includes("mask"),
      `${fam} boards 'mask' (the MASK ORDER: every img-gen family carries the region vocabulary)`);
    assert.ok(svc.flavorRegistrations().some((f) => f.pack === "mask" && f.families.includes(fam)),
      `a 'mask' flavor scopes ${fam} (the boarding's flavor file)`);
  }
  // THE PLANE-LOCAL FATE (the refused-fate honesty): no image-gen
  // lane builds a region arm (compose untouched), so a stated mask
  // on the gen card refuses LOUD — field-named, never a silent
  // plain run. E2-11 moved the refusal's LAW, not its fate: the
  // mask mod's keys are DECLARED surface now (MASK_RIDERS at the
  // walk — the mod's own keys, never 'undeclared param'), and
  // the refusal speaks at the card's own REGION FIRING GATE,
  // teaching where the region vocabulary composes. The region
  // story lives on the edit plane; the gen card routes nothing.
  const { GraphBuilder } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const gen = svc.getCardDef("image-gen") as unknown as {
    compose: (p: unknown, m: unknown, g: unknown, r: string) => void;
  };
  assert.throws(
    () => gen.compose({ prompt: "a cat", input_mask: "region.png" }, getModel("qwen-img-21") as never, new GraphBuilder({}), "wall-mask-c"),
    (err: unknown): boolean =>
      err instanceof Error && /'input_mask' fires on the image-gen card.*region arm/.test(err.message),
    "a stated input_mask on image-gen refuses LOUD at the firing gate (the fate this boarding carries)",
  );
});
