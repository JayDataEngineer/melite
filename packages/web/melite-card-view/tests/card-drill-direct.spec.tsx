// @vitest-environment happy-dom
/**
 * card-drill-direct.spec.tsx — the shared CardDrill's own faces,
 * rendered directly (2026-09-16 burn-down): the switch toggle (Pill
 * on/off, unknown-value '?'), raw typing (decimal dots survive until
 * patch time), the patch contract (changed keys only, null when
 * untouched), the run-error seam (named Error vs foreign throw), the
 * running button, the thumb, and close. Fakes: recording closures
 * for onRun/onClose, deep-equal on the delivered patch.
 */
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { CardDrill } from "../src/client/card-drill.tsx";
import type { ParamField } from "../src/client/draft.ts";

afterEach(cleanup);

const FIELDS: ParamField[] = [
  { key: "turbo", value: false, atom: "switch" },
  { key: "steps", value: 8, atom: "number" },
  { key: "prompt", value: "a", atom: "text" },
];

function mount(over: Partial<Parameters<typeof CardDrill>[0]> = {}): {
  patches: Array<Record<string, unknown> | null>
  closes: number
} {
  const patches: Array<Record<string, unknown> | null> = [];
  let closes = 0;
  const rec = {
    patches,
    get closes(): number { return closes; },
  };
  render(h(CardDrill, {
    title: "Card gen",
    fields: FIELDS,
    thumbUrl: null,
    running: false,
    onRun: async (patch) => { patches.push(patch); },
    onClose: () => { closes++; },
    ...over,
  }));
  return rec;
}

describe("the switch field — the Pill toggle", () => {
  test("off → on: the click flips the face and the patch carries true", async () => {
    const rec = mount();
    const pill = await screen.findByText("off", {}, { timeout: 4000 });
    fireEvent.click(pill);
    expect(await screen.findByText("on", {}, { timeout: 4000 })).toBeTruthy();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    await waitFor(() => { expect(rec.patches).toEqual([{ turbo: true }]); }, { timeout: 4000 });
  });

  test("a non-boolean switch value renders '?' (never a fake state)", async () => {
    mount({ fields: [{ key: "weird", value: 8 as unknown as boolean, atom: "switch" }] });
    expect(await screen.findByText("?", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the text fields — raw typing, single coercion", () => {
  test("retyping steps coerces once at Run (changed keys only)", async () => {
    const rec = mount();
    fireEvent.change(screen.getByDisplayValue("8"), { target: { value: "9" } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    await waitFor(() => { expect(rec.patches).toEqual([{ steps: 9 }]); }, { timeout: 4000 });
  });

  test("a decimal dot survives typing (the raw string rides until patch)", async () => {
    const rec = mount();
    const input = screen.getByDisplayValue("8") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "8." } });
    expect(input.value).toBe("8.");
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    // "8." coerces back to 8 — identical to the field value: NOT an edit
    await waitFor(() => { expect(rec.patches).toEqual([null]); }, { timeout: 4000 });
  });

  test("an untouched Run delivers null (never a lying patch)", async () => {
    const rec = mount();
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    await waitFor(() => { expect(rec.patches).toEqual([null]); }, { timeout: 4000 });
  });
});

describe("the run-error seam — the press seat never dies silently", () => {
  test("a named rejection renders its message (the drill stays open)", async () => {
    mount({ onRun: async () => { throw new Error("admission: nope"); } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    expect(await screen.findByText("admission: nope", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a foreign rejection renders the throw's own words (never a blank death)", async () => {
    mount({ onRun: async () => { throw "kablam"; } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    // the prop threw a plain string — the face speaks it verbatim
    // (the failureText law), never a fixed fallback that masks it
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a later Run clears the earlier error", async () => {
    let calls = 0;
    mount({
      onRun: async () => {
        calls++;
        if (calls === 1) throw new Error("first death");
      },
    });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    expect(await screen.findByText("first death", {}, { timeout: 4000 })).toBeTruthy();
    fireEvent.click(screen.getByText("Run"));
    await waitFor(() => { expect(screen.queryByText("first death")).toBeNull(); }, { timeout: 4000 });
  });
});

describe("the run-gate rescue — the chat tile's drill mounts the popup (lane-miss follow-up)", () => {
  // THE EXACT KEY (2026-10-22): the estate's structured lane-miss
  // rides the thrown details — the popup keys on it with NO prose
  // anchor in the message (the message below matches none of
  // parseRescue's arms, so only the structured key can pop it).
  const laneMiss = (): Error => Object.assign(new Error("press refused"), {
    details: { kind: "model", family: "qwen-image", slot: "weight", missing: "qwen-image.safetensors" },
  });
  const STAGES = [{ card: "image-gen", params: {} }];

  test("a structured lane-miss mounts the weight popup (the drill stays open)", async () => {
    mount({ stages: STAGES, onRun: async () => { throw laneMiss(); } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    expect(await screen.findByText("press refused", {}, { timeout: 4000 })).toBeTruthy();
    expect(await screen.findByTestId("weight-popup", {}, { timeout: 4000 })).toBeTruthy();
    expect(await screen.findByTestId("weight-download", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a detail-less refusal mounts no popup (never a phantom offer)", async () => {
    mount({ stages: STAGES, onRun: async () => { throw new Error("plain death"); } });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    expect(await screen.findByText("plain death", {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(() => { expect(screen.queryByTestId("weight-popup")).toBeNull(); }, { timeout: 4000 });
  });

  test("a later Run clears the popup with the error", async () => {
    let calls = 0;
    mount({
      stages: STAGES,
      onRun: async () => {
        calls++;
        if (calls === 1) throw laneMiss();
      },
    });
    fireEvent.click(await screen.findByText("Run", {}, { timeout: 4000 }));
    expect(await screen.findByTestId("weight-popup", {}, { timeout: 4000 })).toBeTruthy();
    fireEvent.click(screen.getByText("Run"));
    await waitFor(() => { expect(screen.queryByTestId("weight-popup")).toBeNull(); }, { timeout: 4000 });
  });
});

describe("running + thumb + close", () => {
  test("running flips the button (disabled 'running…')", async () => {
    mount({ running: true });
    const btn = await screen.findByText("running…", {}, { timeout: 4000 });
    expect((btn.closest("button") as HTMLButtonElement).disabled).toBe(true);
  });

  test("a thumb renders (alt = the card title); null renders no image", async () => {
    const { unmount } = render(h(CardDrill, {
      title: "Card gen", fields: FIELDS, thumbUrl: "/img/out.png",
      running: false, onRun: async () => {}, onClose: () => {},
    }));
    const img = await screen.findByAltText("Card gen", {}, { timeout: 4000 });
    expect((img as HTMLImageElement).src).toContain("/img/out.png");
    unmount();
    cleanup();
    render(h(CardDrill, {
      title: "Card gen", fields: FIELDS, thumbUrl: null,
      running: false, onRun: async () => {}, onClose: () => {},
    }));
    await screen.findByText("Run", {}, { timeout: 4000 });
    expect(screen.queryByAltText("Card gen")).toBeNull();
  });

  test("closing the modal calls onClose", async () => {
    const rec = mount();
    // the primitives Modal renders closeLabel as the dismiss button's
    // accessible name (icon X, no visible text)
    fireEvent.click(await screen.findByRole("button", { name: "Close card" }, { timeout: 4000 }));
    expect(rec.closes).toBe(1);
  });
});
