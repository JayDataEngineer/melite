// THE FILM-MIX WALL (roadmap §20): the disk-side mix's placement
// math — the same seats the retired in-graph tail overlaid, now
// owned by filmMix.ts for BOTH consumers (card compose feeds stanza
// lengths, filmMux feeds probed durations). Every pinned number is
// the proof film's geometry: the 2-window clock (delays [0, 0.417,
// 2.5], the sfx duck at its film seat 2.5:3.75, never the phantom
// 3.417) and the 3-window owner map (doc 200 → 7.417, never 8.333).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  computeFilmMix,
  parseFilmMixClips,
  stanzaSecs,
} from '@melite/models-h3/filmMix';
import { spanStanzaFrames } from '@melite/models-h3/timelineContract';
import type { FilmMixClip, FilmMixSpan } from '@melite/models-h3/filmMix';

const SPAN = (start: number, end: number, transition?: string): FilmMixSpan =>
  transition === undefined ? { start, end } : { start, end, transition };
const CLIP = (over: Partial<FilmMixClip> & { src: string }): FilmMixClip => ({
  start: 0, dur: 0, text: "", cls: "music", ...over,
});
// the card's snap law for the pinned spans (56 → 56, 68 → 73,
// 90 → 90, 124 → 124 — 22+17k by construction)
const W2 = [56 / 24, 73 / 24];
const W3 = [56 / 24, 90 / 24, 124 / 24];

describe("parseFilmMixClips — the one law for what a clip IS", () => {
  it("the auto law: text → dialogue, textless → music; unpositioned src-less rows skip", () => {
    const clips = parseFilmMixClips([
      { src: "d.flac", start_frame: 10, dur_frames: 40, text: "get down, now." },
      { src: "m.flac", start_frame: 0, dur_frames: 124 },
      { noSrc: true },
      null,
    ]);
    assert.equal(clips.length, 2);
    assert.equal(clips[0]!.cls, "dialogue");
    assert.equal(clips[1]!.cls, "music");
  });

  it("positioned source-less rows refuse loud", () => {
    // placement (start_frame/dur_frames) claims a seat on the track
    assert.throws(
      () => parseFilmMixClips([{ id: "junk", start_frame: 10, dur_frames: 20 }]),
      /positioned clip row has no src/,
    );
    // and so does identity: a named row with no source is a lost take,
    // not junk
    assert.throws(
      () => parseFilmMixClips([{ id: "take-2", name: "the bell", src: "", start_frame: 0 }]),
      /positioned clip row has no src/,
    );
    assert.throws(
      () => parseFilmMixClips([{ text: "the line", src: "  " }]),
      /positioned clip row has no src/,
    );
    // rows that claim nothing stay skippable junk: empty strings, a
    // non-string field, and the truly empty row
    assert.deepEqual(
      parseFilmMixClips([{}, { noSrc: true }, { text: "", class: "", id: "", name: "" }, { text: 4, class: 9 }]),
      [],
    );
  });

  it("junk refuses loud: unknown class, src without a numeric start", () => {
    assert.throws(
      () => parseFilmMixClips([{ src: "x.flac", start_frame: 1, class: "voiceover" }]),
      /unknown class "voiceover"/,
    );
    assert.throws(
      () => parseFilmMixClips([{ src: "x.flac" }]),
      /no numeric start_frame/,
    );
  });
});

describe("stanzaSecs — the compose-time clock (§26's snap, one owner)", () => {
  it("spanStanzaFrames snaps to the 22+17k render grid, clamped [22,362]", () => {
    // the pinned spans: 56 → 56, 68 → 73, 90 → 90, 124 → 124
    assert.equal(spanStanzaFrames(SPAN(0, 56)), 56, "56 IS on the grid");
    assert.equal(spanStanzaFrames(SPAN(56, 124)), 73, "68f of new content snaps UP to 73 (round(46/17)=3)");
    assert.equal(spanStanzaFrames(SPAN(56, 146)), 90, "90 IS on the grid");
    assert.equal(spanStanzaFrames(SPAN(146, 270)), 124, "124 IS on the grid");
    // the clamp law: a 1-frame span still renders 22; a 6-minute
    // span caps at the engine's 362
    assert.equal(spanStanzaFrames(SPAN(0, 1)), 22, "the floor: no window renders under 22 frames");
    assert.equal(spanStanzaFrames(SPAN(0, 9000)), 362, "the ceiling: the engine's hard 362");
  });

  it("THE CARRY IS GENERATION — a carried window's stanza covers carry + span (the operator's standing 'the seam is still CUT' catch, MEASURED on the BRIEF4 proof film, 2026-09-23)", () => {
    // THE INVARIANT SCHEMAMASTER CANNOT SEE: the old snap produced
    // LEGAL grid lengths that failed the arithmetic — span 119,
    // stanza 124, carry 22: the render starts at sf−22, covers
    // [sf−22, sf+102), the finalize trims 22 → the SAVED clip is
    // 102 frames, 17 SHORT of its span. The film joins by hard
    // concat on the wrong frames — every carried seam a visible
    // cut. No type/bounds gate catches this: 124 IS on the grid.
    // THIS wall is the gate: stanza − carry ≥ span, snapped.
    const seam = SPAN(362, 481); // the BRIEF4 W4: extend, carry 22
    const stanza = spanStanzaFrames(seam, 22);
    assert.equal(stanza, 141, "span 119 + carry 22 = 141 IS on the grid");
    assert.ok(stanza - 22 >= seam.end - seam.start, "after the finalize trims the carried head, the saved clip still covers the span");
    // the failure the operator watched: the old law's 124 saved 102
    assert.notEqual(stanza, 124);
    assert.equal(spanStanzaFrames(SPAN(56, 124), 22), 90, "68f span + 22 carry = 90, on the grid — the old pin 73 starved this window by 17");
    assert.equal(spanStanzaFrames(SPAN(56, 124), 0), 73, "an uncalled-for carry (cut, or window 1) keeps the bare-span snap");
  });

  it("a degenerate span conditions nothing (the defensive floor: end ≤ start, or a non-finite bound)", () => {
    // the door refuses these docs upstream (the shot law); the mix
    // still guards its own math — a degenerate span stamps no
    // conditioning and crashes nothing
    const flat = computeFilmMix({
      spans: [SPAN(10, 10)],
      clips: [CLIP({ src: "d.flac", start: 10, dur: 48, text: "line" })],
      windowSecs: [22 / 24],
    });
    assert.equal(flat.duckSpans.length, 0, "no generation span, no conditioned clip");
    assert.equal(flat.placements.length, 1, "the overlay still places (owner 0, seat 0)");
    const nan = computeFilmMix({
      spans: [SPAN(Number.NaN, 56)],
      clips: [],
      windowSecs: [56 / 24],
    });
    assert.equal(nan.duckSpans.length, 0, "a non-finite bound conditions nothing either");
  });

  it("stanzaSecs feeds RAW frames/24 — no per-window rounding (sums must not compound drift) — and states the CARRY (a k≥2 stanza covers carry + span)", () => {
    // the 3-window seat proof: rounded parts give filmStart
    // 2.333+3.75−0.917 = 5.166 → seat 7.416; raw gives
    // 5.1666… → seat 7.4166… → ms 7.417 (the true owner-map seat)
    const secs = stanzaSecs([SPAN(0, 56), SPAN(56, 146), SPAN(146, 270)]);
    // index-aware carry: w1 fresh (56); w2 span 90 + carry 22 = 112
    // → 107; w3 span 124 + carry 22 = 146 → 141
    assert.deepEqual(secs, [56 / 24, 107 / 24, 141 / 24], "raw fractions, exactly frames/24, carry included");
    const manifest = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 146), SPAN(146, 270)],
      clips: [CLIP({ src: "d.flac", start: 200, dur: 48, text: "third window" })],
      windowSecs: secs,
    });
    // w3's film seat: 56/24 + (107−22)/24 = 141/24; the clip at doc
    // 200 sits (200−146)/24 later — 8.125, derived from RAW stanza
    // secs, never compounded rounded parts.
    assert.equal(manifest.placements[0]!.filmSec, 8.125, "the seat derived from RAW stanza secs is the true 8.125 — never a compounded rounding");
  });
});

describe("computeFilmMix — the owner map (filmStart + (start−docStart), no carry term)", () => {
  const d1 = CLIP({ src: "d.flac", start: 10, dur: 40, text: "get down, now.", cls: "dialogue" });
  const m1 = CLIP({ src: "m.flac", start: 0, dur: 124 });
  const s1 = CLIP({ src: "s.flac", start: 60, dur: 30, text: "a distant boom", cls: "sfx" });

  it("the 2-window film clock: music 0, dialogue 10/24, sfx at its film seat 2.5", () => {
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 124)],
      clips: [d1, m1, s1],
      windowSecs: W2,
    });
    assert.deepEqual(m.placements.map((p) => p.filmSec), [0.417, 0, 2.5]);
    assert.ok(m.duckSpanString.includes("2.5:3.75"), "the film duck spans the sfx at its film seat");
    assert.ok(!m.duckSpanString.includes("3.417"), "the phantom +22f seat appears nowhere");
    assert.equal(m.filmSec, 4.458);
  });

  it("THE PLACEMENTS CLOCK (audit A1, 2026-11-07): a 16fps doc books clip seats and durations at the 16-clock — the same clock the windows spoke", () => {
    // the same geometry as the 2-window arm, cut at the DOC CLOCK 16:
    // windowSecs are the fps-cut windows (stanzaSecs(…, 16)), the
    // placements must join them at 16 — a /24 here drifted every seat
    // against its own window (AUDIO-2's placements half).
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 124)],
      clips: [d1, m1, s1],
      windowSecs: [56 / 16, 73 / 16],
      fps: 16,
    });
    assert.deepEqual(m.placements.map((p) => p.filmSec), [0.625, 0, 3.75],
      "dialogue 10/16, music 0, sfx at its 16-clock film seat 3.5 + 4/16");
    assert.deepEqual(m.placements.map((p) => p.durSec), [2.5, 7.75, 1.875],
      "durations divide by the doc clock: 40/16, 124/16, 30/16");
    assert.ok(m.duckSpanString.includes("3.75:5.625"), "the sfx duck spans its 16-clock seat");
    assert.ok(!m.duckSpanString.includes("3.667"), "the phantom 24-clock seat (3.5 + 4/24) appears nowhere");
  });

  it("the duck matrix: the film track carries all conditioned spans, the music bus only the voice spans", () => {
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 124)],
      clips: [d1, m1, s1],
      windowSecs: W2,
    });
    assert.equal(m.duckSpans.length, 3, "d + m + s condition windows");
    assert.equal(m.musicDuckSpans.length, 2, "music never ducks itself");
    assert.ok(!m.musicDuckSpanString.split(";").some((s) => s.startsWith("0:")), "no music self-duck at film 0");
  });

  it("3-window extend: doc 200 seats at 7.417 — never start/24's 8.333", () => {
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 146), SPAN(146, 270)],
      clips: [CLIP({ src: "d3.flac", start: 200, dur: 48, text: "third window, same line.", cls: "dialogue" })],
      windowSecs: W3,
    });
    assert.deepEqual(m.placements.map((p) => p.filmSec), [7.417]);
    assert.ok(m.duckSpanString.includes("7.417:9.417"), "the duck spans the true seat");
  });

  it("a 'cut' seam owns no trim (overlap 0 — a true butt)", () => {
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 124, "cut")],
      clips: [s1],
      windowSecs: W2,
    });
    // no 22f trim past window 1: the sfx seats at 56/24 + 4/24
    assert.deepEqual(m.placements.map((p) => p.filmSec), [2.5]);
    assert.equal(m.filmSec, 5.375);
  });

  it("unsized and sub-0.1s clips stay overlay-only (placed, never ducked)", () => {
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 124)],
      clips: [
        CLIP({ src: "u.flac", start: 10, dur: 0, text: "unsized line", cls: "dialogue" }),
        CLIP({ src: "t.flac", start: 55, dur: 2, text: "a 2f graze", cls: "sfx" }),
      ],
      windowSecs: W2,
    });
    assert.equal(m.placements.length, 2, "both placed");
    assert.equal(m.duckSpans.length, 0, "neither sized a conditioning slice");
  });

  it("one lane per class per window: the first clip wins conditioning, both still overlay", () => {
    const m = computeFilmMix({
      spans: [SPAN(0, 56), SPAN(56, 124)],
      clips: [
        CLIP({ src: "a.flac", start: 10, dur: 40, text: "first", cls: "dialogue" }),
        CLIP({ src: "b.flac", start: 20, dur: 40, text: "second", cls: "dialogue" }),
      ],
      windowSecs: W2,
    });
    assert.equal(m.placements.length, 2);
    assert.equal(m.duckSpans.length, 1, "the authored primary owns the lane");
  });

  it("one duration per window — never a guess", () => {
    assert.throws(
      () => computeFilmMix({ spans: [SPAN(0, 56)], clips: [], windowSecs: [] }),
      /0 window duration\(s\) for 1 span\(s\)/,
    );
  });

  it("the duck depth rides the doc, defaulting to −14", () => {
    const a = computeFilmMix({ spans: [SPAN(0, 56)], clips: [], windowSecs: [1] });
    assert.equal(a.duckDb, -14);
    const b = computeFilmMix({ spans: [SPAN(0, 56)], clips: [], windowSecs: [1], duckDb: -8 });
    assert.equal(b.duckDb, -8);
  });
});

describe("parseFilmMixClips — the row-level numeric restore (035 wire family)", () => {
  it("stringified start_frame/dur_frames restore", () => {
    const clips = parseFilmMixClips([
      { src: "/v1/assets/runs/r/tts/line.flac", start_frame: "144", dur_frames: "134", text: "Rain's done." },
    ]);
    assert.deepEqual(clips[0]!.start, 144);
    assert.deepEqual(clips[0]!.dur, 134);
  });
  it("a non-numeric start still refuses", () => {
    assert.throws(
      () => parseFilmMixClips([{ src: "a.flac", start_frame: "soon" }]),
      /no numeric start_frame/,
    );
  });
});
