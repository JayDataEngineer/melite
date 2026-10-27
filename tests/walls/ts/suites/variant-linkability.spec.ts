// @contract models-variant-linkability
//
// THE LINKABILITY WALL (burn d, 2026-10-26). Operator, verbatim:
// "YOU HAVE SHIT THAT DOES NOT AUTO PROVISION WITH AN ALL GREEN
// PIPELINE! FUCK YOU. MANY KREA2 VARIANTS SAY 'MODEL ONLY ON DISK'.
// WHAT THE EVER LOVING FUCK, HOW DOES MODELS WITHOUT FUCKING LINKS
// GO ALL GREEN? FUCK YOU!"
//
// The audit (dev_docs/audits/no-link-models-green-2026-10-26.md)
// found the hole: five walls orbit linkability, each judging
// something weaker — the landability wall's channel test is a
// family-level disjunction (a linked default blesses every
// variant), the ghost wall walks family+variant lane strings only
// (a resolver_defaults.checkpoint seat is invisible, and the
// cell-level cascade never entered it), the roster FILTERS
// hand-only families out (hidden is not red), and the mods loras
// ride a comment ruling nothing reads back. This wall walks every
// SELECTABLE route variant through the run gate's own resolved
// cascade (family ∪ variant ∪ cell lane_inputs — the same merge the
// press probe rides, ONE spelling) plus the engine-side checkpoint
// seat, and reds when a weights demand hits NO fetchable channel —
// unless the DECL names it disk-only WITH a reason, in which case
// the wall names the row in its output (acknowledged, dated debt —
// the declared-resources REGISTER precedent; never a silent
// blessing).
//
// Arms:
//   ARM 1 VARIANT LINKABILITY — per variant × cell, resolved.
//   ARM 2 THE NAMED-DISK-ONLY REGISTER — every flag carries a
//        reason; dual declarations say "placement stated"; stale
//        flags red.
//   ARM 4 THE ANCHOR-AT-THE-DOOR — the gate's own resolver must
//   yield a URL per weight per coordinate; a channel the door cannot
//   say (krea-2 kroma-base) reds here.
//   ARM 3 THE RATCHET — the census counts are pinned; a new
//        disk-only variant without a dated receipt reds.
import assert from "node:assert/strict";
import { beforeAll, describe, it } from "vitest";
import { cascadeInit, getModel, modelIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import type { ModelDecl } from "../../../../packages/engines/comfyui-card-kit/src/model-contract.ts";
// THE LORAS BAG (the MODS FATE seat): the recipe picker vocabulary
// the compose offers — the family's own mod module is the truth
// home (the same import the lane docs ride).
import { KREA_ROWS } from "@melite/models-krea-2/mods/loras";

// THE REAL BOOT (the audit's depth law): the same cascadeInit read
// the run gate and the provision seat take — never a source grep.
beforeAll(async () => { await cascadeInit(); });

// THE GATE'S OWN KEY SET (ONE spelling — the audit's split-brain
// lesson): a lane_inputs dict carries non-weight strings too (the
// lane's node vocabulary, the family pack name). The run gate
// judges ONLY the keys LANE_FOLDERS names plus the family's own
// lane_homes declarations — this wall judges exactly those keys,
// never a wider guess that would cry wolf on node names.
import { LANE_FOLDERS, laneFetchAnchor, type LaneFetchSeat } from "../../../../packages/harness/estate-queue/src/cardsLanes.ts";

/** String leaves of any lane_inputs-shaped dict (the ghost wall's
 *  walk, kept ONE spelling: a leaf that names a file or tree). */
function laneLeaves(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") {
    const t = value.trim();
    if (t !== "") into.push(t);
  } else if (Array.isArray(value)) {
    for (const v of value) laneLeaves(v, into);
  } else if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) laneLeaves(v, into);
  }
  return into;
}

/** The gate's key filter: only keys LANE_FOLDERS names (the stock
 *  weight slots) plus the family's declared lane_homes keys carry
 *  weights demands — the same keys the press probe walks. */
function gateDemands(decl: ModelDecl, merged: Record<string, unknown>): string[] {
  const keys = new Set<string>([...Object.keys(LANE_FOLDERS), ...Object.keys(decl.lane_homes ?? {})]);
  const out: string[] = [];
  for (const key of keys) {
    const raw = merged[key];
    if (typeof raw === "string" && raw.trim() !== "") out.push(raw.trim());
  }
  return out;
}

const base = (s: string): string => s.split("/").pop() ?? s;

/** One hand-placed flag, normalized across the union shape: a bare
 *  string is a REASONLESS flag (ARM 2 reds it); the {name, reason}
 *  row is the cured shape. */
interface HandFlag { name: string; reason: string }

function handFlags(decl: ModelDecl): HandFlag[] {
  return (decl.hand_placed_weights ?? []).map((raw) => {
    if (typeof raw === "string") return { name: raw, reason: "" };
    const row = raw as { name?: unknown; reason?: unknown };
    return { name: typeof row.name === "string" ? row.name : "", reason: typeof row.reason === "string" ? row.reason : "" };
  });
}

/** The fetchable channels of one family, as name sets (full name
 *  and basename — the registration law's loaded-identity rule). */
function channelsOf(decl: ModelDecl) {
  const provisions = new Set<string>();
  const add = (s: string): void => { provisions.add(s); provisions.add(base(s)); };
  for (const row of decl.provisions ?? []) add(row.name);
  const snapshots = new Set<string>();
  for (const row of decl.snapshot_provisions ?? []) { snapshots.add(row.name); snapshots.add(base(row.name)); }
  const artifacts = new Set<string>();
  for (const variant of decl.variants ?? []) {
    for (const cell of variant.cells) {
      const artifact = cell.artifact;
      if (artifact === undefined || artifact === null) continue;
      let name = artifact.source_url.split("/").pop() ?? "";
      const cut = Math.max(name.indexOf("?"), name.indexOf("#"));
      if (cut >= 0) name = name.slice(0, cut);
      artifacts.add(name);
    }
  }
  return { provisions, snapshots, artifacts };
}

/** A mod lora row's fetch fate (the MODS FATE seat: "never" with a
 *  reason is the ruled channel; anything else must be fetchable —
 *  a provenance-only source_url is NOT a channel). */
interface LoraFate { never: boolean; reason: string }

function loraFate(row: Record<string, unknown>): LoraFate {
  const fetch = row["fetch"];
  const reason = row["reason"];
  return {
    never: fetch === "never",
    reason: typeof reason === "string" ? reason : "",
  };
}

describe("THE LINKABILITY WALL (burn d: no-link variants never sail green)", () => {
  // ARM 1 — VARIANT LINKABILITY. Every weights demand of every
  // selectable route variant (the resolved cascade + the
  // engine-side checkpoint seat + the recipe lora bag) hits a
  // fetchable channel or a reasoned disk-only flag.
  it("ARM 1 — every selectable variant's weights resolve to a fetchable channel or a named disk-only flag", () => {
    const offenders: string[] = [];
    const namedDiskOnly: string[] = [];
    for (const id of modelIds()) {
      const view = getModel(id);
      const ch = channelsOf(view);
      const flags = new Map(handFlags(view).map((f) => [f.name, f]));
      const flagged = (demand: string): boolean => {
        const f = flags.get(demand) ?? flags.get(base(demand));
        if (f === undefined) return false;
        namedDiskOnly.push(`${id}: ${f.name} — ${f.reason || "(REASONLESS)"}`);
        return f.reason !== "";
      };
      for (const variant of view.variants ?? []) {
        if (variant.group !== "Variant") continue;
        // THE RESOLVED CASCADE (the run gate's own merge, ONE
        // spelling): family ∪ variant ∪ each cell — every coordinate
        // the picker can state, judged on the gate's own key set.
        const seats: Array<Record<string, unknown>> = [
          { ...(view.lane_inputs ?? {}), ...(variant.lane_inputs ?? {}) },
        ];
        for (const cell of variant.cells) {
          seats.push({ ...(view.lane_inputs ?? {}), ...(variant.lane_inputs ?? {}), ...(cell.lane_inputs ?? {}) });
        }
        const checkpoint = (variant.resolver_defaults as Record<string, unknown> | undefined)?.["checkpoint"];
        const engineSideSeat = typeof checkpoint === "string" && checkpoint.trim() !== "";
        const seenDemands = new Set<string>();
        for (const seat of seats) {
          const list = gateDemands(view, seat);
          // THE ENGINE-SIDE SEAT: a variant whose weights load by
          // picker name (resolver_defaults.checkpoint — the node
          // resolves the name engine-side) and declares NO backing
          // lane files is the audit's Tier C class — the demand is
          // the seat itself.
          if (list.length === 0 && engineSideSeat) list.push(checkpoint as string);
          for (const demand of list) {
            if (seenDemands.has(demand)) continue;
            seenDemands.add(demand);
            const hits =
              ch.provisions.has(demand) || ch.provisions.has(base(demand)) ||
              ch.snapshots.has(demand) || ch.snapshots.has(base(demand)) ||
              ch.artifacts.has(demand) || ch.artifacts.has(base(demand));
            if (!hits && !flagged(demand)) {
              offenders.push(`${id} / ${variant.id}: weights '${demand}' — no provisions, snapshot, or artifact row fetches it, and no reasoned disk-only flag names it`);
            }
          }
        }
      }
    }
    // THE RECIPE LORA BAG: the mods picker vocabulary is a weights
    // surface the compose offers. The MODS FATE ruling (2026-10-17)
    // says the estate never fetches them — the ruling must be
    // STATED on the rows (fetch:"never" + reason), never implied by
    // a file comment the pipeline cannot read.
    for (const row of KREA_ROWS) {
      const fate = loraFate(row as unknown as Record<string, unknown>);
      if (!fate.never || fate.reason === "") {
        offenders.push(`krea-2 loras / ${String(row["id"])}: picker row carries no fetch fate — MODS FATE rulings must be stated on the row (fetch:"never" + reason), not implied`);
      }
    }
    assert.deepEqual(offenders, [], `linkability offenders (the audit's §2 Tier C census is this arm's first red set):\n${offenders.join("\n")}`);
    // the named register RIDES the green output — acknowledged debt,
    // never silent (the wall's own face names every flagged row).
    namedDiskOnly.sort();
    assert.ok(namedDiskOnly.length > 0, "the disk-only register is empty — either every family now fetches (delete this register arm) or a flag lost its reason");
  });

  // ARM 2 — THE NAMED-DISK-ONLY REGISTER. The flag is a contract,
  // not a checkbox: every hand_placed_weights entry carries a
  // reason; a flag over a file that ALSO fetches is the dual
  // declaration and must say "placement stated"; a reason claiming
  // placement over a file nothing fetches is a lie.
  it("ARM 2 — every hand_placed_weights flag is reasoned, dual declarations say 'placement stated', stale flags red", () => {
    const offenders: string[] = [];
    for (const id of modelIds()) {
      const view = getModel(id);
      const ch = channelsOf(view);
      const fetchable = (name: string): boolean =>
        ch.provisions.has(name) || ch.provisions.has(base(name)) ||
        ch.snapshots.has(name) || ch.snapshots.has(base(name)) ||
        ch.artifacts.has(name) || ch.artifacts.has(base(name));
      for (const flag of handFlags(view)) {
        if (flag.name === "") { offenders.push(`${id}: a flag row with no name`); continue; }
        if (flag.reason === "") {
          offenders.push(`${id}: '${flag.name}' flagged disk-only with NO reason — a flag is a contract, state why nothing fetches it`);
          continue;
        }
        const dual = fetchable(flag.name);
        const saysPlacement = flag.reason.includes("placement stated");
        if (dual && !saysPlacement) {
          offenders.push(`${id}: '${flag.name}' is flagged AND fetchable — the dual declaration must say 'placement stated' (the weight-acquire-parity Arm D precedent)`);
        }
        if (!dual && saysPlacement) {
          offenders.push(`${id}: '${flag.name}' says 'placement stated' but nothing fetches it — a stale dual flag is a lie`);
        }
      }
    }
    assert.deepEqual(offenders, [], `the disk-only register is not a checkbox:\n${offenders.join("\n")}`);
  });

  // ARM 3 — THE RATCHET. The post-cure census, pinned: the counts
  // of judged selectable variants, the per-family disk-only flags,
  // and the never-fetch lora rows. The counts may only move with a
  // dated receipt — a new disk-only variant without one reds here
  // first (the url-liveness census floors and the declared-resources
  // register behave the same way).
  it("ARM 3 — the linkability census is pinned (a new disk-only variant reds before it sails)", () => {
    let selectable = 0;
    const diskOnlyByFamily = new Map<string, number>();
    let loraNever = 0;
    for (const id of modelIds()) {
      const view = getModel(id);
      for (const variant of view.variants ?? []) {
        if (variant.group === "Variant") selectable += 1;
      }
      const n = handFlags(view).length;
      if (n > 0) diskOnlyByFamily.set(id, n);
    }
    for (const row of KREA_ROWS) {
      if (loraFate(row as unknown as Record<string, unknown>).never) loraNever += 1;
    }
    assert.equal(selectable, 189, "the selectable-variant census moved — update this pin deliberately");
    assert.deepEqual(
      [...diskOnlyByFamily.entries()].sort(),
      [["moss-sfx", 1], ["qwen3-tts", 5], ["qwen3-tts-base", 5], ["qwen3-tts-voicedesign", 5], ["qwen3-tts-voicedesign-base", 5], ["qwen3-tts-voicedesign-design", 5]],
      "the disk-only register moved — a new hand-placed tree owes a dated receipt (row + reason), a cured one deletes its flag here",
    );
    assert.equal(loraNever, KREA_ROWS.length, "every mods lora row must carry its never-fetch fate — no partial rulings");
  });

  // ARM 4 — THE ANCHOR-AT-THE-DOOR LAW (the kroma burn, operator
  // 2026-10-26: "IF A SINGLE WEIGHT DOES NOT HAVE A FUCKING URL TO
  // DOWNLOAD FROM — WE GET REDS IN THE TESTING SUITE — ALWAYS").
  // ARM 1 judges that a channel EXISTS somewhere in the family; this
  // arm judges THE DOOR: the run gate's own anchor resolver
  // (laneFetchAnchor — provisions, the STATED cell/variant artifact,
  // the snapshot repo, in that order) must produce a URL for every
  // weight every coordinate demands. The burn's exact shape: krea-2
  // kroma-base's unet HAS its URL (the cell artifact row), ARM 1
  // counted it green, and the live press still refused with "no
  // store copy exists" and NO fetch anchor — the refusal read family
  // provisions only. A channel the door cannot say is a lie the
  // operator pays for at the press. Hand-placed weights (the debt
  // band, reasoned flags) stay exempt — their face is the
  // hand-place sentence, never a bare miss.
  it("ARM 4 — the door anchors every weight: the run gate's own resolver yields a URL per demand, per coordinate (the kroma law)", () => {
    const offenders: string[] = [];
    for (const id of modelIds()) {
      const view = getModel(id);
      const flags = new Map(handFlags(view).map((f) => [f.name, f]));
      const exempt = (demand: string): boolean => {
        const f = flags.get(demand) ?? flags.get(base(demand));
        return f !== undefined && f.reason !== "";
      };
      for (const variant of view.variants ?? []) {
        if (variant.group !== "Variant") continue;
        // every coordinate the door can state — the door NEVER composes
        // a bare family∪variant cascade for a cell-carrying variant:
        // statedCellRow resolves the FIRST VISIBLE cell when quant
        // rides unstated, so the cell's lane_inputs always join the
        // merge (and their artifact rides the stated cell row). The
        // no-cell seat exists only for cell-less variants.
        const visibleCells = variant.cells.filter((c) => c.hide_from_dropdown !== true);
        const seats: ReadonlyArray<{ merged: Record<string, unknown>; rows: readonly [LaneFetchSeat, LaneFetchSeat] }> = [
          ...(visibleCells.length === 0
            ? [{ merged: { ...(view.lane_inputs ?? {}), ...(variant.lane_inputs ?? {}) }, rows: [variant, undefined] as const }]
            : []),
          ...visibleCells.map((cell) => ({
            merged: { ...(view.lane_inputs ?? {}), ...(variant.lane_inputs ?? {}), ...(cell.lane_inputs ?? {}) },
            rows: [variant, cell] as const,
          })),
        ];
        const seenDemands = new Set<string>();
        for (const seat of seats) {
          for (const demand of gateDemands(view, seat.merged)) {
            if (seenDemands.has(demand)) continue;
            seenDemands.add(demand);
            const anchor = laneFetchAnchor(view, seat.rows, demand);
            if (anchor === undefined) {
              if (!exempt(demand)) {
                offenders.push(
                  `${id} / ${variant.id}: weights '${demand}' — THE DOOR CANNOT ANCHOR IT: laneFetchAnchor yields no URL at this coordinate (no provisions row, no stated-cell artifact basename, no snapshot repo) and no reasoned hand flag names it — a press refuses with a bare miss`,
                );
              }
            } else if (!/^https?:\/\//.test(anchor.url)) {
              offenders.push(`${id} / ${variant.id}: weights '${demand}' — the anchor is not an http(s) URL: '${anchor.url}'`);
            } else {
              // THE SNAPSHOT REVISION PIN (kroma audit F7, 2026-10-26):
              // a weight whose channel is a snapshot tree anchors at
              // the PINNED revision — the bare repo URL names the
              // moving default branch, not the coordinate the
              // fetcher lands. Demand /tree/<the row's own revision>
              // whenever a snapshot row names this file.
              const snap = (view.snapshot_provisions ?? []).find((s) => s.name === base(demand));
              if (snap !== undefined && anchor.url !== `https://huggingface.co/${snap.repo_id}/tree/${snap.revision}`) {
                offenders.push(
                  `${id} / ${variant.id}: weights '${demand}' — the snapshot anchor omits its pinned revision: '${anchor.url}' — the fetch coordinate is ${snap.repo_id}/tree/${snap.revision}, never the moving default branch`,
                );
              }
            }
          }
        }
      }
    }
    assert.deepEqual(offenders, [], `anchor-at-the-door offenders (the kroma law — a URL the door cannot say is a lie the operator pays for at the press):\n${offenders.join("\n")}`);
  });
});
