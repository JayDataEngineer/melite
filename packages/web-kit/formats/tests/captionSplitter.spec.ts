// captionSplitter.spec.ts — the caption text splitter: proportional timing,
// the timestamped-tokens path, sentence/clause/word splitting, and merging.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { splitCaptions, splitIntoChunks } from "../src/captionSplitter.ts";

const cueShape = (c: { id: string; start: number; end: number; text: string }): void => {
  assert.match(c.id, /^cap_\d+_[a-z0-9]+$/);
  assert.equal(typeof c.start, "number");
  assert.equal(typeof c.end, "number");
  assert.ok(c.end >= c.start);
  assert.ok(c.text.length > 0);
};

describe("splitCaptions gates", () => {
  it("returns [] when duration <= 0", () => {
    assert.deepEqual(splitCaptions({ text: "hello world", duration: 0 }), []);
    assert.deepEqual(splitCaptions({ text: "hello world", duration: -3 }), []);
  });

  it("returns [] for empty/whitespace text without tokens", () => {
    assert.deepEqual(splitCaptions({ text: "", duration: 10 }), []);
    assert.deepEqual(splitCaptions({ text: "   \n\t  ", duration: 10 }), []);
  });

  it("falls back to proportional timing when tokens is null/undefined/empty", () => {
    const a = splitCaptions({ text: "Hello world.", duration: 4 });
    const b = splitCaptions({ text: "Hello world.", duration: 4, tokens: null });
    const c = splitCaptions({ text: "Hello world.", duration: 4, tokens: [] });
    assert.ok(a.length > 0 && b.length > 0 && c.length > 0);
    assert.equal(a[0]!.text, b[0]!.text);
    assert.equal(a[0]!.text, c[0]!.text);
  });
});

describe("splitCaptions proportional path", () => {
  it("distributes time by character count and pins the last cue end to duration", () => {
    const cues = splitCaptions({ text: "Hello world. Short one here.", duration: 12 });
    assert.ok(cues.length >= 1);
    for (const c of cues) cueShape(c);
    assert.equal(cues[0]!.start, 0);
    assert.equal(cues[cues.length - 1]!.end, 12);
    for (let i = 1; i < cues.length; i++) {
      assert.ok(cues[i]!.start >= cues[i - 1]!.start);
    }
  });

  it("covers the whole window with a single short sentence", () => {
    const cues = splitCaptions({ text: "Hi.", duration: 5 });
    assert.equal(cues.length, 1);
    assert.equal(cues[0]!.start, 0);
    assert.equal(cues[0]!.end, 5);
    assert.equal(cues[0]!.text, "Hi.");
  });
});

describe("splitCaptions tokens path", () => {
  it("builds cue text/timing from word tokens", () => {
    const cues = splitCaptions({
      text: "",
      duration: 5,
      tokens: [
        { text: "hello", start: 0.1234, end: 0.5 },
        { text: "world", start: 0.6, end: 1.0 },
      ],
    });
    assert.equal(cues.length, 1);
    cueShape(cues[0]!);
    assert.equal(cues[0]!.text, "hello world");
    assert.equal(cues[0]!.start, 0.123);
    assert.equal(cues[0]!.end, 1);
  });

  it("flushes into multiple cues past maxChars", () => {
    const cues = splitCaptions({
      text: "ignored",
      duration: 10,
      maxChars: 5,
      tokens: [
        { text: "aa", start: 0, end: 1 },
        { text: "bb", start: 1, end: 2 },
        { text: "cc", start: 2, end: 3 },
      ],
    });
    assert.equal(cues.length, 2);
    assert.equal(cues[0]!.text, "aa bb");
    assert.equal(cues[1]!.text, "cc");
  });

  it("keeps an over-long first word instead of emitting an empty cue", () => {
    const cues = splitCaptions({
      text: "",
      duration: 10,
      maxChars: 3,
      tokens: [{ text: "abcdef", start: 0, end: 1 }],
    });
    assert.equal(cues.length, 1);
    assert.equal(cues[0]!.text, "abcdef");
  });

  it("clamps the last cue end to the segment duration on overshoot", () => {
    const cues = splitCaptions({
      text: "",
      duration: 5,
      tokens: [{ text: "hello", start: 0, end: 10 }],
    });
    assert.equal(cues.length, 1);
    assert.equal(cues[0]!.end, 5);
  });

  it("leaves the last cue end alone when inside the duration", () => {
    const cues = splitCaptions({
      text: "",
      duration: 5,
      tokens: [{ text: "hello", start: 0, end: 2 }],
    });
    assert.equal(cues[0]!.end, 2);
  });
});

describe("splitIntoChunks", () => {
  it("returns [] for empty/blank input", () => {
    assert.deepEqual(splitIntoChunks(""), []);
    assert.deepEqual(splitIntoChunks("   "), []);
  });

  it("keeps short sentences and merges fragments that fit", () => {
    assert.deepEqual(splitIntoChunks("Hi. Yo."), ["Hi. Yo."]);
  });

  it("splits long sentences at clause boundaries", () => {
    const s =
      "The quick brown fox jumps over the lazy dog, and then it runs away fast";
    const chunks = splitIntoChunks(s, 42);
    assert.ok(chunks.length > 1);
    for (const c of chunks) assert.ok(c.length <= 42);
    assert.ok(chunks.join(" ").includes("quick brown fox"));
  });

  it("splits long clause parts further at word boundaries", () => {
    const s =
      "Short clause, " +
      "and then this second clause keeps going with many more words packed in";
    const chunks = splitIntoChunks(s, 20);
    assert.ok(chunks.length > 2);
    for (const c of chunks) assert.ok(c.length <= 20);
  });

  it("falls back to word boundaries with no clause separators", () => {
    const s = "word ".repeat(30).trim();
    const chunks = splitIntoChunks(s, 42);
    assert.ok(chunks.length > 1);
    for (const c of chunks) assert.ok(c.length <= 42);
  });

  it("keeps a single over-long word instead of dropping it", () => {
    const giant = "z".repeat(100);
    const chunks = splitIntoChunks(`Hi ${giant}`, 42);
    assert.ok(chunks.includes(giant));
  });

  it("starts with an over-long word without emitting an empty chunk", () => {
    const giant = "z".repeat(100);
    const chunks = splitIntoChunks(`${giant} and more words here`, 42);
    assert.deepEqual(chunks[0], giant);
    assert.ok(!chunks.includes(""));
  });

  it("takes the Math.min path for non-last proportional cues", () => {
    const cues = splitCaptions({
      text: "The first sentence is quite long here. The second sentence is long too.",
      duration: 10,
    });
    assert.equal(cues.length, 2);
    assert.equal(cues[0]!.start, 0);
    assert.ok(cues[0]!.end < 10);
    assert.equal(cues[1]!.end, 10);
  });

  it("pushes a pending merge when a long fragment overflows it", () => {
    const giant = "z".repeat(100);
    const chunks = splitIntoChunks(`Hello there. ${giant}`, 42);
    assert.ok(chunks.includes("Hello there."));
    assert.ok(chunks.includes(giant));
  });
});
