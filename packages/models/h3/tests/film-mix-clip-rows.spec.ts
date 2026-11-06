// @melite/models-h3 — parseFilmMixClips' positioned-row chain at
// filmMix.ts:60-66, the conjunct faces the h3-timeline film-mix wall
// (the dom lane) does not drive: a src-less row stating ONLY a class,
// an id, or a name. Each of those keys is positioning in its own
// right — the chain reads all six (start_frame, dur_frames, text,
// class, id, name) — and the blank-string row falls PAST positioning
// into the source-less law (F3-06: only the NO-stated-key row skips).
// Every arm asserts the refusal's own voice or the composed clip;
// never a bare no-throw.
import { describe, it, expect } from "vitest";
import { parseFilmMixClips } from "../src/filmMix.ts";

describe("parseFilmMixClips — the positioned chain's class/id/name conjuncts", () => {
  const POSITIONED_VOICE = /a positioned clip row has no src — the film mix cannot place a source-less row/;
  const SOURCELESS_VOICE = /a clip row has no src — the film mix cannot mix a source-less row; state src or drop the row/;

  it("a src-less row stating only a class is positioned and refuses loud (the class conjunct's true face)", () => {
    expect(() => parseFilmMixClips([{ class: "sfx" }])).toThrow(POSITIONED_VOICE);
  });

  it("a src-less row stating only an id is positioned and refuses loud (the id conjunct's true face)", () => {
    expect(() => parseFilmMixClips([{ id: "take-3" }])).toThrow(POSITIONED_VOICE);
  });

  it("a src-less row stating only a name is positioned and refuses loud (the name conjunct's true face)", () => {
    expect(() => parseFilmMixClips([{ name: "whoosh" }])).toThrow(POSITIONED_VOICE);
  });

  it("a src-less row stating only dur_frames is positioned (a duration alone claims a seat)", () => {
    expect(() => parseFilmMixClips([{ dur_frames: 48 }])).toThrow(POSITIONED_VOICE);
  });

  it("a BLANK class is not positioning — the row falls to the source-less law and refuses there (the class conjunct's false face)", () => {
    expect(() => parseFilmMixClips([{ class: "   " }])).toThrow(SOURCELESS_VOICE);
  });

  it("a BLANK id is not positioning either (the id conjunct's false face)", () => {
    expect(() => parseFilmMixClips([{ id: "  " }])).toThrow(SOURCELESS_VOICE);
  });

  it("a BLANK name is not positioning either (the name conjunct's false face)", () => {
    expect(() => parseFilmMixClips([{ name: "  " }])).toThrow(SOURCELESS_VOICE);
  });

  it("THE POSITIVE FACE: a positioned row WITH src composes — class/id/name ride along, the int-string restore holds", () => {
    const clips = parseFilmMixClips([
      { src: "s.flac", start_frame: "24", dur_frames: "48", class: "sfx", id: "take-4", name: "the bell" },
    ]);
    expect(clips).toEqual([{ src: "s.flac", start: 24, dur: 48, text: "", cls: "sfx" }]);
  });
});
