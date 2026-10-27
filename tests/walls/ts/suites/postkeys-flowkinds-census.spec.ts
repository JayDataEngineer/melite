// postkeys-flowkinds-census.spec.ts — THE CARD↔FLOWS CROSS-PLANE CENSUS
// (SD-4's estate-wide judge; the purge audit's R9 join, slice 4).
//
// THE LESION IT KILLS: the flow plane can produce a value onto a card
// only through the channels the card's own declaration names — a PORT
// (flowKinds.inputs, an edge the lattice can wire), an ADMIT (the
// admitted extra a stage param may state), or the DECL's declared
// params row (the schema knob channel both doors ride). The h3 card
// serves a POST face (the post-chain knobs: sharpen/interp/sr/second-
// pass masters, attention_backend, the film-only duck_depth_db) that
// rode in NO channel — compose-readable on the served face, no
// producible edge on the flow plane, and NO wall anywhere in the
// estate judged the join. Music's lyrics burned the same class at the
// row side (SD-4, CURED 821475e43); this census owns the CARD side,
// estate-wide, derived — never a hand list.
//
// THE ROSTER IS DERIVED twice over: the compose face is the SERVED
// FormSpecDoc (formSpecArm — the real schema envelope, not a copy),
// and the post-face law is the family's OWN declared sets
// (@melite/models-h3/timelineContract — T4_ONLY_KEYS / FILM_ONLY_KEYS
// / SECOND_PASS_KNOBS, imported verbatim). A post key the walk
// refuses must be served by the face (the integrity arm) and must
// resolve to a flow channel or to an EXPLICIT per-key judgment here —
// a key deliberately edgeless is judged per key, with the channel
// that owns it named; the SD-5 sin (an exemption wearing a comment)
// is refused by construction: the judgment table must cover EXACTLY
// the derived roster, and a judged key that GAINS a slot contradicts
// its own judgment and reds until the table re-judges.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/postkeys-flowkinds-census.spec.ts

import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import type {} from "../../../../packages/harness/estate-queue/src/service.ts";
import { seedFlowsSeat } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import {
  T4_ONLY_KEYS,
  FILM_ONLY_KEYS,
  SECOND_PASS_KNOBS,
} from "@melite/models-h3/timelineContract";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import type { SchemaEnvelope, SchemaRef } from "@melite/contracts/formSpec";

// ── THE BOOT (the card tier, the liveness wall's way) ───────────────
let defs: Map<string, CardDefinition>;
beforeAll(async () => {
  const ctx = new Context();
  // the dangling sweep reads the queue seat's manifest — a bare
  // Context makes the sweep vacuous (the lane-law boot precedent)
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "postkeys-census-")),
    stateRoots: [] as string[],
  };
  const svc = new CardRegistryService(ctx);
  await svc.prime();
  await loadCardDefs();
  defs = svc.defsSync();
}, 90_000);

import { join } from "node:path";

/** THE COMPOSE FACE, DERIVED: every field key the served spec's
 *  schema envelope declares for the card — the keys a bench
 *  post/patch can land and the form renders. Null = the card serves
 *  no form doc (a census-facing miss, judged loud at the sweep). */
async function composeFaceOf(card: string): Promise<string[] | null> {
  const doc = await formSpecArm(card);
  if (doc === null) return null;
  const env = doc.schema as SchemaEnvelope;
  const root: SchemaRef | undefined = env.refs[env.uid];
  if (root?.dict === undefined) return null;
  return Object.keys(root.dict);
}

/** THE POST-FACE LAW, DERIVED from the family's own module (never a
 *  hand list here): the family-conditional keys the walk refuses on a
 *  derived-t4r doc (T4_ONLY_KEYS), the film-only knob
 *  (FILM_ONLY_KEYS), and the master-gated nine (SECOND_PASS_KNOBS —
 *  a subset of T4_ONLY_KEYS, unioned for completeness). */
const H3_POST_FACE: readonly string[] = [
  ...new Set<string>([...T4_ONLY_KEYS, ...FILM_ONLY_KEYS, ...SECOND_PASS_KNOBS]),
].sort();

/** THE FLOW CHANNELS a card declares, derived: ports
 *  (flowKinds.inputs + legacyAliases) and admits (exact or
 *  trailing-* prefix, the admission gate's own matching rule). */
function flowChannelsOf(def: CardDefinition): { ports: string[]; admits: string[] } {
  const inputs = def.flowKinds?.inputs ?? {};
  const aliases = def.flowKinds?.legacyAliases ?? {};
  return {
    ports: [...Object.keys(inputs), ...Object.keys(aliases)],
    admits: [...(def.admits ?? [])],
  };
}

const admitsKey = (admits: readonly string[], key: string): boolean =>
  admits.some((a) => a === key || (a.endsWith("*") && key.startsWith(a.slice(0, -1))));

/** THE PER-KEY JUDGMENT TABLE (the cure half of SD-4). A post-face
 *  key with no port and no admit is DELIBERATELY EDGELESS — the
 *  judgment names the channel that owns the key and why no edge can
 *  exist. NOT an exemption: the table is judged against the DERIVED
 *  roster both ways (an unjudged roster key reds; a judged key that
 *  gains a port/admit reds — the judgment is contradicted and the
 *  table must re-judge). Each entry:
 *   channel — the flow plane's producing channel for the key;
 *   why     — the declared law that keeps the edge closed. */
const EDGELESS_JUDGMENT: Record<string, { channel: string; why: string }> = {
  second_pass_enabled: {
    channel: "schema knob (the compose door + the flow lattice's cardGate ride the same schema walk)",
    why: "post-chain master — a scalar switch, never a media rail; the rail law seats image/file slots only (h3-timeline card.ts flowKinds)",
  },
  sharpen_enabled: {
    channel: "schema knob (per-call fold; the post chain's only door is the doc master)",
    why: "post-chain leaf — a scalar knob, never a media rail; the same walk admits it wherever the lane honors it",
  },
  sharpen_method: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a method enum, never a media rail",
  },
  sharpen_strength: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a bounded scalar, never a media rail",
  },
  sharpen_radius: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a bounded scalar, never a media rail",
  },
  sharpen_threshold: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a bounded scalar, never a media rail",
  },
  sharpen_iterations: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a bounded scalar, never a media rail",
  },
  sharpen_switch: {
    channel: "schema knob (retired alias — never rides the switch, ARM 32 of the value wall)",
    why: "retired alias, judged dead by its own firing arm; an edge would resurrect it",
  },
  interpolate_enabled: {
    channel: "schema knob (per-call fold; the post chain's only door is the doc master)",
    why: "post-chain leaf — a scalar switch, never a media rail",
  },
  interp_model: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a checkpoint NAME, not a media payload; the loader seat is the graph's own",
  },
  interp_multiplier: {
    channel: "schema knob (per-call fold)",
    why: "post-chain leaf — a bounded scalar, never a media rail",
  },
  interp_switch: {
    channel: "schema knob (retired alias — never rides the switch, ARM 23 of the value wall)",
    why: "retired alias, judged dead by its own firing arm; an edge would resurrect it",
  },
  sr_switch: {
    channel: "schema knob (doc-level master)",
    why: "post-chain master — a scalar switch, never a media rail",
  },
  sr_model: {
    channel: "schema knob (doc-level)",
    why: "post-chain leaf — a checkpoint NAME, not a media payload; the loader seat is the graph's own",
  },
  sr_resolution: {
    channel: "schema knob (doc-level)",
    why: "post-chain leaf — a resolution enum, never a media rail",
  },
  attention_backend: {
    channel: "schema knob (doc-level; T4_ONLY — the walk refuses it on a derived-t4r doc)",
    why: "attention build enum — engine-build vocabulary, never a media rail",
  },
  duck_depth_db: {
    channel: "schema knob (film-only — read solely by computeFilmMix inside the multi-window boundary)",
    why: "mix-desk scalar, never a media rail; the audio it ducks rides the ref_audios rail",
  },
};

/** THE ROW-SIDE PER-PORT JUDGMENT TABLE (the R9 join's cure half).
 *  A registry row is a CURATED LANE over a card, never the card's
 *  full face — the {model:} door drives the full face. A declared
 *  port the row deliberately does not seat is judged HERE, per port:
 *  the lane the row serves, and the door that owns the unseated
 *  rail. An unjudged unseated port reds (the next music-lyrics);
 *  a judged port that gains a seat contradicts its judgment and
 *  reds until the table re-judges. Key = "<flow>/<stage>:<port>". */
const ROW_PORT_JUDGMENT: Record<string, { lane: string; door: string }> = {
  "audio-native-tts/tts:ref_audio": {
    lane: "the phase-1b speech gate — text in, wav out (the row's own description)",
    door: "the voice-reference rail rides the {model:} door (GET /v1/form-spec?model=qwen3-tts), which serves the card's full face",
  },
  "body-to-somax/rig:donor_glb": {
    lane: "BODY_TO_SOMAX's chained auto-rig lane (mesh_glb seated from the lift)",
    door: "the donor-retarget rail rides the {model:} door (the rig card's full face)",
  },
  "body-to-somax/rig:creature_glb": {
    lane: "BODY_TO_SOMAX's chained auto-rig lane (mesh_glb seated from the lift)",
    door: "the creature-transfer rail rides the {model:} door (the rig card's full face)",
  },
  "character-factory/lift:rigged_glb": {
    lane: "the photo→mesh lift (input_image seated; the stage PRODUCES the rigged mesh)",
    door: "the re-drive-with-existing-mesh rail rides the {model:} door (the img-to-mesh card's full face)",
  },
  "character-factory/lift:target_glb": {
    lane: "the photo→mesh lift (input_image seated; the stage PRODUCES the rigged mesh)",
    door: "the re-drive-with-target rail rides the {model:} door (the img-to-mesh card's full face)",
  },
  "character-factory/rig:donor_glb": {
    lane: "the chain's auto-rig stage (mesh_glb seated from the lift stage)",
    door: "the donor-retarget rail rides the {model:} door (the rig card's full face)",
  },
  "character-factory/rig:creature_glb": {
    lane: "the chain's auto-rig stage (mesh_glb seated from the lift stage)",
    door: "the creature-transfer rail rides the {model:} door (the rig card's full face)",
  },
  "character-factory/motion:motion_npz": {
    lane: "the chain's text→motion stage — the npz is the stage's OWN output (cardIo), never an input it needs wired",
    door: "the re-drive-with-npz rail rides the {model:} door (the motion card's full face)",
  },
  "object-forge/lift:rigged_glb": {
    lane: "the forge's photo→mesh lift (input_image seated; the stage PRODUCES the rigged mesh)",
    door: "the re-drive-with-existing-mesh rail rides the {model:} door (the img-to-mesh card's full face)",
  },
  "object-forge/lift:target_glb": {
    lane: "the forge's photo→mesh lift (input_image seated; the stage PRODUCES the rigged mesh)",
    door: "the re-drive-with-target rail rides the {model:} door (the img-to-mesh card's full face)",
  },
};

// ── THE CENSUS ──────────────────────────────────────────────────────
describe("THE CARD↔FLOWS CROSS-PLANE CENSUS (SD-4 estate-wide — every compose face resolves to a flow channel or a judged edgeless)", () => {
  it("the post-face law is served by the compose face it governs (the derivation's own integrity gate)", async () => {
    // The walk refuses T4_ONLY members on PRESENCE (schema.ts's gate);
    // the face must therefore SERVE every one of them — a post key the
    // face does not serve is a ghost law (the census would judge
    // nothing). FILM_ONLY_KEYS rides the same face. The roster and the
    // face are both derived: this arm is the census's own derivation
    // gate, and it reds if either side drifts.
    const face = await composeFaceOf("h3-timeline");
    expect(face, "the h3-timeline card serves a form doc (the census's roster seat)").not.toBeNull();
    const missing = H3_POST_FACE.filter((k) => !face!.includes(k));
    expect(
      missing,
      `POST-FACE GHOST KEYS — the family's declared post law names keys the served compose face does not serve ` +
      `(the walk refuses presence; the face must serve what the walk refuses, or the law judges a ghost): ${JSON.stringify(missing)}`,
    ).toEqual([]);
    // The roster is non-empty — an emptied declared law would silence
    // the whole census (the vacuous-wall kill).
    expect(H3_POST_FACE.length, "the declared post-face law is non-empty (the census has a roster)").toBeGreaterThan(0);
  });

  it("every served post-face key resolves to a flow channel or a per-key edgeless judgment (SD-4 — the red that listed the unslotted keys)", async () => {
    const def = defs.get("h3-timeline");
    expect(def, "the h3-timeline card is registered (the estate boot)").toBeDefined();
    const { ports, admits } = flowChannelsOf(def!);
    // PORT SANITY (the roster's own half): the rail the card declares
    // today — first frame, last frame, the reference buses, the
    // retired alias, and the re-shoot source seat — must be exactly
    // the media rail; the judgment table below leans on it.
    // reshoot_clip joined the rail 2026-10-27 (feature 024): a single
    // video producer — the clip the new camera move is shot FROM —
    // wired by the lattice like any media edge; arming rides the
    // schema's reshoot_enabled switch, and the graph stays
    // byte-identical until a clip is seated.
    expect(ports.sort(), "the declared ports are the media rail (the rail law the judgments lean on)").toEqual(
      ["image", "image_name", "last_frame", "ref_audios", "ref_images", "ref_videos", "reshoot_clip"].sort(),
    );
    const face = await composeFaceOf("h3-timeline");
    expect(face).not.toBeNull();
    const unjudged = H3_POST_FACE.filter((k) => EDGELESS_JUDGMENT[k] === undefined);
    const contradicted = H3_POST_FACE.filter(
      (k) => EDGELESS_JUDGMENT[k] !== undefined && (ports.includes(k) || admitsKey(admits, k)),
    );
    const unslotted = H3_POST_FACE.filter(
      (k) => !ports.includes(k) && !admitsKey(admits, k),
    );
    // THE SD-4 RED, KEPT HONEST: the assertion names every post key
    // that stands in NO channel and carries NO judgment. The cure is
    // this census's judgment table (each key judged per key, channel +
    // law named) — a NEW post key, or a judgment whose key gained a
    // slot, re-reds this arm by name.
    expect(
      unjudged,
      `UNJUDGED POST KEYS — the post face serves keys with neither a flowKinds port, nor an admits slot, nor a ` +
      `per-key judgment here (compose-readable, no producible edge — SD-4): ${JSON.stringify(unjudged)}`,
    ).toEqual([]);
    expect(
      contradicted,
      `CONTRADICTED JUDGMENTS — keys judged edgeless here now carry a declared port/admit; the judgment is a lie ` +
      `until the table re-judges: ${JSON.stringify(contradicted)}`,
    ).toEqual([]);
    // The judgment covers the whole unslotted set (no blanket
    // exemption grows beside the table).
    expect(
      unslotted.filter((k) => EDGELESS_JUDGMENT[k] === undefined),
      "every unslotted post key is judged — the table and the roster agree",
    ).toEqual([]);
  });

  it("every flow row's statable seats carry the staging card's declared ports (the R9 join, estate-wide over the live registry)", async () => {
    // The row-side half of the census (the music-lyrics class,
    // SD-4's original burn, generalized): for EVERY registry flow
    // row staging a card, every port the card declares must be
    // STATABLE on that row — a stage input edge, a stage param
    // seat, a tool property, or an overlay stamp. A declared port
    // with no seat is unwireable: no caller shape can carry it.
    const seat = seedFlowsSeat();
    const names = seat.names();
    expect(names.length, "the flow registry serves rows (the join has a plane to judge)").toBeGreaterThan(0);
    const unwireable: string[] = [];
    for (const name of names) {
      const flow = seat.get(name);
      if (flow === undefined) continue;
      for (const st of flow.stages) {
        if (st.card === "") continue;
        const def = defs.get(st.card);
        if (def === undefined) {
          unwireable.push(`${name}/${st.id}: stages unknown card '${st.card}'`);
          continue;
        }
        const { ports } = flowChannelsOf(def);
        const statable = new Set<string>([
          ...Object.keys(st.inputs),
          ...Object.keys(st.params),
          ...Object.keys(flow.tool?.properties ?? {}),
          ...(flow.tool?.overlays ?? []).map((o) => o.param),
        ]);
        for (const port of ports) {
          // The retired-alias law: an alias is lattice-derivable for
          // old graphs and offered by NO face (h3-timeline card.ts's
          // naming-law rider) — aliases never demand a row seat.
          const isAlias = (def.flowKinds?.legacyAliases ?? {})[port] !== undefined;
          if (!isAlias && !statable.has(port)) {
            const judged = ROW_PORT_JUDGMENT[`${name}/${st.id}:${port}`];
            if (judged === undefined) {
              unwireable.push(`${name}/${st.id}: card '${st.card}' declares port '${port}' with no statable seat on the row`);
            }
          } else if (!isAlias && statable.has(port) && ROW_PORT_JUDGMENT[`${name}/${st.id}:${port}`] !== undefined) {
            // A judged port that gained a seat contradicts its own
            // judgment — the table must re-judge, or the row-side
            // census is a lie wearing a table.
            unwireable.push(`${name}/${st.id}: port '${port}' gained a seat but still carries a curated-lane judgment here`);
          }
        }
      }
    }
    expect(
      unwireable,
      `UNWIREABLE PORTS — registry rows staging a card give a declared port no seat (the music-lyrics class, estate-wide): ` +
      unwireable.map((u) => `\n  • ${u}`).join(""),
    ).toEqual([]);
  });
});
