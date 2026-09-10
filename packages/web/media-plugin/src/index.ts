/**
 * `@infer-media/dsh-media` — HOST ONLY, and now an EMPTY host.
 *
 * THE ESTATE COLLAPSE, E4 (docs/plans/estate-collapse-2026-09-10.md):
 * this host half once ran TWO handrolled routes — /infer-media/runs (a
 * server-side merge that re-fetched this host's OWN doors over loopback
 * HTTP, validated rows, and rewrote artifact URLs) and
 * /infer-media/artifact (a byte-streaming proxy with a gateway
 * allowlist + range semantics). Both duplicated what the estate doors
 * already serve same-origin: the client feed rides /v1/flows/runs and
 * /v1/flows/drafts DIRECTLY, artifacts and thumbnails are the door's
 * own root-relative /v1/assets/runs/* URLs, and range semantics live in
 * the assets door (py-parity _parse_range). Nothing here survived the
 * 1:1 pass — the row exists so the bundle loads and owns its client
 * half; apply mounts nothing.
 */
import type { Context } from '@deepseek-ai/cordis'

export const name = 'infer-media'

export function apply(_ctx: Context): void {
  /* intentionally empty — see the header law */
}
