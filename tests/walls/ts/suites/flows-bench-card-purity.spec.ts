// flows-bench-card-purity.spec.ts — THE BENCH HOLDS CARDS ONLY (the
// FLOWS-ARE-COMPOSITIONS law, operator 2026-11-14: "FLOWS = COMPOSITION
// OF CARDS… WHEN YOU LOAD A FLOW, IT COMES OUT AS CARDS. THE CARD UI IS
// MEANT FOR CARDS ONLY, NOT FOR FLOWS. THE BENCH OF CARDS REPRESENTS A
// FLOW").
//
// The retired crime (F60): the flow press overwrote the bench with ONE
// marker row {id, engine, ref_flow, params} — a flow id wearing a
// stage's shape. The client stamped card:<flow-id> onto it
// (deriveCardForRow), the form-spec door answered 404 for a card that
// does not exist, and the estate's own truth said "?" forever.
//
// THE LAW, AT THE DOORS THAT OWN IT:
//   ARM 1 (the write door refuses the marker): a load carrying a
//   ref_flow row refuses bench/bad-body naming the law — at the
//   BIRTH and at the OVERWRITE, with and without an admission seat
//   (the shape is the crime, not the card). The row never lands.
//   ARM 2 (serve stays tolerant — the un-wedge line): a doc an older
//   door wrote still SERVES; the read never bricks the bench a fix
//   needs to open. The marker's cure is the remove door.
//   ARM 3 (undo replays history, not the law): an undo whose inverse
//   restores a marker row does not cross the write door — history is
//   data, and the refusal gates CALLERS, not the doc's past.
//   ARM 4 (the client never mints a card the plane refuses): a
//   card-less row carrying ref_flow stays card-less through the ONE
//   re-attach seat (deriveCardForRow) — the honest "?" face, never a
//   form-spec 404 feed.
//
// The tool-side twin (the press makes NO bench call: one runsStart, no
// draft mint) lives in melite-flow.spec.ts's flows-are-compositions
// cluster — the fake-estate harness owns that seam.
//
// Red-proofs (§5): toggle the ref_flow check out of admitStages
// (bench.ts) → ARMs 1 red at both doors. Toggle the ref_flow guard out
// of deriveCardForRow (cards-resource.ts) → ARM 4 red.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, undoBench } from "../../../../packages/estate/drafts/src/bench.ts";
import { bootCtx, seed } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";
import { deriveCardForRow } from "../../../../packages/web/melite-card-view/src/client/cards-resource.ts";

/** The retired press's exact marker row (melite-flow.ts, pre-law
 *  runTemplate) — the shape the doors must refuse. */
const MARKER = { id: "s_0", engine: "comfyui", ref_flow: "craft-loop", params: {} };

describe("ARM 1 — the write door refuses the flow marker (bench/bad-body, the law's voice)", () => {
  it("a BIRTH carrying a ref_flow row refuses — admission-seat absent (the shape law)", async () => {
    const { domain } = await bootCtx();
    await assert.rejects(
      ensureBench(domain, { session: "s", intent: "craft-loop", stages: [MARKER] }),
      (e: unknown) => {
        assert.equal((e as { code?: string }).code, "bench/bad-body");
        assert.match(
          (e as { message?: string }).message ?? "",
          /'craft-loop' is a flow, not a card — a flow id never lands as a bench row/,
        );
        assert.match((e as { message?: string }).message ?? "", /the bench holds cards; a flow runs through its own start door/);
        return true;
      },
    );
    // the row never landed: the doc was never born (the read's own
    // not-found voice is the proof — the refusal aborted the birth)
    assert.throws(
      () => getBench(domain, "s"),
      (e: unknown) => (e as { code?: string }).code === "bench/not-found",
    );
  });

  it("an OVERWRITE onto a live bench refuses and the live bench stands", async () => {
    const { domain } = await bootCtx();
    // a real card row lands first (the operator's bench; the birth
    // lands at rev 0 — the load CAS walk starts there)
    await ensureBench(domain, { session: "s", intent: "image-gen", stages: [{ id: "s_0", card: "image-gen", params: {} }] });
    await assert.rejects(
      ensureBench(domain, { session: "s", intent: "craft-loop", overwrite: true, expect_rev: 0, stages: [MARKER] }),
      (e: unknown) => (e as { code?: string }).code === "bench/bad-body",
    );
    const after = getBench(domain, "s").stages as Array<Record<string, unknown>>;
    assert.equal(after.length, 1);
    assert.equal(after[0]!["card"], "image-gen", "the live card row stands — the marker never replaced it");
  });

  it("a compound's members judge the same law (the marker cannot hide in children)", async () => {
    const { domain } = await bootCtx();
    await assert.rejects(
      ensureBench(domain, {
        session: "s",
        stages: [{ id: "g", card: "group", children: [MARKER] }],
      }),
      (e: unknown) => (e as { code?: string }).code === "bench/bad-body",
    );
  });
});

describe("ARM 2 — serve stays tolerant (a doc an older door wrote still serves)", () => {
  it("the F60-shaped doc serves verbatim — the read never bricks the bench", async () => {
    const { domain } = await bootCtx();
    await seed(domain, "legacy", { stages: [MARKER] });
    const served = getBench(domain, "legacy").stages as Array<Record<string, unknown>>;
    assert.equal(served.length, 1);
    assert.equal(served[0]!["ref_flow"], "craft-loop", "the marker serves as data — the remove door is the cure");
  });
});

describe("ARM 3 — undo replays history, never the write door (the un-wedge line)", () => {
  it("an undo restoring a clear-snapshot marker row lands — history is data", async () => {
    const { domain } = await bootCtx();
    await seed(domain, "hist", {
      stages: [{ id: "keep" }],
      bench: {
        rev: 1,
        log: [
          { rev: 1, at: 1, author: "agent", kind: "clear", inverse: { stages_before: [MARKER, { id: "keep" }] } },
        ],
      },
    });
    const undone = await undoBench(domain, "hist", { n: 1, expect_rev: 1 });
    const ids = (undone.stages as Array<Record<string, unknown>>).map((r) => r["id"]).sort();
    assert.deepEqual(ids, ["keep", "s_0"], "the marker restores as history — the refusal gates callers, not the doc's past");
  });
});

describe("ARM 4 — the client never mints a card the plane refuses (the F60 cure)", () => {
  it("a card-less ref_flow row stays card-less through the ONE re-attach seat", () => {
    const out = deriveCardForRow(
      [{ id: "s_0", engine: "comfyui", ref_flow: "craft-loop", params: {} }],
      "craft-loop",
    );
    assert.equal(out[0]!["card"], undefined, "no card:id stamp — the honest '?' face, never a form-spec 404 feed");
  });

  it("a genuinely card-born row still takes the intent (the CARD BIRTH LAW stands)", () => {
    const out = deriveCardForRow([{ id: "s_0", params: {} }], "image-gen");
    assert.equal(out[0]!["card"], "image-gen", "the birth law is untouched — only the flow marker is refused");
  });
});
