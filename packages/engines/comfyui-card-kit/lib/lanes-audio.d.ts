export interface QVoiceUse {
    path: string;
    strength: number | undefined;
}
/**
 * The Audiocore voice bank: the studio node's own default
 * `voices_dir` (melite-audio-nodes/nodes.py:743) and the directory
 * the estate's save lanes write personas into (`export_path` in the
 * saved runs' graphs, e.g. /mnt/data/models/audio/voices/x.qvoice).
 * A bare persona name resolves here — the engine's load branch reads
 * only ComfyUI's input directory or a real host path (nodes.py:885
 * via _resolve_input_path, nodes.py:327), so a bare name ridden into
 * the graph verbatim dies as `no such file: <name>`.
 */
export declare const QVOICE_BANK_ROOT = "/mnt/data/models/audio/voices";
/** The qvoice reference's ONE spelling at the wire: a bare persona
 *  name expands to the bank path; a value the caller already spelled
 *  as a path (absolute, run-relative, or an uploaded input leaf that
 *  carries the .qvoice extension) rides verbatim.
 *  @param ref the persona reference as stated on the doc
 *  @returns the path the AudiocoreVoiceStudio seat receives
 */
export declare function resolveQvoicePath(ref: string): string;
export declare function qvoiceUse(p: Record<string, unknown>): QVoiceUse | undefined;
/** THE PERSONA SUPERSEDES THE PRESET (operator order, 2026-11-27:
 *  "THE WHOLE POINT OF THE QVOICE IS TO WORK WITH THE CUSTOMVOICE" —
 *  after the press died with "params 'voice' and 'qvoice' fire
 *  together" on a doc whose preset the operator never picked). The
 *  bag IS the voice source: a persona riding beside a preset name is
 *  the draft's leftover, never an intent, and the engine's persona
 *  branch reads no speaker anyway — so the stale name is RELEASED
 *  from the doc instead of refusing the press. One implementation,
 *  both tts judge seats (the card's compose and the family's speak
 *  action); the run's params then carry the persona alone, which is
 *  what performs.
 *  @param p the stage params (post-defaults-merge) about to compose
 *  @returns true when a preset name was released */
export declare function releasePresetBesidePersona(p: Record<string, unknown>): boolean;
export declare function promoteQvoiceBag(p: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=lanes-audio.d.ts.map
