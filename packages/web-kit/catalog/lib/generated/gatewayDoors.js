// HAND-MAINTAINED browser door table (2026-09-10 — the gateway died
// with its route table and the generator with it, so there is nothing
// left to generate FROM: the lanes live as string literals on the
// estate seats now). Every member is a path the owning DSH serves to
// the editor over HTTP. Add/remove a member BY HAND with the door;
// the serve side is guarded by the runs-remote wall + the e2e census
// (helpers/wire.ts), not by a freshness check anymore.
//
// THE HARD GATE: apiJson/apiFetch accept ONLY EstateDoorUrl. A
// frontend fetch of a door the estate does not serve is a COMPILE
// ERROR here — the loras incident (2026-09-05) shipped exactly that
// gap to the operator as "No LoRAs installed" over 12 declared
// rows. If tsc refuses your path, either the door is missing from
// the estate (build it, then list it here) or the call site is dead
// (delete it).
export {};
//# sourceMappingURL=gatewayDoors.js.map