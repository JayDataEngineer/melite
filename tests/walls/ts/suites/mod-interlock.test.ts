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
  const { modelIds, getModel } = await import(
    "../../../../packages/engines/comfyui/src/models/models.ts"
  );
  const packs = new Set(svc.packNames());
  const verbs = new Set(svc.verbIds());
  // every DECL.mods entry is a live pack or verb id
  for (const id of modelIds()) {
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
