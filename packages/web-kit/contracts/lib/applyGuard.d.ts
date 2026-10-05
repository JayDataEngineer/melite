/**
 * applyGuard.ts — THE SINGLE-MOUNT CLAIM, one implementation.
 *
 * A duplicated client injection (a module factory executed twice in one
 * page lifetime) would register a second sidebar entry and overlay.
 * First application wins; a later call is refused, and the owning
 * fiber's disposer releases the claim so a rebuilt bundle can claim
 * again.
 *
 * WHY A FACTORY AND NOT A SHARED BOOLEAN (2026-10-13, the card-UI
 * duplication audit): two plugins each carried this file, differing
 * only in a name prefix and one console.warn. The claim is a MODULE
 * singleton, and each plugin's client bundle has its own module
 * instance — so sharing one boolean would make the deck's apply refuse
 * the gallery's. Each plugin therefore calls this factory once, in its
 * own module, and gets its own claim: one implementation, one instance
 * per plugin, and the two names stay greppable.
 */
export interface ApplyGuard {
    /** True when this call took the claim; false when one was already held. */
    claim(): boolean;
    /** Release the claim (the owning fiber's disposer). */
    release(): void;
}
export declare function createApplyGuard(label: string, opts?: {
    warnOnRefusal?: boolean;
}): ApplyGuard;
//# sourceMappingURL=applyGuard.d.ts.map
