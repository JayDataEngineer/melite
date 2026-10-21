// @vitest-environment happy-dom
// stack-gesture-flush.spec.tsx — THE STACK GESTURE LAW (2026-10-13,
// the operator's live burn: "when I close the card and reopen it,
// the image reference goes away" — an image-edit upload onto
// input_images). The slot flush law (2026-09-15, "when I wire an
// image from the previous flow, it doesn't stay after I close the
// card") seated the discrete-gesture write for image/file/mesh —
// but image_list rode the TRAILING coalescing write: close the card
// before the flush and the upload evaporated off the bench row; the
// reopen reseeded from a row that never heard it. This wall pins
// the SAME law for stacks: a stack pick writes the bench row NOW,
// and clearing the last entry DELETES the key (the door's null arm).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetStageWrites } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

let fakes: EstateFakes | null = null;

/** The form-spec door serves ONE stack field: input_images
 *  (image_list, group input) — the image-edit card's own shape. */
function stubFetch(): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input instanceof URL ? input : typeof input === "string" ? input : input.url);
    if (url.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-edit", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
          input_images: { type: "array", meta: { description: "Input Images", extra: { wtype: "image_list", group: "input", max_stack: 16 } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/v1/forms")) {
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
        "image-edit": { outputs: { default: "image" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

function mountBench(stages: BenchStageView[]): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: undefined })),
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

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  await user.click(el as HTMLElement);
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

/** Drive the add-cell picker: open the stack's add square, pick
 *  From flow, choose the /b.png artifact row. */
async function pickFlowImageIntoStack(): Promise<void> {
  const user = userEvent.setup();
  const add = await screen.findByRole("button", { name: /add input images/i }, { timeout: 4000 });
  await user.click(add);
  const flow = await screen.findByText("From flow", {}, { timeout: 4000 });
  fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement);
  const rows = await screen.findAllByTestId("source-pick-row", {}, { timeout: 4000 });
  const pick = rows.find((el) => (el.textContent ?? "").includes("/b.png")) ?? rows[rows.length - 1];
  fireEvent.click(pick);
}

function stackPatches(): Array<Record<string, unknown>> {
  const all = fakes?.calls ?? []
  return all
    .filter((c) => c.method === "drafts/patch")
    .map((c) => (c.args as { patch?: Record<string, unknown> }).patch ?? {})
    .filter((doc) => JSON.stringify(doc).includes("input_images"))
}

describe("the stack gesture law — a stack pick writes the bench row NOW (never the trailing write)", () => {
  test("picking an image onto input_images patches the stage row immediately (close/reopen keeps the reference)", async () => {
    mountBench([
      { id: "s_0", card: "image-edit", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/b.png" } },
    ]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await pickFlowImageIntoStack();
    // THE DISCRETE GESTURE: the pick wrote the bench row NOW — a
    // drafts/patch carrying the array landed (the coalescing write
    // fires only at Run; a close-before-flush drops it — the burn)
    // IMMEDIACY is the law: the discrete gesture fires at pick time,
    // not on the 300ms trailing coalescer (SCHEDULED_TRAILING_MS) —
    // a window shorter than the coalescer's delay reds the moment
    // the stack falls back to the trailing write
    const patches = await waitForPatches(150)
    expect(patches.length).toBeGreaterThanOrEqual(1)
    expect(patches.some((d) => JSON.stringify(d).includes('"/b.png"'))).toBe(true)
    // and the landed patch speaks the params key on the stage row
    expect(patches.some((d) => {
      const params = Reflect.get(d, "params") as Record<string, unknown> | undefined
      return params !== undefined && Array.isArray(params.input_images)
        && JSON.stringify(params.input_images) === '["/b.png"]'
    })).toBe(true)
  });

  test("clearing the last stack entry DELETES the key (a null param, the door's own law — never a stated-empty list)", async () => {
    mountBench([
      { id: "s_0", card: "image-edit", engine: "comfyui", params: { input_images: ["/b.png"] } },
    ]);
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    // the attached entry's Detach verb splices the last entry —
    // the empty stack is UNSTATED, not stated-empty
    const detach = await screen.findByRole("button", { name: /detach/i }, { timeout: 4000 });
    await user.click(detach);
    const patches = await waitForPatches()
    expect(patches.some((d) => {
      const params = Reflect.get(d, "params") as Record<string, unknown> | undefined
      return params !== undefined && params.input_images === null
    })).toBe(true)
  });
});

/** drafts/patch is async through the remote — poll the recorded
 *  calls until the stack patch lands (or fail loud after 2s). */
async function waitForPatches(deadlineMs = 2000): Promise<Array<Record<string, unknown>>> {
  const started = Date.now()
  for (;;) {
    const patches = stackPatches()
    if (patches.length > 0) return patches
    if (Date.now() - started > deadlineMs) {
      const docs = (fakes?.calls ?? []).filter((c) => c.method === "drafts/patch").map((c) => JSON.stringify((c.args as { patch?: unknown }).patch))
      throw new Error("no drafts/patch carrying input_images landed — docs seen: " + docs.join(" | "))
    }
    await new Promise((r) => setTimeout(r, 50))
  }
}
