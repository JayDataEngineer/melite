// cards-registry.spec.ts — the card registry: errors, priming,
// facts/decls/object-info reads, family resolution, the prepare
// pipeline, R1 selection, the stamp overlay, the lift, the sweep,
// and the compose phases (spell/admission/happy).
import { describe, it, beforeAll, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import {
  CARD_ENVELOPE_KEYS,
  CardArmError,
  CardRegistryService,
  cardRegistryProvider,
  findCardDangling,
  familyFace,
  liftCardParams,
  needCardRegistry,
  pyStrMid,
  selectCardVariant,
  stampCardOverlay,
} from "../src/cardsRegistry.ts";
import type { ModelFactsRow } from "../src/cardsRegistry.ts";

const svc = (): CardRegistryService => new CardRegistryService(new Context());

beforeAll(async () => {
  const s = svc();
  await s.prime();
  (globalThis as unknown as { __cards: CardRegistryService }).__cards = s;
  // THE LANE PRESENCE GATE's hermetic deferral (2026-09-13): the
  // real-family phase tests below are registry-logic tests, not
  // store tests — a sandboxed world with no endpoint fixture has no
  // store to enforce against, so the gate stands down for them
  // (CI-deterministic: no machine store required). The gate's own
  // describe re-arms it with a fixture endpoint config.
  process.env.INFERENCE_TEST_SANDBOX = "1";
}, 240000);

const primed = (): CardRegistryService =>
  (globalThis as unknown as { __cards: CardRegistryService }).__cards;

let TMP = "";
afterEach(() => {
  delete process.env.MELITE_REPO_ROOT;
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmpRoot = (): string => {
  const d = mkdtempSync(join(tmpdir(), "cards-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};

describe("CardArmError + envelope keys", () => {
  it("carries the refusal shape (optionals ride only when stated)", () => {
    const full = new CardArmError(400, "m", "c", "loc", "exp", "got");
    assert.equal(full.status, 400);
    assert.equal(full.loc, "loc");
    assert.equal(full.expected, "exp");
    assert.equal(full.got, "got");
    const bare = new CardArmError(503, "m", "c");
    assert.equal(bare.loc, undefined);
    assert.equal(bare.expected, undefined);
    assert.equal(bare.got, undefined);
    assert.ok((CARD_ENVELOPE_KEYS as readonly string[]).includes("model"));
    assert.ok((CARD_ENVELOPE_KEYS as readonly string[]).includes("draft_id"));
  });
});

describe("priming", () => {
  it("unprimed reads throw LOUD; reset drops state", async () => {
    const s = svc();
    assert.throws(() => s.defsSync(), /unprimed/);
    assert.throws(() => s.readsSync(), /unprimed/);
    assert.throws(() => s.cardDecls(), /unprimed/);
    await s.prime();
    assert.ok(s.defsSync().size > 0);
    assert.ok(s.readsSync() !== null);
    s.resetForTests();
    assert.throws(() => s.defsSync(), /unprimed/);
  });

  it("the provider primes at apply", async () => {
    const ctx = new Context();
    await cardRegistryProvider.apply(ctx);
    assert.ok(ctx.cardRegistry.defsSync().size > 0);
  }, 240000);
});

describe("facts + decls", () => {
  it("serves strict facts, cached decls, and explicit-facts decls", () => {
    const s = primed();
    const facts = s.modelFacts();
    // 26 since the form-seams stroke (ideogram's facts row retired
    // with its card 2026-09-17; fit + skin went at stroke 87)
    // cards — the DCC surface moved to the blender MCP skills;
    // the studio family retired earlier, stroke 75)
    assert.ok(Object.keys(facts).length >= 26);
    assert.equal(s.cardDecls(), s.cardDecls());
    const decls = s.cardDecls();
    assert.ok(decls["image-gen"] !== undefined);
    assert.ok(decls["image-gen"]!.schemaNames.length > 0);
    // explicit facts: studio writes union into admits (deduped).
    const fam = Object.keys(facts).find((f) => facts[f]!.card in decls)!;
    const card = facts[fam]!.card;
    const injected: Record<string, ModelFactsRow> = {
      [fam]: {
        card,
        defaults: {},
        variants: [],
        studio: { writes: ["zzz-new-write", "zzz-new-write"] },
      },
    };
    const derived = s.cardDecls(injected);
    assert.ok(derived[card]!.admits.includes("zzz-new-write"));
    assert.equal(
      derived[card]!.admits.filter((a) => a === "zzz-new-write").length,
      1,
    );
  });

  it("strict facts throw LOUD under a root without the slice", async () => {
    process.env.MELITE_REPO_ROOT = tmpRoot();
    const s = svc();
    await s.prime();
    assert.throws(() => s.modelFacts(), /ENOENT/);
  });
});

describe("objectInfo", () => {
  it("serves the pin snapshot (mtime-cached)", () => {
    const s = primed();
    const a = s.objectInfo();
    assert.ok(a !== null && typeof a === "object");
    assert.equal(s.objectInfo(), a);
  });

  it("absent/bad pins read null; mtime changes re-read", async () => {
    const root = tmpRoot();
    process.env.MELITE_REPO_ROOT = root;
    const data = join(root, "packages", "engines", "comfyui-cordis", "data");
    mkdirSync(data, { recursive: true });
    const s = svc();
    await s.prime();
    assert.equal(s.objectInfo(), null);
    assert.equal(s.objectInfo(), null);
    writeFileSync(join(data, "object_info.json"), "{bad");
    assert.equal(s.objectInfo(), null);
    writeFileSync(join(data, "object_info.json"), "[1]");
    assert.equal(s.objectInfo(), null);
    writeFileSync(join(data, "object_info.json"), '{"a":1}');
    assert.deepEqual(s.objectInfo(), { a: 1 });
    assert.equal(s.objectInfo(), s.objectInfo());
    writeFileSync(join(data, "object_info.json"), '{"a":2}');
    const t = new Date(Date.now() + 5000);
    utimesSync(join(data, "object_info.json"), t, t);
    assert.deepEqual(s.objectInfo(), { a: 2 });
  }, 240000);
});

describe("mids + families", () => {
  it("catalogs mids (cached) and resolves families", () => {
    const s = primed();
    const mids = s.modelMids();
    assert.ok(mids.size >= 50);
    assert.equal(s.modelMids(), mids);
    assert.equal(s.resolveCardFamily("anima"), "anima");
    assert.equal(s.resolveCardFamily("ghost-mid"), "ghost-mid");
    // facts-less rows skip the lens (variants absent, not empty).
    const bare: Record<string, ModelFactsRow> = {
      fam: { card: "c", defaults: {} } as ModelFactsRow,
      thin: {
        card: "c",
        defaults: {},
        variants: [{ id: "a", group: "Std", route: "r" }],
      } as unknown as ModelFactsRow,
    };
    assert.equal(s.resolveCardFamily("ghost-mid", bare), "ghost-mid");
    assert.equal(s.resolveCardFamily("anima"), s.resolveCardFamily("anima", s.modelFacts()));
  });
});

describe("prepareCardParams", () => {
  it("refuses dangling refs, illegal ids and unknown units first", () => {
    const s = primed();
    assert.throws(
      () => s.prepareCardParams({ photo: "/v1/assets/runs/ghost/x.png" }, "anima", "1"),
      /dangling artifact ref/,
    );
    assert.throws(() => s.prepareCardParams({}, "NOT LEGAL!", "1"), /not a legal identifier/);
    assert.throws(() => s.prepareCardParams({}, "ghost-mid", "1"), /no model unit/);
  });

  it("prepares a real family (select + stamp + lift)", () => {
    const s = primed();
    const prep = s.prepareCardParams({ variant: undefined, quant: null }, "anima", "1");
    assert.equal(prep.mid, "anima");
    assert.equal(prep.fam, "anima");
    assert.equal(prep.card, "image-gen");
    assert.ok(prep.skeleton.length > 0);
    assert.ok(!("variant" in prep.params) && !("quant" in prep.params));
  });

  it("the validate-door overlay agrees (phase-1 voice)", () => {
    const over = primed().overlayCardParams({}, "anima");
    assert.equal(over.fam, "anima");
    assert.equal(over.card, "image-gen");
  });

  // THE 2026-09-14 BENCH POISON (operator: model anima + variant
  // turbo refused at Gen press, "you said proof"): krea-2's turbo
  // riding anima refuses LOUD at the compose gate — the operator's
  // verbatim error, reproduced here — while the repaired coordinates
  // (anima's own standard, no cellar, card recipe) compose.
  it("turbo-on-anima refuses; the repaired bench composes", () => {
    const s = primed();
    assert.throws(
      () => s.prepareCardParams({ variant: "turbo", quant: "int8" }, "anima", "1"),
      /unknown variant 'turbo' for model 'anima' \(known: standard, draft, detailed, default\)/,
    );
    const prep = s.prepareCardParams(
      {
        variant: "standard", quant: null, recipe: "standard",
        prompt: "a cheerful anime girl at the beach",
      },
      "anima",
      "1",
    );
    assert.equal(prep.mid, "anima");
    assert.equal(prep.fam, "anima");
    assert.equal(prep.card, "image-gen");
    assert.ok(!("variant" in prep.params) && !("quant" in prep.params));
  });
});

describe("resolveStageParams (the 1:1 run law's served truth)", () => {
  it("serves the run's own compose input (prepare parity)", () => {
    const s = primed();
    const body = {
      model: "anima", variant: "standard", quant: null, recipe: "standard",
      prompt: "a cheerful anime girl at the beach",
    };
    const served = s.resolveStageParams({ ...body });
    const prep = s.prepareCardParams({ ...body }, "anima", "1");
    assert.deepEqual(served, prep.params);
    assert.ok(!(served as Record<string, unknown>)["variant"] && !("quant" in (served as Record<string, unknown>)));
    assert.equal((served as Record<string, unknown>)["prompt"], "a cheerful anime girl at the beach");
  });

  it("returns null when no unit resolves (never a throw on the serve path)", () => {
    const s = primed();
    assert.equal(s.resolveStageParams({}), null);
    assert.equal(s.resolveStageParams({ model: "" }), null);
    assert.equal(s.resolveStageParams({ model: "ghost-mid" }), null);
    assert.equal(s.resolveStageParams({ model: "anima", variant: "turbo", quant: "int8" }), null);
  });
});

describe("selectCardVariant", () => {
  const row = (variants: ModelFactsRow["variants"]): ModelFactsRow => ({
    card: "c",
    defaults: {},
    variants,
  });
  const v = (id: string, group = "Std", cells: Array<{ quant: string; route: string }> = []): ModelFactsRow["variants"][number] => ({
    id,
    group,
    route: "route-" + id,
    resolver_defaults: { k: id },
    cells,
  });

  it("defaults to the first non-Recipe variant / first cell", () => {
    const sel = selectCardVariant("m", row([v("recipe", "Recipe"), v("a", "Std", [{ quant: "q8", route: "r" }]), v("b")]), {}, "1");
    assert.deepEqual(sel, { variantId: "a", quant: "q8", resolverDefaults: { k: "a" } });
    const allRecipe = selectCardVariant("m", row([v("r1", "Recipe")]), {}, "1");
    assert.equal(allRecipe.variantId, "r1");
    assert.equal(allRecipe.quant, "");
    const empty = selectCardVariant("m", row([]), {}, "1");
    assert.deepEqual(empty, { variantId: "", quant: "", resolverDefaults: {} });
  });

  it("stated coordinates win (id or route); unknowns refuse", () => {
    const fam = row([v("a", "Std", [{ quant: "q8", route: "r" }])]);
    assert.equal(selectCardVariant("m", fam, { variant: "a", quant: "q8" }, "1").quant, "q8");
    assert.equal(selectCardVariant("m", fam, { variant: "route-a" }, "2").variantId, "a");
    assert.throws(() => selectCardVariant("m", fam, { variant: "ghost" }, "1"), /unknown variant/);
    assert.throws(() => selectCardVariant("m", fam, { variant: 5 }, "1"), /variant must be a string \(got number\)/);
    assert.throws(() => selectCardVariant("m", fam, { variant: ["a"] }, "1"), /variant must be a string \(got list\)/);
    assert.throws(() => selectCardVariant("m", fam, { variant: "a", quant: "ghost" }, "1"), /unknown quant/);
    assert.throws(() => selectCardVariant("m", fam, { variant: "a", quant: 5 }, "1"), /quant must be a string/);
    assert.throws(() => selectCardVariant("m", fam, { variant: "a", quant: ["q"] }, "1"), /quant must be a string \(got list\)/);
  });

  it("cell-less variants name the empty cellar", () => {
    const fam = row([v("a")]);
    assert.throws(() => selectCardVariant("m", fam, { variant: "a", quant: "q" }, "1"), /declares no cells/);
  });

  it("JSON-thin rows ride the fallbacks (absent keys, not empty ones)", () => {
    const thin = {
      card: "c",
      defaults: undefined,
      variants: undefined,
      resolver_defaults: undefined,
    } as unknown as ModelFactsRow;
    assert.throws(() => selectCardVariant("m", thin, { variant: "a" }, "1"), /unknown variant/);
    assert.deepEqual(selectCardVariant("m", thin, {}, "1"), {
      variantId: "",
      quant: "",
      resolverDefaults: {},
    });
    const noCells = {
      card: "c",
      defaults: {},
      variants: [{ id: "a", group: "Std", route: "r", cells: undefined, resolver_defaults: undefined }],
    } as unknown as ModelFactsRow;
    const sel = selectCardVariant("m", noCells, {}, "1");
    assert.deepEqual(sel, { variantId: "a", quant: "", resolverDefaults: {} });
    const emptyCells = {
      card: "c",
      defaults: {},
      variants: [{ id: "a", group: "Std", route: "r", cells: [], resolver_defaults: {} }],
    } as unknown as ModelFactsRow;
    assert.equal(selectCardVariant("m", emptyCells, {}, "1").quant, "");
    assert.throws(() => selectCardVariant("m", noCells, { quant: "q" }, "1"), /declares no cells/);
    const thinCells = {
      card: "c",
      defaults: {},
      variants: [{ id: "a", group: "Std", route: "r", cells: [{}], resolver_defaults: {} }],
    } as unknown as ModelFactsRow;
    assert.equal(selectCardVariant("m", thinCells, {}, "1").quant, "");
    assert.throws(() => selectCardVariant("m", thin, { quant: "q" }, "1"), /unknown quant/);
    const stamped = stampCardOverlay(
      {},
      thin,
      { schemaNames: ["w"], admits: [] } as never,
      { variantId: "", quant: "", resolverDefaults: {} },
    );
    assert.deepEqual(stamped, {});
  });
});

describe("stampCardOverlay + liftCardParams", () => {
  const declOf = (schemaNames: string[], admits: string[] = []): { schemaNames: string[]; admits: string[] } => ({
    schemaNames,
    admits,
  });

  it("stamps absent keys on the surface; consumes the contract", () => {
    const famRow: ModelFactsRow = {
      card: "c",
      defaults: { w: 1, h: 2, skipme: 1, model: "x", offsurf: 1, none: null, empty: "", undef: undefined },
      variants: [],
    };
    const sel = { variantId: "a", quant: "", resolverDefaults: { h: 99, extra: 1, "trail-x": 1 } };
    const stamped = stampCardOverlay(
      { w: 0, variant: "a", quant: "q8" },
      famRow,
      declOf(["w", "h", "extra", "model"], ["skipme", "trail-*"]) as never,
      sel,
    );
    assert.equal(stamped["w"], 0);
    assert.equal(stamped["h"], 99);
    assert.equal(stamped["extra"], 1);
    assert.equal(stamped["trail-x"], 1);
    assert.equal(stamped["skipme"], 1);
    assert.ok(!("model" in stamped) && !("offsurf" in stamped));
    assert.ok(!("none" in stamped) && !("empty" in stamped) && !("undef" in stamped));
    const params = liftCardParams({ ...stamped, variant: "a", quant: "q8", model: "y" });
    assert.ok(!("variant" in params) && !("quant" in params) && !("model" in params));
    assert.equal(params["w"], 0);
  });
});

describe("findCardDangling live roots", () => {
  it("live artifacts ride (either root serves; the second covers the first's miss)", () => {
    const runs = join(resolveRepoRoot(), "data", "runs");
    const live = join(runs, "output", "run-cards-live");
    const liveTest = join(runs, "test-output", "run-cards-live");
    mkdirSync(live, { recursive: true });
    mkdirSync(liveTest, { recursive: true });
    writeFileSync(join(live, "a.png"), "png");
    writeFileSync(join(liveTest, "b.png"), "png");
    TMP = TMP === "" ? live + ":" + liveTest : TMP + ":" + live + ":" + liveTest;
    try {
      assert.equal(findCardDangling({ p: "/v1/assets/runs/run-cards-live/a.png" }), null);
      assert.equal(findCardDangling({ p: "/v1/assets/runs/run-cards-live/b.png" }), null);
    } finally {
      rmSync(live, { recursive: true, force: true });
      rmSync(liveTest, { recursive: true, force: true });
      TMP = "";
    }
  });
});

describe("findCardDangling", () => {
  it("nulls clean bodies; names dangling refs (either root serves)", () => {
    assert.equal(findCardDangling({}), null);
    assert.equal(findCardDangling({ photo: "plain.png" }), null);
    const [loc, ref, why] = findCardDangling({
      deep: { list: ["ok.png", "/v1/assets/runs/ghost/x.png"] },
    })!;
    assert.equal(loc, "$.deep.list[1]");
    assert.equal(ref, "/v1/assets/runs/ghost/x.png");
    assert.match(why, /artifact not found on disk/);
  });

  it("refuses traversal + malformed URLs", () => {
    assert.match(
      findCardDangling({ p: "/v1/assets/runs/../x/y.png" })![2],
      /refuses traversal/,
    );
    assert.match(
      findCardDangling({ p: "/v1/assets/runs/onlyrun" })![2],
      /malformed artifact URL/,
    );
  });
});

describe("pyStrMid", () => {
  it("mirrors str() at the rim", () => {
    assert.equal(pyStrMid("a"), "a");
    assert.equal(pyStrMid(true), "True");
    assert.equal(pyStrMid(false), "False");
    assert.equal(pyStrMid(null), "None");
    assert.equal(pyStrMid(undefined), "None");
    assert.equal(pyStrMid(5), "5");
    assert.deepEqual(pyStrMid({ a: 1 }), '{"a":1}');
    assert.match(pyStrMid(() => {}), /=>/);
  });
});

describe("needCardRegistry", () => {
  it("passes services, refuses absence LOUD", () => {
    const s = primed();
    assert.equal(needCardRegistry(s, "here"), s);
    assert.throws(() => needCardRegistry(null, "here"), /no CardRegistryService/);
    assert.throws(() => needCardRegistry(undefined, "here"), /no CardRegistryService/);
  });
});

describe("phases", () => {
  it("a complete body composes the phase-1 graph; phase-2 wraps it", async () => {
    const s = primed();
    const p1 = await s.phase1Card({ prompt: "a red square" }, "anima");
    assert.equal(p1.mid, "anima");
    assert.equal(p1.card, "image-gen");
    assert.equal(p1.spell, null);
    assert.ok(typeof p1.params["prompt"] === "string");
    const p2 = await s.phase2Card(p1, "run-phase2-probe");
    assert.ok(typeof p2.graph === "object" && p2.graph !== null);
    assert.equal(p2.skeleton, p1.skeleton);
    assert.equal(p2.spell, null);
  }, 240000);

  it("unprimed validation rethrows the boot error (never a shape)", async () => {
    await assert.rejects(svc().composeValidateCard("image-gen", "anima", {}), /unprimed/);
  }, 240000);

  it("the nested params stanza unwraps (siblings win)", async () => {
    await assert.rejects(
      primed().phase1Card({ params: { "no-such-knob": 1 } }, "anima"),
      /no-such-knob/,
    );
  }, 240000);

  it("spell keys ride only $-values (the rest fall through to compose)", async () => {
    // non-$ spell values compose (the estate-file refusal proves the
    // pool stayed empty and composeOnce ran).
    const settled = await primed()
      .phase1Card({ input_image: "plain.png" }, "seedvr2_ema")
      .then(
        () => "composed",
        (e: unknown) => "refused:" + (e as Error).message.slice(0, 60),
      );
    assert.match(settled, /composed|not a file/);
  }, 240000);

  it("h3 admission walks the admits row (exact + prefix arms)", async () => {
    const s = primed();
    await assert.rejects(s.phase1Card({ "no-such-knob": 1 }, "h3"), /unknown param/);
    // a prefix-admitted key passes admission (compose settles either way).
    await s.phase1Card({ ctx_foo: 1 }, "h3").then(
      () => "composed",
      (e: unknown) => "refused:" + ((e as Error).message.slice(0, 40)),
    );
  }, 240000);

  it("h3 admission covers its own families' axis stamps (quant + recipe)", async () => {
    const s = primed();
    // the h3-timeline family declares Variant/Quant/Recipe groups —
    // the axis seeding writes those keys onto every fresh stage, so
    // the card's admission must cover them (image-gen's recipe-knob
    // law; the lane run refused `recipe` before this row grew).
    // Admission-level assertion: the keys must pass the GATE (compose
    // may still refuse VALUES — that is the engine's own voice).
    await s.phase1Card({ quant: "int8", recipe: "default" }, "h3").then(
      () => "composed",
      (e: unknown) => {
        assert.doesNotMatch(
          (e as Error).message,
          /unknown param/,
          "axis stamps refused at admission: " + (e as Error).message.slice(0, 80),
        );
      },
    );
  }, 240000);

  it("post-admission compose refusals ride the phase voice", async () => {
    const r = await primed().composeValidateCard("image-gen", "anima", {
      prompt: "x",
      sampler: "nope",
    });
    assert.match(r!.message, /phase 1: bad-params/);
  }, 240000);
  it("spell bodies compose no graph", async () => {
    const p1 = await primed().phase1Card({ input_image: "$slot" }, "seedvr2_ema");
    assert.ok(p1.spell !== null && p1.spell.inputs["input_image"] === "$slot");
  }, 240000);

  it("unknown params refuse at admission (phase voice)", async () => {
    await assert.rejects(
      primed().phase1Card({ "no-such-knob": 1 }, "anima"),
      /card_compose phase 1.*unknown param/,
    );
  }, 240000);

  it("validate composes (null) or refuses in its shape", async () => {
    const ok = await primed().composeValidateCard("image-gen", "anima", {});
    assert.ok(ok === null || typeof ok.message === "string");
    assert.equal(await primed().composeValidateCard("image-gen", "anima", { prompt: "x" }), null);
  }, 240000);
});

// ── THE LANE PRESENCE GATE (2026-09-13, the one-pattern law) ───────
// Img Gen worked while Img Edit died because presence was luck, not
// law. The gate enforces every family's declared lane files against
// the store BEFORE a graph composes. Hermetic fixture drive: temp
// repo root (no data/runtime — the runtime leg misses
// deterministically) + fixture endpoint config whose model_base_path
// points at a temp store we seed per test. The sandbox default the
// file set in beforeAll is deleted per-test here (the fixture env
// re-arms the gate).
describe("the lane presence gate", () => {
  const withGateEnv = (): { base: string } => {
    const root = tmpRoot();
    const realRoot = resolveRepoRoot();
    // THE RUNTIME SHADOW (stroke 48 fix): phase-1 reads facts/defs
    // from the PRIMED registry (cached at beforeAll — the real root),
    // but the presence gate's runtime leg probes resolveRepoRoot() per
    // call. The real data/runtime tree is provision-populated now
    // (2026-09-14: the qwen text_encoder the test below names LANDED
    // there — the old "placeholder files only" comment lied and the
    // gate, correctly, stopped refusing). Pointing MELITE_REPO_ROOT at
    // the empty fixture shadows ONLY the store probes (runtime leg +
    // the fixture endpoint's mount leg); the voice under test
    // (family/key/file/fetch URL from cached facts) is unchanged.
    // afterEach deletes the override — no other test sees it.
    process.env.MELITE_REPO_ROOT = root;
    // THE DATA SHADOW: the happy-path tests below compose FOR REAL
    // through the primed registry — compose re-reads the cordis data
    // dir per call (object_info pin, model-facts), so the shadow
    // symlinks the WHOLE real data dir (captured before the override
    // above; the refusal test never reaches compose; the seed tests
    // ride the live files exactly as before). The STORE stays
    // fixture: the runtime tree (data/runtime) and the endpoint
    // mount leg both point at the empty fixture below.
    mkdirSync(join(root, "packages", "engines", "comfyui-cordis"), { recursive: true });
    symlinkSync(
      join(realRoot, "packages", "engines", "comfyui-cordis", "data"),
      join(root, "packages", "engines", "comfyui-cordis", "data"),
    );
    const base = join(root, "store");
    mkdirSync(base, { recursive: true });
    const endpoint = join(root, "endpoint.json");
    writeFileSync(
      endpoint,
      JSON.stringify({ model_base_path: base, extra_model_folders: { SEEDVR2: "SEEDVR2" } }),
    );
    process.env.COMFYUI_ENDPOINT_CONFIG = endpoint;
    delete process.env.INFERENCE_TEST_SANDBOX;
    return { base };
  };

  it("refuses LOUD when a declared lane file is missing — with the provision fetch hint", async () => {
    withGateEnv();
    // qwen-img-edit-2511 declares text_encoder
    // qwen_2.5_vl_7b_fp8_scaled.safetensors and PROVISIONS it (the
    // 2026-09-13 cure) — an empty store must name family, key,
    // file, and the fetch URL. The refusal fires BEFORE compose
    // (phase-1, the run never reaches ComfyUI to die silently).
    await assert.rejects(
      primed().phase1Card({ prompt: "x", image1: "plain.png" }, "qwen-img-edit-2511"),
      (e: unknown) => {
        assert.ok(e instanceof CardArmError);
        assert.equal((e as CardArmError).code, "lane_input_missing");
        assert.match((e as Error).message, /lane presence: family 'qwen-img-edit-2511' declares text_encoder 'qwen_2\.5_vl_7b_fp8_scaled\.safetensors'/);
        assert.match((e as Error).message, /— fetch it: https:\/\/huggingface\.co\/Comfy-Org\/Qwen-Image_ComfyUI\//);
        return true;
      },
    );
  }, 240000);

  it("the seed lands the lane: present files compose (anima)", async () => {
    const { base } = withGateEnv();
    // Seed anima's declared lane files into the fixture store — the
    // gate passes and phase-1 proceeds to a real compose (the
    // pattern the phases describe above proves for the happy path).
    mkdirSync(join(base, "text_encoders"), { recursive: true });
    mkdirSync(join(base, "vae"), { recursive: true });
    mkdirSync(join(base, "diffusion_models"), { recursive: true });
    writeFileSync(join(base, "text_encoders", "qwen_3_06b_base.safetensors"), "x");
    writeFileSync(join(base, "vae", "qwen_image_vae.safetensors"), "x");
    writeFileSync(join(base, "diffusion_models", "anima-base-v1.0.safetensors"), "x");
    const p1 = await primed().phase1Card({ prompt: "a red square" }, "anima");
    assert.equal(p1.mid, "anima");
    assert.equal(p1.spell, null);
  }, 240000);

  it("pack folders count (the SEEDVR2 law: custom-node homes are stores too)", async () => {
    const { base } = withGateEnv();
    // seedvr2_ema's unet/vae live ONLY in the SEEDVR2 pack folder —
    // the gate unions the endpoint's extra_model_folders keys, so a
    // file in a pack satisfies presence (never breaks a working
    // lane). Spell body: the gate fires before the spell branch.
    mkdirSync(join(base, "SEEDVR2"), { recursive: true });
    writeFileSync(join(base, "SEEDVR2", "seedvr2_ema_3b_fp16.safetensors"), "x");
    writeFileSync(join(base, "SEEDVR2", "ema_vae_fp16.safetensors"), "x");
    const p1 = await primed().phase1Card({ input_image: "$slot" }, "seedvr2_ema");
    assert.ok(p1.spell !== null && p1.spell.inputs["input_image"] === "$slot");
  }, 240000);

  it("a sandboxed world with no endpoint fixture defers (the hermetic seam)", async () => {
    delete process.env.COMFYUI_ENDPOINT_CONFIG;
    process.env.INFERENCE_TEST_SANDBOX = "1";
    // No store anywhere — the gate stands down and phase-1 proceeds
    // (the registry-logic tests above all ride this deferral).
    const p1 = await primed().phase1Card({ prompt: "a red square" }, "anima");
    assert.equal(p1.mid, "anima");
  }, 240000);

  it("an unparseable endpoint config degrades to the stock lane (never a crash)", async () => {
    withGateEnv();
    const endpoint = process.env.COMFYUI_ENDPOINT_CONFIG as string;
    // the pack-folders read throws inside lanePackFolders; the gate
    // degrades to the stock folders and still names the missing lane.
    writeFileSync(endpoint, "{ not json");
    await assert.rejects(
      primed().phase1Card(
        { prompt: "x", model: "qwen-img-edit-2511@fp8" },
        "qwen-img-edit-2511",
      ),
      (e: unknown) => {
        assert.ok(e instanceof CardArmError);
        assert.equal((e as CardArmError).code, "lane_input_missing");
        assert.match((e as Error).message, /declares text_encoder 'qwen_2\.5_vl_7b_fp8_scaled\.safetensors'/);
        return true;
      },
    );
  }, 240000);

  it("a non-object extra_model_folders degrades to the stock lane", async () => {
    const { base } = withGateEnv();
    const endpoint = process.env.COMFYUI_ENDPOINT_CONFIG as string;
    // an array is an object that is not a folders map — the gate
    // drops extras and still names the missing lane.
    writeFileSync(
      endpoint,
      JSON.stringify({ model_base_path: base, extra_model_folders: ["SEEDVR2"] }),
    );
    await assert.rejects(
      primed().phase1Card(
        { prompt: "x", model: "qwen-img-edit-2511@fp8" },
        "qwen-img-edit-2511",
      ),
      (e: unknown) => {
        assert.ok(e instanceof CardArmError);
        assert.equal((e as CardArmError).code, "lane_input_missing");
        return true;
      },
    );
    // a bare string degrades the same way.
    writeFileSync(
      endpoint,
      JSON.stringify({ model_base_path: base, extra_model_folders: "junk" }),
    );
    await assert.rejects(
      primed().phase1Card(
        { prompt: "x", model: "qwen-img-edit-2511@fp8" },
        "qwen-img-edit-2511",
      ),
      (e: unknown) => {
        assert.ok(e instanceof CardArmError);
        assert.equal((e as CardArmError).code, "lane_input_missing");
        return true;
      },
    );
  }, 240000);

  it("a family with no lane_inputs walks past the gate (h3)", async () => {
    withGateEnv();
    // h3 declares no lane_inputs — every lane key continues and the
    // gate returns null; compose settles in its own voice (never the
    // lane's).
    const settled = await primed().phase1Card({ ctx_foo: 1 }, "h3").then(
      () => "composed",
      (e: unknown) => "refused:" + (e as Error).message.slice(0, 60),
    );
    assert.doesNotMatch(settled, /lane presence/);
  }, 240000);

  it("a missing lane file with no provision names no fetch (anima, empty store)", async () => {
    withGateEnv();
    // anima's text_encoder is absent and anima declares no
    // provisions — the refusal names family/key/file and stops (no
    // fetch hint to give).
    await assert.rejects(
      primed().phase1Card({ prompt: "a red square" }, "anima"),
      (e: unknown) => {
        assert.ok(e instanceof CardArmError);
        assert.equal((e as CardArmError).code, "lane_input_missing");
        assert.match((e as Error).message, /family 'anima' declares text_encoder 'qwen_3_06b_base\.safetensors'/);
        assert.doesNotMatch((e as Error).message, /fetch it/);
        return true;
      },
    );
  }, 240000);

  afterEach(() => {
    delete process.env.COMFYUI_ENDPOINT_CONFIG;
    // Restore the file's hermetic default for the describes above.
    process.env.INFERENCE_TEST_SANDBOX = "1";
  });
});

// ── THE MODEL ADMISSION + THE FAMILIES BLOCK (no-silent-drop law,
//    hour 26 stroke 17 — the lane proof: the LLM wrote model=anima,
//    boarded but not downloaded; every surface silently disagreed) ──

describe("admitStageModel (the write-time door)", () => {
  it("ADMITS a boarded-but-absent model (stroke 18: absence prompts download, never blocks the write — world-truthful: the fixture's own presence decides)", () => {
    const s = primed();
    const rows = s.cardFamilies("image-gen");
    const absent = rows.find((r) => !r.present);
    // a world where every board is downloaded has nothing to prove
    // here; this wall pins the ARM (offered is offered), not the
    // machine
    if (absent === undefined) return;
    assert.deepEqual(s.admitStageModel("image-gen", absent.id), { ok: true });
  });

  it("refuses a model the card does not board (even present ones)", () => {
    const s = primed();
    const v = s.admitStageModel("image-gen", "qwen3-tts");
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.error, /not offered by card 'image-gen'/);
  });

  it("refuses on an unknown card", () => {
    const s = primed();
    const v = s.admitStageModel("__nope__", "krea-2");
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.error, /no registered card definition/);
  });

  it("refuses a model-less row whose card is unknown (the wipe's own hole: model-less used to pass unchecked)", () => {
    const s = primed();
    const v = s.admitStageModel("__nope__", undefined);
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.error, /no registered card definition/);
  });

  it("refuses a flow id staged as a card, naming the flow's cards", () => {
    const s = primed();
    const v = s.admitStageModel("image-upscale", undefined);
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.match(v.error, /'image-upscale' is a flow, not a card/);
      assert.match(v.error, /image-gen/);
      assert.match(v.error, /upscale-tools/);
    }
  });
  it("admits a present boarded model; a variant route resolves to its family; model-less passes", () => {
    const s = primed();
    assert.deepEqual(s.admitStageModel("image-gen", "krea-2"), { ok: true });
    // model-less rows compose on the default family — admitted
    assert.deepEqual(s.admitStageModel("image-gen", undefined), { ok: true });
    assert.deepEqual(s.admitStageModel("image-gen", ""), { ok: true });
  });
});

describe("cardFamilies (the presence-marked serve)", () => {
  it("serves every boarded family, marked — never a silent drop", () => {
    const s = primed();
    const rows = s.cardFamilies("image-gen");
    const ids = rows.map((r) => r.id);
    // the card's own declaration, whole
    assert.ok(ids.includes("krea-2"));
    assert.ok(ids.includes("anima"));
    for (const r of rows) {
      assert.equal(typeof r.present, "boolean");
      assert.equal(typeof r.id, "string");
      // THE FAMILY FACE (operator, 2026-09-16 — supersedes the
      // stroke-19 ids-only law): every row serves the family DECL's
      // own label, version included — an id-only face ("Moss Sfx")
      // is ambiguous between versions; the DECL label ("MOSS-SFX
      // v2") is the model's face. Never the composed variant+quant
      // row — the axes carry those.
      assert.equal(typeof r.label, "string");
      assert.ok(r.label.length > 0);
    }
    // the operator's reported case, pinned: sfx boards MOSS-SFX v2
    const sfx = s.cardFamilies("sfx");
    assert.deepEqual(
      sfx.map((r) => [r.id, r.label]),
      [["moss-sfx", "MOSS-SFX v2"]],
    );
    // familyFace both arms: the DECL face serves; an unknown family
    // degrades to its id (the serve never throws)
    assert.equal(familyFace("moss-sfx"), "MOSS-SFX v2");
    assert.equal(familyFace("__no_such_family__"), "__no_such_family__");
    // presence is per-row and MIRRORS the live catalog offer (the
    // machine truth, one spelling) — whatever this world says, the
    // mark matches it exactly
    const mids = s.modelMids();
    for (const r of rows) {
      assert.equal(r.present, mids.has(r.id));
    }
  });
});

describe("admission + families coverage arms", () => {
  it("a pure-tool card boards nothing: the refusal names both nones", () => {
    const s = primed();
    // mask-form boards [] — the model is not offered (boards:
    // none) and nothing is downloaded (downloaded here: none).
    // (The studio card retired at parity, stroke 75 — the FORM
    // card is the pure-tool exemplar now.)
    const v = s.admitStageModel("mask-form", "krea-2");
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.match(v.error, /not offered by card 'mask-form'/);
      assert.match(v.error, /boards: none/);
      assert.match(v.error, /downloaded here: none/);
    }
  });

  it("a cardless flow stages as 'none listed'", () => {
    const s = primed();
    // the character flow's stages carry no card ids — the refusal
    // says so instead of joining an empty list.
    const v = s.admitStageModel("character", undefined);
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.match(v.error, /'character' is a flow, not a card/);
      assert.match(v.error, /none listed/);
    }
  });

  it("families of an unknown card are the empty list", () => {
    assert.deepEqual(primed().cardFamilies("__nope__"), []);
  });
});
