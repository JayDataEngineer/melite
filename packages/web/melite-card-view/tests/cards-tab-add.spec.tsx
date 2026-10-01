// @vitest-environment happy-dom
// cards-tab-add.spec.tsx — the add door (2026-09-16 burn-down,
// installment 3h): the catalog faces (list / Error voice / thrown
// voice / unmount calm), the pick faces (familyless id, spec Error,
// spec thrown, spec envelope-less), the add faces (seeds ride, fresh
// opens, re-read throw falls back, refusal voices, thrown voices),
// and the picker chrome (query narrows, genre bands, title arms).
// Estate verbs ride mountEstateFakes (the one-lane seam); fetch
// answers ONLY the /v1 discovery doors (catalog, form-spec, forms).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base';

interface Call { method: string; args: Record<string, unknown> }

let fakes: { calls: Call[]; unmount: () => void } | null = null;
let posted: Call[] = [];

// fetch-level controls (the /v1 doors — kept verbatim)
const doors: {
  catalog: Record<string, Record<string, unknown>> | null;
  catalogThrown?: unknown;
  catalogStatus?: number;
  specThrown?: unknown;
  specStatus?: number;
  specVariants?: boolean;
  specModels?: string[];
} = { catalog: null, specModels: [] };

function schemaEnvelope(fields: Record<string, unknown>): unknown {
  const refs: Record<string, unknown> = {};
  const order: string[] = [];
  let uid = 1;
  for (const [name, field] of Object.entries(fields)) {
    refs[name] = { uid: uid++, ...(field as Record<string, unknown>) };
    order.push(name);
  }
  return { uid: 0, refs, order };
}

function stubDoors(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const estate = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] },
    draftStages: [],
    draftBenchRev: 1,
    ...estateOpts,
  });
  fakes = estate;
  posted = estate.calls;
  doors.catalog = null;
  doors.catalogThrown = undefined;
  doors.catalogStatus = undefined;
  doors.specThrown = undefined;
  doors.specStatus = undefined;
  doors.specVariants = undefined;
  doors.specModels = [];
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/model-catalog")) {
      if (doors.catalogThrown !== undefined) throw doors.catalogThrown;
      if (doors.catalogStatus !== undefined) {
        return new Response("down", { status: doors.catalogStatus });
      }
      return new Response(JSON.stringify({ cards: doors.catalog ?? {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      if (doors.specThrown !== undefined) throw doors.specThrown;
      if (doors.specStatus !== undefined) {
        return new Response("down", { status: doors.specStatus });
      }
      const model = new URL(path, "http://x").searchParams.get("model") ?? "";
      doors.specModels?.push(model);
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(doors.specVariants === true ? {
          families: [{ id: "image-gen", present: true }, { id: "tts", present: true }],
          variants: [
            { id: "v-img", label: "Img", group: "Variant", defaults: { model: "image-gen" }, route: "image-gen" },
            { id: "v-tts", label: "Tts", group: "Variant", defaults: { model: "tts" }, route: "tts" },
          ],
        } : {}),
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

const STAGES: BenchStageView[] = [];

function mount(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}, prestage?: () => void): void {
  stubDoors(estateOpts);
  if (prestage !== undefined) prestage();
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: STAGES },
    }),
  } as never));
}

async function openPicker(): Promise<void> {
  await waitFor(() => {
    if (screen.queryByRole("button", { name: "Add a card" }) === null) throw new Error("no add");
  });
  fireEvent.click(screen.getByRole("button", { name: "Add a card" }));
  await screen.findByRole("button", { name: "Close picker" }, { timeout: 5000 });
}

describe("the catalog faces — list, refusal, and calm unmount", () => {
  test("a dead catalog voices its HTTP (never a blank door)", async () => {
    mount({}, () => { doors.catalogStatus = 500; });
    await openPicker();
    expect(await screen.findAllByText(/HTTP 500/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a throwing catalog voices the fallback (never empty)", async () => {
    mount({}, () => { doors.catalogThrown = "gone"; });
    await openPicker();
    expect(await screen.findAllByText("catalog unavailable", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("an unmount mid-flight stays calm (the alive guard holds)", async () => {
    let release!: (v: unknown) => void;
    const gate = new Promise((resolve) => { release = resolve; });
    mount({}, () => {
      doors.catalogThrown = gate.then(() => "never");
    });
    await openPicker();
    cleanup();
    release(null);
    await new Promise((r) => setTimeout(r, 100));
  });
});

describe("the pick faces — family, spec, and seed", () => {
  test("a familyless card specs by its own id (never a blank model)", async () => {
    mount({}, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: [] } };
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    }, { timeout: 5000 });
    expect(doors.specModels).toEqual(["lone"]);
  });

  test("a dead spec voices label-first (never a bare HTTP)", async () => {
    mount({}, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
      doors.specStatus = 500;
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    expect(await screen.findAllByText(/Lone: .*HTTP 500/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a throwing spec voices the fallback (never empty)", async () => {
    mount({}, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
      doors.specThrown = "gone";
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    expect(await screen.findAllByText(/Lone: .*form-spec unavailable/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("the axis seed rides the add (a card is born with its variant)", async () => {
    mount({}, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
      doors.specVariants = true;
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    }, { timeout: 5000 });
    const post = posted.find((p) => p.method === "bench/add-stage");
    const doc = (post?.args as { doc: Record<string, unknown> }).doc;
    expect(doc["params"]).toBeTruthy();
  });
});

describe("the landing faces — fresh opens, stale falls back", () => {
  test("the fresh row opens its drill (the open-on-add law)", async () => {
    // HARNESS LAW: bench/add-stage appends a fresh row and bumps the
    // rev, so the post-add re-read diff always finds it — the old
    // envelope stub answered {rev} with no stage, pinning the stale
    // fallback. The fallback arm itself survives below (the dead
    // re-read).
    mount({}, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    // the door closes and the fresh card's zoom opens (never a hijack
    // to a stale row)
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close picker" })).toBeNull();
    }, { timeout: 5000 });
    await waitFor(() => {
      expect(document.querySelector('div[class*="zoomCard"]')).not.toBeNull();
    }, { timeout: 5000 });
  });

  test("a dead re-read still falls back (never a stuck door)", async () => {
    mount({ throws: [{ method: "bench/get", message: "bench gone" }] }, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Close picker" })).toBeNull();
    }, { timeout: 5000 });
  });

  test("a refused add voices label-first (the door stays for retry)", async () => {
    mount({ refusals: [{ method: "bench/add-stage", message: "rev moved" }] }, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    expect(await screen.findAllByText(/Lone: .*rev moved/, {}, { timeout: 5000 })).not.toHaveLength(0);
    // the door stays open for the retry
    expect(screen.queryByRole("button", { name: "Close picker" })).not.toBeNull();
  });

  test("a throwing add voices the fallback (never empty)", async () => {
    // the door throws the foreign number 42 verbatim (the old stub's
    // shape) — "Lone: add refused" voices, never an empty door.
    mount({ throws: [{ method: "bench/add-stage", value: 42 }] }, () => {
      doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    });
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    expect(await screen.findAllByText(/Lone: .*add refused/, {}, { timeout: 5000 })).not.toHaveLength(0);
  });
});

describe("the picker chrome — query, bands, and titles", () => {
  test("a query narrows to label, id, and genre (never the rest)", async () => {
    mount({}, () => {
      doors.catalog = {
        alpha: { label: "Alpha", genre: "image" },
        beta: { label: "Beta", genre: "audio" },
      };
    });
    await openPicker();
    await screen.findByRole("button", { name: "Alpha" }, { timeout: 5000 });
    const search = screen.getByRole("textbox", { name: "Search cards" });
    fireEvent.change(search, { target: { value: "alp" } });
    expect(screen.queryByRole("button", { name: "Alpha" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Beta" })).toBeNull();
    fireEvent.change(search, { target: { value: "audio" } });
    expect(screen.queryByRole("button", { name: "Beta" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
  });

  test("motion bands with 3d, the genreless with Other (one section each)", async () => {
    mount({}, () => {
      doors.catalog = {
        clip: { label: "Clip", genre: "motion" },
        stray: { label: "Stray", genre: "" },
      };
    });
    await openPicker();
    await screen.findByRole("button", { name: "Clip" }, { timeout: 5000 });
    const titles = Array.from(document.querySelectorAll("h4")).map((el) => el.textContent);
    expect(titles.filter((t) => t === "3d")).toHaveLength(1);
    expect(titles.filter((t) => t === "Other")).toHaveLength(1);
    expect(titles.some((t) => t === "Motion")).toBe(false);
  });

  test("a described card titles long, a bare card titles short", async () => {
    mount({}, () => {
      doors.catalog = {
        told: { label: "Told", genre: "image", description: "does things" },
        bare: { label: "Bare", genre: "image" },
      };
    });
    await openPicker();
    const told = await screen.findByRole("button", { name: "Told" }, { timeout: 5000 });
    const bare = screen.getByRole("button", { name: "Bare" });
    expect(told.getAttribute("title")).toBe("Told — does things");
    expect(bare.getAttribute("title")).toBe("Bare");
  });
});
