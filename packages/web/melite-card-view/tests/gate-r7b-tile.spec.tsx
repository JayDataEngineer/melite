// @vitest-environment happy-dom
// gate-r7b-tile.spec.tsx — the sortable tile's grouping arms (round
// 7b): grouping mode has no entry UI through the tab (the dragdrop
// spec's note), so every grouping arm is dark — the tile mounts
// DIRECTLY with grouping on. Selected + unselected seats pin the
// check-circle arms (✓ + checkOn class vs empty), the selection
// click (onToggleSelect, never onOpen), the chrome absence (no
// trash, no run/stop), and the grouping data marks; plus the
// running stop's disabled arm (activeRunId null), the four tile
// faces, and the card-drop no-op arms.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi, type Mock } from "vitest";
import { createElement as h } from "react";
import { SortableTile } from "../src/client/sortable-tile.tsx";
import { benchRow, type CardRowLineTabRow } from "../src/client/bench-row.ts";
import { CARD_DRAG_MIME, ASSET_DRAG_MIME } from "../src/client/dnd-payloads.ts";
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stage(over: Record<string, unknown> = {}): BenchStageView {
  return { id: "s_0", card: "image-gen", engine: "comfyui", params: {}, ...over };
}

// the spies stand in for SortableTile's own gesture verbs (the prop
// signatures verbatim) — typed at the interface so every call below
// checks against the tile's contract
interface TileSpies {
  onOpen: Mock<(row: CardRowLineTabRow) => void>;
  onToggleSelect: Mock<(id: string) => void>;
  onAssetAttach: Mock<(target: string, source: string | File, kind: "image" | "audio") => void>;
  onReorderStart: Mock<(id: string | null) => void>;
  onReorderOver: Mock<(id: string) => void>;
  onReorderDrop: Mock<(active: string, over: string) => void>;
  onRun: Mock<(row: CardRowLineTabRow) => void>;
  onStop: Mock<(row: CardRowLineTabRow) => void>;
  onRemove: Mock<(row: CardRowLineTabRow) => void>;
}

function mountTile(row: CardRowLineTabRow, over: {
  grouping?: boolean;
  selected?: boolean;
  activeRunId?: string | null;
} = {}): TileSpies {
  const spies: TileSpies = {
    onOpen: vi.fn((_r: CardRowLineTabRow) => {}),
    onToggleSelect: vi.fn((_id: string) => {}),
    onAssetAttach: vi.fn((_t: string, _s: string | File, _k: "image" | "audio") => {}),
    onReorderStart: vi.fn((_id: string | null) => {}),
    onReorderOver: vi.fn((_id: string) => {}),
    onReorderDrop: vi.fn((_a: string, _o: string) => {}),
    onRun: vi.fn((_r: CardRowLineTabRow) => {}),
    onStop: vi.fn((_r: CardRowLineTabRow) => {}),
    onRemove: vi.fn((_r: CardRowLineTabRow) => {}),
  };
  render(h("ol", null, h(SortableTile, {
    row,
    entered: false,
    onOpen: (r) => { spies.onOpen(r); },
    grouping: over.grouping ?? false,
    selected: over.selected ?? false,
    onToggleSelect: (id) => { spies.onToggleSelect(id); },
    onAssetAttach: (t, s, k) => { spies.onAssetAttach(t, s, k); },
    dragging: false,
    dragOver: false,
    onReorderStart: (id) => { spies.onReorderStart(id); },
    onReorderOver: (id) => { spies.onReorderOver(id); },
    onReorderDrop: (a, o) => { spies.onReorderDrop(a, o); },
    onRun: (r) => { spies.onRun(r); },
    onStop: (r) => { spies.onStop(r); },
    onRemove: (r) => { spies.onRemove(r); },
    activeRunId: over.activeRunId ?? null,
  })));
  return spies;
}

function tileLi(id: string): HTMLElement {
  const li = document.querySelector(`li[data-stage-id="${id}"]`);
  if (li === null) throw new Error("tile missing: " + id);
  return li as HTMLElement;
}

function innerButton(li: HTMLElement): HTMLElement {
  // the tile face button (the nested chrome buttons ride INSIDE it —
  // a bare getByRole would match them too outside grouping mode)
  const btn = li.querySelector('button[class*="tileInner"]');
  if (btn === null) throw new Error("tile face button missing");
  return btn as HTMLElement;
}

describe("grouping mode — selection replaces chrome and reorder", () => {
  test("a selected tile checks on, toggles on click, and hides every chrome button", () => {
    const spies = mountTile(benchRow(stage()), { grouping: true, selected: true });
    const li = tileLi("s_0");
    // the grouping data marks ride
    expect(li.getAttribute("data-grouping")).toBe("on");
    expect(li.getAttribute("data-selected")).toBe("on");
    // reorder pauses in selection mode (no draggable seat)
    expect(li.getAttribute("draggable")).toBeNull();
    // the check circle reads checked
    const check = li.querySelector('[aria-hidden="true"]');
    expect(check?.textContent).toBe("✓");
    expect(document.querySelector('[class*="checkOn"]')).not.toBeNull();
    // the chat-input chrome is gone (no trash, no run, no stop)
    expect(screen.queryByTestId("tile-remove")).toBeNull();
    expect(screen.queryByTestId("tile-run")).toBeNull();
    expect(screen.queryByTestId("tile-stop")).toBeNull();
    // the click toggles selection — the drill never opens
    fireEvent.click(innerButton(tileLi("s_0")));
    expect(spies.onToggleSelect).toHaveBeenCalledTimes(1);
    expect(spies.onToggleSelect).toHaveBeenCalledWith("s_0");
    expect(spies.onOpen).not.toHaveBeenCalled();
  });

  test("an unselected tile checks empty and still toggles", () => {
    const spies = mountTile(benchRow(stage()), { grouping: true, selected: false });
    const li = tileLi("s_0");
    expect(li.getAttribute("data-grouping")).toBe("on");
    expect(li.getAttribute("data-selected")).toBeNull();
    expect(li.getAttribute("draggable")).toBeNull();
    const check = li.querySelector('[aria-hidden="true"]');
    expect(check?.textContent).toBe("");
    expect(document.querySelector('[class*="checkOn"]')).toBeNull();
    expect(screen.queryByTestId("tile-remove")).toBeNull();
    expect(screen.queryByTestId("tile-run")).toBeNull();
    expect(screen.queryByTestId("tile-stop")).toBeNull();
    fireEvent.click(innerButton(tileLi("s_0")));
    expect(spies.onToggleSelect).toHaveBeenCalledWith("s_0");
    expect(spies.onOpen).not.toHaveBeenCalled();
  });

  test("outside grouping the tile is draggable and opens on click", () => {
    const spies = mountTile(benchRow(stage()), { grouping: false, selected: false });
    const li = tileLi("s_0");
    expect(li.getAttribute("draggable")).toBe("true");
    expect(li.getAttribute("data-grouping")).toBeNull();
    fireEvent.click(innerButton(tileLi("s_0")));
    expect(spies.onOpen).toHaveBeenCalledTimes(1);
    expect(spies.onToggleSelect).not.toHaveBeenCalled();
  });
});

describe("the running stop — no run id, no arming", () => {
  test("a running row with a null run id disables its stop (never a live lie)", () => {
    mountTile(benchRow(stage({ runStatus: "running" })), { activeRunId: null });
    expect(tileLi("s_0").querySelector('[data-testid="tile-spin"]')).not.toBeNull();
    const stop = screen.getByTestId("tile-stop");
    expect(stop.getAttribute("aria-label")).toBe("Stop run");
    expect((stop as HTMLButtonElement).disabled).toBe(true);
  });

  test("a running row with a run id arms its stop", () => {
    mountTile(benchRow(stage({ runStatus: "running" })), { activeRunId: "run-1" });
    expect((screen.getByTestId("tile-stop") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("the tile faces — the artifact's kind owns the preview", () => {
  test("an audio result bars (never an image), a video heroes", () => {
    mountTile(benchRow(stage({ result: { url: "/x.wav" } })));
    expect(tileLi("s_0").querySelector('[data-testid="tile-face-audio"]')).not.toBeNull();
    expect(tileLi("s_0").querySelector("img")).toBeNull();
    cleanup();
    mountTile(benchRow(stage({ result: { url: "/x.mp4" } })));
    const hero = tileLi("s_0").querySelector('[data-testid="tile-face-video"]');
    expect(hero).not.toBeNull();
    expect((hero as HTMLVideoElement).muted).toBe(true);
  });

  test("an image result thumbs, a bare row kinds", () => {
    mountTile(benchRow(stage({ result: { url: "/x.png" } })));
    expect((tileLi("s_0").querySelector("img") as HTMLImageElement | null)?.getAttribute("src")).toBe("/x.png");
    cleanup();
    mountTile(benchRow(stage()));
    expect(tileLi("s_0").querySelector("img")).toBeNull();
    expect(tileLi("s_0").querySelector("video")).toBeNull();
    expect(tileLi("s_0").textContent ?? "").toContain("Image Gen");
  });
});

describe("the card-drop guards — ghosts and self-drops never reorder", () => {
  function cardTransfer(sourceId: string): Record<string, unknown> {
    const store: Record<string, string> = { [CARD_DRAG_MIME]: sourceId };
    return {
      types: [CARD_DRAG_MIME],
      getData: (mime: string) => store[mime] ?? "",
      setData: (mime: string, v: string) => { store[mime] = v; },
      effectAllowed: "",
      dropEffect: "",
      files: [],
    };
  }

  test("an empty id and a self-drop stay silent; a foreign id reorders", () => {
    const spies = mountTile(benchRow(stage()));
    fireEvent.drop(tileLi("s_0"), { dataTransfer: cardTransfer("") });
    fireEvent.drop(tileLi("s_0"), { dataTransfer: cardTransfer("s_0") });
    expect(spies.onReorderDrop).not.toHaveBeenCalled();
    fireEvent.drop(tileLi("s_0"), { dataTransfer: cardTransfer("s_9") });
    expect(spies.onReorderDrop).toHaveBeenCalledTimes(1);
    expect(spies.onReorderDrop).toHaveBeenCalledWith("s_9", "s_0");
  });

  test("dragover arms cards for move and copies assets (never a reorder)", () => {
    const spies = mountTile(benchRow(stage()));
    fireEvent.dragOver(tileLi("s_0"), { dataTransfer: cardTransfer("s_9") });
    expect(spies.onReorderOver).toHaveBeenCalledWith("s_0");
    expect(spies.onReorderDrop).not.toHaveBeenCalled();
    fireEvent.dragOver(tileLi("s_0"), {
      dataTransfer: {
        types: [ASSET_DRAG_MIME], getData: () => "", setData: () => {}, files: [], dropEffect: "",
      },
    });
    // the asset arm rides the copy effect and arms no reorder callback
    expect(spies.onReorderOver).toHaveBeenCalledTimes(1);
    expect(spies.onReorderDrop).not.toHaveBeenCalled();
  });
});

// L9 (the fallback audit): the capability parser's THREE worlds —
// foreign (empty), corrupt (present but unparseable/shape-wrong),
// valid. `null` alone once covered foreign+corrupt and the corrupt
// world was swallowed silent at the drop target.
describe("parseCapabilityDrop — the three worlds (L9)", () => {
  test("empty is foreign (silent), corrupt bodies are malformed, valid parses", async () => {
    const { parseCapabilityDrop, isMalformedCapabilityDrop } = await import("../src/client/dnd-payloads.ts");
    // foreign: empty data, both probes quiet
    expect(parseCapabilityDrop("")).toBe(null);
    expect(isMalformedCapabilityDrop("")).toBe(false);
    // corrupt world 1: unparseable JSON
    expect(parseCapabilityDrop("{not json")).toBe(null);
    expect(isMalformedCapabilityDrop("{not json")).toBe(true);
    // corrupt world 2: parses but the shape is wrong
    expect(parseCapabilityDrop(JSON.stringify({ service: "svc" }))).toBe(null);
    expect(isMalformedCapabilityDrop(JSON.stringify({ service: "svc" }))).toBe(true);
    // valid: parses, not malformed
    expect(parseCapabilityDrop(JSON.stringify({ service: "svc", title: "Svc" }))).toEqual({ service: "svc", title: "Svc" });
    expect(isMalformedCapabilityDrop(JSON.stringify({ service: "svc", title: "Svc" }))).toBe(false);
  });
});
