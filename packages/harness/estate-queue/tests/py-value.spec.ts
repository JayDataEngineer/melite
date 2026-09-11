// py-value.spec.ts — the py scalar module (PyNum/asciiEscape/pyStr/
// pyInt/mediaVocab/kindFor). Pure: the only I/O is mediaVocab's
// repo-anchored kinds file, so every kinds shape rides a tmp
// fixture. The module caches per process — the missing/malformed
// loads run FIRST (cache still null), the valid load arms the
// cache, and the policy variants ride query-suffixed fresh imports
// (one module instance each, same file).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  PyNum,
  asciiEscape,
  pyStr,
  pyInt,
  mediaVocab,
  kindFor,
} from "../src/pyValue.ts";

let dir = "";
let kindsPath = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "pyvalue-"));
  writeFileSync(
    join(dir, "kinds.json"),
    JSON.stringify({
      kinds: {
        image: { exts: ["PNG", "jpg"], gallery: ["png"] },
        audio: { exts: ["wav"] },
        video: { exts: ["mp4"], gallery: [] },
      },
      policy: { maxListedImages: 7 },
    }),
  );
  kindsPath = join(dir, "kinds.json");
});

describe("PyNum", () => {
  it("serializes the numeric value, not the literal", () => {
    assert.equal(new PyNum("1.00").toJSON(), 1);
    assert.equal(new PyNum("42").toJSON(), 42);
    assert.equal(JSON.stringify({ n: new PyNum("1.00") }), '{"n":1}');
  });

  it("out-of-range literals serialize null (the dumpsPy rule)", () => {
    assert.equal(new PyNum("1e400").toJSON(), null);
    assert.equal(new PyNum("abc").toJSON(), null);
  });
});

describe("asciiEscape", () => {
  it("ASCII rides verbatim", () => {
    assert.equal(asciiEscape("plain ascii ~"), "plain ascii ~");
  });

  it("BMP chars ride \\uXXXX", () => {
    assert.equal(asciiEscape("caf\u00e9"), "caf\\u00e9");
  });

  it("astral chars ride surrogate halves (charCodeAt parity)", () => {
    assert.equal(asciiEscape("\uD834\uDD1E"), "\\ud834\\udd1e");
  });
});

describe("pyStr", () => {
  it("strings ride, bools voice True/False", () => {
    assert.equal(pyStr("abc"), "abc");
    assert.equal(pyStr(true), "True");
    assert.equal(pyStr(false), "False");
  });

  it("ints ride exact, floats keep their point", () => {
    assert.equal(pyStr(42), "42");
    assert.equal(pyStr(1.5), "1.5");
    assert.equal(pyStr(1e-7), "1e-7");
  });

  it("non-finite numbers raise (the sidecar never writes inf)", () => {
    assert.throws(() => pyStr(Infinity), /bad sidecar number/);
    assert.throws(() => pyStr(NaN), /bad sidecar number/);
  });

  it("anything else rides String()", () => {
    assert.equal(pyStr(null), "null");
    assert.equal(pyStr(undefined), "undefined");
  });
});

describe("pyInt", () => {
  it("falsy is 0, bools voice 0/1", () => {
    assert.equal(pyInt(0), 0);
    assert.equal(pyInt(""), 0);
    assert.equal(pyInt(null), 0);
    assert.equal(pyInt(undefined), 0);
    assert.equal(pyInt(false), 0);
    assert.equal(pyInt(true), 1);
  });

  it("floats truncate toward zero, non-finite raise", () => {
    assert.equal(pyInt(3.9), 3);
    assert.equal(pyInt(-3.9), -3);
    assert.throws(() => pyInt(Infinity), /bad sidecar number/);
  });

  it("numeric strings parse (trimmed), anything else raises", () => {
    assert.equal(pyInt("42"), 42);
    assert.equal(pyInt("  -7 "), -7);
    assert.equal(pyInt("+12"), 12);
    assert.throws(() => pyInt("4.5"), /bad sidecar number/);
    assert.throws(() => pyInt("abc"), /bad sidecar number/);
    assert.throws(() => pyInt({}), /bad sidecar number/);
  });
});

describe("mediaVocab", () => {
  it("a missing kinds file refuses LOUD (never an empty sidebar)", () => {
    assert.throws(
      () => mediaVocab(join(dir, "absent.json")),
      /ENOENT/,
    );
  });

  it("a malformed kinds file refuses LOUD", () => {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{not json");
    assert.throws(() => mediaVocab(bad), /SyntaxError|JSON/);
  });

  it("loads, lowercases, defaults the absent kind + gallery", () => {
    const v = mediaVocab(kindsPath);
    assert.deepEqual(v.image, ["png", "jpg"]);
    assert.deepEqual(v.audio, ["wav"]);
    assert.deepEqual(v.galleryImage, ["png"]);
    assert.deepEqual(v.galleryAudio, []);
    assert.deepEqual(v.galleryVideo, []);
    assert.deepEqual(v.galleryModel, []);
    assert.equal(v.maxListedImages, 7);
  });

  it("the second load rides the process cache (same identity)", () => {
    const first = mediaVocab(kindsPath);
    assert.equal(mediaVocab(join(dir, "other.json")), first);
  });

  it("an absent policy defaults the cap to 0", async () => {
    const p = join(dir, "nopol.json");
    writeFileSync(p, JSON.stringify({ kinds: {} }));
    const fresh = await import("../src/pyValue.ts?nopol");
    assert.equal(fresh.mediaVocab(p).maxListedImages, 0);
  });

  it("a non-finite policy cap defaults to 0", async () => {
    const p = join(dir, "huge.json");
    writeFileSync(
      p,
      JSON.stringify({ kinds: {}, policy: { maxListedImages: 1e400 } }),
    );
    const fresh = await import("../src/pyValue.ts?huge");
    assert.equal(fresh.mediaVocab(p).maxListedImages, 0);
  });
});

describe("kindFor", () => {
  it("the estate vocab voices image/audio/video first", () => {
    assert.equal(kindFor("p.PNG", kindsPath), "image");
    assert.equal(kindFor("a.wav", kindsPath), "audio");
    assert.equal(kindFor("v.MP4", kindsPath), "video");
  });

  it("mesh exts voice model through the code set", () => {
    assert.equal(kindFor("m.glb", kindsPath), "model");
    assert.equal(kindFor("m.FBX", kindsPath), "model");
  });

  it("json voices spec, text exts voice text, all document", () => {
    assert.equal(kindFor("r.json", kindsPath), "document");
    assert.equal(kindFor("n.md", kindsPath), "document");
    assert.equal(kindFor("t.txt", kindsPath), "document");
    assert.equal(kindFor("y.yaml", kindsPath), "document");
    assert.equal(kindFor("d.yml", kindsPath), "document");
    assert.equal(kindFor("d.csv", kindsPath), "document");
  });

  it("the model vocab voices through the estate set", async () => {
    const p = join(dir, "full.json");
    writeFileSync(
      p,
      JSON.stringify({
        kinds: {
          image: { exts: [] },
          audio: { exts: [] },
          video: { exts: [] },
          model: { exts: ["glb"] },
        },
      }),
    );
    const fresh = await import("../src/pyValue.ts?fullkinds");
    assert.equal(fresh.kindFor("m.glb", p), "model");
  });

  it("unknown exts and dotless names voice other", () => {
    assert.equal(kindFor("b.bin", kindsPath), "other");
    assert.equal(kindFor("README", kindsPath), "other");
  });
});
