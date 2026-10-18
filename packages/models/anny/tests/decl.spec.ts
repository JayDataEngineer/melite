// @melite/models-anny — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity; the
// full carrier (every HF link, sha256, lane weight, variant
// matrix) is the declaration itself, and registration is proven
// engine-side (the walls' registry count, the flavor↔DECL.mods
// interlock, the boot gates). Family-specific truth pins land here
// hand-written when a fact needs pinning — never generated guesses.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the anny model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-anny");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "anny");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  // (l) THE LANE SURFACE (operator 2026-11-08, ERRORS.md:100): the
  // photo slot rides the declared params beside the GLB attach — the
  // image face the compose estimator arm reads. The row set is
  // pinned at its head (body_glb + body_image) so a dropped or
  // renamed input slot is a deliberate edit, never drift.
  it("declares the body input slots — the GLB attach and the (l) photo face", () => {
    assert.equal(DECL.params[0], "body_glb", "the GLB attach seats first (the schema's order 0)");
    assert.equal(DECL.params[1], "body_image", "the photo face seats beside it (the estimator's card arm)");
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["anny-base-body.glb", "989eed67a59a4397ac61693e968bcea34504735d2e298eaa1885df6048a95b96", "https://huggingface.co/ProtoPomp/anny/resolve/main/anny/anny-base-body.glb", 494404],
  ["sam_vit_b_01ec64.pth", "ec2df62732614e57411cdcf32a23ffdf28910380d03139ee0f4fcbe91eb8c912", "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth", 375042383],
];

describe("the declared provisions are pinned verbatim", () => {
  it("every row carries its pinned sha256, url and size_bytes", () => {
    const rows = DECL.provisions ?? [];
    assert.deepEqual(rows.map((r) => r.name), PROVISION_PINS.map((p) => p[0]),
      "the pin table IS the declared table — a row added, dropped or renamed is a deliberate edit");
    for (const [name, sha256, url, size_bytes] of PROVISION_PINS) {
      const row = rows.find((r) => r.name === name)!;
      assert.equal(row.sha256, sha256, `${name}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(row.url, url, `${name}: the url is pinned verbatim — a wrong path inside the right repo fails here`);
      assert.equal(row.size_bytes, size_bytes, `${name}: the declared size is pinned verbatim`);
    }
  });
});
