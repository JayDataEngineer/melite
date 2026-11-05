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
export declare const orbCopy: {
    /** The orb canvas's accessible name: the live pose in words (ONE TRUTH —
     *  the orb and the orbit/tilt/dolly number dials write the same seats). */
    readonly aria: (p: {
        orbit: number;
        tilt: number;
        dolly: number;
    }) => string;
    /** The gesture hint under the orb: the handle snaps, empty space turns
     *  the view, the wheel dollies, double-click resets the view. */
    readonly hint: (p: {
        snap: number;
    }) => string;
};
//# sourceMappingURL=orbCopy.d.ts.map
