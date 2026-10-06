// real-card-wire.spec.ts — A WIRE, BUILT FROM REAL CARDS (2026-10-11)
//
// The seam hunt found this. Every wire wall in the tree composes
// HAND-MADE graphs: `planMerge` is driven with `{save: {class_type:
// "SaveImage"}}` fixtures, and the bench/queue walls drive a fake
// engine or a two-node stub. So the two halves are each proven and
// the join between them is proven by nothing:
//
//   - "a card stage composes to a graph with a producer" is asserted
//     against a stub the test wrote;
//   - "a wire naming a channel resolves to a link" is asserted
//     against a stub the test wrote.
//
// If a real card's composed graph had no Save node, or two of them,
// or a channel name the bench's stored wires do not use, EVERY wired
// bench would die at merge with "produces no such channel" or
// "ambiguous producers" — and the entire suite would stay green,
// because the two stubs agree with each other and neither is a card.
//
// This file closes that join with REAL graphs: the compose door
// (`cli.ts compose`) spawns for real, over the real model facts, and
// the resulting graphs go through the REAL merge planner.
//
// NOTHING HERE IS HAND-TYPED. The channel under test is read out of
// the producing card's own source, so renaming a card's output
// channel moves the wall with the rename rather than breaking it —
// which is correct, because the law is not "the channel is called
// default" but "a wire naming a channel the card DECLARES resolves
// to a node that EXISTS".
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { planMerge } from "../../../../packages/engines/comfyui-cordis/src/comfyui-merge.ts";
import type { MergeRow } from "../../../../packages/engines/comfyui-cordis/src/comfyui-merge.ts";
import { cardPackages } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

const FACTS = "packages/engines/comfyui-cordis/data/model-facts.json";
const CLI = "packages/engines/comfyui-cordis/src/cli.ts";

/** The REAL compose door, spawned: graph JSON on stdout, a refusal on
 *  stderr with exit 1. The same door cli.spec.ts drives — this is the
 *  production path a bench run takes, not a mock of it. */
const compose = (card: string, model: string, params: Record<string, unknown>): Record<string, unknown> => {
  const r = spawnSync(
    "node",
    ["--experimental-strip-types", "--no-warnings", CLI, "compose",
     "--facts", FACTS, "--card", card, "--model", model, "--params", JSON.stringify(params)],
    { encoding: "utf8", timeout: 240_000, maxBuffer: 64 * 1024 * 1024 },
  );
  assert.equal(r.status, 0, `compose ${card} refused: ${r.stderr}`);
  return JSON.parse(r.stdout) as Record<string, unknown>;
};

/** The output channels a card DECLARES, read from the card package's
 *  own source. Derived, never a hand-copied "default". */
const declaredOutputs = (cardPkg: string): string[] => {
  const src = readFileSync(`packages/image/${cardPkg}/src/card.ts`, "utf8");
  const m = /outputs:\s*\{([^}]*)\}/.exec(src);
  assert.ok(m !== null, `${cardPkg} declares no outputs map`);
  return (m[1] as string)
    .split(",")
    .map((s) => s.split(":")[0]?.trim() ?? "")
    .filter((s) => s.length > 0);
};

/** EVERY card's output channels, keyed by the card id the bench
 *  stores. The card id → package path is derived from cardPackages
 *  (`@melite/<genre>-<pkg>/card`), never a hand-written table — the
 *  same derivation cards-registration.spec uses. */
const declaredByCardId = (): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const specifier of cardPackages) {
    const noScope = specifier.replace(/^@melite\//, "").replace(/\/card$/, "");
    const at = noScope.indexOf("-");
    const genre = noScope.slice(0, at);
    const pkg = noScope.slice(at + 1);
    let src = "";
    try {
      src = readFileSync(`packages/${genre}/${pkg}/src/card.ts`, "utf8");
    } catch {
      continue; // a card with no single card.ts declares its outputs elsewhere
    }
    const m = /outputs:\s*\{([^}]*)\}/.exec(src);
    if (m === null) continue;
    out.set(
      pkg,
      (m[1] as string).split(",").map((s) => s.split(":")[0]?.trim() ?? "").filter((s) => s.length > 0),
    );
  }
  return out;
};

/** A MergeRow exactly as composeBenchStages builds one: the composed
 *  graph as the workflow, the declared channels as the outputs, and
 *  NO output_nodes — so producer inference runs the way it runs for a
 *  card stage that names no explicit producer. */
const stageRow = (
  stageId: string,
  workflow: Record<string, unknown>,
  outputs: Record<string, string>,
  inputs?: Record<string, unknown>,
): MergeRow =>
  ({
    stageId,
    workflow,
    params: {},
    outputs,
    outputNodes: {},
    ...(inputs === undefined ? {} : { inputs }),
  }) as unknown as MergeRow;

/** EVERY `$spell` in a graph, with where it sits. The wall asserts
 *  on the substituted value at each of these sites. */
const spellSites = (graph: Record<string, unknown>): Array<{ node: string; slot: string; value: unknown }> => {
  const sites: Array<{ node: string; slot: string; value: unknown }> = [];
  for (const [nid, node] of Object.entries(graph)) {
    const ins = (node as { inputs?: unknown }).inputs;
    if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
    for (const [slot, value] of Object.entries(ins as Record<string, unknown>)) {
      if (typeof value === "string" && value.startsWith("$")) sites.push({ node: nid, slot, value });
    }
  }
  return sites;
};

describe("a wire between REAL composed cards resolves to a node that EXISTS", () => {
  it("the producing card declares a channel AND composes exactly one producer", () => {
    const channels = declaredOutputs("image-gen");
    assert.deepEqual(channels, ["default"], "image-gen declares its image channel (derived from source)");
    const graph = compose("image-gen", "z-image", { prompt: "a harbour at dusk" });
    const saves = Object.entries(graph).filter(([, n]) =>
      String((n as { class_type?: string }).class_type ?? "").startsWith("Save"));
    // Ambiguity is the failure this whole class has: a card with two
    // Save nodes makes EVERY wire to it refuse with "ambiguous
    // producers", and a card with none makes every wire refuse with
    // "produces no such channel". Exactly one is the only workable count.
    assert.equal(saves.length, 1,
      `image-gen composes ${saves.length} Save nodes (${JSON.stringify(saves.map(([k]) => k))}) — ` +
      "producer inference is unambiguous only at exactly one");
  });

  it("the consuming card's spell rides its REAL graph (nothing drops it at compose)", () => {
    const graph = compose("image-edit", "qwen-img-edit-2511", {
      prompt: "zoom out",
      input_images: "$input_images",
    });
    const sites = spellSites(graph);
    assert.ok(sites.length > 0,
      "image-edit composed with NO $spell — the wire would have nothing to substitute, " +
      "and the bench would accept a stage that composes to an unwired image");
    // every spell in the real graph must be one the BENCH can name
    for (const s of sites) {
      assert.equal(s.value, "$input_images",
        `image-edit carries an unexpected spell ${JSON.stringify(s.value)} at ${s.node}.${s.slot} — ` +
        "a channel the bench door has no spelling for cannot be wired");
    }
  });

  // Both REAL-compose arms spawn the CLI twice (node
  // --experimental-strip-types, a 240s internal spawn budget). Their
  // idle cost is ~1s, but under the full battery's import/transform
  // storm the spawns' tail crosses the 30s default test timeout
  // while the subprocesses are still healthy — the budget names the
  // spawn reality, the same law dep-doctor's wall already carries.
  it("THE WHOLE WIRE: real image-gen → real image-edit, through the real merge", () => {
    const genChannels = declaredOutputs("image-gen");
    const genGraph = compose("image-gen", "z-image", { prompt: "a harbour at dusk" });
    const editGraph = compose("image-edit", "qwen-img-edit-2511", {
      prompt: "zoom out",
      input_images: "$input_images",
    });

    // The bench's own two rows, built the way composeBenchStages and
    // runsStart build them: the channel the producer declares, the
    // edge {stage, output}, and the input map that edge compiles to.
    const channel = genChannels[0] as string;
    const rows = [
      stageRow("s_0", genGraph, { [channel]: "image" }),
      stageRow("s_1", editGraph, { default: "image" }),
    ];
    const inputNames = { s_0: {}, s_1: { input_images: `s_0.${channel}` } };

    const plan = planMerge(rows, {}, inputNames);

    // 1. every spell became a LINK (no `$` survives into the merged graph)
    for (const [key, node] of Object.entries(plan.workflow)) {
      const ins = (node as { inputs?: Record<string, unknown> }).inputs;
      if (typeof ins !== "object" || ins === null) continue;
      for (const [slot, value] of Object.entries(ins)) {
        assert.ok(
          typeof value !== "string" || !value.startsWith("$"),
          `merged node ${key}.${slot} still carries the spell ${JSON.stringify(value)} — ` +
          "the wire did not substitute",
        );
      }
    }
    // 2. the substituted value is a link tuple landing on a REAL node.
    //    A real card graph is FULL of intra-stage links (every
    //    CLIPLoader→VAELoader hop is a tuple), so the cross-stage wire
    //    is the one whose target leaves the consuming stage — not the
    //    first tuple found, which would be an internal hop and prove
    //    nothing about the bench's edge.
    const linked: Array<{ at: string; target: string }> = [];
    for (const [key, node] of Object.entries(plan.workflow)) {
      const ins = (node as { inputs?: Record<string, unknown> }).inputs;
      if (typeof ins !== "object" || ins === null) continue;
      for (const [slot, value] of Object.entries(ins)) {
        if (Array.isArray(value) && typeof value[0] === "string" && typeof value[1] === "number") {
          linked.push({ at: `${key}.${slot}`, target: value[0] });
        }
      }
    }
    const crossed = linked.find((l) => l.at.startsWith("s_1::") && !l.target.startsWith("s_1::"));
    assert.ok(crossed !== undefined,
      "the consuming stage substituted NO link that leaves it — the real cards did not wire " +
      `(all of s_1's links: ${JSON.stringify(linked.filter((l) => l.at.startsWith("s_1::")))})`);
    assert.ok(
      Object.prototype.hasOwnProperty.call(plan.workflow, crossed.target),
      `s_1 wired to ${crossed.target}, which is NOT a node in the merged graph ` +
      `(keys: ${Object.keys(plan.workflow).join(", ")}) — a producer link must land on a real node`,
    );
    // 3. and it is the PRODUCER's node, not something from the consumer
    assert.ok(crossed.target.startsWith("s_0::"),
      `s_1's input resolved to ${crossed.target}, which is not in the producing stage s_0`);
  }, 120_000);

  it("the BACKWARD arrangement of the same two real cards ALSO resolves", () => {
    // The li-aw defect was proved on hand-made graphs. This pins it on
    // REAL ones: if a future change made position load-bearing again,
    // a hand-made fixture would keep passing and the operator's own
    // bench would break.
    const genGraph = compose("image-gen", "z-image", { prompt: "a harbour at dusk" });
    const editGraph = compose("image-edit", "qwen-img-edit-2511", {
      prompt: "zoom out",
      input_images: "$input_images",
    });
    const channel = (declaredOutputs("image-gen")[0]) as string;
    // the CONSUMER first this time
    const plan = planMerge(
      [
        stageRow("s_1", editGraph, { default: "image" }),
        stageRow("s_0", genGraph, { [channel]: "image" }),
      ],
      {},
      { s_1: { input_images: `s_0.${channel}` } },
    );
    const crossed = Object.entries(plan.workflow).some(([key, node]) => {
      if (!key.startsWith("s_1::")) return false;
      const ins = (node as { inputs?: Record<string, unknown> }).inputs;
      if (typeof ins !== "object" || ins === null) return false;
      // a link that LEAVES s_1 is the bench's edge; the real card's
      // own internal hops stay inside it
      return Object.values(ins).some(
        (v) => Array.isArray(v) && typeof v[0] === "string" && v[0].startsWith("s_0::"),
      );
    });
    assert.ok(crossed, "the backward arrangement of two REAL cards did not resolve");
  }, 120_000);
});

// ── THE RENAMED CHANNEL (the arm the derived arms above cannot be) ─
//
// The two whole-wire arms DERIVE the channel from the card, which is
// right for "a wire naming a declared channel resolves" — and exactly
// wrong for the operator's real exposure. A bench on disk stores the
// channel as TEXT. Rename a card's `default` to `picture` and those
// stored wires stop resolving — every one of them, silently, at run
// time — while a derived arm happily follows the rename and stays
// green. Verified: renaming image-gen's channel reddened only the
// literal arm above.
//
// So the law that actually needs pinning is the CROSS one: every
// channel the STORE has wired must be a channel the PRODUCING CARD
// still declares. The bench and the card are two files written by two
// different hands, and nothing joined them.
describe("every channel the STORE has wired is still DECLARED by the card that produces it", () => {
  const storeDir = join(homedir(), ".dsh", "storages", "drafts", "docs");

  /** Every wire the real store holds, as (producing card, channel,
   *  the bench file it came from). Compound rows are descended: a
   *  group holds children with their own cards and wires, and a walk
   *  that skipped them would under-count and pass vacuously. */
  const storedWires = (): Array<{ card: string; channel: string; file: string }> => {
    if (!existsSync(storeDir)) return [];
    const found: Array<{ card: string; channel: string; file: string }> = [];
    for (const file of readdirSync(storeDir)) {
      if (!file.endsWith(".json")) continue;
      let doc: unknown;
      try {
        doc = JSON.parse(readFileSync(join(storeDir, file), "utf8"));
      } catch {
        continue;
      }
      // the store's own envelope: {version, record: {doc: {…}}}
      const rec = doc as { record?: { doc?: { stages?: unknown } } };
      const stages = rec?.record?.doc?.stages;
      if (!Array.isArray(stages)) continue;
      const byId = new Map<string, string>();
      const rows: Array<Record<string, unknown>> = [];
      for (const s of stages) {
        if (typeof s !== "object" || s === null) continue;
        const row = s as Record<string, unknown>;
        rows.push(row);
        if (typeof row["id"] === "string" && typeof row["card"] === "string") {
          byId.set(row["id"], row["card"]);
        }
        if (Array.isArray(row["children"])) {
          for (const c of row["children"] as unknown[]) {
            if (typeof c !== "object" || c === null) continue;
            const child = c as Record<string, unknown>;
            if (typeof child["id"] === "string" && typeof child["card"] === "string") {
              byId.set(child["id"], child["card"]);
            }
          }
        }
      }
      const all = [...rows, ...rows.flatMap((r) =>
        Array.isArray(r["children"]) ? (r["children"] as Array<Record<string, unknown>>) : [])];
      for (const row of all) {
        const ins = row["inputs"];
        if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
        for (const ref of Object.values(ins as Record<string, unknown>)) {
          const r = ref as Record<string, unknown>;
          if (typeof r?.["stage"] !== "string" || typeof r["output"] !== "string") continue;
          const card = byId.get(r["stage"]);
          if (card === undefined) continue; // a phantom: the serve gate's voice, not this law
          found.push({ card, channel: r["output"], file });
        }
      }
    }
    return found;
  };

  it("every stored wire's channel is DECLARED by the card that produces it", () => {
    // THE TRACKED RECEIPT + the live store, unioned. The receipt is
    // what makes this arm bite on a fresh clone (no store, no data);
    // the live store is what keeps it honest where one exists. A
    // channel that appears in EITHER must be declared by the card.
    const receipt = JSON.parse(
      readFileSync("tests/walls/fixtures/stored-wire-channels.json", "utf8"),
    ) as { channels: Record<string, string[]> };
    const byCard = new Map<string, Set<string>>();
    const note = (card: string, channel: string): void => {
      if (!byCard.has(card)) byCard.set(card, new Set());
      (byCard.get(card) as Set<string>).add(channel);
    };
    for (const [card, channels] of Object.entries(receipt.channels)) {
      for (const c of channels) note(card, c);
    }
    const wires = storedWires();
    for (const w of wires) note(w.card, w.channel);
    const declared = declaredByCardId();
    // The census is the point: an empty judgement proves nothing, so
    // the arm states how much it judged rather than passing silently.
    const judged = Object.values(receipt.channels).reduce((n, c) => n + c.length, 0) + wires.length;
    assert.ok(judged > 0,
      "this arm judged ZERO channels (no receipt, no store) — it would prove nothing; " +
      "the receipt is tracked, so a green here means the fixture is missing, not that the law holds");
    console.log(
      `real-card-wire: ${judged} channel(s) judged (${wires.length} from the live store, ` +
      `${judged - wires.length} from the tracked receipt) across ${byCard.size} card(s): ` +
      `${[...byCard].map(([c, s]) => `${c}:${[...s].join("|")}`).join(", ")}`,
    );
    for (const [card, channels] of byCard) {
      const have = declared.get(card);
      if (have === undefined) {
        // A card that declares its outputs somewhere other than a
        // single card.ts (a kit-composed card). Not this law's
        // business; naming it beats silently skipping it.
        console.log(`real-card-wire: ${card} declares outputs outside card.ts — not judged here`);
        continue;
      }
      for (const channel of channels) {
        assert.ok(have.includes(channel),
          `the store wires ${card}.${channel} (a real bench on disk) but ${card} now declares ` +
          `${JSON.stringify(have)} — every stored wire naming "${channel}" dies at run time with ` +
          '"produces no such channel". The bench and the card are two files; nothing joined them.');
      }
    }
  });

  it("EVERY card that declares outputs declares a NON-EMPTY channel set", () => {
    // The law that holds with no store present, so the arm above is
    // never the only thing standing here.
    const declared = declaredByCardId();
    assert.ok(declared.size > 0, "no card declared an outputs map — the derivation found nothing");
    for (const [card, channels] of declared) {
      assert.ok(channels.length > 0, `${card} declares an EMPTY outputs map — every wire to it is dead`);
    }
  });
});
