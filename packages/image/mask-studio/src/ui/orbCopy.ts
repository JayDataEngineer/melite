/**
 * orbCopy.ts — THE ORBIT COPY DICTIONARY. Client UI copy is locale-owned —
 * presentation code owns no copy literals; it consumes them here through the
 * typed seat. A second locale plugs into this dictionary without touching the
 * orb component.
 *
 * THE BOUND: static user-visible FACES of the orbit orb canvas live here
 * (the accessible pose name, the gesture hint). Canvas DATA — the trained-band
 * ink, data-testid hooks, classNames, and the numeric control seats — rides
 * the component, never this dictionary.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const orbCopy = {
  /** The orb canvas's accessible name: the live pose in words (ONE TRUTH —
   *  the orb and the orbit/tilt/dolly number dials write the same seats). */
  aria: (p: { orbit: number; tilt: number; dolly: number }): string =>
    `Camera pose orb: orbit ${p.orbit} degrees, tilt ${p.tilt} degrees, dolly ${p.dolly}`,
  /** The gesture hint under the orb: the handle snaps, empty space turns
   *  the view, the wheel dollies, double-click resets the view. */
  hint: (p: { snap: number }): string =>
    `Drag the blue handle to set orbit/tilt (${p.snap}\u00B0 snap) \u00B7 drag empty space to rotate the view \u00B7 wheel = dolly \u00B7 double-click resets the view. The dials below ride the same seats.`,
} as const;
