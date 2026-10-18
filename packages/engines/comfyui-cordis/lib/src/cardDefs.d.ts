import { Context } from '@deepseek-ai/cordis';
import { ComfyUIService } from './service.ts';
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
import type { ProvisionRow } from '@melite/comfyui-card-kit/model-contract';
/** Test seam: drop the process-global card-defs cell. Production
 *  code never calls this — the cache is boot-static per process
 *  (refreshCardDefs is the one production swap, and it swaps the
 *  CELL's map, not the cell).
 *  Specs that pin a cold first caller reset it because vitest
 *  resets the per-file module registry but not globalThis. */
export declare const resetCardDefsForTests: () => void;
/** The booted ComfyUIService (the card set + mods + verbs ride
 *  it). Throws if loadCardDefs has not settled. */
export declare const theService: () => ComfyUIService;
/** Boot the card set once and return id → CardDefinition.
 * Deterministic across calls in one process. */
/** THE CARD PACKAGES (the card sweep, 2026-09-09 — the glob's named
 *  death date arrived): every card lives in its own package
 *  (packages/<domain>/<id> — one card one package: card.ts +
 *  ui/ + agents/ in one unit). This table is the ONLY card
 *  composition (loadCardDefs' cache-boot AND the compose door's
 *  fresh-Context boot both ride it); a card lands by adding its
 *  package + one row. The engine src/cards tree is empty of host
 *  cards (only tenants remain: the fetch-registrar manifests,
 *  retired with their rows). */
export declare const cardPackages: string[];
/** One package onto the context (the shared composition step —
 * the WHOLE module namespace rides: cards declare `export const
 * inject = ['comfyui']` at module level; passing only { apply }
 * drops the inject declaration and the service dies with "cannot
 * get property comfyui without inject"). A package without a host
 * face refuses with its kind's voice — never a silent skip, never
 * cordis' anonymous error. */
export declare const pluginPackage: (ctx: Context, specifier: string, kind: "card package" | "packaged flavor", label?: string) => Promise<void>;
/** Compose the card set into a Context (the shared auto-load loop —
 * every card rides pluginPackage above). */
export declare const composeCards: (ctx: Context) => Promise<void>;
/** Compose the mod plane into a Context (packs first, flavors
 *  after — the flavor↔DECL.mods interlock is unchanged on the
 *  models side). SHARED composition: loadCardDefs rides it for the
 *  registry, and the gateway's per-request composeOnce rides it too
 *  (2026-09-10 — composeOnce built a fresh service with cards only,
 *  so flavor rows were absent at compose and every LoRA id refused).
 *  The dir-walk over src/models/families/<genre>/<id>/mods that used
 *  to live here was DEAD CODE (ledger row 24, 2026-09-10). */
export declare const composeModPlane: (ctx: Context) => Promise<void>;
/** THE IDENTITY RUNG (native since 2026-09-10): every card
 *  declares its identity inline (label/description/genre — the
 *  frozen ring is retired from this path; it survives only as the
 *  DELETED with the ring, 2026-09-18). A card
 *  with no identity refuses LOUD here (the m1 wall: no card
 *  without it) — never a silent fallback, never generated prose. */
export declare const assertCardIdentity: (id: string, def: CardDefinition) => void;
export declare const loadCardDefs: () => Promise<Map<string, CardDefinition>>;
/** The module cache, SYNC, for seats that must not fork the truth
 *  (the G2 receipt, 2026-10-11): null before the first loadCardDefs()
 *  — a cold caller still primes. After a refreshCardDefs() swap this
 *  is the SAME map every per-request door (forms, form-spec,
 *  catalog) serves; the estate registry reads it so a live-mounted
 *  hot card validates at POST /v1/flows/validate the moment it
 *  serves — one cache, not a boot snapshot and its fork. */
export declare const cardDefsNow: () => Map<string, CardDefinition> | null;
/** Refresh the served defs map from the LIVE singleton (#39, the
 *  hotload prototype): loadCardDefs' cache is a boot snapshot, so a
 *  card registered after boot (the hot root's drop-ins) never
 *  serves until the projection re-derives. This re-runs the SAME
 *  build line against theService() — the identity wall rides, the
 *  per-request doors (form-spec, forms, catalog) pick it up on
 *  their next read. Cold boots are untouched: the first
 *  loadCardDefs() call is exactly what it was; only a process that
 *  ALREADY booted can refresh. */
export declare const refreshCardDefs: () => Map<string, CardDefinition>;
/** Every family's declaration provision rows (DECL provisions for
 *  every model id, then card-owned provisions), keyed by family —
 *  the download + serve surface (provision.ts downloads them; the
 *  provision door serves them). ONE spelling — the door delegates
 *  here, never a frozen capture.
 *
 *  The models reads are a LAZY import (models/models.ts carries the
 *  boot top-level-await, and the models boot dynamically imports
 *  THIS module — a static edge here deadlocks both boots). Call
 *  only after boot (loadCardDefs / the door's liveSources). */
export declare function provisionsByFamily(defs: Map<string, CardDefinition>): Promise<Record<string, {
    engine: string;
    provisions: ProvisionRow[];
}>>;
