import type { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
export declare const name = "melite-estate";
/** THE SEAT ROSTER the settle gate demands (the ONE hand list —
 * §3.9 one owner, every other home a pure reader): every door seat
 * the prober's seatFamilyForPath vocabulary can name, plus the
 * internal cardRegistry no door family names but every registry
 * row injects. The drift-alarm arm (lane-runs-state-repro) reds if
 * the prober learns a seat this roster does not demand. */
export declare const REQUIRED_SEATS: readonly string[];
/** The estate's config face (stroke 45c): repoRoot PINS the runs
 *  state tree — the queue seat refuses unpinned boots (a cwd-guessed
 *  root silently serves an empty runs tree; the profile patch names
 *  the repo). The engine gates (V6/J12 cure, 2026-10-18) are config
 *  fields the profile's cordis.yml row pins — every env seam that
 *  decided seating is gone. */
export interface Config {
    repoRoot?: string;
    /** The runs state root, named absolute (J12: the retired
     *  MELITE_STATE_ROOT env seam's config twin — wins over
     *  repoRoot's data/runs default; the queue boot gate refuses
     *  when neither root is named). */
    stateRoot?: string;
    /** §23 cross-roots manifest extras, in search order after the
     *  own root (J12: the retired MELITE_STATE_ROOTS env seam's
     *  config twin). A string is colon-split; a list passes
     *  through. */
    stateRoots?: string | string[];
    /**
     * Serve degraded when required bundles are absent instead of
     * refusing the boot (the bundle gate's explicit opt-out — the
     * profile's cordis.yml row pins it; no env seam).
     */
    allowGuttedLane?: boolean;
    /** MCP engine ids to seat (default none — optional/experimental).
     *  A string is comma-split; a list passes through. */
    mcpEngines?: string | string[];
    /** The craft critic's named route "provider/model" (unset: the
     *  auto-route's first image-capable enumeration). */
    criticRoute?: string;
    /** The agent engine's brain "provider/model" (unset: the engine
     *  stays unseated and refuses at the door — loud, never a silent
     *  default brain). */
    agentRoute?: string;
    /** The provisioning weights store root (unset: the checkout's
     *  tracked configs derive it at apply — loadStoreRoot). */
    storeRoot?: string;
    /** THE ACQUIRE STALL BUDGET (ERRORS.md k2, P5 F1): how long a
     *  direct fetch may land no bytes before the stall watchdog
     *  fails it. Unset: the service default owns the bound. */
    acquireStallTimeoutMs?: number;
    /** THE DURABLE DOWNLOAD SEAT (the lifetime finding, 2026-10-21):
     *  true on the operator's lane — that seat claims 'requested' op
     *  rows (a transient seat's download requests) and owns every
     *  fetch's lifetime. Unset/false: this seat is transient; its
     *  acquire requests queue for a durable seat, never wiring a
     *  fetch in this process. */
    durableDownloads?: boolean;
    /** THE CLAIM CADENCE (durable seats only): how often the shared
     *  op store is polled for requested rows, in milliseconds. */
    downloadClaimIntervalMs?: number;
    /** THE SEAT-SETTLE BUDGET (2026-10-23 wedge cure): how long the
     * settle gate waits for the queue plane's required seats to go
     * strict-active before the estate refuses to boot. Unset: 30s —
     * slow census boots settle well inside it; tests pin it small. */
    seatSettleBudgetMs?: number;
}
/** The validator twin of {@link Config}. */
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config?: Config): Promise<void>;
/** The cordis row shape: a plugin object (name + apply). */
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map