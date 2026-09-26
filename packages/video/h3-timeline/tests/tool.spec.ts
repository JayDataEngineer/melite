// tool.spec.ts — the h3_timeline tool face pins (the image-gen
// pattern) + the shot laws (the card gate the execute rides).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { buildH3TimelineTool, TOOL_NAME } from "../src/tool.ts";
import { carrier, schema } from "../src/card.ts";

// Face pins only — this spec never executes, so the transport is a
// stub that refuses if ever invoked (the old URL-string arg predates
// the EstateCall transport and never ran).
const tool = buildH3TimelineTool(async () => {
  throw new Error("tool.spec: no execute arm — the transport must stay cold")
});
// (defineTool validates args before presenters run — prompt AND
// calls are both required on this surface)
const ARGS = { prompt: "the courier pushes off", calls: [{ text: "the courier pushes off", start_frame: 0, end_frame: 56 }] };
const CLIP = { src: "/v1/assets/runs/r1/line.flac", start_frame: 0, dur_frames: 48, text: "the line" };

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
    assert.equal(view?.title, "Generate Video [h3-timeline] → r9");
  });

  it("JSON-STRING calls and audio_clips unwrap before either estate door", async () => {
    const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
    const transport = buildH3TimelineTool(async (_m, path, body) => {
      posts.push({ path, body: (body ?? {}) as Record<string, unknown> });
      if (path === "/v1/flows/drafts") return { draftId: "d-str" };
      return { run_id: "r-str", status: "queued" };
    });
    const out = await transport.execute?.(
      {
        prompt: "p",
        model: "h3-timeline",
        calls: JSON.stringify(ARGS.calls),
        audio_clips: JSON.stringify([CLIP]),
      } as never,
      { signal: undefined } as never,
    );
    assert.equal((out as { run_id?: string }).run_id, "r-str");
    const start = posts.find((p) => p.path === "/v1/flows/start");
    assert.ok(start, "the start door was dialed");
    assert.deepEqual(start.body["calls"], ARGS.calls);
    assert.deepEqual(start.body["audio_clips"], [CLIP]);
    const draft = posts.find((p) => p.path === "/v1/flows/drafts");
    const stage = (draft?.body["stages"] as Array<{ params?: { calls?: unknown; audio_clips?: unknown } }>)[0];
    assert.deepEqual(stage?.params?.calls, ARGS.calls);
    assert.deepEqual(stage?.params?.audio_clips, [CLIP]);
  });

  it("a calls STRING parsing to a non-array rides on — the estate refuses, never coerced", async () => {
    // tool.ts:134 — Array.isArray(parsed) false: a well-formed JSON
    // string that is NOT a list (an object, a number) is not a shot
    // list, so this face does not invent one — the string rides to
    // the estate and the card gate refuses with its own text.
    const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
    const transport = buildH3TimelineTool(async (_m, path, body) => {
      posts.push({ path, body: (body ?? {}) as Record<string, unknown> });
      if (path === "/v1/flows/drafts") return { draftId: "d-obj" };
      const start = (body ?? {}) as Record<string, unknown>;
      if (!Array.isArray(start["calls"])) return { error: "h3-timeline: no calls to compose" };
      return { run_id: "r-obj", status: "queued" };
    });
    const raw = JSON.stringify({ text: "not a shot list" });
    const out = await transport.execute?.(
      { prompt: "p", model: "h3-timeline", calls: raw } as never,
      { signal: undefined } as never,
    );
    assert.deepEqual(out, {
      flow: "h3-timeline", model: "h3-timeline", error: "h3-timeline: no calls to compose",
    });
    const start = posts.find((p) => p.path === "/v1/flows/start");
    assert.equal(start?.body["calls"], raw, "the non-array string rides untouched — this face never invents a verdict");
  });

  it("a MALFORMED calls string rides on — the card gate refuses with its own text", async () => {
    // the JSON.parse throw (the catch arm): a malformed string is
    // not unwrapped, not dropped — it rides to the estate, whose
    // gate reads it as "no calls to compose".
    const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
    const transport = buildH3TimelineTool(async (_m, path, body) => {
      posts.push({ path, body: (body ?? {}) as Record<string, unknown> });
      if (path === "/v1/flows/drafts") return { draftId: "d-bad" };
      const start = (body ?? {}) as Record<string, unknown>;
      if (!Array.isArray(start["calls"])) return { error: "h3-timeline: no calls to compose" };
      return { run_id: "r-bad", status: "queued" };
    });
    const raw = '[{"text":';
    const out = await transport.execute?.(
      { prompt: "p", model: "h3-timeline", calls: raw } as never,
      { signal: undefined } as never,
    );
    assert.deepEqual(out, {
      flow: "h3-timeline", model: "h3-timeline", error: "h3-timeline: no calls to compose",
    });
    const start = posts.find((p) => p.path === "/v1/flows/start");
    assert.equal(start?.body["calls"], raw, "the malformed string rides untouched");
  });

  it("a native ARRAY calls passes through untouched", async () => {
    const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
    const transport = buildH3TimelineTool(async (_m, path, body) => {
      posts.push({ path, body: (body ?? {}) as Record<string, unknown> });
      if (path === "/v1/flows/drafts") return { draftId: "d-arr" };
      return { run_id: "r-arr", status: "queued" };
    });
    await transport.execute?.(
      { prompt: "p", model: "h3-timeline", calls: ARGS.calls } as never,
      { signal: undefined } as never,
    );
    const start = posts.find((p) => p.path === "/v1/flows/start");
    assert.ok(Array.isArray(start?.body["calls"]));
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
    const out = schema({ ...BASE, calls: [SHOT, { ...SHOT, start_frame: 56, end_frame: 107 }] }) as Record<string, unknown>;
    assert.equal(out.variant, "t4_chain");
  });

  it("ABSENT calls composes the fresh-press starter; EXPLICIT empty refuses", () => {
    // the 2026-09-17 cure: absent calls = a fresh card (the bench
    // tile's Run) — ONE window 0→90 composes (the t4_open physics
    // budget, the widest a single window renders). An explicit empty
    // array names zero shots — garbage, the py refusal stands.
    const out = schema({ ...BASE }) as Record<string, unknown>
    assert.deepEqual(out.calls, [{ start_frame: 0, end_frame: 90 }])
    assert.throws(() => schema({ ...BASE, calls: [] }), /no calls to compose/);
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

  it("the seam is automatic — seam_carry is retired vocabulary (never read, never gated)", () => {
    // (2026-09-20: the drift-control continuation owns the chaining;
    // overlap is the director's proven 22, a 'cut' call is their
    // overlap-0 arm. The old lane-physics law died with MotionContext.)
    const out = schema({ ...BASE, calls: [{ ...SHOT, seam_carry: 99 }] }) as Record<string, unknown>;
    assert.equal(out.variant, "t4_open", "a single call stays t4_open, the junk key rides inert");
  });
});
