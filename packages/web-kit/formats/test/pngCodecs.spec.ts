// pngCodecs.spec.ts — PNG tEXt embed/parse (pngMeta + pngMetaInfo) plus the
// SOMA-77 topology constants and chunked base64 codec (poseCodec).
import { describe, it, vi, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  asciiJsonStringify,
  embedPngText,
  parsePngText,
  readWorkflowFromPng,
} from "../src/pngMeta.ts";
import { injectPngMeta, readPngMeta } from "../src/pngMetaInfo.ts";
import {
  SOMA77_BONE_CONNECTIONS,
  SOMA_VERTEX_COUNT,
  encodeBufferToB64,
} from "../src/poseCodec.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

const u32be = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];

const chunk = (type: string, data: number[]): number[] => [
  ...u32be(data.length),
  ...[...type].map((c) => c.charCodeAt(0)),
  ...data,
  0,
  0,
  0,
  0, // CRC is never verified by these readers
];

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = chunk("IHDR", [...u32be(1), ...u32be(1), 8, 2, 0, 0, 0]);
const IEND = chunk("IEND", []);

/** Minimal valid PNG: sig + IHDR + IEND. */
const tinyPng = (extra: number[][] = []): Uint8Array =>
  new Uint8Array([...SIG, ...IHDR, ...extra.flat(), ...IEND]);

const toDataUrl = (b: Uint8Array): string =>
  `data:image/png;base64,${Buffer.from(b).toString("base64")}`;
const toB64 = (b: Uint8Array): string => Buffer.from(b).toString("base64");
const latin1 = (s: string): number[] => [...s].map((c) => c.charCodeAt(0) & 0xff);

const textChunk = (key: string, value: string): number[] =>
  chunk("tEXt", [...latin1(key), 0, ...latin1(value)]);

const itxtChunk = (
  key: string,
  text: string,
  flag = 0,
  lang = "en",
  translated = "",
): number[] =>
  chunk("iTXt", [
    ...latin1(key),
    0,
    flag,
    0,
    ...latin1(lang),
    0,
    ...latin1(translated),
    0,
    ...Array.from(new TextEncoder().encode(text)),
  ]);

describe("asciiJsonStringify", () => {
  it("passes ASCII JSON through untouched", () => {
    assert.equal(asciiJsonStringify({ a: 1, b: "x" }), JSON.stringify({ a: 1, b: "x" }));
  });

  it("escapes DEL and BMP non-ASCII as \\uXXXX with round-trip", () => {
    const out = asciiJsonStringify({ t: "a\x7fébÿ" });
    assert.match(out, /\\u007f/);
    assert.match(out, /\\u00e9/);
    assert.match(out, /\\u00ff/);
    assert.deepEqual(JSON.parse(out), { t: "a\x7fébÿ" });
  });

  it("escapes U+FFFF and surrogate pairs with round-trip", () => {
    const out = asciiJsonStringify({ t: "\uffff\ud83d\ude00" });
    assert.match(out, /\\uffff/);
    assert.deepEqual(JSON.parse(out), { t: "\uffff\ud83d\ude00" });
  });
});

describe("embedPngText", () => {
  const url = toDataUrl(tinyPng());

  it("returns the input unchanged for empty metadata", () => {
    assert.equal(embedPngText(url, {}), url);
  });

  it("returns the input unchanged for non-PNG input", () => {
    assert.equal(embedPngText("not-a-data-url", { k: "v" }), "not-a-data-url");
    assert.equal(embedPngText("data:image/png;base64,!!!", { k: "v" }), "data:image/png;base64,!!!");
    // Valid base64, too short to be a PNG.
    assert.equal(embedPngText("data:,QUJD", { k: "v" }), "data:,QUJD");
    // Long enough but with a bad signature.
    const bad = toDataUrl(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    assert.equal(embedPngText(bad, { k: "v" }), bad);
  });

  it("skips empty keys, returning the input when nothing remains", () => {
    assert.equal(embedPngText(url, { "": "v" }), url);
  });

  it("round-trips metadata through parsePngText", () => {
    const out = embedPngText(url, { workflow: '{"a":1}', prompt: "hi" });
    assert.ok(out.startsWith("data:image/png;base64,"));
    assert.deepEqual(parsePngText(out), { workflow: '{"a":1}', prompt: "hi" });
  });

  it("survives a >32KB PNG (chunked base64 path)", () => {
    const big = tinyPng([chunk("IDAT", new Array(40000).fill(7))]);
    const out = embedPngText(toDataUrl(big), { workflow: "{}" });
    assert.deepEqual(parsePngText(out), { workflow: "{}" });
  });
});

describe("parsePngText", () => {
  it("returns {} for non-PNG or truncated input", () => {
    assert.deepEqual(parsePngText("nope"), {});
    assert.deepEqual(parsePngText("data:,QUJD"), {});
    assert.deepEqual(parsePngText(toDataUrl(new Uint8Array([1, 2, 3]))), {});
    assert.deepEqual(
      parsePngText(toDataUrl(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))),
      {},
    );
  });

  it("reads tEXt with last-write-wins", () => {
    const url = toDataUrl(tinyPng([textChunk("a", "1"), textChunk("a", "2")]));
    assert.deepEqual(parsePngText(url), { a: "2" });
  });

  it("skips tEXt entries with an empty or missing keyword", () => {
    const noNul = chunk("tEXt", latin1("keyword-without-nul"));
    const emptyKey = chunk("tEXt", [0, ...latin1("v")]);
    const url = toDataUrl(tinyPng([noNul, emptyKey, textChunk("ok", "1")]));
    assert.deepEqual(parsePngText(url), { ok: "1" });
  });

  it("reads uncompressed iTXt", () => {
    const url = toDataUrl(tinyPng([itxtChunk("cmt", "héllo")]));
    assert.equal(parsePngText(url)["cmt"], "héllo");
  });

  it("reads iTXt with a translated keyword without leaking it into the text", () => {
    const url = toDataUrl(tinyPng([itxtChunk("cmt", "hello", 0, "en", "Title")]));
    assert.equal(parsePngText(url)["cmt"], "hello");
  });

  it("skips compressed iTXt", () => {
    const url = toDataUrl(tinyPng([itxtChunk("cmt", "x", 1), textChunk("ok", "1")]));
    assert.deepEqual(parsePngText(url), { ok: "1" });
  });

  it("skips malformed iTXt (no keyword / truncated header)", () => {
    const noNul = chunk("iTXt", latin1("no-nul-bytes-here"));
    const emptyKey = chunk("iTXt", [0, 0, 0, 0, 0]);
    const truncated = chunk("iTXt", [...latin1("k"), 0, 0, 0, ...latin1("en")]);
    const url = toDataUrl(tinyPng([noNul, emptyKey, truncated, textChunk("ok", "1")]));
    assert.deepEqual(parsePngText(url), { ok: "1" });
  });

  it("stops at IEND and on truncation", () => {
    const afterEnd = toDataUrl(
      new Uint8Array([...SIG, ...IHDR, ...IEND, ...textChunk("late", "1")]),
    );
    assert.deepEqual(parsePngText(afterEnd), {});
    // Declared length runs past EOF.
    const trunc = new Uint8Array([
      ...SIG,
      ...IHDR,
      ...u32be(100),
      ...latin1("tEXt"),
      1,
      2,
      3,
    ]);
    assert.deepEqual(parsePngText(toDataUrl(trunc)), {});
  });
});

describe("readWorkflowFromPng", () => {
  it("prefers workflow, then prompt, then parameters", () => {
    const w = toDataUrl(tinyPng([textChunk("workflow", '{"w":1}')]));
    assert.deepEqual(readWorkflowFromPng(w), { w: 1 });
    const p = toDataUrl(tinyPng([textChunk("prompt", '{"p":2}')]));
    assert.deepEqual(readWorkflowFromPng(p), { p: 2 });
    const q = toDataUrl(tinyPng([textChunk("parameters", '{"q":3}')]));
    assert.deepEqual(readWorkflowFromPng(q), { q: 3 });
  });

  it("returns null when nothing is embedded", () => {
    assert.equal(readWorkflowFromPng(toDataUrl(tinyPng())), null);
  });

  it("returns null (loudly) for malformed embedded JSON", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = toDataUrl(tinyPng([textChunk("workflow", "{bad")]));
    assert.equal(readWorkflowFromPng(bad), null);
    assert.ok(err.mock.calls.length > 0);
  });
});

describe("injectPngMeta / readPngMeta", () => {
  it("round-trips params through a bare base64 PNG", () => {
    const b64 = toB64(tinyPng());
    const injected = injectPngMeta(b64, { seed: 7, prompt: "hi" });
    assert.notEqual(injected, b64);
    assert.deepEqual(readPngMeta(injected), { seed: 7, prompt: "hi" });
  });

  it("reads through a data-URL wrapper", () => {
    const injected = injectPngMeta(toB64(tinyPng()), { a: 1 });
    assert.deepEqual(readPngMeta(`data:image/png;base64,${injected}`), { a: 1 });
  });

  it("passes non-PNG input through untouched", () => {
    const b64 = Buffer.from("hello world, not a png!!!").toString("base64");
    assert.equal(injectPngMeta(b64, { a: 1 }), b64);
  });

  it("returns the original on injection failure (loudly)", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    assert.equal(injectPngMeta("%%%", { a: 1 }), "%%%");
    assert.ok(err.mock.calls.length > 0);
  });

  it("returns null when no tEXt is present", () => {
    assert.equal(readPngMeta(toB64(tinyPng())), null);
  });

  it("returns null on key mismatch or tiny/short chunks", () => {
    const other = toB64(tinyPng([textChunk("other", '{"a":1}')]));
    assert.equal(readPngMeta(other), null);
    const tiny = toB64(tinyPng([textChunk("x", "y")]));
    assert.equal(readPngMeta(tiny), null);
    const noNul = toB64(tinyPng([chunk("tEXt", latin1("long-key-no-nul-here"))]));
    assert.equal(readPngMeta(noNul), null);
  });

  it("returns null (loudly) for malformed embedded JSON", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = toB64(tinyPng([textChunk("tech_noir", "{bad")]));
    assert.equal(readPngMeta(bad), null);
    assert.ok(err.mock.calls.length > 0);
  });

  it("returns null (loudly) for unreadable input", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    assert.equal(readPngMeta("%%%"), null);
    assert.ok(err.mock.calls.length > 0);
  });
});

describe("poseCodec", () => {
  it("exposes the SOMA-77 topology", () => {
    assert.equal(SOMA_VERTEX_COUNT, 18056);
    assert.equal(SOMA77_BONE_CONNECTIONS.length, 76);
    assert.deepEqual(SOMA77_BONE_CONNECTIONS[0], [0, 1]);
    for (const [a, b] of SOMA77_BONE_CONNECTIONS) {
      assert.ok(Number.isInteger(a) && a >= 0 && a < 77);
      assert.ok(Number.isInteger(b) && b >= 0 && b < 77);
    }
  });

  it("encodes base64 compatibly with Buffer", () => {
    assert.equal(encodeBufferToB64(new Uint8Array([])), "");
    const small = new Uint8Array([104, 105]);
    assert.equal(encodeBufferToB64(small), Buffer.from(small).toString("base64"));
  });

  it("encodes past the 32KB chunk boundary", () => {
    const big = new Uint8Array(40000);
    for (let i = 0; i < big.length; i++) big[i] = i & 0xff;
    assert.equal(encodeBufferToB64(big), Buffer.from(big).toString("base64"));
  });
});
