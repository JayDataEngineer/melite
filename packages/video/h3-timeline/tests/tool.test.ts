// tool.test.ts — the h3_timeline tool face pins (the image-gen
// pattern) + the shot laws (the card gate the execute rides).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildH3TimelineTool, TOOL_NAME } from "../src/tool.ts";
import { carrier, schema } from "../src/card.ts";

const tool = buildH3TimelineTool("http://127.0.0.1:1");
// (defineTool validates args before presenters run — prompt AND
// calls are both required on this surface)
const ARGS = { prompt: "the courier pushes off", calls: [{ text: "the courier pushes off", start_frame: 0, end_frame: 56 }] };

describe("the h3-timeline tool face", () => {
  it("names itself on the tool plane (plain id, no _card suffix)", () => {
    assert.equal(TOOL_NAME, "h3_timeline");
    assert.equal(tool.name, "h3_timeline");
  });

  it("carries the identity prose (the ring's spelling)", () => {
    assert.ok(typeof tool.description === "string" && tool.description.length > 10);
  });

  it("the calls node rides the tool plane — required, unconstrained at the JSON-Schema boundary", () => {
    const props = (tool.parameters?.properties ?? {}) as Record<string, { description?: string; type?: string }>;
    const calls = props.calls;
    assert.ok(calls, "calls declared on the tool plane");
    assert.ok(calls.description?.startsWith("Shots"), "the shot-shape prose");
    assert.ok(((tool.parameters?.required ?? []) as string[]).includes("calls"));
    // 'json' maps to the unconstrained node (no type key) — the
    // item laws are the card gate's at execute time
    assert.ok(calls !== undefined && !("type" in calls));
  });

  it("presentationMeta projects the run arm, empty keys omitted", () => {
    const out = tool.output.presentationMeta?.(undefined, {
      flow: "h3-timeline", model: "h3-timeline", run_id: "r1", draft_id: "d1", status: "queued",
    });
    assert.deepEqual(out, {
      flow: "h3-timeline", model: "h3-timeline", run_id: "r1", draft_id: "d1", status: "queued",
    });
  });

  it("presentResult titles the run arm from result.meta — content omitted", () => {
    assert.equal(tool.presentResult?.(ARGS, {} as never), undefined);
    const view = tool.presentResult?.(ARGS, {
      content: [], isError: false,
      meta: { flow: "h3-timeline", model: "h3-timeline", run_id: "r9" },
    });
    assert.ok(view?.card === "generic");
    assert.equal(view?.title, "H3 Timeline [h3-timeline] → r9");
  });
});

describe("the shot laws (the card gate — py schema.py port)", () => {
  // The LAWS live in card.ts schema()'s variant arm (module-private
  // by design — the registry hands it to the compose door); the
  // carrier does NOT declare calls (the studio's frozen form-spec
  // walks the carrier and owns its own shots editor). The laws are
  // exercised end-to-end by the gateway compose door (the walls'
  // golden runs). Here: the plane split itself — the carrier stays
  // knob-only, the calls node lives on the tool plane alone.
  it("carrier stays knob-only (no calls leak into the studio form-spec)", () => {
    const dict = (carrier as unknown as { dict?: Record<string, unknown> }).dict;
    assert.ok(dict);
    assert.ok(!("calls" in dict), "calls is the tool plane's, never the studio's");
  });

  // the py _wire_value_laws port — each arm, isolated.
  //
  // The interpolate_enabled quirk is FIXED: the gate pre-fills the
  // boolean when the doc omits the key (the served wire default stays
  // the py-parity literal "false" — byte-frozen in the goldens).
  // Docs exercise the gate WITHOUT the key now.
  const BASE = { prompt: "x" };
  const SHOT = { text: "the courier pushes off", start_frame: 0, end_frame: 56 };

  it("a calls doc derives the variant (single text shot → t4_open)", () => {
    const out = schema({ ...BASE, calls: [SHOT] }) as Record<string, unknown>;
    assert.equal(out.variant, "t4_open");
  });

  it("multiple text shots → t4_chain", () => {
    const out = schema({ ...BASE, calls: [SHOT, { ...SHOT, start_frame: 57, end_frame: 120 }] }) as Record<string, unknown>;
    assert.equal(out.variant, "t4_chain");
  });

  it("no calls at all refuses (a film needs at least one shot)", () => {
    assert.throws(() => schema({ ...BASE }), /no calls to compose/);
  });

  it("a missing span refuses (text alone is not a shot)", () => {
    assert.throws(
      () => schema({ ...BASE, calls: [{ text: "x", end_frame: 56 }] }),
      /calls\[0\]: start_frame is required/,
    );
  });

  it("a reversed span refuses (end <= start is not a shot)", () => {
    assert.throws(
      () => schema({ ...BASE, calls: [{ text: "x", start_frame: 60, end_frame: 56 }] }),
      /end_frame 60 <= start_frame 60|end_frame 56 <= start_frame 60|reversed or empty span/,
    );
  });

  it("a doc omitting interpolate_enabled passes the gate (the fixed quirk)", () => {
    const out = schema({ prompt: "x", variant: "t4_open" }) as Record<string, unknown>;
    assert.equal(out.interpolate_enabled, false);
  });

  it("seam_carry 0 is a hard cut; out-of-range carry refuses", () => {
    // 0 rides (hard cut)
    const out = schema({ ...BASE, calls: [{ ...SHOT, seam_carry: 0 }] }) as Record<string, unknown>;
    assert.equal(out.variant, "t4_open");
    assert.throws(
      () => schema({ ...BASE, calls: [{ ...SHOT, seam_carry: 99 }] }),
      /seam_carry 99 outside \[1, 64\]/,
    );
  });
});
