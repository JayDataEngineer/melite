// mod-interlock.test.ts — THE MOD/VERB INTERLOCK WALL (the 1:1
// cordis port, 2026-09-08: "Follow Cordis. Transfer the python
// functionality, 1:1 into Cordis.").
//
// Pins (the py melite_cards interlock, dsl.py @ 034e1f97):
//   - REGISTRATION: mods and verbs register through the
//     ComfyUIService (registerPack/registerFlavor/registerVerb —
//     the pack/flavor split, the correction stroke 2026-09-08)
//     under src/mods/ — the py Model.mods declarations as code,
//     PORT LAW shape (never frozen JSON + walkers);
//   - ABSORPTION PARITY: the absorbed surface matches the frozen
//     py referee (discovery-catalog form_specs) byte-exactly on
//     field ORDER, field SET, and group (id/zone/count) for the
//     two hardest keys — image-edit/qwen-img-edit-2511 (3 packs)
//     and image-gen/krea-2 (loras with rows);
//   - FAMILY SCOPING: krea-2's loras never leak onto other
//     families (the interlock's whole point);
//   - THE LOUD LAWS ported as registration gates: duplicate verb
//     id refuses, two-shape same-pack refuses, the verb plane law
//     (exactly one engine arm), min>max / step<=0 / out-of-range
//     default refuse at the gate;
//   - VERBS: the anny card mounts all five py verbs with their
//     flow ids; SubActionMod knobs NEVER join the card surface.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/mod-interlock.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import z from "../../../../packages/engines/comfyui-cordis/src/_z.ts"; // re-export of the pinned schemastery (walls cannot import node_modules TS)
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/index.ts";

/** field names of a mod contract (the dict is the field table). */
const names = (a: { fields: { dict?: Record<string, unknown> } }): string[] =>
  Object.keys(a.fields.dict ?? {});

const frozen = JSON.parse(
  readFileSync(new URL("../../../../packages/gateway/shell/data/discovery-catalog.json", import.meta.url), "utf8"),
) as { form_specs: Record<string, { status: number; body: Record<string, unknown> }> };

await loadCardDefs();
const svc = theService();

test("mods registered through the service as plugins (PORT LAW: Schemastery contracts)", () => {
  // the absorption is non-empty for all four py families
  const edit = svc.cardModFields("image-edit");
  const editNames = new Set(edit.flatMap(names));
  for (const n of ["image1", "lanpaint_enabled", "outpaint_overlap", "mask", "mask_mode", "loras"]) {
    assert.ok(editNames.has(n), `image-edit absorbed surface misses ${n}`);
  }
  // every mod's fields ARE a z.object contract (the dual-decl pattern)
  for (const a of edit) {
    assert.ok(a.fields.dict !== undefined, `pack ${a.pack} carries a Schemastery object contract`);
  }
  const gen = svc.cardModFields("image-gen");
  assert.deepEqual(gen.flatMap(names), ["loras"], "image-gen absorbs exactly loras");
  const tts = svc.cardModFields("tts");
  assert.deepEqual(tts.flatMap(names).sort(), ["qvoice", "voice_pca_strengths"], "tts absorbs the qvoice pack");
});

test("absorption parity: image-edit/qwen-img-edit-2511 byte-exact vs the py referee", () => {
  const ref = frozen.form_specs["qwen-img-edit-2511"].body;
  const live = svc.formSpec("image-edit", "qwen-img-edit-2511");
  assert.notEqual(live, null);
  const refFields = (ref.fields as Array<{ name: string }>).map((f) => f.name);
  const liveFields = (live.fields as Array<{ name: string }>).map((f) => f.name);
  assert.deepEqual(liveFields, refFields, "field order + set byte-exact");
  const refGroups = (ref.schema_groups as Array<{ id: string; zone: string; fields: unknown[] }>)
    .map((g) => [g.id, g.zone, g.fields.length]);
  const liveGroups = (live.schema_groups as Array<{ id: string; zone: string; fields: unknown[] }>)
    .map((g) => [g.id, g.zone, g.fields.length]);
  assert.deepEqual(liveGroups, refGroups, "group id/zone/count byte-exact");
});

test("absorption parity: image-gen/krea-2 byte-exact vs the py referee", () => {
  const ref = frozen.form_specs["krea-2"].body;
  const live = svc.formSpec("image-gen", "krea-2");
  assert.notEqual(live, null);
  const refFields = (ref.fields as Array<{ name: string }>).map((f) => f.name);
  const liveFields = (live.fields as Array<{ name: string }>).map((f) => f.name);
  assert.deepEqual(liveFields, refFields);
  const refGroups = (ref.schema_groups as Array<{ id: string; zone: string; fields: unknown[] }>)
    .map((g) => [g.id, g.zone, g.fields.length]);
  const liveGroups = (live.schema_groups as Array<{ id: string; zone: string; fields: unknown[] }>)
    .map((g) => [g.id, g.zone, g.fields.length]);
  assert.deepEqual(liveGroups, refGroups);
});

test("family scoping: krea-2's loras never leak", () => {
  for (const fam of ["z-image", "flux-schnell", "sd-35-large"]) {
    const spec = svc.formSpec("image-gen", fam);
    if (spec === null) continue;
    const names = (spec.fields as Array<{ name: string }>).map((f) => f.name);
    assert.ok(!names.includes("loras"), `${fam} must not carry krea-2's loras`);
  }
});

test("krea lora rows: byte-truth vs the frozen runtime catalog (the py referee)", () => {
  const rows = svc.modRows("loras", "krea-2");
  assert.equal(rows.length, 12);
  assert.ok(rows.every((r) => r.source_url.startsWith("https://")), "no link, no row");
  // the frozen spec's modifier options are the capture of the py
  // rows — value/label/defaults must agree row-for-row
  const ref = (frozen.form_specs["krea-2"].body as { features?: { modifiers?: Array<{ options?: Array<{ value: string; label: string; defaults?: { strength?: number } }> }> } })
    .features?.modifiers?.find((m) => m.kind === "lora")?.options ?? [];
  assert.equal(ref.length, 12, "frozen referee carries 12 options");
  for (const opt of ref) {
    const row = rows.find((r) => r.id === opt.value);
    assert.ok(row !== undefined, `row ${opt.value} missing`);
    assert.equal(row.label, opt.label, `label drift on ${opt.value}`);
    assert.equal(row.default_strength, opt.defaults?.strength, `default_strength drift on ${opt.value}`);
  }
});

test("THE RUNTIME CATALOG LAW: qwen serves the union; family rows win", () => {
  const union = svc.modRows("loras", "qwen-img-edit-2511");
  assert.equal(union.length, 12, "the union of every family's rows");
  assert.ok(union.some((r) => r.id === "krea2_realism_lora"));
  const own = svc.modRows("loras", "krea-2");
  assert.equal(own.length, 12, "family rows unchanged (they ARE the union source)");
});

test("the anny card mounts all five py verbs; knobs never join the surface", () => {
  const verbs = svc.cardVerbs("anny");
  assert.deepEqual(verbs.map((v) => v.id).sort(),
    ["dress", "hmr-estimate", "preset-load", "preset-save", "prop"]);
  const byId = new Map(verbs.map((v) => [v.id, v]));
  assert.equal(byId.get("hmr-estimate")?.engines[0]?.flow, "anny-hmr-commercial");
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
    "../../../../packages/engines/comfyui/src/models/models.ts"
  );
  const packs = new Set(svc.packNames());
  const verbs = new Set(svc.verbIds());
  // every DECL.mods entry is a live pack or verb id (the MODEL
  // plane — variant routes inherit the boarding, never re-declare)
  for (const id of registryIds()) {
    for (const entry of getModel(id).mods ?? []) {
      assert.ok(packs.has(entry) || verbs.has(entry),
        `${id} boards '${entry}' — dead boarding (the amnesty is over)`);
    }
  }
  // every flavor's family boards its pack (undeclared mutation)
  for (const flavor of svc.flavorRegistrations()) {
    for (const fam of flavor.families) {
      assert.ok((getModel(fam).mods ?? []).includes(flavor.pack),
        `${fam} carries a '${flavor.pack}' flavor its DECL does not board`);
    }
  }
  // every DECLARED pack boarding HAS a flavor for that family (the
  // satisfaction law's third edge — a boarding whose flavor file
  // was lost is a silent dead mutation, the boot gate refuses it)
  for (const id of registryIds()) {
    for (const entry of getModel(id).mods ?? []) {
      if (verbs.has(entry)) continue;
      assert.ok(
        svc.flavorRegistrations().some((f) => f.pack === entry && f.families.includes(id)),
        `${id} boards '${entry}' with no flavor file — families/<genre>/${id}/mods/${entry}.ts must exist`,
      );
    }
  }
  // the pack taxonomy is the distinct category (controlnet rides
  // registered-but-unboarded — the py truth, it waits for a
  // truthful boarder)
  assert.deepEqual(svc.packNames(), ["controlnet", "lanpaint", "loras", "mask", "qvoice"]);
  const boarded = new Set(svc.flavorRegistrations().flatMap((f) => [f.pack]));
  assert.ok(!boarded.has("controlnet"), "controlnet serves nothing until a family truthfully boards it");
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
  const after = svc.flavorRegistrations().filter((f) => f.pack === "mask" && f.families.includes("krea-2"));
  assert.equal(after.length, 0, "fiber dispose retracts its flavor");
  assert.ok(svc.cardModFields("image-gen").some((a) => a.pack === "loras"));
});

test("THE CONSUMPTION GATE (paper §3.2.2): a smuggled mutation on a non-boarding atom refuses LOUD", async () => {
  // the z-image violation: absorption is family-scoped (no loras
  // knob — walled above) but compose stacked p.loras onto
  // WHATEVER atom resolved. The gate fires the mutation only
  // where the atom boarded the pack (ModelFacts.mods ≡ DECL.mods,
  // pinned by the flows wall).
  const kit = await import("../../../../packages/engines/comfyui-cordis/src/kit.ts");
  const { GraphBuilder } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const facts = JSON.parse(
    readFileSync(new URL("../../../../packages/engines/comfyui-cordis/data/model-facts.json", import.meta.url), "utf8"),
  ) as { models: Record<string, Record<string, unknown>> };
  const base = { seed: 1, width: 1024, height: 1024, steps: 8, cfg: 4.5, prompt: "x", negative_prompt: "" };
  const smuggled = { ...base, loras: [{ name: "foo.safetensors", strength: 0.8 }] };

  // z-image boards NOTHING — smuggled loras refuse, naming atom + pack
  assert.throws(
    () => kit.imageT2I(smuggled, facts.models["z-image"], new GraphBuilder({}), "wall"),
    (err: unknown): boolean =>
      err instanceof Error &&
      String(err.message).includes("model 'z-image' does not board the 'loras' pack"),
  );
  // krea-2 boards loras — the mutation fires (LoraLoader in graph)
  const gb = new GraphBuilder({});
  kit.imageT2I(smuggled, facts.models["krea-2"], gb, "wall");
  assert.ok(JSON.stringify(gb.toJSON()).includes("LoraLoaderModelOnly"), "boarding atom must fire the mutation");
  // empty picks = no mutation = no gate (both planes pass through)
  kit.imageT2I(base, facts.models["z-image"], new GraphBuilder({}), "wall");
  kit.imageT2I(base, facts.models["krea-2"], new GraphBuilder({}), "wall");
});

test("THE CONSUMPTION GATE, qvoice leg: voice_file fires only on boarding atoms", async () => {
  // the ttsT1 lane wires p.qvoice/p.voice_pca_strengths straight
  // into AudiocoreTTS — the second z-image-class site (ungated
  // composition). Counterfactual shape: the qwen row with its
  // boarding retracted must refuse, naming atom + pack.
  const kit = await import("../../../../packages/engines/comfyui-cordis/src/kit.ts");
  const { GraphBuilder } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const facts = JSON.parse(
    readFileSync(new URL("../../../../packages/engines/comfyui-cordis/data/model-facts.json", import.meta.url), "utf8"),
  ) as { models: Record<string, Record<string, unknown>> };
  const qwen = facts.models["qwen3-tts"];
  const base = { text: "hi", voice: "", style_instruction: "", temperature: 0.7, seed: 1, qvoice: "", voice_pca_strengths: "" };
  assert.throws(
    () => kit.ttsT1({ ...base, qvoice: "stolen.wav" }, { ...qwen, mods: [] }, new GraphBuilder({}), "wall"),
    (err: unknown): boolean =>
      err instanceof Error &&
      String(err.message).includes("model 'qwen3-tts' does not board the 'qvoice' pack"),
  );
  assert.throws(
    () => kit.ttsT1({ ...base, voice_pca_strengths: "smuggled" }, { ...qwen, mods: [] }, new GraphBuilder({}), "wall"),
    /does not board the 'qvoice' pack/,
  );
  // boarding atom, stated knob → fires into the graph
  const gb = new GraphBuilder({});
  kit.ttsT1({ ...base, qvoice: "maria.wav" }, qwen, gb, "wall");
  assert.ok(JSON.stringify(gb.toJSON()).includes("maria.wav"), "boarding atom must fire voice_file");
  // blank knobs = no mutation = no gate
  kit.ttsT1(base, { ...qwen, mods: [] }, new GraphBuilder({}), "wall");
});

test("THE REFUSED FATE, lanpaint/mask legs: stated knobs refuse LOUD on the image-edit lane", async () => {
  // lanpaint + mask board qwen-img-edit-2511 but this plane builds
  // the stock plain-edit graph only — the firing gate refuses
  // every stated knob instead of silently plain-editing (the
  // retired MOD FIRING LAW, now wall-pinned: 'refused' is a fate,
  // not an accident).
  const kit = await import("../../../../packages/engines/comfyui-cordis/src/kit.ts");
  // every lanpaint knob off its lane promise refuses field-named
  for (const [key, val] of [
    ["lanpaint_enabled", true],
    ["lanpaint_num_steps", 99],
    ["lanpaint_step_size", 2.5],
    ["lanpaint_lambda", 0.1],
    ["lanpaint_beta", 0.1],
    ["lanpaint_friction", 0.1],
    ["lanpaint_prompt_mode", "positive"],
  ] as Array<[string, unknown]>) {
    assert.throws(
      () => kit.refuseImageEditFiring({ [key]: val }),
      (err: unknown): boolean => err instanceof Error && String(err.message).includes(`'${key}' fires on the image-edit card`),
    );
  }
  // every mask knob off its lane promise refuses field-named
  for (const [key, val] of [
    ["mask", "some.png"],
    ["input_mask", "region.png"],
    ["mask_mode", "bbox"],
    ["mask_context_pad", 1],
    ["mask_grow", 1],
    ["mask_feather", 1],
    ["mask_threshold", 1],
    ["mask_invert", true],
  ] as Array<[string, unknown]>) {
    assert.throws(
      () => kit.refuseImageEditFiring({ [key]: val }),
      (err: unknown): boolean => err instanceof Error && String(err.message).includes(`'${key}' fires on the image-edit card`),
    );
  }
  // lane promises ride inert (the stock plain-edit run)
  kit.refuseImageEditFiring({});
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
  // controlnet is registered but fateless (waiting, unboarded) —
  // boarding it refuses; the four landed packs pass. Live pin:
  // every DECL pack entry has a fate (the boot refuses otherwise,
  // so this wall and the boot read one table).
  const guard = await import("../../../../packages/engines/comfyui-cordis/src/mods/guard.ts");
  for (const p of ["loras", "qvoice", "lanpaint", "mask"]) guard.assertPackFate(p);
  assert.throws(() => guard.assertPackFate("controlnet"), /no fate in this plane/);
  const { registryIds, registryModel } = await import("../../../../packages/engines/comfyui/src/models/models.ts");
  const verbs = new Set(svc.verbIds());
  for (const id of registryIds()) {
    for (const entry of (registryModel(id).mods ?? []) as readonly string[]) {
      if (verbs.has(entry)) continue;
      assert.ok(
        (guard.PACK_FATE as Record<string, string>)[entry] !== undefined,
        `model '${id}' boards fateless pack '${entry}' — land the lane or the loud refusal first`,
      );
    }
  }
});

test("the verb mirror: every mounted verb is boarded by its families' DECLs", async () => {
  // boot interlock (b)-for-verbs, walled live: a verb claiming a
  // family that never boarded it is an undeclared mutation. The
  // boot refuses; this wall pins the agreement on the live table.
  const { registryModel } = await import("../../../../packages/engines/comfyui/src/models/models.ts");
  for (const verb of svc.verbRegistrations()) {
    assert.ok(verb.families.length > 0, `verb '${verb.id}' claims no family`);
    for (const fam of verb.families) {
      const mods = (registryModel(fam).mods ?? []) as readonly string[];
      assert.ok(mods.includes(verb.id), `verb '${verb.id}' claims '${fam}' but its DECL never boarded it`);
    }
  }
  // and the reverse direction is total: every DECL verb entry names
  // a mounted verb (dead verb boardings refuse at boot gate (a)).
  const mounted = new Set(svc.verbIds());
  const { registryIds } = await import("../../../../packages/engines/comfyui/src/models/models.ts");
  for (const id of registryIds()) {
    const { registryModel: rm } = await import("../../../../packages/engines/comfyui/src/models/models.ts");
    for (const entry of (rm(id).mods ?? []) as readonly string[]) {
      if (svc.packNames().includes(entry)) continue;
      assert.ok(mounted.has(entry), `model '${id}' boards verb '${entry}' no verb registers`);
    }
  }
});

test("THE DOOR GATE: _h_loras 404s every atom that boards no loras (z-image's last mile)", async () => {
  // the operator's catch (verbatim: z-image has no mods): the
  // frozen loras map keys EVERY mid (mod-less atoms carry an empty
  // list), and hasOwn alone 200d a mods offer onto them — z-image
  // served 200-empty, the deleted txt2music/mask-studio 200d too.
  // The endpoint satisfies ONLY for boarding atoms (live registry
  // read, same 404 body as unknown — never a skip, never a 500).
  const doors = await import("../../../../packages/gateway/doors/src/doors/discovery.ts");
  const root = new URL("../../../..", import.meta.url).pathname;
  const hit = (mid: string) =>
    doors.dispatchDiscovery("_h_loras", "GET", "/v1/loras", `/v1/loras?model=${mid}`, root);
  // boarders serve
  for (const mid of ["krea-2", "qwen-img-edit-2511"]) {
    assert.equal(hit(mid)?.status, 200, `${mid} boards loras — must serve`);
  }
  // mod-less atoms refuse (z-image first — the reported violation)
  for (const mid of ["z-image", "anima", "dwpose", "somax"]) {
    const r = hit(mid);
    assert.equal(r?.status, 404, `${mid} boards no loras — must 404, got ${r?.status}`);
  }
  // deleted models refuse (thrown out of the live registry)
  for (const mid of ["txt2music", "mask-studio", "moss-tts"]) {
    assert.equal(hit(mid)?.status, 404, `deleted '${mid}' must 404`);
  }
  // the old arms are untouched: unknown 404s, empty 400s
  assert.equal(hit("no-such-model")?.status, 404);
  assert.equal(
    doors.dispatchDiscovery("_h_loras", "GET", "/v1/loras", "/v1/loras", root)?.status,
    400,
  );
});

test("THE DOOR OFFER: the catalog serves the live offer only (no hollow, no deleted)", async () => {
  // the compliance stroke's second half: unoffering 13 hollow
  // atoms moved the live catalog (67→53) but the door serves the
  // FROZEN capture (55 keys — hollow + deleted). servedCatalog
  // filters frozen bodies to the live serve law; _h_model_one
  // 404s filtered mids even when the capture keys them.
  const doors = await import("../../../../packages/gateway/doors/src/doors/discovery.ts");
  const root = new URL("../../../..", import.meta.url).pathname;
  const cat = doors.dispatchDiscovery("_h_model_catalog", "GET", "/v1/model-catalog", "/v1/model-catalog", root);
  assert.equal(cat?.status, 200);
  const body = JSON.parse(String(cat?.body)) as { models: Record<string, unknown>; families: Record<string, unknown> };
  assert.equal(Object.keys(body.models).length, 53);
  assert.equal(Object.keys(body.families).length, 53);
  for (const mid of ["z-image", "krea-2", "qwen-img-edit-2511"]) {
    assert.ok(mid in body.models, `${mid} is offered and composable — must serve`);
  }
  for (const mid of ["dwpose", "somax", "concat", "txt2music", "mask-studio", "moss-tts"]) {
    assert.ok(!(mid in body.models), `'${mid}' is unoffered/deleted — must not serve, door serves ${Object.keys(body.models).length}`);
  }
  const one = (mid: string) =>
    doors.dispatchDiscovery("_h_model_one", "GET", `/v1/model-catalog/${mid}`, `/v1/model-catalog/${mid}`, root);
  assert.equal(one("z-image")?.status, 200);
  assert.equal(one("dwpose")?.status, 404);
  assert.equal(one("txt2music")?.status, 404);
});
