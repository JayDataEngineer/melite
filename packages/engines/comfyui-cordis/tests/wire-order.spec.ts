// ── THE WIRE ORDER LAW IS NOT A LAW (2026-10-11) ────────────────
//
// The bench door admits any wire whose upstream is live and whose
// channel is spelled; the draft persists it verbatim. Nothing
// anywhere says the upstream must sit EARLIER in the stages array —
// and yet the merge said exactly that. `planMerge` walked the rows in
// one loop, filling `producers[sid]` as it went and reading it to
// resolve each wire, so a stage could only wire from a stage it had
// already passed. A backward wire died at run time with
//
//   stage "s_0" input "image" wires "s_1.image" — the upstream stage
//   declares no mergeable producer for it
//
// …which blames s_1 for a fault it does not have. s_1 declares a
// producer. It simply had not been read yet.
//
// This file pins the POSITIVE law (order-independence) and the
// refusal the order-dependence was accidentally providing (the
// cycle), because removing the accident must not remove the net.
import { describe, expect, it } from "vitest";
import { planMerge } from "../src/comfyui-merge.ts";
import type { MergeRow } from "../src/comfyui-merge.ts";

/** A stage with one Save (its producer) and, when `spell` is set, a
 *  node consuming a `$w` spell. `outputs: {image}` gives the Save its
 *  channel.
 *
 *  The spell is OPT-IN on purpose. A stage carrying a `$w` nothing
 *  wires is a stray spell, and the run refuses it LOUD — the door
 *  admits it as a legal intermediate (spell first, wire second), so
 *  a fixture that spelled everywhere would be measuring that refusal
 *  rather than the wire. */
const stage = (stageId: string, over: Partial<MergeRow> = {}): MergeRow => {
  const spell = (over.workflow as Record<string, unknown> | undefined)?.["n"] !== undefined;
  return {
    stageId,
    workflow: spell
      ? {
          save: { class_type: "SaveImage", inputs: {} },
          n: { class_type: "X", inputs: { i: "$w" } },
        }
      : { save: { class_type: "SaveImage", inputs: {} } },
    params: {},
    outputs: { image: "png" },
    outputNodes: {},
    ...over,
  } as unknown as MergeRow;
};

/** A stage that CONSUMES a `$w` spell (the downstream half). */
const consumer = (stageId: string): MergeRow =>
  stage(stageId, {
    workflow: { n: { class_type: "X", inputs: { i: "$w" } } },
  } as Partial<MergeRow>);

/** A stage that both publishes a channel and consumes a `$w` spell —
 *  what a cycle needs, since both ends of the loop must produce. */
const both = (stageId: string): MergeRow =>
  stage(stageId, {
    workflow: {
      save: { class_type: "SaveImage", inputs: {} },
      n: { class_type: "X", inputs: { i: "$w" } },
    },
  } as Partial<MergeRow>);

const refusal = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return "";
};

describe("a wire resolves from ANY stage, not only an earlier one", () => {
  it("backward: the downstream stage is FIRST in the array", () => {
    const plan = planMerge(
      [consumer("s_0"), stage("s_1")],
      {},
      { s_0: { w: "s_1.image" } },
    );
    const n = plan.workflow["s_0::n"] as Record<string, unknown>;
    expect(n["inputs"]).toEqual({ i: ["s_1::save", 0] });
  });

  it("forward: the upstream stage is FIRST in the array (no regression)", () => {
    const plan = planMerge(
      [stage("s_0"), consumer("s_1")],
      {},
      { s_1: { w: "s_0.image" } },
    );
    const n = plan.workflow["s_1::n"] as Record<string, unknown>;
    expect(n["inputs"]).toEqual({ i: ["s_0::save", 0] });
  });

  it("MIRRORED: both orders produce the SAME graph for the same wires", () => {
    // The two stage arrays differ only in position; the merged keys
    // are the same set, and each stage's substituted input is the
    // link to the OTHER stage's Save. Nothing may depend on which
    // one the loop reached first.
    const back = planMerge([consumer("a"), stage("b")], {}, { a: { w: "b.image" } });
    const fwd = planMerge([stage("b"), consumer("a")], {}, { a: { w: "b.image" } });
    expect(Object.keys(back.workflow).sort()).toEqual(Object.keys(fwd.workflow).sort());
    expect((back.workflow["a::n"] as Record<string, unknown>)["inputs"]).toEqual(
      (fwd.workflow["a::n"] as Record<string, unknown>)["inputs"],
    );
  });

  it("a three-stage chain wires middle-to-last AND last-to-middle at once", () => {
    // s_0 → s_1 → s_2, with s_1 sitting between them in the array
    // and s_2 (the last consumer) reading backwards to it.
    const plan = planMerge(
      [both("s_1"), stage("s_0"), consumer("s_2")],
      {},
      { s_1: { w: "s_0.image" }, s_2: { w: "s_1.image" } },
    );
    expect((plan.workflow["s_1::n"] as Record<string, unknown>)["inputs"]).toEqual({
      i: ["s_0::save", 0],
    });
    expect((plan.workflow["s_2::n"] as Record<string, unknown>)["inputs"]).toEqual({
      i: ["s_1::save", 0],
    });
  });
});

describe("the cycle the old order-dependence refused BY ACCIDENT", () => {
  it("a two-stage cycle refuses, naming the loop", () => {
    const msg = refusal(() =>
      planMerge([both("a"), both("b")], {}, { a: { w: "b.image" }, b: { w: "a.image" } }),
    );
    expect(msg).toMatch(/wire a cycle/);
    expect(msg).toMatch(/a → b → a/);
  });

  it("a three-stage cycle refuses, naming the loop", () => {
    const msg = refusal(() =>
      planMerge(
        [both("a"), both("b"), both("c")],
        {},
        { a: { w: "b.image" }, b: { w: "c.image" }, c: { w: "a.image" } },
      ),
    );
    expect(msg).toMatch(/wire a cycle/);
  });

  it("a BACKWARD two-stage cycle refuses as a CYCLE, not with the producer fault", () => {
    // This one is the one the fix could have cost us: before it,
    // order-dependence reported a backward cycle with the same
    // "declares no mergeable producer" text as a missing upstream,
    // so a real cycle and a typo looked identical to the operator.
    //
    // BOTH halves are asserted. A `not.toMatch` alone passes on
    // silence — if the cycle gate simply stopped firing, the
    // refusal helper returns "" and the arm goes green having proven
    // nothing. Naming the cycle is what makes this arm bite.
    const msg = refusal(() =>
      planMerge([both("a"), both("b")], {}, { a: { w: "b.image" }, b: { w: "a.image" } }),
    );
    expect(msg).not.toBe("");
    expect(msg).toMatch(/wire a cycle/);
    expect(msg).not.toMatch(/declares no mergeable producer/);
  });

  it("a dot-less SELF-ref is a self-wire, not a missing producer (one shape, one voice)", () => {
    // `{w: "a"}` on stage `a` names an upstream with an empty
    // channel. Letting a dot-less ref skip the edge list gave this
    // two voices: it was reported as a missing producer, which is
    // the exact confusion the cycle message exists to end.
    const msg = refusal(() => planMerge([both("a")], {}, { a: { w: "a" } }));
    expect(msg).toMatch(/wire a cycle/);
  });

  it("a self-wire refuses as a cycle (the door refuses it earlier; the run is the net)", () => {
    const msg = refusal(() => planMerge([both("a")], {}, { a: { w: "a.image" } }));
    expect(msg).toMatch(/wire a cycle/);
  });

  it("a DIAMOND is not a cycle: two paths converging on one stage", () => {
    // s_0 → {s_1, s_2} → s_3. Four stages, two edges into s_1 and
    // s_2, two edges out of them into s_3. A refusal here would be
    // the cycle gate mistaking convergence for a loop — and s_3
    // reads two edges while carrying no spell of its own, so the
    // shape under test is the EDGES, not the substitution.
    const msg = refusal(() =>
      planMerge(
        [stage("s_0"), both("s_1"), both("s_2"), stage("s_3")],
        {},
        {
          s_1: { w: "s_0.image" },
          s_2: { w: "s_0.image" },
          s_3: { x: "s_1.image", y: "s_2.image" },
        },
      ),
    );
    expect(msg).toBe("");
  });
});

describe("the refusals the order-independence must NOT have cost", () => {
  it("a wire to a stage that is not on the bench still refuses", () => {
    const msg = refusal(() =>
      planMerge([stage("s_0")], {}, { s_0: { w: "ghost.image" } }),
    );
    expect(msg).toMatch(/declares no mergeable producer/);
  });

  it("a wire to a channel the upstream does not publish still refuses", () => {
    const msg = refusal(() =>
      planMerge([stage("s_0"), stage("s_1")], {}, { s_1: { w: "s_0.video" } }),
    );
    expect(msg).toMatch(/produces no such channel/);
  });

  it("a stage with no workflow still refuses", () => {
    const msg = refusal(() => planMerge([stage("s_0", { workflow: {} })], {}, {}));
    expect(msg).toMatch(/no workflow to merge/);
  });

  it("a dangling spell still refuses LOUD with its own voice", () => {
    const msg = refusal(() =>
      planMerge(
        [stage("s_0", { workflow: { n: { class_type: "X", inputs: { i: "$nowhere" } } } })],
        {},
        {},
      ),
    );
    expect(msg).toMatch(/carries \$nowhere/);
  });

  it("an initial edge still substitutes (the __initial__ seam is untouched)", () => {
    const plan = planMerge(
      [stage("s_0", { workflow: { n: { class_type: "X", inputs: { i: "$seed" } } } })],
      { seed: 7 },
      { s_0: { seed: "__initial__.seed" } },
    );
    expect((plan.workflow["s_0::n"] as Record<string, unknown>)["inputs"]).toEqual({ i: 7 });
  });
});

// ── THE MERGE ADDS NO NAMES (the li-bb stroke, 2026-10-11) ───────
//
// The merge seam's own comment claims it (pass 3 namespaces ids and
// resolves $spells into link VALUES, "adding no class_type or input
// key") — and the audit's finding 3 was that the claim had NO wall:
// the check was deferred to the engines adapter's post-splice seat,
// which walks the graph for OTHER laws. The day namespaceWires or
// rewriteSpells grows a key — a "helpful" wired marker, a computed
// cnet, anything — the merged graph would carry a name no card
// declared, and no arm anywhere would say so. This block pins the
// claim at the seam: the merged graph's names ARE the sources'
// names, exactly, and every node's shape is its source's shape plus
// nothing.
describe("the merge adds no names (the seam's own claim, walled)", () => {
  /** A stage whose node carries the shapes a merge might be tempted
   *  to annotate: several inputs (a spell, a literal, a nested
   *  array), a `_meta` sibling, and a second node so the
   *  namespacing has real work to do. */
  const rich = (stageId: string, spell: boolean): MergeRow =>
    stage(stageId, {
      workflow: {
        save: { class_type: "SaveImage", inputs: {} },
        n: {
          class_type: "X",
          // the spell is OPT-IN (the file's own law): a stage
          // carrying a $w nothing wires is a stray spell and the
          // merge refuses it — only s_1 wires
          inputs: spell
            ? { i: "$w", seed: 5, text: "keep me", nested: [1, "a"] }
            : { i: "literal", seed: 5, text: "keep me", nested: [1, "a"] },
          _meta: { title: "the node" },
        },
      },
    } as Partial<MergeRow>);

  it("the merged key set IS the namespaced union — no extra node, none dropped", () => {
    const plan = planMerge([rich("s_0", false), rich("s_1", true)], {}, { s_1: { w: "s_0.image" } });
    expect([...Object.keys(plan.workflow)].sort()).toEqual(
      ["s_0::n", "s_0::save", "s_1::n", "s_1::save"].sort(),
    );
    expect(Object.keys(plan.workflow).length).toBe(4);
  });

  it("every node's TOP-LEVEL keys are its source's keys, exactly (no marker, no computed sibling)", () => {
    const plan = planMerge([rich("s_0", false), rich("s_1", true)], {}, { s_1: { w: "s_0.image" } });
    for (const sid of ["s_0", "s_1"]) {
      const spell = sid === "s_1";
      for (const nid of ["save", "n"]) {
        const mergedNode = plan.workflow[`${sid}::${nid}`] as Record<string, unknown>;
        const srcNode = (rich(sid, spell).workflow as Record<string, Record<string, unknown>>)[nid]!;
        expect(Object.keys(mergedNode).sort(), `${sid}::${nid} carries exactly its source's keys`)
          .toEqual(Object.keys(srcNode).sort());
        expect(mergedNode["class_type"], `${sid}::${nid} class_type is untouched`)
          .toBe(srcNode["class_type"]);
        expect(mergedNode["_meta"], `${sid}::${nid} keeps its _meta verbatim`)
          .toEqual(srcNode["_meta"]);
      }
    }
  });

  it("every node's INPUT KEYS are its source's input keys — the $spell resolves as a VALUE, never a new key", () => {
    const plan = planMerge([rich("s_0", false), rich("s_1", true)], {}, { s_1: { w: "s_0.image" } });
    for (const sid of ["s_0", "s_1"]) {
      const spell = sid === "s_1";
      const mergedInputs = (plan.workflow[`${sid}::n`] as Record<string, unknown>)["inputs"] as Record<string, unknown>;
      const srcInputs = ((rich(sid, spell).workflow as Record<string, Record<string, unknown>>)["n"]!)["inputs"] as Record<string, unknown>;
      expect(Object.keys(mergedInputs).sort(), `${sid}::n inputs carry exactly their source's keys`)
        .toEqual(Object.keys(srcInputs).sort());
      // the untouched values ride verbatim — only the $spell's slot
      // may change, and it changes into a link VALUE
      expect(mergedInputs["seed"]).toBe(srcInputs["seed"]);
      expect(mergedInputs["text"]).toBe(srcInputs["text"]);
      expect(mergedInputs["nested"]).toEqual(srcInputs["nested"]);
    }
    // and the spell DID resolve (the wall is not vacuous: the merge
    // ran its substitution, and still added no name)
    const resolved = (plan.workflow["s_1::n"] as Record<string, unknown>)["inputs"] as Record<string, unknown>;
    expect(resolved["i"]).toEqual(["s_0::save", 0]);
  });
});
