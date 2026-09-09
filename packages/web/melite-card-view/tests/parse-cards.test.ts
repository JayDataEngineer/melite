// parse-cards.test.ts — the tile hydration contract, pinned at the
// consumer (2026-09-10): the draft handle rides presentationMeta (the
// persisted channel — ToolResultNode.meta), with the render-text token
// as the LEGACY fallback for sessions logged before a tool grew its
// projector. Before this split, the view parsed prose exclusively —
// and the seven card tools that already emitted meta (with draft_id)
// fell to the inert "cards · earlier draft" note. That regression is
// the reason this file exists.
import { describe, expect, test } from "bun:test";
import { parseCardsBlock } from "../src/client/FlowCards.tsx";
import type { ToolCallBlockView } from "../src/client/types.ts";

function settledBlock(over: Partial<ToolCallBlockView>): ToolCallBlockView {
  return {
    callId: "c1",
    kind: "tool-result",
    call: { name: "melite_flow", argsRaw: '{"card":"image-gen","model":"krea-2"}' },
    content: [],
    isError: false,
    ...over,
  };
}

describe("parseCardsBlock — native channel first", () => {
  test("meta.draft_id wins, content never consulted", () => {
    const p = parseCardsBlock(settledBlock({
      meta: { mode: "card", target: "image-gen", draft_id: "draft-meta-1", run_id: "r1", status: "queued" },
      content: [{ text: "prose with no token at all" }],
    }));
    expect(p.draftId).toBe("draft-meta-1");
    expect(p.model).toBe("krea-2"); // header still args-derived
    expect(p.settled).toBe(true);
    expect(p.isError).toBe(false);
  });

  test("legacy token fallback when meta is absent (pre-projector logs)", () => {
    const p = parseCardsBlock(settledBlock({
      content: [{ text: "card draft-token-9 · flow x → r2 [queued] — poll with run_status" }],
    }));
    expect(p.draftId).toBe("draft-token-9");
  });

  test("meta present but draft_id absent/empty falls through to the token", () => {
    const p = parseCardsBlock(settledBlock({
      meta: { mode: "card", target: "x", error: "refused" },
      content: [{ text: "card draft-fall-1 done" }],
    }));
    // note: meta.error with no draft_id -> not a success handle; the
    // token below is what old code paths would have parsed
    expect(p.draftId).toBe("draft-fall-1");
  });

  test("junk meta shapes never throw and never fake a handle", () => {
    for (const junk of [42, "x", [], null, true, { draft_id: 7 }, { draft_id: "" }]) {
      const p = parseCardsBlock(settledBlock({ meta: junk, content: [{ text: "no tokens here" }] }));
      expect(p.draftId).toBe(null);
    }
  });

  test("error results never hydrate, meta or not", () => {
    const p = parseCardsBlock(settledBlock({
      isError: true,
      meta: { draft_id: "draft-should-not-mount" },
      content: [{ text: "card draft-should-not-mount" }],
    }));
    expect(p.draftId).toBe(null);
  });

  test("running calls parse nothing (composing…)", () => {
    const p = parseCardsBlock({ callId: "c2", name: "melite_flow", argsRaw: '{"flow":"x"}' });
    expect(p.draftId).toBe(null);
    expect(p.settled).toBe(false);
  });

  test("settled, success, no meta, no token = the legacy inert branch", () => {
    const p = parseCardsBlock(settledBlock({ content: [{ text: "image_card [krea-2] → r3 — poll" }] }));
    expect(p.draftId).toBe(null);
    // (post-fix this shape only occurs for tools that predate meta AND
    //  never spoke the token — the view renders the legacy note)
  });
});
