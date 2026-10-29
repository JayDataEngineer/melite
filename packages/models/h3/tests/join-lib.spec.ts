// @melite/models-h3 — the film-join primitives as a library (the
// multi-window unification, 2026-11-12: chainSaveBoundaries +
// concatSavedFilms are the shared file-join face the film tail and
// the extend compose both ride; the card suites drive them at full
// depth — this spec owns the empty-input refusals, which no card
// doc can state). Guards: both refusals fire LOUD; the concat
// seats the optional append member and derives audio from the
// join's own wire when none is given.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { chainSaveBoundaries, concatSavedFilms } from "../src/actions.ts";

// a wiring-shape handle: the join only threads outputs, it never
// reads node internals
const handle = { __handle: true } as never;

describe("the film-join primitives as a library", () => {
  it("chainSaveBoundaries refuses an empty save list LOUD (nothing to order)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => chainSaveBoundaries(g, []),
      /the boundary chain needs at least one save — a join with nothing to order refuses loud/,
    );
  });

  it("concatSavedFilms refuses an empty prefix list LOUD (nothing to stitch)", () => {
    const g = new GraphBuilder();
    const boundary = chainSaveBoundaries(g, [handle]);
    assert.throws(
      () => concatSavedFilms(g, [], boundary, "run/join"),
      /the concat needs at least one member prefix — a join with nothing to stitch refuses loud/,
    );
  });

  it("concatSavedFilms seats the append member and derives audio from the join wire", () => {
    const g = new GraphBuilder();
    const boundary = chainSaveBoundaries(g, [handle]);
    concatSavedFilms(g, ["run/x0"], boundary, "run/extend_film", { append: handle });
    const o = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const concats = Object.values(o).filter((n) => n.class_type === "MeliteConcatVideos");
    assert.equal(concats.length, 1, "one join node");
    assert.equal(concats[0].inputs.videos, "run/x0", "the prefix members ride the videos string");
    assert.ok("append" in concats[0].inputs, "the append member is seated (an exact wired path, LAST)");
    const muxes = Object.values(o).filter((n) => n.class_type === "CreateVideo");
    assert.equal(muxes.length, 1, "the join's own deliverable mux");
    const audio = muxes[0].inputs.audio as [string, number];
    assert.ok(Array.isArray(audio) && audio[1] === 1,
      "unstated audio derives from the concat's own audio output (the join is the source of truth)");
  });
});
