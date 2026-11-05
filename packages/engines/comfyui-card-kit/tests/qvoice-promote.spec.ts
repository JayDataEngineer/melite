// The flat-qvoice promotion writer (the F49 cure, 2026-11-01): the
// mods surface chips only ARRAY-valued params, so a flat
// `qvoice: "<path>"` press composed but stored voiceless in the
// studio's mods bar. promoteQvoiceBag rewrites the flat spelling into
// the bag the card's own refusal text names at the params WRITE seat;
// compose reads either spelling (qvoiceUse). These arms pin the
// writer's own edges — the store-seat wiring is judged estate-side
// (packages/estate/drafts/tests/bench-qvoice-promote.spec.ts).
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { promoteQvoiceBag, unwrapItemArrays, qvoiceUse } from "../src/kit.ts";

describe("promoteQvoiceBag — the flat spelling becomes the bag", () => {
  test("a flat path press promotes to the one-row bag with strength 1", () => {
    const out = promoteQvoiceBag({ qvoice: "/voices/kunoichi.qvoice" });
    assert.deepEqual(out, {
      qvoice: [{ qvoice: "/voices/kunoichi.qvoice", voice_strength: 1 }],
    });
    // the chip reads the array; compose reads either spelling
    assert.ok(Array.isArray(out["qvoice"]));
    assert.equal(qvoiceUse(out as Record<string, unknown>)?.path, "/voices/kunoichi.qvoice");
  });

  test("a stated top-level strength folds into the row (number and numeric string)", () => {
    assert.deepEqual(
      promoteQvoiceBag({ qvoice: "/v.qvoice", voice_strength: 1.2 }),
      { qvoice: [{ qvoice: "/v.qvoice", voice_strength: 1.2 }] },
    );
    assert.deepEqual(
      promoteQvoiceBag({ qvoice: "/v.qvoice", voice_strength: "0.8" }),
      { qvoice: [{ qvoice: "/v.qvoice", voice_strength: 0.8 }] },
    );
  });

  test("a junk stated strength promotes as 1 — the writer is total, admission owns refusals", () => {
    for (const junk of ["loud", "", "9", "-3", "1e9", Number.NaN, 9, -3, null, undefined, true]) {
      const out = promoteQvoiceBag({ qvoice: "/v.qvoice", voice_strength: junk as never });
      assert.equal(
        (out["qvoice"] as Array<Record<string, unknown>>)[0]["voice_strength"], 1,
        `junk ${String(junk)} must not poison the stored row`,
      );
    }
    // the STRING spelling folds exactly like the number spelling —
    // an out-of-range "9" never throws where a 9 folds (the writer's
    // totality law: one behavior per value, whatever its transport)
    const inRange = promoteQvoiceBag({ qvoice: "/v.qvoice", voice_strength: "1.5" });
    assert.equal(
      (inRange["qvoice"] as Array<Record<string, unknown>>)[0]["voice_strength"], 1.5,
    );
  });

  test("a transport-flattened one-STRING-array with a blank element never promotes", () => {
    // `["   "]` is the unwrapped shape with nothing to say — the row
    // rides verbatim, no bag minted from an empty voice
    assert.deepEqual(promoteQvoiceBag({ qvoice: ["   "] }), { qvoice: ["   "] });
  });

  test("bags, empty paths, and qvoice-less params ride untouched", () => {
    const bag = { qvoice: [{ qvoice: "/v.qvoice", voice_strength: 1.4 }] };
    assert.deepEqual(promoteQvoiceBag(bag), bag);
    assert.equal(promoteQvoiceBag({ qvoice: "   " })["qvoice"], "   ");
    assert.deepEqual(promoteQvoiceBag({ prompt: "hello" }), { prompt: "hello" });
    assert.deepEqual(promoteQvoiceBag({}), {});
  });

  test("the writer never mutates the caller's params record", () => {
    const p = { qvoice: "/v.qvoice", voice_strength: 0.5 };
    promoteQvoiceBag(p);
    assert.deepEqual(p, { qvoice: "/v.qvoice", voice_strength: 0.5 });
  });

  test("the store-seat order holds: wire unwrap first, promotion second", () => {
    // the remote transport wraps free-form arrays as {item:[…]}; the
    // wrap must resolve BEFORE the flat-string check fires
    const out = promoteQvoiceBag(
      unwrapItemArrays({ qvoice: { item: ["/v.qvoice"] } }) as Record<string, unknown>,
    );
    assert.deepEqual(out, { qvoice: [{ qvoice: "/v.qvoice", voice_strength: 1 }] });
  });
});
