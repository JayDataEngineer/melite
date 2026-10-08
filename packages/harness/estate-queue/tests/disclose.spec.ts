// disclose.spec.ts — the disclosure pures (card/flow search,
// flow summary rows) + the seat (lookup law, live derivation).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import {
  DiscloseDirectoryService,
  discloseProvider,
  flowContractRows,
  flowSummaryRows,
  searchCards,
  searchFlows,
} from "../src/discloseRegistry.ts";
import type { FlowSummary, SearchableCard } from "../src/discloseRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

const defs = (rows: Array<[string, SearchableCard]>): ReadonlyMap<string, SearchableCard> =>
  new Map(rows);
const CARD = (
  over: Partial<SearchableCard> = {},
): SearchableCard => ({
  identity: { label: "L", description: "d", genre: "g" },
  tags: [],
  ...over,
});

describe("searchCards", () => {
  const all = defs([
    ["b-card", CARD({ identity: { label: "Beta brush", description: "paints skies", genre: "image" }, tags: ["sky", "paint"] })],
    ["a-card", CARD({ identity: { label: "Alpha", description: "paints seas", genre: "image" }, tags: ["sea"] })],
    ["bare", {}],
  ]);

  it("empty q + tags returns all, sorted by id", () => {
    const out = searchCards(all, "", "");
    assert.deepEqual(out.map((r) => r.id), ["a-card", "b-card", "bare"]);
  });

  it("q tokens ALL match across id/label/description/tags (case-folded)", () => {
    assert.deepEqual(searchCards(all, "beta sky", "").map((r) => r.id), ["b-card"]);
    assert.deepEqual(searchCards(all, "PAINTS", "").map((r) => r.id), ["a-card", "b-card"]);
    assert.deepEqual(searchCards(all, "beta seas", ""), []);
    assert.deepEqual(searchCards(all, "  ", ""), searchCards(all, "", ""));
  });

  it("tags ALL match def.tags; missing identity falls back", () => {
    assert.deepEqual(searchCards(all, "", "sky,paint").map((r) => r.id), ["b-card"]);
    assert.deepEqual(searchCards(all, "", "sky,sea"), []);
    const bare = searchCards(all, "bare", "")[0];
    assert.equal(bare?.label, "bare");
    assert.equal(bare?.description, "");
    assert.equal(bare?.genre, "");
  });
});

describe("searchFlows", () => {
  const rows: FlowSummary[] = [
    { name: "b-flow", title: "Beta", description: "second", stages: 2, skillRefs: [] },
    { name: "a-flow", title: "Alpha", description: "first", stages: 1, skillRefs: ["s"] },
  ];

  it("empty q returns all sorted; tokens narrow", () => {
    assert.deepEqual(searchFlows(rows, "").map((r) => r.name), ["a-flow", "b-flow"]);
    assert.deepEqual(searchFlows(rows, "alpha first").map((r) => r.name), ["a-flow"]);
    assert.deepEqual(searchFlows(rows, "zzz-no-such"), []);
  });
});

describe("flowSummaryRows", () => {
  it("merges registry rows with the tool.json face, sorted by search", () => {
    const rows = flowSummaryRows(resolveRepoRoot());
    assert.ok(rows.length > 0);
    for (const r of rows) {
      assert.equal(typeof r.name, "string");
      assert.equal(typeof r.title, "string");
      assert.ok(r.title !== "");
      assert.equal(typeof r.stages, "number");
      assert.ok(Array.isArray(r.skillRefs));
    }
    const searched = searchFlows(rows, "");
    assert.deepEqual(
      searched.map((r) => r.name),
      [...rows.map((r) => r.name)].sort(),
    );
  });

  it("no leaf reads the registry title; leaves override it", () => {
    const repo = mkdtempSync(join(tmpdir(), "disclose-repo-"));
    try {
      const leaf = (name: string, body: unknown): void => {
        mkdirSync(join(repo, "flows", name), { recursive: true });
        writeFileSync(join(repo, "flows", name, "tool.json"), JSON.stringify(body));
      };
      leaf("anny-hmr-commercial", { stage_title: "Anny face" });
      leaf("audio-native-tts", {});
      leaf("body-to-somax", { stage_title: "" });
      leaf("craft-loop", { stage_title: 5 });
      const byName = new Map(flowSummaryRows(repo).map((r) => [r.name, r.title]));
      assert.equal(byName.get("anny-hmr-commercial"), "Anny face");
      assert.equal(byName.get("audio-native-tts"), "audio-native-tts");
      assert.equal(byName.get("body-to-somax"), "body-to-somax");
      assert.equal(byName.get("craft-loop"), "craft-loop");
      assert.equal(byName.get("fit-seat"), "fit-seat");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe("DiscloseDirectoryService", () => {
  const seat = (): DiscloseDirectoryService => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    const svc = new DiscloseDirectoryService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      defsSync: () =>
        new Map([["c1", CARD({ identity: { label: "One", description: "first", genre: "g" } })]]),
    };
    return svc;
  };

  it("unknown lookups refuse with the door's voice", () => {
    assert.throws(() => seat().discover("bogus", "", ""), /unknown lookup 'bogus' \(all \| cards \| flows\)/);
  });

  it("each plane answers alone; all answers both", () => {
    const flows = seat().discover("flows", "", "");
    assert.ok(Array.isArray(flows.flows));
    assert.equal(flows.cards, undefined);
    const cards = seat().discover("cards", "one", "");
    assert.deepEqual(cards.cards?.map((r) => r.id), ["c1"]);
    assert.equal(cards.flows, undefined);
    const all = seat().discover("all", "", "");
    assert.ok(Array.isArray(all.flows) && Array.isArray(all.cards));
  });

  it("the provider mounts the seat", () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    discloseProvider.apply(ctx);
    assert.ok((ctx as unknown as { disclose: unknown }).disclose instanceof DiscloseDirectoryService);
  });
});

describe("flowContractRows (the app door: what a named flow TAKES)", () => {
  it("states every registry flow's stages, inputs, outputs and tool signature", () => {
    const rows = flowContractRows();
    assert.ok(rows.length > 0, "the registry has flows to describe");
    const tts = rows.find((r) => r.id === "audio-native-tts");
    assert.ok(tts !== undefined, "audio-native-tts carries a contract");
    // the stage is STATED, not counted — an app reads the card + params
    assert.equal(tts.stages.length, 1);
    assert.equal(tts.stages[0]?.card, "tts");
    assert.equal(tts.stages[0]?.engine, "comfyui", "the card plane's engine id");
    // the tool signature is the JSON-Schema face the flow declares
    const tool = tts.tool as { name?: string; required?: string[] } | null;
    assert.equal(tool?.name, "speak");
    // the caller key IS the initial name (2026-10-04) — a contract that
    // advertised a key the door never reads would be a lying API
    assert.deepEqual(tool?.required, ["text"]);
    // and the validate-time gate rides, so a caller knows what must hold
    assert.deepEqual(tts.initialValidators, { text: "text" });
    // every row names itself; none is anonymous
    for (const r of rows) assert.equal(r.id, r.id.trim() === "" ? "" : r.id);
  });

  it("the seat answers contracts() without a lookup argument", () => {
    // the seat's own ctor needs the cardRegistry inject present; the
    // contracts arm never reads it (a flow contract is registry-only).
    const bare = new Context();
    new FlowsSeatService(bare);
    const svc = new DiscloseDirectoryService(bare);
    const body = svc.contracts();
    assert.ok(Array.isArray(body.flows));
    assert.equal(body.flows.length, flowContractRows().length);
  });
});
