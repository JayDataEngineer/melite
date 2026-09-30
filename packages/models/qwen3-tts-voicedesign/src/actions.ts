// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the speak + export actions the tts card binds. The
// DECL's lane_inputs are the ONE facts door (model_path — the
// audiocore load key; synth_lane — the lane-branch DATA, never a
// family-id switch); the segment factories are the legacy ttsT1 /
// ttsDesignT1 tree verbatim on the kit's OWN calibrated pins,
// loaders, and guards (one owner; the lanes stay as the
// byte-oracles, proven in tests/action.spec.ts). Creation order IS
// node-id order (the recipe law). Keys the segment never reads
// (instruction_control, checkpoint, … the strip shape) ride
// unvalidated.
//
// NO seed-sentinel rule is declared on `speak` — DELIBERATELY. The
// qvoice use-branch locks the studio seed to the artifact path when
// the doc seed is -1/unstated (the voice-lock law); a sentinel
// pre-mint would stamp a random concrete seed before the lock reads
// it, drifting timbre on every reuse. The branch-local mints below
// ride the ONE card-kit helper. `export` declares the rule: its
// single mint has no lock to preserve, so the ported mint is a
// pass-through.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import {
  AUDIACORE_STUDIO_AUTOFILL,
  AUDIACORE_TTS_AUTOFILL,
  loadAudiocore,
  mintSeed,
  qvoiceUse,
  voiceLockSeed,
} from "@melite/comfyui-card-kit";
import { assertModUse } from "@melite/comfyui-card-kit/guard";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { GraphBuilder, NodeRef } from "@melite/comfyui-card-kit/graph";

/** The closed facts shape the tts segments read (synth_lane: the
 * resolved lane branch — '' absent falls to speak). */
export type TtsFacts = {
  readonly model_path: string;
  readonly synth_lane: "" | "speak" | "clone" | "design";
};

/** The gated params doc the tts segments read (the card's schema
 * walk validated types and bounds — a same-process typed
 * boundary). */
export type TtsParams = Record<string, unknown>;

/** The tts facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here; a
 * synth_lane outside the three honest lanes refuses field-named at
 * registration, never falls to a silent default at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factories read */
export function parseTtsFacts(raw: LaneInputsFacts): TtsFacts {
  const path = raw.model_path;
  if (typeof path !== "string" || path === "") {
    throw new Error(`qwen3-tts-voicedesign speak: lane_inputs.model_path = ${JSON.stringify(path)} — a non-empty string is required`);
  }
  const lane = raw.synth_lane;
  if (lane === undefined) return { model_path: path, synth_lane: "" };
  if (lane !== "" && lane !== "speak" && lane !== "clone" && lane !== "design") {
    throw new Error(`qwen3-tts-voicedesign speak: lane_inputs.synth_lane = ${JSON.stringify(lane)} — speak, clone, or design is required`);
  }
  return { model_path: path, synth_lane: lane };
}

/** The speak segment: a stated .qvoice performs the text through
 * the studio's clone pipeline (the voice-lock LOAD half); otherwise
 * AudiocoreTTS synthesis with the persona default + the 1:1
 * generate kwargs (absent rows ride the autofill pin). */
function speakSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef {
  const use = qvoiceUse(p);
  if (use) return useSegment(p, model, g, runId, use.path, use.strength);
  const seed = mintSeed(p);
  const loaded = loadAudiocore(g, model);
  const synth = g.node("AudiocoreTTS", {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: p.text,
    mode: typeof model.defaults.mode === "string" ? model.defaults.mode : "tts",
    voice: (p.voice as string) || (typeof model.defaults.voice === "string" ? model.defaults.voice : ""),
    instruct: (p.style_instruction ?? "") as string,
    temperature: p.temperature,
    ...(p.top_p !== undefined && p.top_p !== null ? { top_p: p.top_p } : {}),
    ...(p.top_k !== undefined && p.top_k !== null ? { top_k: p.top_k } : {}),
    ...(p.speed !== undefined && p.speed !== null ? { speed: p.speed } : {}),
    ...(p.repetition_penalty !== undefined && p.repetition_penalty !== null ? { repetition_penalty: p.repetition_penalty } : {}),
    seed,
  });
  return g.node("SaveAudio", { audio: synth.out(), filename_prefix: `${runId}/tts` });
}

/** The use segment: a saved persona performs the text — the
 * studio's generate mode with the lock seed derived from the
 * artifact path when unstated. */
function useSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string, path: string, strength: number | undefined): NodeRef {
  assertModUse(model, "qvoice");
  const loaded = loadAudiocore(g, model);
  const studio = g.node("AudiocoreVoiceStudio", {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: "generate",
    qvoice_path: path,
    text: p.text,
    instruct: (p.style_instruction ?? "") as string,
    temperature: p.temperature,
    voice_strength: strength,
    seed: voiceLockSeed(p, path),
  });
  return g.node("SaveAudio", { audio: studio.out(), filename_prefix: `${runId}/tts` });
}

/** The clone segment: the Base cloner (reference audio +
 * transcript in, the speaker's voice out); a stated .qvoice
 * performs through the studio's generate pipeline instead (the
 * qvoice carry — works across ALL qwen3-tts). */
function cloneSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef {
  const use = qvoiceUse(p);
  if (use) return useSegment(p, model, g, runId, use.path, use.strength);
  const seed = mintSeed(p);
  const loaded = loadAudiocore(g, model);
  const synth = g.node("AudiocoreTTS", {
    ...AUDIACORE_TTS_AUTOFILL,
    model: loaded,
    prompt: p.text,
    mode: typeof model.defaults.mode === "string" ? model.defaults.mode : "clone",
    reference_audio: p.ref_audio,
    reference_text: p.ref_text,
    temperature: p.temperature,
    ...(p.top_p !== undefined && p.top_p !== null ? { top_p: p.top_p } : {}),
    ...(p.top_k !== undefined && p.top_k !== null ? { top_k: p.top_k } : {}),
    ...(p.speed !== undefined && p.speed !== null ? { speed: p.speed } : {}),
    ...(p.repetition_penalty !== undefined && p.repetition_penalty !== null ? { repetition_penalty: p.repetition_penalty } : {}),
    seed,
  });
  return g.node("SaveAudio", { audio: synth.out(), filename_prefix: `${runId}/tts` });
}

/** The speak action: the tts lane — three honest branches keyed on
 * the resolved synth_lane DATA (persona synthesis, Base clone,
 * design export), never a family-id switch. */
export const speak: ComfyActionSpec<TtsParams, TtsFacts> = {
  id: "speak",
  outputs: [{ name: "audio", kind: "AUDIO" }],
  params: [],
  facts: parseTtsFacts,
  build({ p, facts, model, g, runId }) {
    if (facts.synth_lane === "design") return exportSegment(p, model, g, runId).out();
    if (facts.synth_lane === "clone") return cloneSegment(p, model, g, runId).out();
    return speakSegment(p, model, g, runId).out();
  },
};

/** The export segment: the studio's export_lite on the persona
 * description + the Design mod's name — the .qvoice persists into
 * the run's own tree (One copy node after the sample). */
function exportSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef {
  assertModUse(model, "qvoice_save");
  const seed = mintSeed(p);
  const loaded = loadAudiocore(g, model);
  const studio = g.node("AudiocoreVoiceStudio", {
    ...AUDIACORE_STUDIO_AUTOFILL,
    model: loaded,
    mode: "export_lite",
    name: (p.voice_name as string).trim(),
    instruct: (p.design_prompt as string).trim(),
    sample_text: p.text,
    temperature: p.temperature,
    top_p: p.top_p,
    speed: p.speed,
    repetition_penalty: p.repetition_penalty,
    seed,
  });
  const save = g.node("SaveAudio", { audio: studio.out(), filename_prefix: `${runId}/design` });
  g.node("MeliteQVoiceCopy", {
    voice_name: (p.voice_name as string).trim(),
    dest_prefix: `${runId}/voices`,
    audio: studio.out(),
  });
  return save;
}

/** The export action: the persona SAVE half — fires from any lane
 * when the Design mod's name + the persona description both ride
 * (admission stays on the card). */
export const exportAction: ComfyActionSpec<TtsParams, TtsFacts> = {
  id: "export",
  outputs: [{ name: "qvoice", kind: "AUDIO" }],
  params: [{ name: "seed", rule: "seed-sentinel" }],
  facts: parseTtsFacts,
  build({ p, model, g, runId }) {
    return exportSegment(p, model, g, runId).out();
  },
};
