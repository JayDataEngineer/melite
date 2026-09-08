// mod-interlock.test.ts — THE MOD/VERB INTERLOCK WALL (the 1:1
// cordis port, 2026-09-08: "Follow Cordis. Transfer the python
// functionality, 1:1 into Cordis.").
//
// Pins (the py melite_cards interlock, dsl.py @ 034e1f97):
//   - REGISTRATION: mods and verbs register through the
//     ComfyUIService (registerMod/registerVerb) as cordis plugins
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
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/index.ts";

const frozen = JSON.parse(
  readFileSync(new URL("../../../../packages/gateway/shell/data/discovery-catalog.json", import.meta.url), "utf8"),
) as { form_specs: Record<string, { status: number; body: Record<string, unknown> }> };

await loadCardDefs();
const svc = theService();

test("mods registered through the service as plugins (PORT LAW)", () => {
  // the absorption is non-empty for all four py families
  const edit = svc.cardModFields("image-edit");
  const names = new Set(edit.map((a) => a.field.name));
  for (const n of ["image1", "lanpaint_enabled", "outpaint_overlap", "mask", "mask_mode", "loras"]) {
    assert.ok(names.has(n), `image-edit absorbed surface misses ${n}`);
  }
  const gen = svc.cardModFields("image-gen");
  assert.deepEqual(gen.map((a) => a.field.name), ["loras"], "image-gen absorbs exactly loras");
  const tts = svc.cardModFields("tts");
  assert.deepEqual(tts.map((a) => a.field.name).sort(), ["qvoice", "voice_pca_strengths"], "tts absorbs the qvoice pack");
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
  const surface = svc.cardModFields("anny").map((a) => a.field.name);
  for (const knob of ["person_index", "preset_id", "fit_ratio"]) {
    assert.ok(!surface.includes(knob), `verb knob ${knob} leaked onto the card surface`);
  }
});

test("the loud laws: registration gates refuse", () => {
  assert.throws(() => svc.registerVerb({
    id: "hmr-estimate", label: "dup", families: ["anny"], engines: [{ id: "x", flow: "f" }],
    writes: [], requires: [], fields: [],
  }), /registered twice/);
  assert.throws(() => svc.registerVerb({
    id: "two-arms", label: "x", families: ["anny"],
    engines: [{ id: "e", flow: "f", local: "l" }], writes: [], requires: [], fields: [],
  }), /exactly one/);
  assert.throws(() => svc.registerMod({
    pack: "loras", families: ["krea-2"],
    fields: [{ name: "wrong_shape", type: "text", label: "X" }],
  }), /two shapes/);
  assert.throws(() => svc.registerMod({
    pack: "broken", families: ["krea-2"],
    fields: [{ name: "bad", type: "slider", label: "X", min: 10, max: 1 }],
  }), /min 10 > max 1/);
  assert.throws(() => svc.registerMod({
    pack: "broken", families: ["krea-2"],
    fields: [{ name: "bad", type: "slider", label: "X", step: 0 }],
  }), /step 0 <= 0/);
  assert.throws(() => svc.registerMod({
    pack: "broken", families: ["krea-2"],
    fields: [{ name: "bad", type: "slider", label: "X", min: 0, max: 1, default: 5 }],
  }), /outside/);
});
