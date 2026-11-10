// split-cuts-verb.spec.ts — THE ONE-BENCH WALL, CONTRACT SIDE
// (operator 2026-11-10: "THE AGENT, AND THE USER UI. SHARE ONE BENCH.
// ONE."). The split law moved here (timelineContract) so the strip's
// mutations, the leaf form, and the agent's cuts verb are three doors
// over ONE implementation. This wall pins:
//   1. THE THIRD-DOOR PARITY — expandCuts IS the split law folded,
//      never a second arithmetic (an equal-output-on-a-fixture test
//      could pass beside a drifted law; this arm judges the fold
//      against splitCallsAt itself, on random-ish gesture frames).
//   2. THE TWO-VIEWS LAW — the engine's "% 17 == 5" refusal is the
//      GENERATED length (span + 22) of a legal carried span (17k):
//      17k + 22 ≡ 5 (mod 17) always. A fresh agent reading this wall
//      never re-derives a "two grids" theory from one error string
//      (the 2026-11-10 lane burn: 51f and 17f card-legal spans both
//      refused by a chain reading the generated length).
//   3. THE ONE-STORAGE CONTRACT — every fold adds exactly one row,
//      the tiling stays contiguous, and the row's own payload (text,
//      refs, knobs) carries WHOLE into both halves.
//   4. THE REFUSAL VOICES — garbage seconds, empty split points, and
//      a window too short to halve refuse loud; nothing parses to
//      zero, nothing repairs silently.
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  expandCuts,
  splitCallsAt,
  isGridLength,
  GRID_STEP_FRAMES,
  SEAM_OVERLAP_FRAMES,
} from "../src/timelineContract.ts";

/** A legal first window: 22+17k, the design window 90f. */
const film = () => [{ text: "the shot", start_frame: 0, end_frame: 90, seed: 4242 }];

describe("THE CUTS VERB — the third door over the one law", () => {
  test("expandCuts IS splitCallsAt folded: same seconds, same rows, every gesture", () => {
    // a spread of split seconds across the 90f window (2.5s=60f among
    // them) — the verb must equal the manual fold, byte for byte
    for (const secs of ["0.5", "1.0", "2.5", "3.0", "3.5"]) {
      const verb = expandCuts(film(), secs, "cut");
      const frame = Math.round(Number(secs) * 24);
      const folded = splitCallsAt(film(), frame, "cut");
      assert.ok(verb.ok, `secs ${secs} must expand`);
      assert.ok(folded !== null, `secs ${secs} must fold`);
      assert.deepEqual(verb.calls, folded, `secs ${secs}: the verb must equal the law folded`)
    }
  });

  test("a stated multi-second verb equals the seconds applied in order", () => {
    const one = expandCuts(film(), "1.0, 3.0", "cut");
    assert.ok(one.ok);
    let manual = film();
    for (const s of [1.0, 3.0]) {
      const next = splitCallsAt(manual, Math.round(s * 24), "cut");
      assert.ok(next !== null);
      manual = next;
    }
    assert.deepEqual(one.calls, manual)
  });

  test("THE ONE-STORAGE CONTRACT: each cut adds one row, tiling contiguous, payload whole", () => {
    const out = expandCuts(film(), "2.5", "cut");
    assert.ok(out.ok);
    assert.equal(out.calls.length, 2, "one cut, one more window")
    // contiguity: end of i IS start of i+1 (the authored tiling)
    for (let i = 0; i + 1 < out.calls.length; i++) {
      assert.equal(out.calls[i]!.end_frame, out.calls[i + 1]!.start_frame, "the tiling stays contiguous")
    }
    // the row's own payload carries WHOLE into both halves
    for (const row of out.calls) {
      assert.equal(row.text, "the shot", "text carries whole")
      assert.equal(row.seed, 4242, "knobs carry whole")
    }
  });

  test("THE TWO-VIEWS LAW: a legal carried span (17k) reads %17==5 at the engine (span+22)", () => {
    for (let k = 1; k <= 20; k++) {
      const span = GRID_STEP_FRAMES * k;
      const generated = span + SEAM_OVERLAP_FRAMES;
      assert.equal(generated % 17, 5, `carried span ${span}f renders ${generated}f — one grid, two views`)
    }
    // and the first/cut window's authored span already satisfies the
    // engine's view (22+17k ≡ 5 mod 17 too — the same law, no second grid)
    for (const len of [22, 39, 56, 73, 90, 124, 362]) {
      assert.ok(isGridLength(len))
      assert.equal(len % 17, 5)
    }
  });

  test("THE SEAM LAW DEFAULT (operator 2026-11-17): an unstated carry seats EXTEND — the seam births context carry, never stock", () => {
    // "STOCK IS NOT DEFAULT. YOU SELECTED STOCK… CONTEXT IS DEFAULT
    // TO CARRY." The verb's unstated carry is the operator's law;
    // 'cut' stays a legal STATED mode (the operator's manual escape
    // hatch rides the strip) but never what an omitted seat births.
    const out = expandCuts(film(), "2.5");
    assert.ok(out.ok);
    // (the typed read: the fixture's rows author no transition — the
    // seam the split births is the only row that carries one)
    const seam = out.calls[1] as { transition?: string };
    assert.equal(seam.transition, "extend",
      "the seam an unstated carry births states extend — stock is never the default");
    // and the rows it authors pass the walk's own span gate (the
    // split never writes a doc the schema would refuse)
    for (let i = 0; i < out.calls.length; i++) {
      const row = out.calls[i]!;
      const span = row.end_frame - row.start_frame;
      if (i === 0) {
        assert.ok(isGridLength(span), `the first window stays 22+17k (got ${span})`);
      } else {
        assert.ok(span % GRID_STEP_FRAMES === 0 && span > 0,
          `the carried right half's span is 17k (got ${span}) — its 22f seam is the generation head`);
      }
    }
  });

  test("THE DOWNSTREAM REBASE: a carried split keeps EVERY downstream window on its own lattice (the 141f defect's wall)", () => {
    // THE BURN (2026-11-17, caught when the carry default landed):
    // the carry block slid the next window's START to the reflowed
    // seam but never its END — a 3-window doc split under carry
    // landed the third row at 141f, off the 17k carried lattice, a
    // doc the walk itself would refuse (the split authored illegal
    // rows). Every downstream window rebase-preserved its SPAN: the
    // film keeps its length, the tiling stays contiguous.
    const doc = [
      { text: "w1", start_frame: 0, end_frame: 124 },
      { text: "w2", start_frame: 124, end_frame: 243, transition: "extend" },
      { text: "w3", start_frame: 243, end_frame: 362, transition: "extend" },
    ];
    const out = expandCuts(doc, "2.5");
    assert.ok(out.ok);
    assert.deepEqual(
      out.calls.map((c) => [c.start_frame, c.end_frame]),
      [[0, 56], [56, 124], [124, 243], [243, 362]],
      "the seam reflows onto the 17k lattice and the downstream rows keep their spans — the film keeps its length",
    );
    for (let i = 0; i + 1 < out.calls.length; i++) {
      assert.equal(out.calls[i]!.end_frame, out.calls[i + 1]!.start_frame, "the tiling stays contiguous");
    }
  });

  test("the refusal voices: garbage, empty part, and a window too short to halve", () => {
    for (const bad of ["soon", "2.5,,5", ""]) {
      const out = expandCuts(film(), bad, "cut");
      assert.ok(!out.ok, `cuts '${bad}' must refuse`)
      assert.match(out.refusal, /seconds/)
    }
    // the shape's floor: a 22f first window has NO legal split
    const floor = [{ text: "x", start_frame: 0, end_frame: 22 }];
    const out = expandCuts(floor, "0.5", "cut");
    assert.ok(!out.ok)
    assert.match(out.refusal, /no legal split/)
  });
});
