// @vitest-environment happy-dom
// @contract cards-strip-singularity
// stage-drill-strip-singularity.spec.ts — THE ONE-REFUSAL/ONE-STRIP
// WALL (2026-11-09/10 burn, verbatim on the receipt: "ERRORS APPEAR
// TWICE ON THE TTS CARD, ONE ABOVE AND BELOW, AND I CAN ONLY CLOSE
// THE BOTTOM ERROR MESSAGE"). Two render sites voice the compose
// gate: the form's intake banner ABOVE the form (card-base form.tsx,
// renders EVERY violation, unclosable) and the drill's error strip
// BELOW it (the press seat, closable, the SD-7 unstamp owner). The
// E2-12 one-voice mute muted only the ONE message the strip voiced —
// the press seat's composeGateViolation took violations[0] — so a
// two-refusal doc (the operator's: 'voice' AND 'style_instruction')
// left the SECOND refusal on the unclosable banner while the strip
// carried the first: two faces, one closable. The law this wall
// pins: the press strip owns the WHOLE gate set (one row per
// violation, each field-named row with its unstamp), the banner
// stands down for EVERY message the strip carries, and one dismiss
// retires the strip. Singularity: after a refused press, exactly ONE
// gate face exists on the card.
//
// THE PRE-REGISTERED RED (first run IS the receipt): the press
// voiced violations[0] only — the banner kept the second refusal
// (banner count 1) and the strip carried one unstamp. GREEN on the
// cured tree; toggling the cure out re-reds it.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from '@melite/card-base/client';
import { resetStageWrites } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

let fakes: EstateFakes | null = null;

/** The two-ghost fixture: the family base declares ONLY the text
 *  param — the served doc (the bench row the estate stamped) carries
 *  TWO keys no lane declares. The mirror refuses both, in key order:
 *  ghost_a, then ghost_b — the operator's 'voice' AND
 *  'style_instruction' shape on the tts card. */
function ghostStage(): BenchStageView {
  return {
    id: "s_0",
    card: "tts",
    engine: "comfyui",
    params: {
      model: "m",
      text: "the operator speaks again",
      ghost_a: "stated carry one",
      ghost_b: "stated carry two",
    },
  };
}

function ghostSpecDoc(): Record<string, unknown> {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({
      text: { type: 'string', meta: { description: 'Text', extra: { wtype: 'textarea' } } },
    }),
    variants: [],
    params: ['text'],
  };
}

/** Re-stubbed PER MOUNT (the afterEach unstub law): the form-spec is
 *  the drill's served truth — the two-ghost family base. */
function stubFetchSpec(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
  if (path.includes("/v1/form-spec")) {
    return new Response(JSON.stringify(ghostSpecDoc()), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
  if (path.includes("/v1/forms")) {
    return new Response(JSON.stringify({ tts: { outputs: { default: "audio" } } }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
  if (path.includes("/v1/model-catalog")) {
    return new Response(JSON.stringify({ cards: {} }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
  return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  });
}

function mountBench(stages: BenchStageView[]): void {
  stubFetchSpec();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: (s as { runStatus?: string }).runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
  }));
}

async function openDrill(): Promise<void> {
  const user = userEvent.setup();
  const tile = document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement;
  await user.click(tile);
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
  await screen.findByLabelText("Text", {}, { timeout: 4000 });
}

async function typeText(text: string): Promise<void> {
  const field = await screen.findByLabelText("Text", {}, { timeout: 4000 });
  const user = userEvent.setup();
  await user.clear(field);
  await user.type(field, text);
}

async function pressRun(): Promise<void> {
  const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
  const user = userEvent.setup();
  await user.click(within(zoom).getByRole("button", { name: "Run stage" }));
}

const gateBanners = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-compose-gate]')) as HTMLElement[];
const gateStrip = (): HTMLElement | null =>
  document.querySelector('[data-testid="stage-error-strip"]');
const unstampButtons = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('button[aria-label^="Unstamp"]')) as HTMLElement[];

describe("strip singularity — one refused press, one strip, every violation owned", () => {
  test("THE FLOOR — the open doc carries two undeclared keys and the intake banner voices BOTH pre-press (singular)", async () => {
    mountBench([ghostStage()]);
    await openDrill();
    await waitFor(() => { if (gateBanners().length === 0) throw new Error("banner not voiced yet"); }, { timeout: 8000 });
    expect(gateBanners().length, "pre-press: the intake banner is the ONE face").toBe(1);
    const text = gateBanners()[0].textContent ?? "";
    expect(text).toContain("ghost_a");
    expect(text).toContain("ghost_b");
    expect(gateStrip()).toBeNull();
  });

  test("THE RED — a refused press voices the WHOLE gate set on ONE closable strip; the banner stands down fully", async () => {
    mountBench([ghostStage()]);
    await openDrill();
    await typeText("an edit so the flush has a key");
    await pressRun();
    await waitFor(() => { if (gateStrip() === null) throw new Error("strip not voiced yet"); }, { timeout: 8000 });
    // SINGULARITY: the strip is the ONLY gate face on the card.
    expect(gateBanners().length, `the intake banner kept a face the strip carries:\n  ${gateBanners().map((b) => b.textContent).join("\n  ")}`).toBe(0);
    // OWNERSHIP: the strip carries BOTH refusals...
    const stripText = gateStrip()?.textContent ?? "";
    expect(stripText).toContain("ghost_a");
    expect(stripText).toContain("ghost_b");
    // ...with the unstamp affordance for EACH field-named row (SD-7).
    const stamps = unstampButtons();
    expect(stamps.length, `expected an unstamp per named field, got ${JSON.stringify(stamps.map((b) => b.getAttribute("aria-label")))}`).toBe(2);
    expect(stamps.map((b) => b.getAttribute("aria-label")).join("|")).toContain("ghost_a");
    expect(stamps.map((b) => b.getAttribute("aria-label")).join("|")).toContain("ghost_b");
    // CLOSABILITY: one dismiss retires the whole strip.
    const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
    fireEvent.click(within(zoom).getByRole("button", { name: "Dismiss error" }));
    await waitFor(() => { if (gateStrip() !== null) throw new Error("strip still voiced"); }, { timeout: 4000 });
    expect(gateBanners().length, "the banner returns after the dismiss (the doc still carries the ghosts) — the intake job resumes").toBe(1);
  });
});
