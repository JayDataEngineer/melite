// flows-card-default-parity.spec.ts — THE ONE-HOME-FOR-FLOW-DEFAULTS
// WALL (audit 015 C2, flows tier `flow.card-default-parity`): the
// flow registry is not a second default-write into card param seats.
// The card/decl owns every knob default; a flow stage carries a value
// on a card-defaulted seat only when it EQUALS the card's declared
// default, and no flow face may publish a divergent number. The burn
// the audit rode: agent music composed 120 s while the music card
// defaults 30; flow-driven tts/image takes locked to seed 42 while
// the cards default -1 (a fresh mint per take).
//
// DEPTH: both sides derive LIVE — the flow side from the seed rows
// (seedFlowsSeat, the real registry literal) and the card side from
// the REAL card definitions (loadCardDefs, the same defs cache every
// per-request door serves), each default read off the card's own
// schemastery resolve (the walk compose itself runs for absent
// params). No census literal appears in any expectation; the
// non-vacuity canaries name seats, never numbers.
//
// ARMS (ENFORCEMENT: each invariant fires on its own path):
//   ARM 1 — stage stamps: every scalar stage-param stamp on a
//           card-defaulted seat equals the card default (the sweep
//           that reds a reintroduced `duration: 120` / `seed: 42`).
//   ARM 2 — the tool face: every row tool property that publishes a
//           default onto a card-defaulted overlay seat publishes the
//           card's number (or none — the card's own default rules).
//   ARM 3 — the leaf face: no flows/<id>/tool.json description or
//           SKILL.md knob line teaches a numeric default the row does
//           not publish (the duplicated literal home stays dead).
//
// Package-local home note: the wall lands beside the registry it
// judges; the registry row's wall.spec names this file (the
// contracts-registry wall's accounting arm covers it through the
// row, not the walls-tier suite sweep).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { seedFlowsSeat } from "../src/flowsData.ts";

const REPO: string = new URL("../../../..", import.meta.url).pathname;
const SEAT = seedFlowsSeat();

// The leaf JSON's structural read (same narrow-parse shape the
// flows-wiring leaf arm rides — no unknown-valued assertions).
interface LeafPropertyCell {
  description?: unknown;
}
interface LeafShape {
  description?: unknown;
  params_schema?: { properties?: Record<string, LeafPropertyCell> } | undefined;
}

// The row publishes nothing for a param → the sentinel, so a
// published `null`/`0` default still compares honestly.
const ABSENT: unique symbol = Symbol("no published default");

// Numeric default claims, attributed to their param:
//  - DEFAULT_NUM: inside one property description ("default 42, range …").
//  - KNOB_CLAIM: the tool.json top description's knob list
//    ("seed (optional, default 42) — …").
//  - BULLET_CLAIM: a SKILL.md knob line ("`seed` (optional, default
//    42)" and "The `seed` default (42) stamps …").
const DEFAULT_NUM = /default (-?\d+(?:\.\d+)?)/g;
const KNOB_CLAIM = /([\w-]+)\s*\((?:required|optional)[^)]*?default (-?\d+(?:\.\d+)?)/g;
const BULLET_CLAIM = /`([\w-]+)`[^`\n]{0,80}?default \((-?\d+(?:\.\d+)?)\)/g;

/** The card's declared defaults, read off its own schemastery walk:
 *  `def.schema({})` is exactly the resolve compose runs for absent
 *  params, so `declared`/`of` answer "what does the card's own
 *  default rule set this seat to" from the door's own machinery.
 *  @param defs the real card definitions (loadCardDefs' cache)
 *  @param cardId the stage's card id (loud on an unknown card)
 *  @returns the declared-default read face for that card */
function defaultsOf(defs: ReadonlyMap<string, CardDefinition>, cardId: string): {
  declared(key: string): boolean;
  of(key: string): unknown;
} {
  const def = defs.get(cardId);
  assert.ok(def, `card '${cardId}' named by a flow stage is not registered — the wall judges real cards only`);
  let walk: Record<string, unknown>;
  try {
    walk = def.schema({});
  } catch (e) {
    throw new Error(
      `default derivation for card '${cardId}' threw — the wall cannot judge what the card's own resolve refuses: ` +
        String(e instanceof Error ? e.message : e),
    );
  }
  return {
    declared: (key: string): boolean => walk[key] !== undefined,
    of: (key: string): unknown => walk[key],
  };
}

let defs: ReadonlyMap<string, CardDefinition>;
beforeAll(async (): Promise<void> => {
  defs = await loadCardDefs();
});

describe("THE ONE-HOME-FOR-FLOW-DEFAULTS WALL (audit 015 C2 — the registry derives or deletes, never stamps)", () => {
  it("serves a non-empty registry and real card defs to judge against", () => {
    assert.ok(SEAT.names().length > 0, "the flow registry is empty — the wall would judge nothing");
    assert.ok(defs.size > 0, "loadCardDefs returned no card definitions — the card side of the parity walk is dead");
  });

  it("ARM 1 — every flow stage stamp on a card-defaulted seat EQUALS the card's declared default (zero divergent seats)", () => {
    const failures: string[] = [];
    const judged: string[] = [];
    for (const name of SEAT.names()) {
      const row = SEAT.get(name);
      if (row === undefined) continue;
      for (const st of row.stages) {
        // Family/engine stages carry no card seats (the either/or row
        // contract); only card stages can restate a card default.
        if (st.card === "") continue;
        const defaults = defaultsOf(defs, st.card);
        for (const [key, value] of Object.entries(st.params)) {
          // Wired $spells are links, not values; non-scalars are
          // carriers (bags/structs), not default-writes.
          if (typeof value === "string" && value.startsWith("$")) continue;
          if (typeof value !== "number" && typeof value !== "string" && typeof value !== "boolean") continue;
          // A stamp on a knob the card pre-sets nothing for is an
          // authored fixed value (e.g. the instrumental lyric), not a
          // second default home.
          if (!defaults.declared(key)) continue;
          judged.push(`${name}/${st.id}/${key}`);
          if (!Object.is(value, defaults.of(key))) {
            failures.push(
              `${name}: stage '${st.id}' stamps ${key}=${JSON.stringify(value)} but the ${st.card} card's declared default is ` +
                `${JSON.stringify(defaults.of(key))} — the card is the ONE home for the default (audit 015 C2): ` +
                "delete the stamp and let the card's own default rule",
            );
          }
        }
      }
    }
    console.log(`stage-stamp parity roster (stamps judged against card defaults): ${judged.sort().join(", ") || "(none)"}`);
    // Non-vacuity canaries: the sweep must actually WALK
    // declared-default seats — the minted music seed the row keeps
    // and the rig template values (seats, never numbers).
    for (const canary of ["music-native/music/seed", "body-to-somax/rig/mode"]) {
      assert.ok(
        judged.includes(canary),
        `the sweep never judged ${canary} — the derivation broke (a wall that walks nothing proves nothing)`,
      );
    }
    assert.ok(judged.length > 0, "no stage stamp was judged against a card default — the derivation broke");
    assert.deepEqual(failures, [], "flow stages stamping divergent card defaults:\n" + failures.join("\n"));
  });

  it("ARM 2 — every tool-published default on a card-defaulted overlay seat EQUALS the card's declared default", () => {
    const failures: string[] = [];
    const walked: string[] = [];
    for (const name of SEAT.names()) {
      const row = SEAT.get(name);
      if (row === undefined || row.tool === null) continue;
      for (const ov of row.tool.overlays) {
        const stage = row.stages.find((s) => s.id === ov.stage);
        if (stage === undefined || stage.card === "") continue;
        const key: string = ov.path[0] ?? "";
        if (key === "") continue;
        walked.push(`${name}:${ov.param}->${stage.id}/${key}`);
        const prop = row.tool.properties[ov.param];
        // No published default → the card's own default rules; the
        // overlay still carries a stated value when the caller names
        // one. Nothing published, nothing to fight the card.
        if (prop === undefined || !prop.hasDefault) continue;
        const defaults = defaultsOf(defs, stage.card);
        // A seat the card pre-sets nothing for (the model pick is a
        // rider; width/height have no declared default) is the flow's
        // own contract — the flow tool may default its own param.
        if (!defaults.declared(key)) continue;
        if (!Object.is(prop.default, defaults.of(key))) {
          failures.push(
            `${name}: tool '${row.tool.name}' publishes ${ov.param} default ${JSON.stringify(prop.default)} onto ` +
              `${stage.id}/${key}, but the ${stage.card} card's declared default is ${JSON.stringify(defaults.of(key))} — ` +
              "a published default is a default-write (audit 015 C2): publish the card's number or none",
          );
        }
      }
    }
    console.log(`tool-face overlay roster (walked): ${walked.sort().join(", ")}`);
    // Non-vacuity canaries: the walk must reach the seats the cure
    // de-defaulted, so a derivation break cannot fake an empty
    // failure set (the seat names, never numbers).
    for (const canary of ["audio-native-tts:seed->tts/seed", "music-native:duration->music/duration", "image-upscale:seed->make/seed"]) {
      assert.ok(walked.includes(canary), `the overlay walk never reached ${canary} — the derivation broke`);
    }
    assert.deepEqual(failures, [], "tool faces publishing divergent card defaults:\n" + failures.join("\n"));
  });

  it("ARM 3 — no flow leaf teaches a numeric default the row does not publish (the duplicated literal home stays dead)", () => {
    const failures: string[] = [];
    const scanned: string[] = [];
    let claims = 0;
    let propsSeen = 0;
    for (const name of SEAT.names()) {
      const row = SEAT.get(name);
      if (row === undefined) continue;
      const dir = join(REPO, "flows", name);
      const leafPath = join(dir, "tool.json");
      if (!existsSync(leafPath)) continue;
      scanned.push(name);
      const judge = (param: string, claim: number, where: string): void => {
        claims++;
        const prop = row.tool?.properties[param];
        const published: unknown =
          prop !== undefined && prop.hasDefault ? prop.default : ABSENT;
        if (published === ABSENT || !Object.is(claim, published)) {
          failures.push(
            `${name}: ${where} teaches '${param}' default ${claim} but the row publishes ` +
              (published === ABSENT
                ? "no default (the card's own default rules — audit 015 C2)"
                : `default ${String(published)}`),
          );
        }
      };
      const leaf = JSON.parse(readFileSync(leafPath, "utf8")) as LeafShape;
      const top = typeof leaf.description === "string" ? leaf.description : "";
      for (const m of top.matchAll(KNOB_CLAIM)) {
        judge(m[1]!, Number(m[2]!), "tool.json description");
      }
      for (const [key, cell] of Object.entries(leaf.params_schema?.properties ?? {})) {
        const desc = cell !== null && typeof cell.description === "string" ? cell.description : "";
        if (desc !== "") propsSeen++;
        for (const m of desc.matchAll(DEFAULT_NUM)) {
          judge(key, Number(m[1]!), `tool.json params_schema.${key}`);
        }
      }
      const skillPath = join(dir, "SKILL.md");
      if (existsSync(skillPath)) {
        const text = readFileSync(skillPath, "utf8");
        for (const m of text.matchAll(BULLET_CLAIM)) {
          judge(m[1]!, Number(m[2]!), "SKILL.md");
        }
      }
    }
    console.log(
      `leaf default-claim scan: ${claims} numeric claim(s), ${propsSeen} property description(s) read ` +
        `across ${scanned.length} leaf/row pairs (${scanned.sort().join(", ")})`,
    );
    // Non-vacuity: the scan must read the three cured leaves and see
    // real property text — a scan over nothing proves nothing.
    for (const canary of ["music-native", "audio-native-tts", "image-upscale"]) {
      assert.ok(scanned.includes(canary), `the leaf scan never read flows/${canary}/ — the walk broke`);
    }
    assert.ok(propsSeen > 0, "no leaf property description was read — the scan is walking empty leaves");
    assert.deepEqual(failures, [], "flow leaves teaching defaults the rows do not publish:\n" + failures.join("\n"));
  });
});
