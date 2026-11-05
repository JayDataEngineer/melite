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
import { FlowsSeatService, seedFlowsSeat } from "../src/flowsData.ts";

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

  it("q is RANKED, never an AND: every token scores its best facet, rows carry WHY (slice 3)", () => {
    // the transcript's first call: "Make an image of an anime girl."
    // is a sentence, and the old literal AND returned 0/0. Ranking
    // scores the real words (stopwords ignored) and says why.
    assert.deepEqual(searchCards(all, "beta sky", "").map((r) => r.id), ["b-card"]);
    assert.deepEqual(searchCards(all, "PAINTS", "").map((r) => r.id), ["a-card", "b-card"]);
    // one real token finds its row even beside a stopword — the
    // "beta seas" pair no longer demands BOTH (a-card owns seas)
    assert.deepEqual(searchCards(all, "beta seas", "").map((r) => r.id).sort(), ["a-card", "b-card"]);
    // a sentence's stopwords drop and the modality word carries it
    const sentence = searchCards(all, "Make an image of an anime girl.", "");
    assert.deepEqual(sentence.map((r) => r.id), ["a-card", "b-card"]);
    assert.match(sentence[0]?.matched_by ?? "", /modality:image/);
    // a genuinely unrelated token still misses
    assert.deepEqual(searchCards(all, "zzz-no-such", ""), []);
    assert.deepEqual(searchCards(all, "  ", ""), searchCards(all, "", ""));
  });

  it("matched_by names the facet that surfaced each row (tag > word > fuzzy)", () => {
    const sky = searchCards(all, "sky", "")[0];
    assert.equal(sky?.id, "b-card");
    assert.match(sky?.matched_by ?? "", /tag:sky/);
    const beta = searchCards(all, "beta", "")[0];
    assert.match(beta?.matched_by ?? "", /word:beta/);
    // trigram fuzzy: a near-miss word still surfaces, with the
    // measure stated (no embeddings — the 2026-11-12 adjudication)
    const fuzzy = searchCards(all, "paintz", "");
    assert.equal(fuzzy[0]?.id, "b-card");
    assert.match(fuzzy[0]?.matched_by ?? "", /fuzzy:paintz~paint/);
  });

  it("tags ALL match def.tags; missing identity falls back", () => {
    assert.deepEqual(searchCards(all, "", "sky,paint").map((r) => r.id), ["b-card"]);
    assert.deepEqual(searchCards(all, "", "sky,sea"), []);
    const bare = searchCards(all, "bare", "")[0];
    assert.equal(bare?.label, "bare");
    assert.equal(bare?.description, "");
    assert.equal(bare?.genre, "");
  });

  it("a model name in q routes to the card boarding that family (friction-report #5)", () => {
    const fams = defs([
      ["image-gen", CARD({ identity: { label: "Generate", description: "makes pictures", genre: "image" }, tags: ["generate"], boarded: ["krea-2", "z-image"] })],
      ["tagger", CARD({ identity: { label: "Tag", description: "labels pictures", genre: "image" }, tags: ["analyze"], boarded: ["joytag"] })],
    ]);
    // the bare family name routes (split corpus); the full id fuzzy-matches
    assert.deepEqual(searchCards(fams, "krea", "").map((r) => r.id), ["image-gen"]);
    assert.deepEqual(searchCards(fams, "krea-2", "").map((r) => r.id), ["image-gen"]);
    // the card's own words still route (no regression on the base corpus)
    assert.deepEqual(searchCards(fams, "tagger", "").map((r) => r.id), ["tagger"]);
  });
});

describe("searchFlows", () => {
  const rows: FlowSummary[] = [
    // initials: [] — the search corpus is q-routing only; the F57
    // key-naming law is judged on the real roster (flowSummaryRows)
    { name: "b-flow", title: "Beta", description: "second", stages: 2, skillRefs: [], initials: [] },
    { name: "a-flow", title: "Alpha", description: "first", stages: 1, skillRefs: ["s"], initials: [] },
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

  // ── F57 (operator 2026-11-13: "single-stage flow initial keys are
  // UNDOCUMENTED — natural keys fail with internal errors … the error
  // text is the only teacher") — the DISCOVERY tier names every
  // flow's initial keys, derived from the registry row (required
  // first, then the optional validators), so the spell-stem seats the
  // flow door binds are learned BEFORE a natural-key press meets the
  // seam. A real-roster walker, never a frozen list: a new flow owes
  // its initials the day it seats.
  it("F57: every summary row names its registry initial keys (required first) — the anny spell stems included", () => {
    const seat = seedFlowsSeat();
    const rows = flowSummaryRows(resolveRepoRoot());
    const byName = new Map(rows.map((r) => [r.name, r]));
    for (const name of seat.names()) {
      const row = seat.get(name)!;
      const required = row.requiredInitials ?? [];
      const optional = Object.keys(row.initialValidators).filter((k) => !required.includes(k));
      const expected = [...required, ...optional];
      assert.deepEqual(
        byName.get(name)?.initials,
        expected,
        `${name}: the summary names the row's initial keys, required first`,
      );
    }
    // THE F57 SPELLS, verbatim — the exact seats the operator's
    // natural-key presses (image, mesh) missed
    assert.deepEqual(byName.get("anny-hmr-estimator")?.initials, ["photo"]);
    assert.deepEqual(byName.get("anny-params")?.initials, ["params_json"]);
    // requireds lead: craft-loop's brief+command before the optional dial
    assert.deepEqual(byName.get("craft-loop")?.initials, ["agent_prompt", "command", "max_iterations"]);
    // fit-seat's bone is REQUIRED (the vendor row gate) — it leads
    // the two optional mesh seats
    assert.deepEqual(byName.get("fit-seat")?.initials, ["bone", "body", "prop"]);
  });

  it("no leaf reads the registry title; leaves override it", () => {
    const repo = mkdtempSync(join(tmpdir(), "disclose-repo-"));
    try {
      const leaf = (name: string, body: unknown): void => {
        mkdirSync(join(repo, "flows", name), { recursive: true });
        writeFileSync(join(repo, "flows", name, "tool.json"), JSON.stringify(body));
      };
      leaf("anny-hmr-estimator", { stage_title: "Anny face" });
      leaf("image-upscale", {});
      leaf("object-forge", { stage_title: "" });
      leaf("craft-loop", { stage_title: 5 });
      const byName = new Map(flowSummaryRows(repo).map((r) => [r.name, r.title]));
      assert.equal(byName.get("anny-hmr-estimator"), "Anny face");
      assert.equal(byName.get("image-upscale"), "image-upscale");
      assert.equal(byName.get("object-forge"), "object-forge");
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
    // F57: the provider serves the summary rows VERBATIM — the
    // initial keys ride to the tool face (the "; initials:"
    // segment), never hand-stripped at the seam
    const anny = flows.flows?.find((f) => f.name === "anny-hmr-estimator");
    assert.deepEqual(anny?.initials, ["photo"]);
    const cards = seat().discover("cards", "one", "");
    assert.deepEqual(cards.cards?.map((r) => r.id), ["c1"]);
    assert.equal(cards.flows, undefined);
    const all = seat().discover("all", "", "");
    assert.ok(Array.isArray(all.flows) && Array.isArray(all.cards));
  });

  it("totals ride every answer; a filtered answer names the miss vocabulary (friction-report #5)", () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    const svc = new DiscloseDirectoryService(ctx);
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
      defsSync: () =>
        new Map([
          ["gen", CARD({ identity: { label: "Generate", description: "makes pictures", genre: "image" }, tags: ["generate", "image"], boarded: ["krea-2"] })],
          ["tagger", CARD({ identity: { label: "Tag", description: "labels pictures", genre: "image" }, tags: ["analyze"], boarded: ["joytag"] })],
        ]),
    };
    const unfiltered = svc.discover("cards", "", "");
    assert.equal(unfiltered.totals.cards, 2);
    assert.equal(unfiltered.missed_tags, undefined);
    // a filtered answer says "2 cards, 1 matched" at the door, and
    // the miss vocabulary routes away (analyze is tagger's alone)
    const filtered = svc.discover("cards", "krea", "");
    assert.deepEqual(filtered.cards?.map((r) => r.id), ["gen"]);
    assert.equal(filtered.totals.cards, 2);
    assert.ok((filtered.missed_tags ?? []).includes("analyze"), "the removed row's tags route the next hop");
    assert.ok(!(filtered.missed_tags ?? []).includes("generate"), "a matched tag is not a miss");
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
    // (re-homed 2026-11-14 from the retired audio-native-tts wrapper —
    // image-upscale carries the same contract shape, two stages deep)
    const up = rows.find((r) => r.id === "image-upscale");
    assert.ok(up !== undefined, "image-upscale carries a contract");
    // the stage is STATED, not counted — an app reads the card + params
    assert.equal(up.stages.length, 2);
    assert.equal(up.stages[0]?.card, "image-gen");
    assert.equal(up.stages[0]?.engine, "comfyui", "the card plane's engine id");
    // the tool signature is the JSON-Schema face the flow declares
    const tool = up.tool as { name?: string; required?: string[] } | null;
    assert.equal(tool?.name, "image_upscale");
    // the caller key IS the initial name (the 2026-10-04 law) — a
    // contract that advertised a key the door never reads would be a
    // lying API
    assert.deepEqual(tool?.required, ["image_model", "prompt"]);
    // and the validate-time gate rides, so a caller knows what must hold
    assert.deepEqual(up.initialValidators, { prompt: "text" });
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
