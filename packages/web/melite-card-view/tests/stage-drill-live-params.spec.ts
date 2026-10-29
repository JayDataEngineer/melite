/**
 * stage-drill-live-params.spec.ts — THE LIVE DOC BENEATH THE FORM
 * LAYER (2026-11-12, the operator's "IT WOULD NOT UPDATE THE TIMELINE
 * VISUALS" report): the drill's effective params must follow the LIVE
 * bench row for every key the drill has not authored, because the form
 * layer seeds with EVERY held key at open (seedUser's pass-along law)
 * and a plain held-over-user merge pinned the open-time snapshot — an
 * agent's calls rewrite or a pre-existing mod bag's arm/change/disarm
 * never reached the open studio. Pure unit arms over the seam's own
 * helper (the browser-plane wall e2e/studio-agent-writes.spec.ts rides
 * the same law end-to-end through the estate's bench doors).
 */
import { describe, expect, test } from "vitest";
import { liveEffectiveParams } from "../src/client/stage-drill.tsx";

describe("liveEffectiveParams — the open card follows the agent's writes", () => {
  test("an UNTOUCHED key follows the live row: the agent's four splits flow through", () => {
    // seeded at open with one call; the agent rewrites the same key on
    // the bench while the drill stays open
    const user = { calls: [{ text: "one", start_frame: 0, end_frame: 175 }] };
    const held = {
      calls: [
        { text: "split 1", start_frame: 0, end_frame: 124 },
        { text: "split 2", start_frame: 124, end_frame: 243 },
        { text: "split 3", start_frame: 243, end_frame: 362 },
        { text: "split 4", start_frame: 362, end_frame: 481 },
      ],
    };
    const out = liveEffectiveParams(held, user, new Set());
    expect(out["calls"]).toEqual(held["calls"]);
  });

  test("a pre-existing mod bag follows the live row: arm, change, disarm all flow", () => {
    const opened = { extend: [{ source_clip: "a.mp4", extend_seconds: 1 }] };
    // untouched — the agent arms a different value
    const armed = liveEffectiveParams(
      { ...opened, extend: [{ source_clip: "a.mp4", extend_seconds: 15.79 }] },
      opened,
      new Set(),
    );
    expect(armed["extend"]).toEqual([{ source_clip: "a.mp4", extend_seconds: 15.79 }]);
    // the agent disarms: null deletes at the door, so the live row simply
    // no longer carries the key
    const disarmed = liveEffectiveParams({}, opened, new Set());
    expect("extend" in disarmed).toBe(false);
  });

  test("a TOUCHED key keeps the user's face while it differs from the live row", () => {
    const user = { steps: 12 };
    const held = { steps: 6 }; // the agent writes 6 while the user holds 12
    const out = liveEffectiveParams(held, user, new Set(["steps"]));
    expect(out["steps"]).toBe(12);
  });

  test("a touched key RETIRES when its write settles — then the next foreign write flows", () => {
    const user = { steps: 6 };
    // while the gesture is UNRESOLVED (in flight or refused), the
    // user's face holds even against a foreign write that raced in
    const racing = liveEffectiveParams({ steps: 9 }, user, new Set(["steps"]));
    expect(racing["steps"]).toBe(6);
    // the settle effect retired the touch once the row confirmed the
    // authored value — the key follows the live row again
    const settled = liveEffectiveParams({ steps: 9 }, user, new Set());
    expect(settled["steps"]).toBe(9);
  });

  test("a touched-then-unset key leaves the view — the form's own gesture", () => {
    const user = { prompt: "kept" };
    const held = { prompt: "kept", dead_recipe: "x" };
    const out = liveEffectiveParams(held, user, new Set(["dead_recipe"]));
    expect("dead_recipe" in out).toBe(false);
    expect(out["prompt"]).toBe("kept");
  });

  test("a key only the user holds (a fresh pick) rides untouched", () => {
    const out = liveEffectiveParams({}, { model: "h3" }, new Set(["model"]));
    expect(out["model"]).toBe("h3");
  });
});
