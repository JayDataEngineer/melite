import type { GraphBuilder, NodeRef } from './graph.ts';
import type { ModelFacts, LaneInputsFacts } from './facts.ts';
import type { ParamSpec } from '@melite/engine-contract/vocabulary';
/** The closed facts shape the tts segments read (model_path: the
 *  audiocore load key — the ONE engine-general member the families
 *  declare). One home; the families re-export as their TtsFacts. */
export type TtsFacts = {
    readonly model_path: string;
};
/** The gated params doc the tts segments read (the card's schema
 *  walk validated types and bounds — a same-process typed boundary). */
export type TtsParams = Record<string, unknown>;
/** The lane topology per variant id: synth_lane and
 *  instruction_control are FAMILY-OWNED lane facts derived from the
 *  resolved variant, never engine-general members — the branch key
 *  is data (the variant pick), never a family-id switch. */
export interface TtsLaneTopology {
    readonly synth_lane: 'speak' | 'clone' | 'design';
    readonly instruction_control: boolean;
}
/** @param model the resolved row (family ⊕ variant)
 *  @param topology the family's LANE_TOPOLOGY data
 *  @param label the refusing family tag, message-prefixed
 *  @returns the lane topology the dispatch and the card's admission
 *  read
 *  @throws Error when the resolved variant has no topology row (a
 *  broken DECL refuses loud, never a silent default) */
export declare function laneTopologyOf(model: ModelFacts, topology: Readonly<Record<string, TtsLaneTopology>>, label: string): TtsLaneTopology;
/** The tts facts door: the resolved lane_inputs parsed into the
 *  closed shape — a missing model_path refuses field-named here, at
 *  registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @param label the refusing door's name (family + action)
 *  @returns the typed facts the segment factories read */
export declare function parseTtsFacts(raw: LaneInputsFacts, label: string): TtsFacts;
/** The 13-row surface both TTS actions declare. The seed row is the
 *  one seam: `speak` carries it PLAIN (the voice-lock law — the mint
 *  sits inside build, branch-local, never sentinel-pre-minted);
 *  `export` carries the sentinel rule (its single mint has no lock
 *  to preserve). THE QVOICE BOOLEAN LAW (operator 2026-10-22): no
 *  voice_name row — the save is the save_qvoice boolean (the
 *  qvoice_save mod's toggle; the build mints the export name).
 *  @param sentinelSeed true for the export action's seed row
 *  @param presetSpeakers the family's voice enum options
 *  @returns the declared param rows */
export declare function ttsParamRows(sentinelSeed: boolean, presetSpeakers: readonly string[]): readonly ParamSpec[];
/** The speak segment: a stated .qvoice performs the text through
 *  the studio's clone pipeline (the voice-lock LOAD half); otherwise
 *  AudiocoreTTS synthesis — a stated persona rides, an unstated one
 *  OMITS the voice input entirely (the node's own default resolves
 *  it; a family that still declares a voice default fills it, the
 *  qwen3-tts no-default-voice law removed that default), plus the
 *  1:1 generate kwargs (absent rows ride the autofill pin). */
export declare function speakSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef;
/** The use segment: a saved persona performs the text — the
 *  studio's generate mode with the lock seed derived from the
 *  artifact path when unstated. */
export declare function useSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string, path: string, strength: number | undefined): NodeRef;
/** The clone segment: the Base cloner (reference audio +
 *  transcript in, the speaker's voice out); a stated .qvoice
 *  performs through the studio's generate pipeline instead (the
 *  qvoice carry — works across ALL qwen3-tts). */
export declare function cloneSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef;
/** The export segment: the studio's export_lite on the persona
 *  description — the .qvoice persists into the run's own tree (One
 *  copy node after the sample). THE NAME LAW (the named-presence
 *  refinement, operator 2026-10-22: "Make sure that the 'design'
 *  mod has a popup, it can just be 'name' or something so a name
 *  can be used for the save file"): the mod's stated voice_name
 *  names BOTH nodes (the pair law — the studio's write and the
 *  copy's search key share one string); unstated ('' or absent)
 *  falls to the mint `voice-<runId>` (unique per save, the
 *  collision-numbered search key both nodes share), and the
 *  receipt names itself from the saved file. */
export declare function exportSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef;
/** The design PREVIEW segment (the qvoice boolean law, operator
 *  2026-10-22: a plain design run previews — the persona speaks
 *  the text, the flac lands, and NOTHING persists to the media
 *  tree): the same studio design fire as the export, with NO copy
 *  node — the embedding stays in the engine's own scratch (its
 *  cache law), and the run carries the sample only. The save is
 *  the SAVE QVOICE boolean, never the lane. */
export declare function designPreviewSegment(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): NodeRef;
//# sourceMappingURL=tts-segments.d.ts.map