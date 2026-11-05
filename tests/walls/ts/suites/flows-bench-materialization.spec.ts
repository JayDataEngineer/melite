// flows-bench-materialization.spec.ts — THE FLOW PRESS MATERIALIZES
// (the FLOWS-ARE-COMPOSITIONS law, slice C, operator 2026-11-14:
// "FLOWS = COMPOSITION OF CARDS… WHEN YOU LOAD A FLOW, IT COMES OUT
// AS CARDS… THE BENCH OF CARDS REPRESENTS A FLOW").
//
// THE LIVE BURN THIS WALL CLOSES: slice A (62b2025ba) killed the
// marker-row mint, but the submit envelope still required draft_id on
// EVERY press — so the headless {flow} press was DEAD against the
// real door (draft_required) while melite-flow.spec's fake estate
// certified the call shape and e2e pressed hand-minted drafts. A wall
// judged the tool's mock; nothing judged the real door. The cure is
// the materializing press: the flow's cards LAND (one bench write)
// and the run rides the flow door carrying the bench's draft.
//
//   ARM 1 (composer parity): flowBenchStages' rows ≡ the registry's
//   OWN expansion (expandRegistryFlow) — cards in order, params
//   detached (a mutation never reaches the template), stage wires
//   remapped to the landed s_-ids, initial edges verbatim, outputs
//   verbatim, and NO stowaway keys (no card_io, no skip_when, no
//   ref_flow — the F60 shape stays dead). Census: exactly
//   image-upscale / character-factory / object-forge materialize; the
//   other four refuse naming their plane.
//   ARM 2 (the load bundle serves the rows): loadFlow carries
//   bench_stages iff the flow materializes — the data face of "when
//   you load a flow, it comes out as cards".
//   ARM 3 (the rows land through the REAL bench door): the press's
//   rows cross ensureBench — visible card rows, the flow as intent,
//   no ref_flow key on any landed row, and the landing is UNDOABLE
//   (the history inverse restores the operator's prior bench).
//   ARM 4 (the real submit envelope): {flow} doc-less walks ok (THE
//   FLOW-DOC EXEMPTION) with no existence probe; the materialized
//   press shape ({draft_id, flow}) walks ok through the probe; a
//   draft-less non-flow body still refuses draft_required (the CARD
//   BIRTH LAW holds everywhere else).
//
// The tool-side press shape (loadCard read → ONE bench write → the
// flow-door start carrying the bench draft) is pinned by
// melite-flow.spec.ts's flows-are-compositions cluster — the
// fake-estate harness owns that seam; this wall owns the doors.
//
// Red-proofs (§5, hands off the target files): toggle the
// namesFlowDoc exemption out of submitEnvelopeStructuralRefusal
// (queueSubmit.ts) → ARM 4's doc-less case reds (draft_required).
// Toggle the bench_stages embed out of loadFlow (loadPlane.ts) →
// ARM 2 reds. Remap flowBenchStages' wire ids to the registry's
// stage ids (s/make/ instead of s_0/) → ARM 1's remap arm reds.
// Drop the inverse from ensureBench's overwrite history → ARM 3's
// undo arm reds (restore yields the flow's rows, not the prior
// bench).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { flowBenchStages, loadFlow } from "../../../../packages/harness/estate-queue/src/loadPlane.ts";
import { seedFlowsSeat, expandRegistryFlow } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { submitEnvelopeStructuralRefusal, walkSubmitEnvelope } from "../../../../packages/harness/estate-queue/src/queueSubmit.ts";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { ensureBench, getBench, undoBench } from "../../../../packages/estate/drafts/src/bench.ts";
import { bootCtx, seed } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";

/** The rows' key set — exactly the bench's card row shape. card_io
 *  and skip_when are the registry's own seats; ref_flow is the F60
 *  crime; none of them may ride a landed row. */
const ROW_KEYS = ["card", "description", "engine", "id", "inputs", "outputs", "params"];

describe("ARM 1 — composer parity: the bench rows ARE the registry's expansion", () => {
  it("image-upscale's rows ≡ expandRegistryFlow, projected onto the bench's card shape", () => {
    const seat = seedFlowsSeat();
    const row = seat.get("image-upscale")!;
    const out = flowBenchStages(row, seat);
    assert.ok(!("refused" in out), "image-upscale materializes");
    if ("refused" in out) return;
    const rows = out.stages;
    const expanded = expandRegistryFlow(row, seat).stages;
    // cards in order, landed as s_0..s_n
    assert.deepEqual(
      rows.map((r) => r["card"]),
      expanded.map((s) => s.card),
      "the landed cards are the expansion's cards, in order",
    );
    assert.deepEqual(rows.map((r) => r["id"]), ["s_0", "s_1"], "stage ids land as s_-prefixed bench ids");
    // every row is exactly the bench's card shape — no stowaways
    for (const r of rows) {
      assert.deepEqual(Object.keys(r).sort(), ROW_KEYS, "the row carries only bench card keys");
    }
    // the initial edge rides verbatim; the stage wire rides REMAPPED
    // to the landed id (the bench's own wiring law speaks s_-ids)
    assert.deepEqual(rows[0]!["inputs"], { prompt: { initial: "prompt" } });
    assert.deepEqual(rows[1]!["inputs"], { image: { stage: "s_0", output: "image" } });
    // outputs verbatim (the flow-plane renames survive)
    assert.deepEqual(rows[0]!["outputs"], { image: "image" });
    // params carry the $spells the wires resolve (the door's own law)
    assert.deepEqual(rows[0]!["params"], { model: "krea-2", prompt: "$prompt" });
    assert.deepEqual(rows[1]!["params"], { model: "seedvr2-ema", input_image: "$image" });
  });

  it("params are DETACHED (a landed mutation never reaches the registry template)", () => {
    const seat = seedFlowsSeat();
    const row = seat.get("image-upscale")!;
    const before = JSON.stringify(expandRegistryFlow(row, seat).stages);
    const out = flowBenchStages(row, seat);
    assert.ok(!("refused" in out));
    if ("refused" in out) return;
    (out.stages[0]!["params"] as Record<string, unknown>)["prompt"] = "MUTATED";
    (out.stages[1]!["outputs"] as Record<string, unknown>)["image"] = "MUTATED";
    const after = JSON.stringify(expandRegistryFlow(row, seat).stages);
    assert.equal(after, before, "mutating the landed rows never leaks into the template");
    // and a second materialization serves the clean template
    const again = flowBenchStages(row, seat);
    assert.ok(!("refused" in again));
    if ("refused" in again) return;
    assert.deepEqual(again.stages[0]!["params"], { model: "krea-2", prompt: "$prompt" });
  });

  it("THE CENSUS: exactly image-upscale, character-factory and object-forge materialize; the rest refuse naming their plane", () => {
    const seat = seedFlowsSeat();
    const materialized: string[] = [];
    const refused: Array<[string, string]> = [];
    for (const id of seat.names()) {
      const row = seat.get(id)!;
      const out = flowBenchStages(row, seat);
      if ("refused" in out) refused.push([id, out.refused]);
      else materialized.push(id);
    }
    assert.deepEqual(
      materialized.sort(),
      ["character-factory", "image-upscale", "object-forge"],
      "the census is derived from the live seat — a new card-stage flow joins it, a refusal never lands",
    );
    assert.deepEqual(
      refused.map(([id]) => id).sort(),
      ["anny-hmr-estimator", "anny-params", "craft-loop", "fit-seat"],
    );
    // each refusal names the plane it composes on (family / engine
    // verb / skip_when) — never a bare boolean
    for (const [id, why] of refused) {
      assert.match(why, /no card seat|skip_when/, `${id}'s refusal names its plane: ${why}`);
    }
    const craft = refused.find(([id]) => id === "craft-loop")!;
    assert.match(craft[1], /engine verb \(craft/, "craft-loop's loop stage is an engine verb");
    const anny = refused.find(([id]) => id === "anny-hmr-estimator")!;
    assert.match(anny[1], /the family plane \(family 'anny'/, "anny-hmr-estimator composes on the family plane");
  });

  it("character-factory and object-forge land their cards in expansion order (the multi-card census parity)", () => {
    const seat = seedFlowsSeat();
    for (const [id, wantCards] of [
      ["character-factory", ["rig", "motion"]],
      ["object-forge", ["image-gen", "img-to-mesh"]],
    ] as const) {
      const row = seat.get(id)!;
      const out = flowBenchStages(row, seat);
      assert.ok(!("refused" in out), `${id} materializes`);
      if ("refused" in out) continue;
      assert.deepEqual(
        out.stages.map((r) => r["card"]),
        wantCards,
        `${id}'s cards land in order`,
      );
      assert.equal(out.flow, id, "the materialization names its flow");
    }
  });
});

describe("ARM 2 — the load bundle serves bench_stages iff the flow materializes", () => {
  const REPO = resolveRepoRoot();
  it("a card-stage flow serves its rows on the bundle (the flow comes out as cards)", () => {
    const bundle = loadFlow(REPO, "image-upscale") as Record<string, unknown>;
    const rows = bundle["bench_stages"] as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(rows) && rows.length === 2, "the bundle carries the two card rows");
    assert.deepEqual(rows.map((r) => r["card"]), ["image-gen", "upscale-tools"]);
    // the bundle's rows ARE the composer's rows (one materialization
    // body — melite_construct load lands them verbatim)
    const seat = seedFlowsSeat();
    const composed = flowBenchStages(seat.get("image-upscale")!, seat);
    assert.ok(!("refused" in composed));
    assert.deepEqual(rows, composed.stages);
  });
  it("a flow with no card seats carries NO bench_stages key (the run-door face)", () => {
    for (const id of ["anny-hmr-estimator", "craft-loop", "fit-seat", "anny-params"]) {
      const bundle = loadFlow(REPO, id) as Record<string, unknown>;
      assert.equal("bench_stages" in bundle, false, `${id} keeps the run-door face`);
      // the slim stages list still names every stage — the load is
      // honest about what the flow holds
      assert.ok(Array.isArray(bundle["stages"]) && (bundle["stages"] as unknown[]).length > 0, `${id} still discloses its stages`);
    }
  });
});

describe("ARM 3 — the rows land through the REAL bench ensure door", () => {
  it("the press's rows cross ensureBench: visible card rows, no ref_flow, the flow as intent — and the landing UNDOS", async () => {
    const { domain } = await bootCtx();
    // the operator's live bench (what the flow's landing replaces)
    await seed(domain, "session-chat7", {
      stages: [{ id: "keep-me", card: "tts", params: {} }],
    });
    const seat = seedFlowsSeat();
    const composed = flowBenchStages(seat.get("image-upscale")!, seat);
    assert.ok(!("refused" in composed));
    if ("refused" in composed) return;
    // the press's write: overwrite:true + expect_rev (the loadBench
    // CAS walk — melite-flow.ts's own body)
    const landed = await ensureBench(domain, {
      session: "session-chat7",
      intent: "image-upscale",
      stages: composed.stages,
      overwrite: true,
      expect_rev: 0,
    });
    assert.ok(typeof landed.draft_id === "string" && landed.draft_id !== "", "the landing mints the bench draft the run rides");
    const served = getBench(domain, "session-chat7");
    const rows = served.stages as Array<Record<string, unknown>>;
    assert.equal(rows.length, 2, "the bench shows the flow's cards");
    assert.deepEqual(rows.map((r) => r["card"]), ["image-gen", "upscale-tools"]);
    assert.deepEqual(rows.map((r) => r["id"]), ["s_0", "s_1"], "the landed ids are the composed ids");
    for (const r of rows) {
      assert.equal("ref_flow" in r, false, "no landed row carries ref_flow — the F60 shape stays dead");
      assert.equal(typeof r["card"], "string", "every landed row is a card row");
    }
    assert.equal(served.intent, "image-upscale", "the landing declares itself: the flow is the bench's intent");
    // the landing is UNDOABLE: the history inverse restores the
    // operator's prior bench (the anti-ghost exit)
    const undone = await undoBench(domain, "session-chat7", { n: 1, expect_rev: 1 });
    const restored = (undone.stages as Array<Record<string, unknown>>).map((r) => r["id"]);
    assert.deepEqual(restored, ["keep-me"], "undo restores the bench the flow replaced");
  });
});

describe("ARM 4 — the real submit envelope: the flow-doc exemption", () => {
  it("a doc-less {flow} body walks ok — and the existence probe never runs", async () => {
    let probed = false;
    const w = await walkSubmitEnvelope({ flow: "image-upscale", test: false, params: {} }, () => {
      probed = true;
      return false;
    });
    assert.equal(w.kind, "ok");
    assert.equal(probed, false, "the probe rides only a present draft_id");
  });
  it("the materialized press shape ({draft_id, flow}) walks ok through the probe", async () => {
    const w = await walkSubmitEnvelope({ draft_id: "bench-session-chat7", flow: "image-upscale", test: true }, (id) => id === "bench-session-chat7");
    assert.equal(w.kind, "ok");
  });
  it("a draft-less non-flow body still refuses draft_required (CARD BIRTH LAW outside the exemption)", () => {
    const r = submitEnvelopeStructuralRefusal({ model: "image-gen-1", prompt: "x" });
    assert.ok(r !== null);
    assert.equal(r.payload["code"], "draft_required");
  });
  it("present-but-bad draft shapes still refuse inside a flow doc (requiredness is the only lift)", () => {
    for (const doc of [{ flow: "f", draft_id: "" }, { flow: "f", draft_id: 7 }, { flow_inline: {}, draft_id: null }]) {
      const r = submitEnvelopeStructuralRefusal(doc);
      assert.ok(r !== null, JSON.stringify(doc) + " must refuse");
      assert.equal(r.payload["code"], "draft_required");
    }
  });
});
