// runs-validate.spec.ts — the flows VALIDATE surface: strictBody,
// pyReprJson, the stage-row compile (extras/isinstance/pulls), the
// wire + kind lattices, the prune/merge, the pin sweep, the
// artifact-ref probe, and the serve tail. Internals ride the two
// exported arms (inlineArm/serveSubject) with crafted bodies; the
// card gate rides a structural fake registry.
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import {
  FlowError,
  strictBody,
  pyReprJson,
  findDanglingRefs,
  inlineArm,
  serveSubject,
} from "../src/runsValidate.ts";
import type { CardRegistryLike } from "../src/runsValidate.ts";
import type { CardDefinition } from "@melite/comfyui-cordis";
import { PyNum } from "../src/pyValue.ts";

const S = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s",
  engine: "comfyui",
  ...over,
});
const FLOW = (
  stages: unknown,
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({ id: "f", stages, ...over });

function fakeCards(
  defs: Record<string, Record<string, unknown>> = {},
  info: Record<string, unknown> | null = null,
): CardRegistryLike {
  return {
    defsSync: () =>
      new Map(
        Object.entries(defs).map(([k, v]) => [k, v as unknown as CardDefinition]),
      ),
    objectInfo: () => info,
  };
}

const okSchema = {
  requiresModel: false,
  schema: (p: unknown): unknown => p,
};

function answerOf(full: unknown, cards?: CardRegistryLike | null): {
  status: number;
  payload: Record<string, unknown>;
} {
  return inlineArm(full, cards) as {
    status: number;
    payload: Record<string, unknown>;
  };
}

describe("strictBody", () => {
  it("retired knobs and pipe-carry keys refuse loud", () => {
    assert.throws(() => strictBody({ start_from: 1 }), FlowError);
    assert.throws(() => strictBody({ start_from: 1 }), /retired runner knob/);
    assert.throws(() => strictBody({ pipe: 1 }), /pipe-carry/);
  });

  it("clean bodies pass silent", () => {
    strictBody({ flow: 1, model: "m" });
  });
});

describe("pyReprJson", () => {
  it("strings ride single-quoted (backslash/quote/C0 escapes, the rest verbatim)", () => {
    assert.equal(pyReprJson("a"), "'a'");
    assert.equal(pyReprJson("it's"), "'it\\'s'");
    assert.equal(pyReprJson('a"b\\c\nd'), String.raw`'a"b\\c\nd'`);
    assert.equal(pyReprJson("a\u0001b\u007f"), String.raw`'a\x01b\x7f'`);
    assert.equal(pyReprJson("𝄞"), String.raw`'𝄞'`);
    assert.equal(pyReprJson("a\rb\tc"), "'a\\rb\\tc'");
  });

  it("lone surrogates ride verbatim (no stringify leg here)", () => {
    assert.equal(pyReprJson("a\ud800"), "'a\ud800'");
    assert.equal(pyReprJson("\udc00"), "'\udc00'");
  });

  it("the scalar leaves voice None/True/False/ints, containers recurse", () => {
    assert.equal(pyReprJson(null), "None");
    assert.equal(pyReprJson(undefined), "None");
    assert.equal(pyReprJson(true), "True");
    assert.equal(pyReprJson(false), "False");
    assert.equal(pyReprJson(5), "5");
    assert.equal(pyReprJson([1, "a"]), "[1, 'a']");
    assert.equal(pyReprJson({ a: 1 }), "{'a': 1}");
    assert.equal(pyReprJson(new PyNum("1.00")), "{'literal': '1.00'}");
    assert.equal(pyReprJson(10n), "10");
  });
});

describe("flowFromBody top gates", () => {
  it("non-objects refuse the needs shape", () => {
    for (const bad of [5, null, "x"]) {
      const a = answerOf(bad);
      assert.equal(a.status, 400);
      assert.equal(a.payload["code"], "flow_compile");
      assert.match(String(a.payload["error"]), /flow body must be a JSON object/);
    }
    const arr = answerOf([]);
    assert.equal(arr.status, 400);
  });

  it("unknown top keys refuse with the sorted vocabulary", () => {
    const a = answerOf({ id: "f", stages: [], bogus: 1 });
    assert.match(String(a.payload["error"]), /carries unknown keys \['bogus'\]/);
  });

  it("missing id/stages and empty stages refuse", () => {
    assert.match(String(answerOf({}).payload["error"]), /needs at least id and stages/);
    assert.match(String(answerOf({ id: "f" }).payload["error"]), /needs at least id and stages/);
    assert.match(String(answerOf({ stages: [] }).payload["error"]), /needs at least id and stages/);
    assert.match(String(answerOf({ id: "f", stages: {} }).payload["error"]), /must be a non-empty list/);
    assert.match(String(answerOf(FLOW([])).payload["error"]), /must be a non-empty list/);
  });

  it("empty flow ids refuse the pydantic min_length voice", () => {
    const a = answerOf(FLOW([S()], { id: "" }));
    assert.match(String(a.payload["error"]), /string_too_short/);
  });

  it("the flow_inline envelope rides when present", () => {
    const inner = FLOW([S()]);
    const a = answerOf({ flow_inline: inner });
    assert.equal(a.status, 200);
    assert.equal(a.payload["flow"], "f");
    const nulled = answerOf({ flow_inline: null });
    assert.equal(nulled.status, 400);
  });
});

describe("buildStageRow", () => {
  it("dict extras refuse with the id (or <no id>)", () => {
    const a = answerOf(FLOW([S({ bogus: 1 })]));
    assert.match(String(a.payload["error"]), /unknown field\(s\) \['bogus'\]/);
    assert.match(String(a.payload["error"]), /'s'/);
    const b = answerOf(FLOW([{ engine: "e", bogus: 1 }]));
    assert.match(String(b.payload["error"]), /'<no id>'/);
  });

  it("non-dict extras die the AttributeError (a plain rethrow)", () => {
    assert.throws(() => answerOf(FLOW([["bogus"]])), /has no attribute 'get'/);
    assert.throws(() => answerOf(FLOW(["abc"])), /'str' object has no attribute 'get'/);
    assert.throws(() => answerOf(FLOW([5])), /'number' object is not iterable/);
    assert.throws(() => answerOf(FLOW([null])), /'object' object is not iterable/);
  });

  it("non-object stages refuse the isinstance gate", () => {
    const a = answerOf(FLOW([["id"]]));
    assert.match(String(a.payload["error"]), /is not an object/);
  });

  it("the four .items pulls wrap TypeErrors with py type names", () => {
    // Falsy values ride {} through the `||` — the pulls only fire on
    // truthy non-records.
    for (const [key, tn] of [
      ["inputs", "int"],
      ["outputs", "list"],
      ["expected", "str"],
      ["card_io", "bool"],
    ] as Array<[string, string]>) {
      const val = { inputs: 5, outputs: [], expected: "x", card_io: true } as Record<string, unknown>;
      const a = answerOf(FLOW([S({ [key]: val[key] })]));
      assert.match(String(a.payload["error"]), new RegExp("'" + tn + "' object has no attribute 'items'"));
    }
    const nulled = answerOf(FLOW([S({ inputs: null })]));
    assert.equal(nulled.status, 200);
    const cls = answerOf(FLOW([S({ inputs: new PyNum("1") })]));
    assert.match(String(cls.payload["error"]), /is not an object — use/);
    const fn = answerOf(FLOW([S({ inputs: (() => {}) as never })]));
    assert.match(String(fn.payload["error"]), /'function' object has no attribute 'items'/);
  });

  it("edge shapes: garbage, empty-initial, stage coercions", () => {
    assert.match(String(answerOf(FLOW([S({ inputs: { i: 5 } })])).payload["error"]), /is not an object/);
    assert.match(String(answerOf(FLOW([S({ inputs: { i: {} } })])).payload["error"]), /not an edge shape/);
    assert.match(
      String(answerOf(FLOW([S({ inputs: { i: { stage: "s", output: "o", extra: 1 } } })])).payload["error"]),
      /not an edge shape/,
    );
    assert.match(
      String(answerOf(FLOW([S({ inputs: { i: { initial: "" } } })])).payload["error"]),
      /string_too_short/,
    );
  });

  it("kind shapes: non-strings and foreign vocab refuse", () => {
    assert.match(String(answerOf(FLOW([S({ outputs: { o: 5 } })])).payload["error"]), /is not a string/);
    assert.match(
      String(answerOf(FLOW([S({ outputs: { o: "bogus" } })])).payload["error"]),
      /is not a Kind/,
    );
  });

  it("skip_when shapes refuse whole (null rides)", () => {
    const okn = answerOf(FLOW([S({ skip_when: null })]));
    assert.equal(okn.status, 200);
    for (const skip of [5, { a: 1 }, { initial: "k" }, { initial: "k", when: "x", extra: 1 }]) {
      const a = answerOf(FLOW([S({ skip_when: skip })]));
      assert.equal(a.status, 400, JSON.stringify(skip));
    }
    const when = answerOf(FLOW([S({ skip_when: { initial: "k", when: 5 } })]));
    assert.match(String(when.payload["error"]), /is not a branch condition/);
    const vocab = answerOf(FLOW([S({ skip_when: { initial: "k", when: "sometimes" } })]));
    assert.match(String(vocab.payload["error"]), /closed vocabulary is \['present', 'absent'\]/);
    const empty = answerOf(FLOW([S({ skip_when: { initial: "", when: "present" } })]));
    assert.match(String(empty.payload["error"]), /not a non-empty string/);
    const num = answerOf(FLOW([S({ skip_when: { initial: 5, when: "present" } })]));
    assert.match(String(num.payload["error"]), /not a non-empty string/);
  });

  it("params ride dict() construction semantics", () => {
    assert.equal(answerOf(FLOW([S({ params: 5 })])).status, 400);
    const a = answerOf(FLOW([S({ params: 5 })]));
    assert.match(String(a.payload["error"]), /'int' object is not iterable/);
    assert.match(String(answerOf(FLOW([S({ params: 1.5 })])).payload["error"]), /'float' object is not iterable/);
    assert.match(String(answerOf(FLOW([S({ params: true })])).payload["error"]), /'bool' object is not iterable/);
    assert.match(String(answerOf(FLOW([S({ params: "x" })])).payload["error"]), /has length 1; 2 is required/);
    assert.match(String(answerOf(FLOW([S({ params: [["a", "b", "c"]] })])).payload["error"]), /has length 3/);
    assert.match(String(answerOf(FLOW([S({ params: [5] })])).payload["error"]), /cannot convert/);
    assert.match(String(answerOf(FLOW([S({ params: [[{}, "b"]] })])).payload["error"]), /unhashable type: 'dict'/);
    assert.match(String(answerOf(FLOW([S({ params: [[["k"], "b"]] })])).payload["error"]), /unhashable type: 'list'/);
    assert.equal(answerOf(FLOW([S({ params: { a: "b" } })])).status, 200);
    assert.equal(answerOf(FLOW([S({ params: [["a", "b"], [5, "c"]] })])).status, 200);
    assert.equal(answerOf(FLOW([S({ params: null })])).status, 200);
    assert.equal(answerOf(FLOW([S({ params: 0 })])).status, 200);
    assert.equal(answerOf(FLOW([S({ params: [] })])).status, 200);
  });

  it("id pulls coerce (digits die illegal, missing dies empty)", () => {
    assert.match(String(answerOf(FLOW([S({ id: 5 })])).payload["error"]), /'5' is not a legal identifier/);
    assert.match(String(answerOf(FLOW([S({ id: null })])).payload["error"]), /not a legal identifier/);
    assert.match(String(answerOf(FLOW([S({ id: true })])).payload["error"]), /not a legal identifier/);
    assert.match(String(answerOf(FLOW([S({ id: false })])).payload["error"]), /not a legal identifier/);
    assert.match(String(answerOf(FLOW([S({ id: {} })])).payload["error"]), /not a legal identifier/);
    const st = S();
    delete st["id"];
    assert.match(String(answerOf(FLOW([st])).payload["error"]), /1 validation error for Stage/);
  });

  it("illegal ids render the Stage value_error whole", () => {
    const a = answerOf(
      FLOW([
        S({
          id: "Bad Id",
          description: "d",
          params: { a: "b" },
          inputs: { i: { initial: "k" }, j: { stage: "up", output: "o" } },
          outputs: { o: "image" },
          expected: { i: "text", j: "image" },
          card: "c",
          card_io: { q: "num" },
          skip_when: { initial: "k", when: "present" },
        }),
      ]),
    );
    // The kwargs display truncates (first 25 + ... + last 24): the head
    // and the skip tail survive, the middle renders execute unvoiced.
    const err = String(a.payload["error"]);
    assert.match(err, /Value error, stage id 'Bad Id' is not a legal identifier/);
    assert.match(err, /\.\.\./);
    assert.match(err, /present: 'present'>\)\}, input_type=dict\]/);
    const plain = answerOf(FLOW([S({ id: "Bad" })]));
    assert.match(String(plain.payload["error"]), /'skip_when': None\}, input_type=dict\]/);
  });

  it("missing engines refuse the min_length voice", () => {
    const st = S();
    delete st["engine"];
    const err = String(answerOf(FLOW([st])).payload["error"]);
    assert.match(err, /1 validation error for Stage/);
    assert.match(err, /string_too_short/);
  });
});

describe("wiresResolve", () => {
  it("illegal flow ids and duplicate stage ids refuse", () => {
    assert.match(
      String(answerOf(FLOW([S()], { id: "Bad" })).payload["error"]),
      /flow id 'Bad' is not a legal identifier/,
    );
    assert.match(
      String(answerOf(FLOW([S({ id: "a" }), S({ id: "a" })])).payload["error"]),
      /duplicate stage id 'a'/,
    );
  });

  it("forward and unknown wires refuse (empty/non-empty known lists)", () => {
    const fwd = answerOf(FLOW([S({ id: "s1", inputs: { x: { stage: "s2", output: "o" } } }), S({ id: "s2" })]));
    assert.match(String(fwd.payload["error"]), /known earlier: none/);
    const unk = answerOf(
      FLOW([S({ id: "s1" }), S({ id: "s2", inputs: { x: { stage: "sX", output: "o" } } })]),
    );
    assert.match(String(unk.payload["error"]), /known earlier: \['s1'\]/);
  });
});

describe("cardGate", () => {
  const carded = S({ card: "c" });
  it("null and undefined registries refuse LOUD (never silent)", () => {
    assert.throws(() => answerOf(FLOW([carded]), null), /no CardRegistryService/);
    assert.throws(() => answerOf(FLOW([carded])), /no CardRegistryService/);
  });

  it("unknown cards hit the model gate first, then the registry gate", () => {
    const cards = fakeCards();
    const nogate = answerOf(FLOW([carded]), cards);
    assert.match(String(nogate.payload["error"]), /requires params\.model/);
    const unreg = answerOf(FLOW([S({ card: "c", params: { model: "m" } })]), cards);
    assert.match(String(unreg.payload["error"]), /not a registered card/);
  });

  it("the model gate reads blank as missing, honors requiresModel: false", () => {
    const req = fakeCards({ c: { requiresModel: true, schema: (p: unknown): unknown => p } });
    assert.match(
      String(answerOf(FLOW([S({ card: "c", params: { model: "  " } })]), req).payload["error"]),
      /requires params\.model/,
    );
    assert.equal(answerOf(FLOW([S({ card: "c", params: { model: "m" } })]), req).status, 200);
    assert.equal(answerOf(FLOW([carded]), fakeCards({ c: okSchema })).status, 200);
  });

  it("schema refusals wrap (Error and exotic throws)", () => {
    const bad = fakeCards({
      c: {
        requiresModel: false,
        schema: (): unknown => {
          throw new Error("schema nope");
        },
      },
    });
    assert.match(
      String(answerOf(FLOW([carded]), bad).payload["error"]),
      /schema refused body — schema nope/,
    );
    const exotic = fakeCards({
      c: {
        requiresModel: false,
        schema: (): unknown => {
          throw "str nope";
        },
      },
    });
    assert.match(
      String(answerOf(FLOW([carded]), exotic).payload["error"]),
      /schema refused body — str nope/,
    );
  });
});

describe("kindsOk", () => {
  it("inputs/expected mismatches refuse each direction", () => {
    const wired = answerOf(FLOW([S({ inputs: { x: { initial: "k" } }, expected: {} })]));
    assert.match(String(wired.payload["error"]), /wired but untyped/);
    const typed = answerOf(FLOW([S({ inputs: {}, expected: { y: "image" } })]));
    assert.match(String(typed.payload["error"]), /typed but unwired/);
    const both = answerOf(FLOW([S({ inputs: { x: { initial: "k" } }, expected: { y: "image" } })]));
    assert.match(String(both.payload["error"]), /wired but untyped.*typed but unwired/);
  });

  it("upstream wires resolve kinds, missings and mismatches refuse", () => {
    const ok = answerOf(
      FLOW([
        S({ id: "s1", outputs: { o: "image" } }),
        S({ id: "s2", inputs: { i: { stage: "s1", output: "o" } }, expected: { i: "image" } }),
      ]),
    );
    assert.equal(ok.status, 200);
    const missing = answerOf(
      FLOW([
        S({ id: "s1", outputs: { o: "image" } }),
        S({ id: "s2", inputs: { i: { stage: "s1", output: "nope" } }, expected: { i: "image" } }),
      ]),
    );
    assert.match(String(missing.payload["error"]), /has no output named 'nope'/);
    const clash = answerOf(
      FLOW([
        S({ id: "s1", outputs: { o: "image" } }),
        S({ id: "s2", inputs: { i: { stage: "s1", output: "o" } }, expected: { i: "text" } }),
      ]),
    );
    assert.match(String(clash.payload["error"]), /expected text, got image/);
  });

  it("deferred (output-less) upstreams skip the kind check", () => {
    const a = answerOf(
      FLOW([
        S({ id: "s1" }),
        S({ id: "s2", inputs: { i: { stage: "s1", output: "o" } }, expected: { i: "image" } }),
      ]),
    );
    // The deferred pass skips the unknown upstream (no mismatch); the
    // full pass then refuses the unwired output against the default map.
    assert.match(String(a.payload["error"]), /has no output named 'o'/);
  });
});

describe("validateEngines", () => {
  it("unknown engines refuse with the known line", () => {
    const a = answerOf(FLOW([S({ engine: "wat" })]));
    assert.match(String(a.payload["error"]), /no engine plugin for type 'wat'/);
  });
});

describe("prunedFor", () => {
  // Skip keys live on the FULL body (outside the flow_inline envelope).
  const two = (skip: unknown): Record<string, unknown> => ({
    flow_inline: FLOW([
      S({ id: "s1", skip_when: skip }),
      S({ id: "s2" }),
    ]),
  });

  it("no skips ride the fast path", () => {
    const a = answerOf({ flow_inline: FLOW([S({ id: "s1" }), S({ id: "s2" })]) });
    assert.equal(a.status, 200);
    assert.deepEqual(a.payload["skipped"], []);
  });

  it("present triggers prune, quiet bodies keep", () => {
    const fired = answerOf({ ...two({ initial: "k", when: "present" }), k: 1 });
    assert.equal(fired.status, 200);
    assert.deepEqual(fired.payload["skipped"], ["s1"]);
    const kept = answerOf(two({ initial: "k", when: "present" }));
    assert.equal(kept.status, 200);
    assert.deepEqual(kept.payload["skipped"], []);
  });

  it("absent triggers prune, null/undefined bodies keep", () => {
    const fired = answerOf(two({ initial: "k", when: "absent" }));
    assert.deepEqual(fired.payload["skipped"], ["s1"]);
    const nulled = answerOf({ ...two({ initial: "k", when: "present" }), k: null });
    assert.deepEqual(nulled.payload["skipped"], []);
    const undefed = answerOf({ ...two({ initial: "k", when: "present" }), k: undefined });
    assert.deepEqual(undefed.payload["skipped"], []);
  });

  it("card_io-only stages compile (outputs echo the card kinds)", () => {
    const a = answerOf(FLOW([S({ card_io: { q: "num" } })]));
    assert.equal(a.status, 200);
    const stages = a.payload["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages[0]?.["outputs"], { q: "num" });
  });

  it("a fully-pruned flow refuses to register", () => {
    const a = answerOf({
      flow_inline: FLOW([S({ id: "s1", skip_when: { initial: "k", when: "present" } })]),
      k: 1,
    });
    assert.match(String(a.payload["error"]), /pruned every stage/);
  });

  it("kept stages rewire off present-pruned upstreams", () => {
    const a = answerOf({
      flow_inline: FLOW([
        S({ id: "s1", outputs: { o: "image" }, skip_when: { initial: "k", when: "present" } }),
        S({
          id: "s2",
          inputs: { x: { stage: "s1", output: "o" }, y: { initial: "j" } },
          expected: { x: "image", y: "text" },
        }),
      ]),
      k: 1,
    });
    assert.equal(a.status, 200);
    const stages = a.payload["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages[0]?.["inputs"], ["__initial__.k", "__initial__.j"]);
  });

  it("wires off absent-pruned upstreams refuse (nothing to merge)", () => {
    const a = answerOf({
      flow_inline: FLOW([
        S({ id: "s1", outputs: { o: "image" }, skip_when: { initial: "k", when: "absent" } }),
        S({
          id: "s2",
          inputs: { x: { stage: "s1", output: "o" } },
          expected: { x: "image" },
        }),
      ]),
    });
    assert.match(String(a.payload["error"]), /no request key to merge/);
  });
});

describe("serveSubject tail", () => {
  it("the happy flow serves cost + stage rows", () => {
    const a = serveSubject(FLOW([S({ description: "d", outputs: { o: "image" } })]), {}) as {
      status: number;
      payload: Record<string, unknown>;
    };
    assert.equal(a.status, 200);
    assert.equal(a.payload["flow"], "f");
    assert.deepEqual(a.payload["skipped"], []);
    const cost = a.payload["cost"] as { stages: Array<{ engine: string }> };
    assert.deepEqual(cost.stages, [{ engine: "comfyui", median_s: null, samples: 0 }]);
    const stages = a.payload["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages[0]?.["outputs"], { o: "image" });
  });

  it("unresolved $channels refuse with the pool voice", () => {
    const bare = answerOf(FLOW([S({ params: { p: "$nope" } })]));
    assert.match(
      String(bare.payload["error"]),
      /unresolved \$channel\(s\): stage 's' references \$nope \(available: nothing\)/,
    );
    const pooled = answerOf(
      FLOW([S({ inputs: { x: { initial: "k" } }, expected: { x: "image" }, params: { p: "$nope" } })]),
    );
    assert.match(
      String(pooled.payload["error"]),
      /references \$nope \(available: k, x\)/,
    );
  });

  it("pin rows refuse workflow_pin at the stage", () => {
    const a = answerOf(
      FLOW([S({ params: { workflow: { n: { class_type: "Nope" } } } })]),
    );
    assert.equal(a.status, 400);
    assert.equal(a.payload["code"], "workflow_pin");
    assert.equal(a.payload["loc"], "s");
  });

  it("nested $ tokens resolve through arrays and objects", () => {
    const a = answerOf(
      FLOW([
        S({
          inputs: { x: { initial: "k" }, y: { initial: "j" } },
          expected: { x: "image", y: "text" },
          params: { arr: ["$x"], deep: { n: "$y" } },
        }),
      ]),
    );
    assert.equal(a.status, 200);
  });

  it("batch rows label per-stage failures (id, index, None)", () => {
    const a = answerOf(
      FLOW([{ id: "good", engine: "comfyui" }, { engine: "comfyui", bogus: 1 }, { id: null, engine: "comfyui", bogus: 2 }]),
    );
    const errors = a.payload["errors"] as Array<Record<string, unknown>>;
    assert.ok(errors.some((r) => r["scope"] === "flow"));
    assert.ok(errors.some((r) => r["stage"] === "stage[1]"));
    assert.ok(errors.some((r) => r["stage"] === "None"));
  });

  it("batch rows append sweep rows for failing flows", () => {
    const a = answerOf(
      FLOW([
        S({ id: "w", params: { workflow: { n: { class_type: "Nope" } } } }),
        { engine: "comfyui", bogus: 1 },
      ]),
    );
    assert.equal(a.status, 400);
    const errors = a.payload["errors"] as Array<Record<string, unknown>>;
    assert.ok(errors.some((r) => r["code"] === "workflow_pin"));
    assert.ok(errors.some((r) => r["stage"] === "stage[1]"));
  });

  it("batch rethrows registry poison from the stripped probe", () => {
    // The outer failure is the second stage's extras; the stripped
    // probe of the card stage then throws the registry's plain Error.
    assert.throws(
      () =>
        answerOf(
          FLOW([S({ card: "c", params: { model: "m" } }), { engine: "comfyui", bogus: 1 }]),
        ),
      /no CardRegistryService/,
    );
  });
});

describe("sweepWorkflows", () => {
  it("null objectInfo degrades to unknown (never throws)", () => {
    const a = answerOf(
      FLOW([S({ params: { workflow: { n: { class_type: "KSampler" } } } })]),
      fakeCards(null),
    );
    assert.equal(a.status, 400);
    assert.match(String(a.payload["error"]), /not in the pinned object_info/);
  });

  it("known classes pass silent (both workflow shapes)", () => {
    const cards = fakeCards({}, { KSampler: {} });
    const nested = answerOf(FLOW([S({ params: { workflow: { n: { class_type: "KSampler" } } } })]), cards);
    assert.equal(nested.status, 200);
    const flat = answerOf(FLOW([S({ params: { n: { class_type: "KSampler" } } })]), cards);
    assert.equal(flat.status, 200);
  });

  it("null/array workflow shapes ride the early return", () => {
    assert.equal(answerOf(FLOW([S({ params: { workflow: null } })])).status, 200);
    assert.equal(answerOf(FLOW([S({ params: { workflow: ["n"] } })])).status, 200);
  });

  it("non-object inner workflows fall back to the outer map", () => {
    for (const inner of [5, null, ["n"]]) {
      const a = answerOf(FLOW([S({ params: { workflow: { workflow: inner } } })]));
      assert.equal(a.status, 400);
      assert.match(String(a.payload["error"]), /: no class_type/);
    }
  });

  it("object inner workflows pin the inner map", () => {
    const a = answerOf(
      FLOW([S({ params: { workflow: { workflow: { n: { class_type: "Nope" } } } } })]),
      fakeCards({}),
    );
    assert.equal(a.status, 400);
    assert.match(String(a.payload["error"]), /not in the pinned object_info/);
  });

  it("scalar nodes and null classes refuse no-class_type", () => {
    const a = answerOf(FLOW([S({ params: { workflow: { n: 5, m: { class_type: null } } } })]));
    const errors = a.payload["errors"] as Array<{ error: string }>;
    assert.ok(errors.some((r) => /: no class_type/.test(r.error)));
  });

  it("non-comfyui engines and param-less stages sweep past", () => {
    const a = answerOf(
      FLOW([
        { id: "good", engine: "comfyui" },
        { id: "o", engine: "other" },
        { id: "p" },
      ]),
    );
    assert.equal(a.status, 400);
    assert.equal(a.payload["code"], "flow_compile");
  });
});

describe("findDanglingRefs", () => {
  const outRoot = join(resolveRepoRoot(), "data", "runs", "output");
  const testRoot = join(resolveRepoRoot(), "data", "runs", "test-output");
  const ref = (run: string, file: string): string => "/v1/assets/runs/" + run + "/" + file;

  afterAll(() => {
    rmSync(join(outRoot, "rzzlive"), { recursive: true, force: true });
    rmSync(join(testRoot, "rzzlive2"), { recursive: true, force: true });
    rmSync(join(outRoot, "rzzdir"), { recursive: true, force: true });
  });

  beforeAll(() => {
    mkdirSync(join(outRoot, "rzzlive"), { recursive: true });
    writeFileSync(join(outRoot, "rzzlive", "f.png"), "x");
    mkdirSync(join(testRoot, "rzzlive2"), { recursive: true });
    writeFileSync(join(testRoot, "rzzlive2", "g.png"), "x");
    mkdirSync(join(outRoot, "rzzdir", "sub"), { recursive: true });
  });

  it("clean bodies dangle nothing", () => {
    assert.deepEqual(findDanglingRefs({}), []);
    assert.deepEqual(findDanglingRefs({ a: 1 }), []);
  });

  it("absent artifacts dangle with the primary message (LIFO order)", () => {
    const rows = findDanglingRefs({ a: ref("rz", "a.png"), b: ref("rz", "b.png") });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.[0], "$.b");
    assert.equal(rows[1]?.[0], "$.a");
    assert.match(rows[0]?.[2] ?? "", /not found on disk/);
  });

  it("traversal and malformed refs refuse their voices", () => {
    const trav = findDanglingRefs({ r: "/v1/assets/runs/../evil/f" });
    assert.match(trav[0]?.[2] ?? "", /refuses traversal/);
    for (const bad of ["/v1/assets/runs/", "/v1/assets/runs/noslash", "/v1/assets/runs/r/"]) {
      const rows = findDanglingRefs({ r: bad });
      assert.match(rows[0]?.[2] ?? "", /malformed artifact URL/);
    }
  });

  it("array-carried refs locate with [i]", () => {
    const rows = findDanglingRefs({ list: [ref("rz", "a.png")] });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.[0], "$.list[0]");
    assert.equal(rows[0]?.[1], ref("rz", "a.png"));
  });

  it("live artifacts resolve (primary, then secondary root)", () => {
    assert.deepEqual(findDanglingRefs({ r: ref("rzzlive", "f.png") }), []);
    assert.deepEqual(findDanglingRefs({ r: ref("rzzlive2", "g.png") }), []);
  });

  it("directories are not files", () => {
    const rows = findDanglingRefs({ r: ref("rzzdir", "sub") });
    assert.match(rows[0]?.[2] ?? "", /not found on disk/);
  });
});

describe("the mcp: engine grammar (stroke 55 seam)", () => {
  it("a grammatical mcp: engine validates and defaults its outputs to image", () => {
    // mcp:unity passes the seat grammar (engineIdOk) — the stage
    // carries no outputs/card_io, so toGraph mints the default row
    // from the mcp-client hit.
    const a = answerOf(FLOW([S({ engine: "mcp:unity" })]));
    assert.equal(a.status, 200);
    assert.deepEqual(a.payload["stages"], [
      { id: "s", engine: "mcp:unity", description: "", inputs: [], outputs: { default: "image" } },
    ]);
  });

  it("an ungrammatical mcp: engine refuses with the unknown-engine voice", () => {
    // "bad id!" breaks the server-name grammar — the mcp: arm
    // evaluates false and the table misses, exactly like a wholly
    // unknown engine.
    const a = answerOf(FLOW([S({ engine: "mcp:bad id!" })]));
    assert.equal(a.status, 400);
    assert.match(String(a.payload["error"]), /no engine plugin for type 'mcp:bad id!'/);
  });
});
