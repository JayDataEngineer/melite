// index.ts — `@melite/estate-drafts`: the drafts/bench Remote owner plugin.
//
// Mounts DraftsRemoteService + BenchRemoteService on the host fiber
// (the Service constructors self-register; disposal cascades with the
// fiber — the provider shape; the Context merge in remote.js is the
// seat). The host's typert gateway claims the endpoints through its
// source-mode discovery walk — no generated artifacts needed
// host-side. Storage arrives via the host's storageDomain facility
// seat (lazy open on first call — boot stays total). Failures are the
// protocol's RemoteError with the `draft/*` + `bench/*` codes
// declared next to their throws (remote.ts / bench.ts).
import type { Context, Plugin } from "@deepseek-ai/cordis";
import { BenchRemoteService, DraftsRemoteService } from "./remote.js";
import { DraftsDomainSeatService } from "./store.js";
import type { DraftsConfig } from "./store.js";

export { BenchRemoteService, DraftsRemoteService, installBenchChangeSeam } from "./remote.js";
export {
  resolveStorageRoot,
  openDraftsDomain,
} from "./store.js";
export type { DraftsConfig } from "./store.js";
export { DRAFT_ID_RE, draftIdOk } from "./spec.js";
export type { BenchChangeSeam } from "./bench.js";
export { setBenchChangeSeam } from "./bench.js";
// The storage PROVIDER rows are GONE (retired 2026-09-10): the DSH
// storage packages' pieces are composed at the COMPOSITION SITE —
// dsh-base's rows in profiles, the boot rigs inline (DSH's own rig
// shape: session-projection-cache/tests/fixtures.spec.ts l.27-104).
// The estate never re-packages DSH plugin pieces as its surface.
export type {
  BenchEnsureRow,
  BenchGetRow,
  DraftListResult,
  DraftListRow,
} from "./remote.js";

export const name = "estate-drafts";

export function apply(ctx: Context, config: DraftsConfig = {}): void {
  // the domain seat mounts FIRST — the remote services' writers open
  // the drafts domain through it (openDraftsDomain probes this seat)
  new DraftsDomainSeatService(ctx, config);
  new DraftsRemoteService(ctx);
  new BenchRemoteService(ctx);
}

const plugin: Plugin = { name, apply };

export default plugin;
