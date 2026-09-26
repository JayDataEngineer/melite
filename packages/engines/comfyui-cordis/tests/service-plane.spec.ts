// @melite/comfyui-cordis — the service plane's registration +
// compose arms (TEST-2 breadth, 2026-09-12). A throwaway
// ComfyUIService per test (fresh Context — no registry boot, no
// fixtures): the refusal voices and the read-side derivations are
// the units; the walls pin the real cards through this same API.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIService, ComposeRefusal, cardWireName, resolveCardFlowOutputs } from "../src/service.ts";
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

describe("packFieldNames", () => {
  it("returns registered declaration order and an empty list for an unknown pack", async () => {
    const svc = await boot();
    assert.deepEqual(svc.packFieldNames("ghost"), []);
    svc.registerPack({ pack: "loras", fields: fields({ strength: {}, filename: {} }) });
    assert.deepEqual(svc.packFieldNames("loras"), ["strength", "filename"]);
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

  it("flow input ports must exist in the card schema", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerCard(card({
        flowKinds: { inputs: { missing: "text" }, outputs: { default: "image" }, requiresModel: true },
      })),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-port" && /missing/.test(error.message),
    );
  });

  it("a flow seat on a hidden carrier key registers (the gate-key precedent)", async () => {
    // THE STRICT-GATE HALF (2026-10-09): the contract gate reads
    // the card's OWN carrier dict only — never absorbed mod fields
    // (packs compose after cards). A seat whose visible face is
    // mod-owned still names a carrier key: hidden, validation-only,
    // never a face. The gate sees dict keys, hidden or not — the
    // seat passes, and a truly unknown name still refuses above.
    const svc = await boot();
    const drop = svc.registerCard(card({
      flowKinds: { inputs: { input_mask: "seg" }, outputs: { default: "image" }, requiresModel: false },
      schemaCarrier: { dict: { input_mask: {} } } as never,
    }));
    assert.deepEqual(svc.cardIds(), ["card1"]);
    drop();
  });

  it("semantic output bindings resolve only selected producers and verify node classes", () => {
    const def = card({
      flowKinds: { inputs: {}, outputs: { image: "image", audio: "audio" }, requiresModel: true },
      flowOutputBindings: [
        { channel: "image", node: "SaveImage.0", nodeClass: "SaveImage", when: (params) => params["mode"] !== "audio" },
        { channel: "audio", node: "SaveAudio.0", nodeClass: "SaveAudio", when: (params) => params["mode"] === "audio" },
      ],
    });
    const graph = {
      "SaveImage.0": { class_type: "SaveImage", inputs: {} },
      "SaveAudio.0": { class_type: "SaveAudio", inputs: {} },
    };
    assert.deepEqual(resolveCardFlowOutputs(def, { mode: "image" }, graph), {
      outputs: { image: "image" },
      outputNodes: { image: "SaveImage.0" },
    });
    assert.deepEqual(resolveCardFlowOutputs(def, { mode: "audio" }, graph), {
      outputs: { audio: "audio" },
      outputNodes: { audio: "SaveAudio.0" },
    });
    assert.throws(
      () => resolveCardFlowOutputs(def, { mode: "image" }, { "SaveImage.0": { class_type: "Wrong" } }),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-output",
    );
  });

  it("a class selector binds the last matching producer", () => {
    const def = card({
      flowKinds: { inputs: {}, outputs: { video: "video" }, requiresModel: true },
      flowOutputBindings: [{ channel: "video", node: "*", nodeClass: "SaveVideo" }],
    });
    const graph = {
      "SaveVideo.0": { class_type: "SaveVideo", inputs: {} },
      "SaveAudio.0": { class_type: "SaveAudio", inputs: {} },
      "SaveVideo.1": { class_type: "SaveVideo", inputs: {} },
    };
    assert.deepEqual(resolveCardFlowOutputs(def, {}, graph), {
      outputs: { video: "video" },
      outputNodes: { video: "SaveVideo.1" },
    });
  });

  it("flow output resolution refuses duplicate, undeclared, and missing producers", () => {
    const duplicate = card({
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: true },
      flowOutputBindings: [
        { channel: "image", node: "Save.0", nodeClass: "Save" },
        { channel: "image", node: "Save.1", nodeClass: "Save" },
      ],
    });
    assert.throws(
      () => resolveCardFlowOutputs(duplicate, {}, { "Save.0": { class_type: "Save" }, "Save.1": { class_type: "Save" } }),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-output",
    );

    const undeclared = card({
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: true },
      flowOutputBindings: [{ channel: "ghost", node: "Save.0", nodeClass: "Save" }],
    });
    assert.throws(
      () => resolveCardFlowOutputs(undeclared, {}, { "Save.0": { class_type: "Save" } }),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-output",
    );

    const missing = card({
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: true },
      flowOutputBindings: [{ channel: "image", node: "Save.0", nodeClass: "Save" }],
    });
    assert.throws(
      () => resolveCardFlowOutputs(missing, {}, {}),
      /output 'image' expects Save\.0 as Save, got missing/,
    );
  });

  it("output bindings cannot name channels absent from flowKinds", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerCard(card({
        flowOutputBindings: [{ channel: "ghost", node: "Save.0", nodeClass: "SaveImage" }],
      })),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-output",
    );
  });

  it("a second boarder of a taken family refuses (ledger #40: the sketch stole krea-2's form)", async () => {
    // A DROP-IN THAT BOARDS A REAL FAMILY OWNS THAT FAMILY'S FORM
    // — the melite-test profile's sketch boarded krea-2 and the
    // lane served its 2-field envelope as image-gen. No second
    // card may board a family another registered card already
    // boards, whatever its source (packaged, profile insert,
    // drop-in): the refusal is LOUD at registration, never a
    // silent first-wins in the defs table.
    const svc = await boot();
    svc.registerCard(card({ id: "image-gen", boarded: ["krea-2"] }));
    assert.throws(
      () => svc.registerCard(card({ id: "sketch", boarded: ["krea-2"] })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "family-taken",
    );
    // the refused card never landed; the owner stands
    assert.deepEqual(svc.cardIds(), ["image-gen"]);
    // distinct families still compose side by side
    svc.registerCard(card({ id: "image-edit", boarded: ["qwen-img-edit-2511"] }));
    assert.deepEqual(svc.cardIds(), ["image-edit", "image-gen"]);
  });
});

describe("flow contract registration guards", () => {
  it("refuses a missing contract, empty producer identity, and duplicate unconditional producers", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerCard(card({ flowKinds: undefined as never })),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-contract",
    );
    assert.throws(
      () => svc.registerCard(card({
        flowOutputBindings: [{ channel: "image", node: "", nodeClass: "Save" }],
      })),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-output",
    );
    assert.throws(
      () => svc.registerCard(card({
        flowOutputBindings: [
          { channel: "image", node: "Save.0", nodeClass: "Save" },
          { channel: "image", node: "Save.1", nodeClass: "Save" },
        ],
      })),
      (error: unknown) => error instanceof ComposeRefusal && error.code === "flow-output",
    );
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

  it("packs serve sorted when registered ascending (the comparator's else arm)", async () => {
    const svc = await boot();
    svc.registerCard(card({ boarded: ["fam1"] }));
    svc.registerPack({ pack: "a-pack", fields: fields({}) });
    svc.registerPack({ pack: "b-pack", fields: fields({}) });
    svc.registerPack({ pack: "c-pack", fields: fields({}) });
    svc.registerFlavor({ pack: "c-pack", families: ["fam1"] });
    svc.registerFlavor({ pack: "b-pack", families: ["fam1"] });
    svc.registerFlavor({ pack: "a-pack", families: ["fam1"] });
    assert.deepEqual(
      svc.cardModFields("card1").map((m) => m.pack),
      ["a-pack", "b-pack", "c-pack"],
      "insertion order never voices — the sort owns the emission order",
    );
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

  it("THE FLAVOR MERGE (#39, the hot seam): several flavors on one (pack, family) merge rows — id-keyed, first wins, never shadowed", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"], rows: [row("a"), row("b")] });
    // the hot root's later flavor rides WITH the family's own table
    svc.registerFlavor({ pack: "loras", families: ["fam1"], rows: [row("c"), row("a")] });
    const out = svc.modCatalog("loras", "fam1");
    assert.equal(out.shared, false);
    assert.deepEqual(
      out.rows.map((r) => r.id),
      ["a", "b", "c"],
      "hot rows append; the duplicate id keeps the family's own row",
    );
  });

  it("THE FLAVOR MERGE: a rowless runtime flavor next to rows still serves the rows (no union fallback)", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"], rows: [row("a")] });
    svc.registerFlavor({ pack: "loras", families: ["fam1"], runtimeCatalog: true });
    const out = svc.modCatalog("loras", "fam1");
    assert.deepEqual(out.rows.map((r) => r.id), ["a"], "rows present, no union");
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
  // THE ENVELOPE FIXTURE (the parameter audit, 2026-09-14): the
  // carrier mimics schemastery's own wire form — .dict for the
  // registry walls, .toJSON() for the envelope the spec door serves.
  const carrier = (dict: Record<string, Record<string, unknown>>): ModFields => {
    const f = ((v: unknown): Record<string, unknown> => v as Record<string, unknown>) as unknown as {
      (v: unknown): Record<string, unknown>;
      dict: Record<string, Record<string, unknown>>;
      toJSON: () => unknown;
    };
    f.dict = dict;
    f.toJSON = () => ({ uid: 0, refs: { 0: { type: "object", dict } } });
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

  // THE ENVELOPE (the parameter audit, 2026-09-14): formSchemas is
  //  the one serving seam — the card's own toJSON plus the family-
  //  scoped mod contracts' toJSONs. The flat row walk, the frozen
  //  15-key shape, and the server-side presentation derivation are
  //  GONE: fieldsOf derives presentation client-side (pinned in
  //  card-base). The server pins: passthrough verbatim, family
  //  scoping on mods only, and the carrier ?? schema walk.
  it("an unknown card serves null", async () => {
    assert.equal((await boot()).formSchemas("ghost", "fam1"), null);
  });

  it("a toJSON-less carrier serves schema null (the carrier ?? walk)", async () => {
    const svc = await boot();
    svc.registerCard(card());
    const out = svc.formSchemas("card1", "fam1")!;
    assert.equal(out.schema, null, "a plain function schema carries no envelope");
    assert.deepEqual(out.mods, {});
  });

  it("the envelope rides the carrier's own toJSON, verbatim", async () => {
    const svc = await bootForm();
    const out = svc.formSchemas("card1", "fam1")!;
    const env = out.schema as { uid: number; refs: Record<string, { type: string; dict: Record<string, Record<string, unknown>> }> };
    assert.equal(env.uid, 0);
    const dict = env.refs["0"]!.dict;
    // the authored nodes ride as-authored — every node the client
    // battery (card-base fieldsOf) derives from:
    // wtype hints under meta.extra, unions with their lists, meta
    // defaults, min/max/step facts
    assert.equal(dict["textarea"]!.meta!["extra"]!["wtype"], "textarea");
    assert.deepEqual(dict["mode"]!.list!.map((c: { value: unknown }) => c.value), ["a", "b"]);
    assert.equal(dict["steps"]!.meta!["min"], 1);
    assert.equal(dict["steps"]!.meta!["max"], 8);
    assert.equal(dict["seed"]!.meta!["step"], 1);
    assert.equal(dict["prompt"]!.meta!["default"], "hi");
    assert.equal(dict["prompt"]!.meta!["description"], "the prompt");
    assert.equal(dict["prompt"]!.meta!["extra"]!["required"], true);
    assert.deepEqual(dict["picked"]!.meta!["extra"]!["options"], ["x", "y"]);
    // the whole card dict serves — no families filter on the card's
    // own envelope (family scoping is the MOD contracts' law)
    assert.ok("otherfam" in dict);
  });

  it("absorbed mod contracts ride their own envelopes, family-scoped", async () => {
    const svc = await bootForm();
    svc.registerPack({ pack: "loras", fields: fields({ strength: { type: "number", meta: { min: 0, max: 2 } } }) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"] });
    svc.registerFlavor({ pack: "loras", families: ["other"] });
    const out = svc.formSchemas("card1", "fam1")!;
    assert.deepEqual(Object.keys(out.mods), ["loras"], "the family-boarded pack rides");
    const unboarded = svc.formSchemas("card1", "unboarded")!;
    assert.ok(!("loras" in unboarded.mods), "the other family never sees the pack");
  });

  it("an absorbed pack with its own toJSON rides the envelope verbatim", async () => {
    const svc = await bootForm();
    svc.registerPack({ pack: "loras", fields: carrier({ strength: { type: "number", meta: { min: 0, max: 2 } } }) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"] });
    const out = svc.formSchemas("card1", "fam1")!;
    assert.deepEqual(
      out.mods["loras"],
      { uid: 0, refs: { 0: { type: "object", dict: { strength: { type: "number", meta: { min: 0, max: 2 } } } } } },
      "the pack's own serializer voices the mod envelope (never the null arm)",
    );
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
    svc.registerCard(card({ requiresModel: false, flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false }, boarded: [] }));
    assert.throws(
      () => svc.compose("card1", null, { bad: 1 }, "r"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-params" && /refused params/.test(e.message),
    );
  });

  it("the extension gate: missing nodes refuse, live nodes pass, empty maps pass", async () => {
    const svc = await boot();
    svc.registerCard(card({ requiresModel: false, flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false }, boarded: [] as never, requires: ["pack-a"] }));
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

  it("the arm-weight gate: an absent weight refuses loud with its fetch URL; a present one composes; no reader = fail-open", async () => {
    const svc = await boot();
    svc.registerCard(card({
      requiresModel: false,
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
      boarded: [] as never,
      provisions: [{ name: "w.bin", url: "http://w/w.bin", folder: "checkpoints" }],
      armWeights: () => ["w.bin"],
    }));
    // no reader armed (the walls-and-fixtures degrade) = fail-open
    svc.compose("card1", null, {}, "r0");
    svc.setWeightPresent(() => false);
    assert.throws(
      () => svc.compose("card1", null, {}, "r1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-weight"
        && /needs weight 'checkpoints\/w\.bin'/.test(e.message)
        && /http:\/\/w\/w\.bin/.test(e.message)
        && /provision_model model=card1/.test(e.message),
    );
    svc.setWeightPresent((rel, name) => rel === "models/checkpoints" && name === "w.bin");
    svc.compose("card1", null, {}, "r2");
    svc.setWeightPresent(null);
    svc.compose("card1", null, {}, "r3");
  });

  it("the arm-weight gate: a named-but-undeclared row is a declaration bug (refused, never skipped)", async () => {
    const svc = await boot();
    svc.registerCard(card({
      requiresModel: false,
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
      boarded: [] as never,
      provisions: [],
      armWeights: () => ["ghost.bin"],
    }));
    svc.setWeightPresent(() => true);
    assert.throws(
      () => svc.compose("card1", null, {}, "r1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-weight" && /no such provision row declared/.test(e.message),
    );
  });

  it("the model-less happy path composes + finalizes; recipes overlay", async () => {
    const svc = await boot();
    svc.registerCard(card({
      requiresModel: false,
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
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
    svc.registerCard(card({ requiresModel: false, flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false }, boarded: [] as never, requires: ["unmapped-pack"] }));
    svc.setObjectInfoNodes([]);
    const graph = svc.compose("card1", null, {}, "r");
    assert.ok("TestNode.0" in graph, "no facts, no gate, just the graph");
  });

  it("the ARM-CONDITIONAL kind gate: a non-empty bag with absent pack nodes refuses, an empty bag never fires", async () => {
    const svc = await boot();
    svc.registerCard(card({
      requiresModel: false,
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
      boarded: [] as never,
      mods: [
        { kind: "sam2", label: "SAM2", param_key: "sam2", cardinality: "list", requires: ["pack-sam"] },
        { kind: "draw", label: "Draw", param_key: "draw", cardinality: "list" },
        { kind: "ghost", label: "Ghost", param_key: "ghost", cardinality: "list", requires: ["unmapped-pack"] },
      ],
    }));
    svc.setFacts(factsFor({}, { "pack-sam": ["SamNode"] }));
    svc.setObjectInfoNodes(["Other"]);
    assert.throws(
      () => svc.compose("card1", "", { sam2: [{ labels: "person" }] }, "r"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-extension" && /requires 'pack-sam'/.test(e.message),
    );
    svc.compose("card1", "", {}, "r2");
    svc.compose("card1", "", { sam2: [] }, "r3");
    // a kind with NO requires never gates, however full its bag
    svc.compose("card1", "", { draw: [{ payload: "x" }] }, "r4");
    // an unmapped pack serves the empty map (never a block — the card-level law)
    svc.compose("card1", "", { ghost: [{ v: 1 }] }, "r5");
    svc.setObjectInfoNodes(["SamNode"]);
    svc.compose("card1", "", { sam2: [{ labels: "person" }] }, "r6");
  });

  it("a recipeless card ignores the recipe key", async () => {
    const svc = await boot();
    svc.registerCard(card({ requiresModel: false, flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false }, boarded: [] as never }));
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

  // ── STEPS APPLIED (2026-09-18, the operator's plaguekind law):
  // a distill row's married step count resolves onto the entry; the
  // caller's own stated count wins over the row's; unstated stays
  // unstated (a non-distill lora has no count to claim). ──
  it("lora steps resolve (row seeds, caller wins, name rows pass verbatim)", async () => {
    const seen: Record<string, unknown>[] = [];
    const svc = await bootModel({ compose: (params) => { seen.push({ ...params }); } });
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({
      pack: "loras",
      families: ["fam1"],
      rows: [
        { id: "dareties", filename: "dareties.safetensors", source_url: "https://h/d", steps: 4 },
        { id: "turbo", filename: "turbo.safetensors", source_url: "https://h/t", steps: 8 },
      ],
    });
    // the row's count seeds an unstated entry
    svc.compose("card1", "fam1", { loras: [{ id: "turbo", strength: 0.6 }] }, "s1");
    assert.deepEqual(seen[0]!["loras"], [{ name: "turbo.safetensors", strength: 0.6, steps: 8 }]);
    // the caller's stated count wins over the row's
    svc.compose("card1", "fam1", { loras: [{ id: "turbo", strength: 0.6, steps: 5 }] }, "s2");
    assert.deepEqual(seen[1]!["loras"], [{ name: "turbo.safetensors", strength: 0.6, steps: 5 }]);
    // a name-row carries its stated count verbatim; a steps-less
    // name-row stays steps-less
    svc.compose("card1", "fam1", { loras: [{ name: "raw.safetensors", strength: 0.4, steps: 6 }] }, "s3");
    assert.deepEqual(seen[2]!["loras"], [{ name: "raw.safetensors", strength: 0.4, steps: 6 }]);
    svc.compose("card1", "fam1", { loras: [{ name: "raw.safetensors", strength: 0.4 }] }, "s4");
    assert.deepEqual(seen[3]!["loras"], [{ name: "raw.safetensors", strength: 0.4 }]);
    // a non-number steps claim is ignored (never a NaN on the wire)
    svc.compose("card1", "fam1", { loras: [{ id: "dareties", steps: "four" as unknown }] }, "s5");
    assert.deepEqual(seen[4]!["loras"], [{ name: "dareties.safetensors", strength: 1.0, steps: 4 }]);
  });

  // ── THE T3 REFINE RIDER RESOLUTION (roadmap item 2): the same
  // law as the bag — the id resolves against the served rows, the
  // row seeds strength+steps, caller overrides win, unknown ids
  // and count-less rows refuse LOUD, and an unset rider leaves
  // params clean (the cache keys of existing films never move). ──
  it("the refine rider resolves (row seeds, caller wins, count-less refuses, unset stays absent)", async () => {
    const seen: Record<string, unknown>[] = [];
    const svc = await bootModel({ compose: (params) => { seen.push({ ...params }); } });
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({
      pack: "loras",
      families: ["fam1"],
      rows: [
        { id: "taomate", filename: "taomate.safetensors", source_url: "https://h/t", default_strength: 0.7, steps: 3 },
        { id: "bare", filename: "bare.safetensors", source_url: "https://h/b" },
      ],
    });
    svc.compose("card1", "fam1", { refine_lora: "taomate" }, "f1");
    assert.deepEqual(seen[0]!["refine"], { name: "taomate.safetensors", strength: 0.7, steps: 3 }, "the row's marriage seeds the rider (taomate: 0.7 @ 3)");
    svc.compose("card1", "fam1", { refine_lora: "taomate", refine_strength: 1.0, refine_steps: 4 }, "f2");
    assert.deepEqual(seen[1]!["refine"], { name: "taomate.safetensors", strength: 1.0, steps: 4 }, "the caller's overrides win");
    assert.throws(
      () => svc.compose("card1", "fam1", { refine_lora: "ghost" }, "f3"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-refine-lora" && /no 'fam1' flavor row/.test(e.message),
    );
    assert.throws(
      () => svc.compose("card1", "fam1", { refine_lora: "bare" }, "f4"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "refine-steps" && /needs a count/.test(e.message),
      "a count-less row with no explicit steps refuses (no silent count)",
    );
    svc.compose("card1", "fam1", { refine_lora: "bare", refine_steps: 2 }, "f5");
    assert.deepEqual(seen[2]!["refine"], { name: "bare.safetensors", strength: 1.0, steps: 2 }, "explicit steps rescue a count-less row");
    svc.compose("card1", "fam1", {}, "f6");
    assert.ok(!("refine" in seen[3]!), "unset rider serializes nothing");
  });

  it("a rowless refine catalog says 'registered: none' (never a dangling list)", async () => {
    const svc = await bootModel({ compose: () => {} });
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({ pack: "loras", families: ["fam1"], rows: [] });
    assert.throws(
      () => svc.compose("card1", "fam1", { refine_lora: "ghost" }, "f1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-refine-lora" && /\(registered: none\)/.test(e.message),
    );
  });

  it("hand-authored weight rows honor the weight (strength-first, never silent full)", async () => {
    const seen: Record<string, unknown>[] = [];
    const svc = await bootModel({ compose: (params) => { seen.push({ ...params }); } });
    svc.registerPack({ pack: "loras", fields: fields({}) });
    svc.registerFlavor({
      pack: "loras",
      families: ["fam1"],
      rows: [{ id: "cool", filename: "cool.safetensors", source_url: "https://h/cool" }],
    });
    svc.compose("card1", "fam1", { loras: [{ name: "raw.safetensors", weight: 0.5 }] }, "r1");
    assert.deepEqual(seen[0]!["loras"], [{ name: "raw.safetensors", strength: 0.5 }]);
    svc.compose("card1", "fam1", { loras: [{ id: "cool", weight: 0.25 }] }, "r2");
    assert.deepEqual(seen[1]!["loras"], [{ name: "cool.safetensors", strength: 0.25 }]);
    svc.compose("card1", "fam1", { loras: [{ name: "raw.safetensors", strength: 0.8, weight: 0.1 }] }, "r3");
    assert.deepEqual(seen[2]!["loras"], [{ name: "raw.safetensors", strength: 0.8 }], "a stated strength wins over the weight");
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

// ── THE PACK PRESENCE READ (no-silent-drop law's extension half,
//    hour 26 stroke 18 — the EXTENSION-LAW gate's own check as a
//    serve; the spec's packs block and the load bundle's pack hints
//    read THIS, one spelling) ──
describe("packPresence (the gate's check as a read)", () => {
  it("present when a declared node type is live; missing when none; unknown without facts or engine", async () => {
    const svc = await boot();
    // engine facts not loaded: everything unknown (never a guess)
    svc.setObjectInfo({ NodeA: {} });
    assert.deepEqual(svc.packPresence(["pack-a"]), [{ id: "pack-a", present: null }]);
    // facts loaded, pack-a declares NodeA (live) + pack-b declares NodeB (dead)
    svc.setFacts(factsFor({}, { "pack-a": ["NodeA"], "pack-b": ["NodeB"] }));
    assert.deepEqual(svc.packPresence(["pack-a", "pack-b", "pack-ghost"]), [
      { id: "pack-a", present: true },
      { id: "pack-b", present: false },
      { id: "pack-ghost", present: null }, // no declared node types — the gate cannot see it
    ]);
    // engine snapshot absent: unknown again (the gate stands down too)
    svc.setObjectInfo(null);
    assert.deepEqual(svc.packPresence(["pack-a"]), [{ id: "pack-a", present: null }]);
  });
});

// ── resolveControlNetEntry (the compose-side half of the
// type/model split — the service resolves, the kit fires; every
// malformed row refuses LOUD with its entry named) ──
describe("resolveControlNetEntry (the controlnet wire resolution)", () => {
  const rows = [
    { id: "depth", filename: "union.safetensors", source_url: "https://h/depth", default_strength: 1.0, preprocessor: "depth_anything" },
    { id: "gray", filename: "union.safetensors", source_url: "https://h/gray" },
  ];
  const good = { type: "depth", image_b64: "map.png" };

  it("normalizes the UI row (catalog key + map) to the lane shape", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    assert.deepEqual(resolveControlNetEntry(good, rows, "card1", "fam1"), {
      type: "depth", model: "union.safetensors", preprocessor: "depth_anything",
      image_b64: "map.png", artifact: "", image: "map.png",
      strength: 1.0, start_percent: 0, end_percent: 1, enabled: true,
    });
  });
  it("a non-object row and an unnamed type refuse as unknown", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    for (const raw of [null, 42, {}, { type: "" }, { type: "ghost", image_b64: "m.png" }]) {
      assert.throws(
        () => resolveControlNetEntry(raw, rows, "card1", "fam1"),
        (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-controlnet",
      );
    }
    assert.throws(
      () => resolveControlNetEntry({ type: "ghost" }, [], "card1", "fam1"),
      (e: unknown) => e instanceof Error && /registered: none/.test(e.message),
    );
  });
  it("a model naming another file refuses (the union file is the row's)", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    assert.throws(
      () => resolveControlNetEntry({ ...good, model: "other.safetensors" }, rows, "card1", "fam1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "controlnet-drift" && /other\.safetensors/.test(e.message),
    );
    // the row's own file restated rides
    assert.equal(
      resolveControlNetEntry({ ...good, model: "union.safetensors" }, rows, "card1", "fam1").model,
      "union.safetensors",
    );
  });
  it("a disagreeing preprocessor refuses; agreement and absence ride", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    assert.throws(
      () => resolveControlNetEntry({ ...good, preprocessor: "canny" }, rows, "card1", "fam1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "controlnet-drift" && /depth_anything/.test(e.message),
    );
    assert.equal(
      resolveControlNetEntry({ ...good, preprocessor: "depth_anything" }, rows, "card1", "fam1").preprocessor,
      "depth_anything",
    );
    // a row with no note trusts nothing and notes nothing
    const gray = resolveControlNetEntry({ type: "gray", image_b64: "m.png", preprocessor: "none" }, rows, "card1", "fam1");
    assert.equal(gray.preprocessor, "none");
    assert.equal(gray.strength, 0.7, "no row default seeds the 0.7 backstop");
  });
  it("strength: stated rides, off-bounds refuses (never a silent clamp)", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    assert.equal(resolveControlNetEntry({ ...good, strength: 0.4 }, rows, "card1", "fam1").strength, 0.4);
    for (const strength of [-1, 2.5, Number.NaN, "high"]) {
      assert.throws(
        () => resolveControlNetEntry({ ...good, strength }, rows, "card1", "fam1"),
        (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-controlnet" && /strength/.test(e.message),
      );
    }
  });
  it("the step range shape refuses malformed; the schedule refuses non-full", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    for (const range of [
      { start_percent: -1 }, { end_percent: 2 }, { start_percent: 0.7, end_percent: 0.2 },
      { start_percent: "early" },
    ]) {
      assert.throws(
        () => resolveControlNetEntry({ ...good, ...range }, rows, "card1", "fam1"),
        (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-controlnet" && /step range/.test(e.message),
      );
    }
    assert.throws(
      () => resolveControlNetEntry({ ...good, start_percent: 0.2, end_percent: 0.9 }, rows, "card1", "fam1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "controlnet-schedule" && /no start\/end inputs/.test(e.message),
    );
  });
  it("the artifact wins; a map-less row refuses; non-string sources are no source", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    const won = resolveControlNetEntry({ ...good, artifact: "front_pose" }, rows, "card1", "fam1");
    assert.equal(won.image, "front_pose");
    assert.throws(
      () => resolveControlNetEntry({ type: "depth" }, rows, "card1", "fam1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-controlnet" && /no conditioning image/.test(e.message),
    );
    const coerced = resolveControlNetEntry({ type: "depth", artifact: 42, image_b64: "m.png" }, rows, "card1", "fam1");
    assert.equal(coerced.image, "m.png");
    assert.throws(
      () => resolveControlNetEntry({ type: "depth", artifact: "", image_b64: 42 }, rows, "card1", "fam1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-controlnet",
    );
  });
  it("enabled defaults true; a non-boolean refuses", async () => {
    const { resolveControlNetEntry } = await import("../src/service.ts");
    assert.equal(resolveControlNetEntry({ ...good, enabled: false }, rows, "card1", "fam1").enabled, false);
    assert.throws(
      () => resolveControlNetEntry({ ...good, enabled: "yes" }, rows, "card1", "fam1"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-controlnet" && /boolean/.test(e.message),
    );
  });
});

describe("compose (the controlnet wire resolution)", () => {
  it("resolves catalog rows to the lane shape; unknown types refuse before any graph", async () => {
    const svc = await boot();
    svc.registerPack({ pack: "controlnet", fields: fields({}) });
    svc.registerFlavor({
      pack: "controlnet",
      families: ["fam1"],
      rows: [{ id: "depth", filename: "u.safetensors", source_url: "https://h/u" }],
    });
    let seen: unknown = null;
    svc.registerCard(card({
      compose: (params) => { seen = (params as Record<string, unknown>)["controlnets"]; },
    }));
    svc.setFacts(factsFor({ fam1: { mods: ["controlnet"] } }));
    svc.compose("card1", "fam1", { controlnets: [{ type: "depth", image_b64: "m.png" }] }, "r");
    assert.deepEqual(seen, [{
      type: "depth", model: "u.safetensors", preprocessor: "",
      image_b64: "m.png", artifact: "", image: "m.png",
      strength: 0.7, start_percent: 0, end_percent: 1, enabled: true,
    }]);
    assert.throws(
      () => svc.compose("card1", "fam1", { controlnets: [{ type: "ghost" }] }, "r2"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-controlnet",
    );
  });
});

describe("requiresModel lift (the phantom model demand, 2026-09-21)", () => {
  // Cards declare requiresModel inside flowKinds (the single
  // declaration); the gates read the def top-level. The registrar
  // lifts absent top-level from flowKinds — image-edit (flowKinds
  // false) demanded a model on every wired flow stage until this.
  it("flowKinds false with no top-level key composes model-less", async () => {
    const svc = await boot();
    svc.registerCard(card({
      boarded: [] as never,
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
    }));
    const g = svc.compose("card1", null, {}, "r");
    assert.ok("TestNode.0" in g, "the lift lands: null model composes");
  });
});

describe("requiresModel conflict (one declaration, no contradictions)", () => {
  // Both stated and disagreeing refuses LOUD at registration — a
  // silent top-level-wins would let one face lie to the gates.
  it("top-level true against flowKinds false refuses", async () => {
    const svc = await boot();
    assert.throws(
      () => svc.registerCard(card({
        requiresModel: true,
        flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
      })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "requires-model-conflict",
    );
  });

  it("agreeing pairs still register", async () => {
    const svc = await boot();
    svc.registerCard(card({
      requiresModel: false,
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
      boarded: [] as never,
    }));
    const g = svc.compose("card1", null, {}, "r");
    assert.ok("TestNode.0" in g);
  });
});
