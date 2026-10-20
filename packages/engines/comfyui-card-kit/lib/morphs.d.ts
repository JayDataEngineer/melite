/**
 * morphs.ts — THE POSER MORPH VOCABULARY (stroke 90, 2026-09-17:
 * the anny form card keeps every studio feature — the hundreds of
 * sliders stage rides the served vocabulary, never a handroll).
 *
 * The membership source is the DOOR PIN
 * (comfyui-cordis/data/poser-identity-space-anny.json — the live
 * /poser identity-space local_changes arm, pinned 2026-09-17:
 * 254 labels, range [-1, 2], defaults ALL 0). The wall
 * (tests/walls/ts/suites/poser-morph-vocab.test.ts) asserts
 * set-equality with the pin: the pin drifts (an engine upgrade adds
 * a morph), the wall fails, THIS FILE is edited by hand. Never a
 * runtime read of the pin into the schema (the vocab.ts law).
 *
 * Defaults: the door pins every morph default at 0 — the card
 * schema seeds 0 from THIS pin and compose ships only NON-ZERO
 * entries (sparse local_changes; absent = the engine's own 0).
 */
export declare const ANNY_MORPH_LABELS: readonly string[];
/** The served local_changes range — HINT-ONLY floors on the schema
 * (the range rule: the schema never refuses what the door serves). */
export declare const ANNY_MORPH_RANGE: readonly [number, number];
/** The pin's default for every morph (the door pins all 0). */
export declare const ANNY_MORPH_DEFAULT: number;
//# sourceMappingURL=morphs.d.ts.map