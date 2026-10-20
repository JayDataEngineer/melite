// h3-window-parity.spec.ts — THE H3 WINDOW PROJECTION SEAM (Slice 0 of
// the P0 census design, dev_docs/audits/p0-census-design-2026-11-08.md
// R4; the (a)-cure's owed lock).
// @contract models-h3-window-parity
//
// The h3 window is function-served: the walk judges the window schema
// (models/h3 schema.ts), the family door judges the film action rows
// (models/h3 actions.ts), and the UI serves the carrier emission
// (emitParamsSchema over paramSchema). Three homes, one surface —
// nothing pinned them agreeing, so a bounds edit on one side that
// missed the other composed a graph the user's own card schema
// forbids, or rejected a value the engine accepts (the F3 hole;
// the portrait cure widened both homes by hand).
//
// WHAT THIS WALL ASSERTS, over serveWindowSpec (the seam's own
// serving projection — a package export the census consumes, never a
// test helper): the carrier's hidden law accounts for every
// carrier-but-unserved key (each carries hidden:true — the mechanism,
// not a list), every served-but-undeclared key is named with its
// exemption, and every declared-but-unserved key is named with its
// wire/internal reason. Drop a film row or a carrier knob from either
// side and the named sets shift → red, naming the key.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { serveWindowSpec } from "../../../../packages/models/h3/src/windowSpec.ts";
import { paramSchema } from "../../../../packages/models/h3/src/schema.ts";

describe("THE H3 WINDOW PROJECTION SEAM — carrier, served envelope, and film rows are one surface", () => {
  it("the seam serves the three universes, sorted", () => {
    const spec = serveWindowSpec();
    for (const [name, arr] of Object.entries({ carrierKeys: spec.carrierKeys, envelope: spec.envelope, filmRows: spec.filmRows }) as const) {
      assert.deepEqual(arr, [...arr].sort(), `${name} is sorted — the wall diffs sets, never order`);
      assert.ok(arr.length > 20, `${name} is the full surface (saw ${arr.length} keys — a surface that empties is a hole, not a pass)`);
    }
  });

  it("every carrier-but-unserved key is hidden by the carrier's own law (the mechanism, not a list)", () => {
    const spec = serveWindowSpec();
    // length: hidden by the B1-1 cure (audit h3-frames-anima,
    // 2026-10-20) — the served Frames knob owned span-less calls only,
    // which fresh cards never author; the timeline's calls own the
    // window. Stays schema-declared (compose reads p.length) but the
    // Layer-A face never serves it.
    assert.deepEqual(
      spec.carrierInternal,
      ["fps", "fps_seconds", "image_name", "interp_switch", "k", "length", "noise_seed", "sharpen_switch", "sla_switch"],
    );
    for (const k of spec.carrierInternal) {
      const field = (paramSchema.dict as Record<string, { meta?: { extra?: Record<string, unknown> } }>)[k];
      assert.equal(
        field?.meta?.extra?.hidden,
        true,
        `${k}: unserved without hidden:true is a silent drop, not a law — the carrier must hide it or serve it`,
      );
    }
  });

  it("served-but-undeclared keys are named with their exemption", () => {
    const spec = serveWindowSpec();
    // ref_video_trims: served to the UI and read by the walk (carrier
    // dict, per-video trims paired with Reference videos) but no film
    // action row declares it — the film rows judge the DECL/family
    // write surface, and trims are a user-doc pairing, not a
    // family-judged knob. Served + walk-read, family-door-exempt.
    assert.deepEqual(spec.undeclaredServed, ["ref_video_trims"]);
  });

  it("declared-but-unserved keys are named with their wire/internal reason", () => {
    const spec = serveWindowSpec();
    // the three switch verbs arrive as WRITE verbs (the switch verbs'
    // delete mark — never UI-set knobs) and image_name is the
    // renderer's guide-image spelling, gate-admitted for old docs
    // (carrier tooltip) while the rail's First frame owns the face.
    // length: a wire row the compose still reads (span-less calls +
    // CALL_KNOB_KEYS' per-call pin) — the face unserves it because
    // the timeline's calls own the window (B1-1).
    // Family-declared wire/internal, UI-unserved by law.
    assert.deepEqual(spec.unservedDeclared, ["image_name", "interp_switch", "length", "sharpen_switch", "sla_switch"]);
  });
});
