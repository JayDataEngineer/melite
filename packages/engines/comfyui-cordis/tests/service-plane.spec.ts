// @melite/comfyui-cordis — the service plane's registration +
// compose arms (TEST-2 breadth, 2026-09-12). A throwaway
// ComfyUIService per test (fresh Context — no registry boot, no
// fixtures): the refusal voices and the read-side derivations are
// the units; the walls pin the real cards through this same API.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, ComposeRefusal, cardWireName } from "../src/service.ts";
import type { CardDefinition, ModFields } from "../src/service.ts";
import type { FactsFile, ModelFacts } from "@melite/comfyui-card-kit/facts";

const boot = async (): Promise<ComfyUIService> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  return ctx.comfyui;
};

const fields = (dict: Record<string, Record<string, unknown>>): ModFields => {
  const f = ((v: unknown): Record<string, unknown> => v as Record<string, unknown>) as ModFields;
  f.dict = dict;
  return f;
};

const knob = (extra: Record<string, unknown> = {}, meta: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: "string",
  meta: { ...meta, extra },
});

const card = (over: Partial<CardDefinition> = {}): CardDefinition => ({
  id: "card1",
  skeleton: "gen",
  boarded: ["fam1"],
  schema: (v: unknown) => {
    const o = ((v ?? {}) as Record<string, unknown>);
    if (o["bad"] !== undefined) throw new Error("bad param");
    return { prompt: "hi", ...(o as Record<string, unknown>) };
  },
  compose: (_params, _model, g, _runId) => { g.node("TestNode", { a: 1 }); },
  sidebar: { key: "gen", order: 1 },
  flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: true },
  ...over,
});

const factsFor = (
  models: Record<string, Partial<ModelFacts>>,
  ext: Record<string, string[]> = {},
): FactsFile => ({
  models: Object.fromEntries(Object.entries(models).map(([id, m]) => [id, {
    id, card: "card1", defaults: {}, lane_inputs: {}, card_knobs: [],
    variants: [], variant_groups: [], outputs: [], mods: [], ...m,
  }])) as unknown as Record<string, ModelFacts>,
  extension_node_types: ext,
});

describe("cardWireName (the one spelling)", () => {
  it("hyphens become underscores plus the card suffix", () => {
    assert.equal(cardWireName("image-gen"), "image_gen_card");
    assert.equal(cardWireName("sfx"), "sfx_card");
  });
});

describe("registerPack (the category contract)", () => {
  it("fields without a .dict refuse (not a z.object contract)", async () => {
    const svc = await boot();
    const bare = ((v: unknown): Record<string, unknown> => v as Record<string, unknown>) as ModFields;
    assert.throws(
      () => svc.registerPack({ pack: "loras", fields: bare }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-field" && /no \.dict to walk/.test(e.message),
    );
  });

  it("illegal field names refuse", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerPack({ pack: "loras", fields: fields({ "Bad-Name": {} }) }),
      /field name 'Bad-Name' is not a legal identifier/,
    );
  });

  it("inverted floors refuse; non-positive steps refuse", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerPack({ pack: "a", fields: fields({ n: { meta: { min: 5, max: 1 } } }) }),
      /min 5 > max 1/,
    );
    assert.throws(
      () => svc.registerPack({ pack: "a", fields: fields({ n: { meta: { step: 0 } } }) }),
      /step 0 <= 0/,
    );
  });

  it("out-of-range defaults refuse on both rails", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerPack({ pack: "a", fields: fields({ n: { meta: { min: 1, max: 5, default: 0 } } }) }),
      /default 0 outside \[1, 5\]/,
    );
    assert.throws(
      () => svc.registerPack({ pack: "a", fields: fields({ n: { meta: { max: 5, default: 9 } } }) }),
      /default 9 outside \[-∞, 5\]/,
    );
    assert.throws(
      () => svc.registerPack({ pack: "a", fields: fields({ n: { meta: { min: 1, default: 0 } } }) }),
      /default 0 outside \[1, ∞\]/,
    );
  });

  it("a valid pack registers; same shape re-registers; new shape is drift; dispose retracts", async () => {
    const svc = await boot();
    const f = fields({ strength: { meta: { min: 0, max: 2, default: 1 } } });
    const drop = svc.registerPack({ pack: "loras", fields: f });
    assert.deepEqual(svc.packNames(), ["loras"]);
    svc.registerPack({ pack: "loras", fields: fields({ strength: { meta: {} } }) });
    assert.throws(
      () => svc.registerPack({ pack: "loras", fields: fields({ other: {} }) }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-mod" && /two shapes/.test(e.message),
    );
    drop();
    assert.deepEqual(svc.packNames(), [], "the disposer retracts the pack");
  });
});

describe("registerFlavor (the family boarding)", () => {
  it("a flavor for an unknown pack is drift; a familyless flavor refuses", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerFlavor({ pack: "nope", families: ["fam1"] }),
      /no such pack registered/,
    );
    svc.registerPack({ pack: "loras", fields: fields({}) });
    assert.throws(
      () => svc.registerFlavor({ pack: "loras", families: [] }),
      /declares no families/,
    );
  });

  it("a flavor registers and its disposer retracts (twice-safe)", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "loras", fields: fields({}) });
    const flavor = { pack: "loras", families: ["fam1"] };
    const drop = svc.registerFlavor(flavor);
    assert.equal(svc.flavorRegistrations().length, 1);
    drop();
    assert.equal(svc.flavorRegistrations().length, 0);
    drop();
    assert.equal(svc.flavorRegistrations().length, 0, "the second dispose is a no-op");
  });
});

describe("registerVerb (the plane law)", () => {
  const verb = (over: Record<string, unknown> = {}): Parameters<ComfyUIService["registerVerb"]>[0] => ({
    id: "v", label: "V", families: ["fam1"],
    engines: [{ id: "e", flow: "f" }], writes: [], requires: [],
    fields: fields({}),
    ...over,
  }) as never;

  it("id + label are required (both rails of the ||)", async () => {
    const svc = await boot();
    assert.throws(() => svc.registerVerb(verb({ id: "" })), /verb needs id \+ label/);
    assert.throws(() => svc.registerVerb(verb({ label: "" })), /verb needs id \+ label/);
  });

  it("every engine row carries EXACTLY one arm (null/'' filter honest)", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerVerb(verb({ engines: [{ id: "e", flow: "", local: null }] })),
      /exactly one of flow\/local\/refusal \(got 0\)/,
    );
    assert.throws(
      () => svc.registerVerb(verb({ engines: [{ id: "e", flow: "f", local: "l" }] })),
      /exactly one of flow\/local\/refusal \(got 2\)/,
    );
  });

  it("the duplicate id fires before the contract gates; the disposer retracts", async () => {
    const svc = await boot();
    const drop = svc.registerVerb(verb());
    assert.deepEqual(svc.verbIds(), ["v"]);
    assert.throws(
      () => svc.registerVerb(verb({ engines: [] })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-verb" && /registered twice/.test(e.message),
    );
    drop();
    assert.deepEqual(svc.verbIds(), []);
    assert.equal(svc.verbRegistrations().length, 0);
  });

  it("verb fields ride the same gates (the where names the verb)", async () => {
    const svc = await boot();
    const bare = ((v: unknown): Record<string, unknown> => v as Record<string, unknown>) as ModFields;
    assert.throws(
      () => svc.registerVerb(verb({ fields: bare })),
      /verb v: fields must be a z\.object contract/,
    );
  });
});

describe("registerCard (one card, one plugin)", () => {
  it("duplicates refuse; the disposer retracts", async () => {
    const svc = await boot();
    const drop = svc.registerCard(card());
    assert.deepEqual(svc.cardIds(), ["card1"]);
    assert.equal(svc.getCardDef("card1")!.skeleton, "gen");
    assert.throws(
      () => svc.registerCard(card()),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "duplicate-card",
    );
    drop();
    assert.equal(svc.getCardDef("card1"), undefined);
  });
});

describe("cardModFields (the absorption)", () => {
  it("an unknown card absorbs nothing", async () => {
    assert.deepEqual((await boot()).cardModFields("ghost"), []);
  });

  it("packs join scoped to the boarded intersection (sorted)", async () => {
    const svc = await boot();
    svc.registerCard(card({ boarded: ["fam1", "fam2"] }));
    svc.registerPack({ pack: "b-pack", fields: fields({}) });
    svc.registerPack({ pack: "a-pack", fields: fields({}) });
    svc.registerFlavor({ pack: "a-pack", families: ["fam2", "fam1"] });
    svc.registerFlavor({ pack: "a-pack", families: ["other"] });
    svc.registerFlavor({ pack: "b-pack", families: ["other"] });
    const out = svc.cardModFields("card1");
    assert.equal(out.length, 1, "the other-scoped pack never joins");
    assert.equal(out[0]!.pack, "a-pack");
    assert.deepEqual(out[0]!.families, ["fam1", "fam2"]);
  });
});

describe("modCatalog (the runtime catalog law)", () => {
  const row = (id: string): { id: string; filename: string; source_url: string } =>
    ({ id, filename: id + ".safetensors", source_url: "https://h/" + id });

  it("an unboarded pack serves the empty row", async () => {
    const svc = await boot();
    assert.deepEqual(svc.modCatalog("loras", "fam1"), { rows: [], shared: false });
    assert.deepEqual(svc.modRows("loras", "fam1"), []);
  });

  it("family rows win and never share", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"], rows: [row("a")] });
    assert.deepEqual(svc.modCatalog("loras", "fam1"), { rows: [row("a")], shared: false });
  });

  it("a rowless flavor without the runtime door serves its empty rows", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"] });
    assert.deepEqual(svc.modCatalog("loras", "fam1"), { rows: [], shared: false });
  });

  it("the runtime door serves the union (deduped, other packs skipped)", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerPack({ pack: "mask", fields: fields({}) });
    svc.registerFlavor({ pack: "mask", families: ["fam1"], rows: [row("m")] });
    svc.registerFlavor({ pack: "loras", families: ["fam1"], runtimeCatalog: true });
    svc.registerFlavor({ pack: "loras", families: ["fam2"], rows: [row("a"), row("b")] });
    svc.registerFlavor({ pack: "loras", families: ["fam3"], rows: [row("a")] });
    const out = svc.modCatalog("loras", "fam1");
    assert.equal(out.shared, true);
    assert.deepEqual(out.rows.map((r) => r.id), ["a", "b"], "union dedupes by id, mask rows never ride");
  });
});

describe("cardVerbs (the family-scoped mount)", () => {
  it("an unknown card mounts nothing; only intersecting verbs ride", async () => {
    const svc = await boot();
    assert.deepEqual(svc.cardVerbs("ghost"), []);
    svc.registerCard(card({ boarded: ["fam1"] }));
    const mk = (id: string, families: string[]): Parameters<ComfyUIService["registerVerb"]>[0] => ({
      id, label: id, families, engines: [{ id: "e", flow: "f" }],
      writes: [], requires: [], fields: fields({}),
    }) as never;
    svc.registerVerb(mk("mine", ["fam1"]));
    svc.registerVerb(mk("theirs", ["other"]));
    assert.deepEqual(svc.cardVerbs("card1").map((v) => v.id), ["mine"]);
  });
});

describe("formSpec (the wire row battery)", () => {
  const carrier = (dict: Record<string, Record<string, unknown>>): ModFields => {
    const f = ((v: unknown): Record<string, unknown> => v as Record<string, unknown>) as unknown as {
      (v: unknown): Record<string, unknown>;
      dict: Record<string, Record<string, unknown>>;
    };
    f.dict = dict;
    return f as unknown as ModFields;
  };
  const cu = (value: unknown): Record<string, unknown> => ({ type: "const", value });

  const bootForm = async (): Promise<ComfyUIService> => {
    const svc = await boot();
    svc.registerCard(card({
      schemaCarrier: carrier({
        prompt: knob({ group: "gen", zone: "zone-a", order: 2, required: true, columns: 2, width: 30, placeholder: "p", tooltip: "t", visible_when: "x>1" }, { description: "the prompt", default: "hi" }) as never,
        second: knob({ group: "gen", zone: "zone-b", order: 1 }) as never,
        otherfam: knob({ families: ["other"] }) as never,
        steps: { type: "number", meta: { min: 1, max: 8, default: 4 } } as never,
        seed: { type: "number", meta: { step: 1, default: 7 } } as never,
        slider: { type: "number", meta: { step: 2, default: 2 } } as never,
        flag: { type: "boolean", meta: {} } as never,
        files: { type: "array", meta: {} } as never,
        blob: { type: "object", meta: {} } as never,
        textarea: knob({ wtype: "textarea" }) as never,
        plain: knob({ wtype: "" }) as never,
        mode: { type: "union", list: [cu("a"), cu("b")] } as never,
        nullable: { type: "union", list: [{ type: "string", meta: { description: "inner" } }, cu(null)], meta: { description: "outer" } } as never,
        nullpair: { type: "union", list: [cu(null), cu(null)] } as never,
        bareunion: { type: "union" } as never,
        typeless: { meta: {} } as never,
        rawnull: { type: "union", list: [{ type: "string" }, cu(null)] } as never,
        strange: { type: "union", list: [{ type: "string" }, { type: "number" }] } as never,
        metaflag: knob({}, { required: true }) as never,
        emptydef: { type: "string", meta: { default: "" } } as never,
        arraydef: { type: "array", meta: { default: [] }, extra: undefined } as never,
        nulled: { type: "array", meta: { default: [], extra: { default: null } } } as never,
        picked: { type: "string", meta: { extra: { options: ["x", "y"] } } } as never,
      }) as never,
    }));
    return svc;
  };

  it("an unknown card serves null", async () => {
    assert.equal((await boot()).formSpec("ghost", "fam1"), null);
  });

  it("a dict-less schema serves the empty form (the carrier ?? walk)", async () => {
    const svc = await boot();
    svc.registerCard(card());
    const out = svc.formSpec("card1", "fam1")!;
    assert.deepEqual(out.fields, []);
    assert.equal(out.form, "card1");
    assert.equal(out.service, "fam1");
  });

  it("rows carry the frozen shape; the other-family knob never rides", async () => {
    const svc = await bootForm();
    const out = svc.formSpec("card1", "fam1")!;
    const byName = Object.fromEntries((out.fields as Record<string, unknown>[]).map((f) => [(f as Record<string, unknown>)["name"], f]));
    assert.ok(!("otherfam" in byName), "the families filter skips");
    const prompt = byName["prompt"] as Record<string, unknown>;
    assert.equal(prompt["label"], "the prompt");
    assert.equal(prompt["default"], "hi");
    assert.equal(prompt["group"], "gen");
    assert.equal(prompt["zone"], "", "zone never wires (lives in schema_groups)");
    assert.equal(prompt["order"], 2);
    assert.equal(prompt["required"], true);
    assert.equal(prompt["columns"], 2);
    assert.equal(prompt["width"], 30);
    assert.equal(prompt["placeholder"], "p");
    assert.equal(prompt["tooltip"], "t");
    assert.equal(prompt["visible_when"], "x>1");
    const groups = out.schema_groups as Record<string, unknown>[];
    assert.equal(groups.length, 2, "the groupless knobs form the '' group");
    const gen = groups.find((g) => g["id"] === "gen")!;
    assert.equal(gen["id"], "gen");
    assert.equal(gen["label"], "Gen", "group labels capitalize");
    assert.equal(gen["zone"], "zone-a", "the FIRST declaration wins the zone");
    const members = gen["fields"] as Record<string, unknown>[];
    assert.equal(members.length, 2, "prompt + second ride the gen group");
    assert.ok(!("group" in members[0]!) && !("zone" in members[0]!), "members drop the flat keys");
  });

  it("the wire-type battery (declared, select, seed, slider, atoms, fallback)", async () => {
    const svc = await bootForm();
    const out = svc.formSpec("card1", "fam1")!;
    const byName = Object.fromEntries((out.fields as Record<string, unknown>[]).map((f) => [(f as Record<string, unknown>)["name"], f])) as Record<string, Record<string, unknown>>;
    assert.equal(byName["textarea"]!["type"], "textarea", "declared wtype wins");
    assert.equal(byName["plain"]!["type"], "text", "an empty wtype falls through");
    assert.equal(byName["mode"]!["type"], "select");
    assert.deepEqual(byName["mode"]!["options"], ["a", "b"]);
    assert.equal(byName["seed"]!["type"], "seed");
    assert.equal(byName["seed"]!["step"], null, "the seed identity wires through the type");
    assert.equal(byName["slider"]!["type"], "slider");
    assert.equal(byName["flag"]!["type"], "boolean");
    assert.equal(byName["files"]!["type"], "loras");
    assert.equal(byName["blob"]!["type"], "text", "unknown atoms fall back to text");
    assert.equal(byName["bareunion"]!["type"], "text", "a list-less union is no vocabulary");
    assert.equal(byName["typeless"]!["type"], "text", "a typeless node reads as a string");
    assert.equal(byName["rawnull"]!["type"], "text", "a metaless nullable unwraps to its inner");
    assert.equal(byName["rawnull"]!["label"], "rawnull", "no outer meta, no outer label — the name stands");
    assert.equal(byName["strange"]!["type"], "text", "a valueless union is no vocabulary");
    assert.deepEqual(byName["nullpair"]!["options"], [], "an all-null union serves no options");
    assert.equal(byName["steps"]!["min"], 1);
    assert.equal(byName["steps"]!["max"], 8);
  });

  it("nullable unwraps (outer meta wins); defaults condition honestly", async () => {
    const svc = await bootForm();
    const out = svc.formSpec("card1", "fam1")!;
    const byName = Object.fromEntries((out.fields as Record<string, unknown>[]).map((f) => [(f as Record<string, unknown>)["name"], f])) as Record<string, Record<string, unknown>>;
    assert.equal(byName["nullable"]!["type"], "text");
    assert.equal(byName["nullable"]!["label"], "outer", "the outer description wins the wrap");
    assert.equal(byName["metaflag"]!["required"], true, "meta.required mounts too");
    assert.equal(byName["emptydef"]!["default"], null, "an empty default wires null");
    assert.equal(byName["nulled"]!["default"], null, "the [] + null-default arm wires null");
    assert.deepEqual(byName["picked"]!["options"], ["x", "y"], "declared options win");
    assert.deepEqual(byName["prompt"]!["options"], [], "optionless rows wire the empty list");
  });

  it("absorbed mod fields ride after the card's own (family-scoped)", async () => {
    const svc = await bootForm();
    svc.registerPack({ pack: "loras", fields: fields({ strength: { type: "number", meta: { min: 0, max: 2 } } }) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"] });
    svc.registerFlavor({ pack: "loras", families: ["other"] });
    const out = svc.formSpec("card1", "fam1")!;
    const names = (out.fields as Record<string, unknown>[]).map((f) => (f as Record<string, unknown>)["name"]);
    assert.equal(names[names.length - 1], "strength", "absorbed rows ride last");
    const other = svc.formSpec("card1", "unboarded")!;
    assert.ok(!(other.fields as Record<string, unknown>[]).some((f) => (f as Record<string, unknown>)["name"] === "strength"));
  });
});

describe("setObjectInfo (the gate arming)", () => {
  it("null clears; a snapshot arms; the legacy setter splits the seam", async () => {
    const svc = await boot();
    svc.setObjectInfo(null);
    svc.setObjectInfoNodes(["A", "B"]);
    svc.setObjectInfoNodes(null);
    svc.setObjectInfo({});
    svc.registerCard(card());
    svc.setFacts(factsFor({ fam1: {} }));
    const graph = svc.compose("card1", "fam1", {}, "r1");
    assert.equal(typeof graph, "object", "an empty snapshot never gates");
  });
});

describe("compose (the model-less path)", () => {
  it("an unknown card refuses (empty registry names none)", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.compose("ghost", null, {}, "r"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-card" && /registered: none/.test(e.message),
    );
  });

  it("bad params refuse before any graph", async () => {
    const svc = await boot();
    svc.registerCard(card({ requiresModel: false, boarded: [] }));
    assert.throws(
      () => svc.compose("card1", null, { bad: 1 }, "r"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-params" && /refused params/.test(e.message),
    );
  });

  it("the extension gate: missing nodes refuse, live nodes pass, empty maps pass", async () => {
    const svc = await boot();
    svc.registerCard(card({ requiresModel: false, boarded: [] as never, requires: ["pack-a"] }));
    svc.setFacts(factsFor({}, { "pack-a": ["NodeA"] }));
    svc.setObjectInfoNodes(["Other"]);
    assert.throws(
      () => svc.compose("card1", "", {}, "r"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-extension" && /pack-a/.test(e.message),
    );
    svc.setObjectInfoNodes(["NodeA"]);
    svc.compose("card1", null, {}, "r");
    svc.setFacts(factsFor({}, { "pack-a": [] }));
    svc.compose("card1", null, {}, "r2", );
    svc.setObjectInfoNodes(null);
    svc.compose("card1", null, {}, "r3");
  });

  it("the model-less happy path composes + finalizes; recipes overlay", async () => {
    const svc = await boot();
    svc.registerCard(card({
      requiresModel: false,
      boarded: [] as never,
      recipes: { fast: { label: "F", description: "d", params: { prompt: "fast" }, loras: [{ name: "r.safetensors" }] } },
      finalize: (g) => ({ ...g, "final": { class_type: "F", inputs: {} } }) as never,
    }));
    const plain = svc.compose("card1", null, {}, "r1");
    assert.ok("TestNode.0" in plain && "final" in plain, "compose emits, finalize rides");
    const fin = svc.compose("card1", "", {}, "r2");
    assert.ok("final" in fin, "finalize rides the model-less path");
    const withRecipe = svc.compose("card1", null, { recipe: "fast", loras: [{ name: "u.safetensors" }] }, "r3");
    assert.ok("final" in withRecipe);
    const unknownRecipe = svc.compose("card1", null, { recipe: "ghost" }, "r4");
    assert.ok("final" in unknownRecipe, "an unknown recipe key passes through");
    const noKey = svc.compose("card1", null, { prompt: "own" }, "r5");
    assert.ok("final" in noKey, "a recipeless call composes");
  });

  it("a factless plane never gates (unmapped packs serve the empty map)", async () => {
    const svc = await boot();
    svc.registerCard(card({ requiresModel: false, boarded: [] as never, requires: ["unmapped-pack"] }));
    svc.setObjectInfoNodes([]);
    const graph = svc.compose("card1", null, {}, "r");
    assert.ok("TestNode.0" in graph, "no facts, no gate, just the graph");
  });

  it("a recipeless card ignores the recipe key", async () => {
    const svc = await boot();
    svc.registerCard(card({ requiresModel: false, boarded: [] as never }));
    svc.compose("card1", null, { recipe: "fast" }, "r");
    svc.compose("card1", null, undefined, "r2");
    svc.compose("card1", null, null, "r3");
  });
});

describe("compose (the model path)", () => {
  const bootModel = async (over: Partial<CardDefinition> = {}, factOver: Partial<ModelFacts> = {}, factExt: Record<string, string[]> = {}): Promise<ComfyUIService> => {
    const svc = await boot();
    svc.registerCard(card(over));
    svc.setFacts(factsFor({ fam1: { defaults: { prompt: "model-says" }, ...factOver } }, factExt));
    return svc;
  };

  it("the admission gates refuse in order (model, board, facts, row, card)", async () => {
    const svc = await boot();
    svc.registerCard(card());
    assert.throws(() => svc.compose("card1", null, {}, "r"), /requires a model id/);
    assert.throws(() => svc.compose("card1", "ghost", {}, "r"), /is not boarded/);
    assert.throws(() => svc.compose("card1", "fam1", {}, "r"), /facts not loaded/);
    svc.setFacts(factsFor({}));
    assert.throws(() => svc.compose("card1", "fam1", {}, "r"), /has no facts row/);
    svc.setFacts(factsFor({ fam1: { card: "other" } }));
    assert.throws(() => svc.compose("card1", "fam1", {}, "r"), /facts name card 'other'/);
  });

  it("bad params refuse; the cascade layers schema < model < explicit", async () => {
    let seen: Record<string, unknown> = {};
    const svc = await bootModel({
      compose: (params) => { seen = { ...params }; },
    });
    assert.throws(() => svc.compose("card1", "fam1", { bad: 1 }, "r"), /refused params/);
    svc.compose("card1", "fam1", { prompt: "explicit" }, "r");
    assert.equal(seen["prompt"], "explicit", "explicit wins over the model default");
    svc.compose("card1", "fam1", {}, "r");
    assert.equal(seen["prompt"], "model-says", "the model default wins over the schema default");
  });

  it("null/array model defaults never ride (lora stacks concat in recipes)", async () => {
    let seen: Record<string, unknown> = {};
    const svc = await bootModel(
      { compose: (params) => { seen = { ...params }; } },
      { defaults: { prompt: null, loras: ["x"], extra: "m" } as never },
    );
    svc.compose("card1", "fam1", {}, "r");
    assert.equal(seen["prompt"], "hi", "null model defaults fall back to schema");
    assert.equal(seen["extra"], "m");
    assert.equal(seen["loras"], undefined, "array model defaults never ride the scalar cascade");
  });

  it("lora rows resolve (name passes, id resolves, unknown refuses, strength defaults)", async () => {
    const seen: Record<string, unknown>[] = [];
    const svc = await bootModel({ compose: (params) => { seen.push({ ...params }); } });
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({
      pack: "loras",
      families: ["fam1"],
      rows: [{ id: "cool", filename: "cool.safetensors", source_url: "https://h/cool" }],
    });
    svc.compose("card1", "fam1", { loras: [{ name: "raw.safetensors" }] }, "r1");
    assert.deepEqual(seen[0]!["loras"], [{ name: "raw.safetensors", strength: 1.0 }]);
    svc.compose("card1", "fam1", { loras: [{ id: "cool", strength: 0.5 }] }, "r2");
    assert.deepEqual(seen[1]!["loras"], [{ name: "cool.safetensors", strength: 0.5 }]);
    assert.throws(
      () => svc.compose("card1", "fam1", { loras: [{ id: "ghost" }] }, "r3"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-lora" && /no 'fam1' flavor row/.test(e.message),
    );
    svc.compose("card1", "fam1", { loras: "not-a-list" }, "r4", );
    assert.equal(seen[2]!["loras"], "not-a-list", "non-list loras pass through");
  });

  it("the family extension slice wins over the flat union", async () => {
    const svc = await bootModel(
      { requires: ["flat-pack"], requiresByFamily: { fam1: ["fam-pack"] } },
      {},
      { "fam-pack": ["FamNode"], "flat-pack": ["FlatNode"] },
    );
    svc.setObjectInfoNodes(["FlatNode"]);
    assert.throws(() => svc.compose("card1", "fam1", {}, "r"), /requires 'fam-pack'/);
    svc.setObjectInfoNodes(["FamNode"]);
    svc.compose("card1", "fam1", {}, "r");
  });

  it("undefined params compose (the cascade starts from the model truth)", async () => {
    let seen: Record<string, unknown> = {};
    const svc = await bootModel({ compose: (params) => { seen = { ...params }; } });
    svc.compose("card1", "fam1", undefined, "r");
    assert.equal(seen["prompt"], "model-says");
    svc.compose("card1", "fam1", null, "r2");
    assert.equal(seen["prompt"], "model-says");
  });

  it("an id-less lora entry refuses named-empty (the catalog names none)", async () => {
    let seen: Record<string, unknown> = {};
    const svc = await bootModel({ compose: (params) => { seen = { ...params }; } });
    assert.throws(
      () => svc.compose("card1", "fam1", { loras: [{ strength: 2 }] }, "r"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-lora" && /registered: none/.test(e.message),
    );
    assert.equal(seen["prompt"], undefined, "the refusal precedes any emit");
  });

  it("a keyless facts file never gates the model path", async () => {
    const svc = await boot();
    svc.registerCard(card({ requires: ["unmapped-pack"] }));
    const models = factsFor({ fam1: {} }).models;
    svc.setFacts({ models } as FactsFile);
    svc.setObjectInfoNodes([]);
    const graph = svc.compose("card1", "fam1", {}, "r");
    assert.ok("TestNode.0" in graph);
  });

  it("the model happy path emits + finalizes", async () => {
    const svc = await bootModel({
      finalize: (g) => ({ ...g, "final": { class_type: "F", inputs: {} } }) as never,
    });
    const graph = svc.compose("card1", "fam1", {}, "r1");
    assert.ok("TestNode.0" in graph && "final" in graph, "compose emits, finalize rides");
  });
});
