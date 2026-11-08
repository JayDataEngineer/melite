// windowSpec.ts — THE H3 WINDOW PROJECTION SEAM (Slice 0 of the P0
// census design, dev_docs/audits/p0-census-design-2026-11-08.md R4).
//
// The h3 window is function-served: the walk judges the window schema
// (schema.ts paramSchema + schema()), the family door judges the film
// action rows (actions.ts film.params), and the UI serves the carrier
// emission (emitParamsSchema over paramSchema). This module is the ONE
// serving projection of that three-home surface — a package export the
// walls (h3-window-parity.spec.ts) and the future hop census consume,
// never a test helper. Home is models/h3 (it owns both inputs and
// already depends on card-kit): the discovery.ts home the design
// sketches would hang a harness→family import, and the card-kit home
// would invert card-kit→family. New module, no cycle (schema/actions
// never import back).
import { emitParamsSchema } from "@melite/comfyui-card-kit/params-emit";
import { film } from "./actions.js";
import { paramSchema } from "./schema.js";
const sorted = (keys) => [...new Set(keys)].sort();
/**
 * Serve the h3 window's three-home surface as one projection: the
 * carrier universe, the served envelope, and the family door's film
 * rows, plus the three named difference sets the parity wall judges.
 * Pure derivation — no hand lists; a row or knob added on any side
 * shifts the sets and the wall names it.
 */
export function serveWindowSpec() {
    const carrierKeys = sorted(Object.keys(paramSchema.dict ?? {}));
    // The bridge rides the toolProjection.ts precedent in two steps:
    // the schemastery object's Meta carries no string index, so the
    // static types cannot prove its overlap with the emitter's minimal
    // face — but the face's whole job is carrying .dict (card-definition
    // Ledger row 23), which this object provably has. Claim only the
    // dict, then take the face the same way the tool face does.
    const carrier = paramSchema;
    const emitted = emitParamsSchema(carrier, ["h3"]);
    const envelope = sorted(Object.keys(emitted.properties ?? {}));
    const filmRows = sorted(film.params.map((r) => r.name));
    const inEnvelope = new Set(envelope);
    const inFilm = new Set(filmRows);
    return {
        carrierKeys,
        envelope,
        filmRows,
        carrierInternal: sorted(carrierKeys.filter((k) => !inEnvelope.has(k))),
        undeclaredServed: sorted(envelope.filter((k) => !inFilm.has(k))),
        unservedDeclared: sorted(filmRows.filter((k) => !inEnvelope.has(k))),
    };
}
//# sourceMappingURL=windowSpec.js.map