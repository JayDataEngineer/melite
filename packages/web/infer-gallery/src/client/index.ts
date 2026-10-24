/**
 * `@melite-plugin/dsh-gallery` — browser half.
 *
 * THE FULL PORT (2026-09-11, operator order: the media sidebar lost
 * its features to the migrations — "there isn't even a modal anymore").
 * The deleted @infer-media/dsh-media package's feature set returns onto
 * the gallery's package + routes: the registration follows the deleted
 * client and the shipped tabs (dsh-card-view's cards tab,
 * dsh-card-deck's comfy-manager) — the `ui-sidebar-right` tab registry
 * carries the type + guide row, the `sidebar.right.pane.tab` slot
 * carries the body.
 *
 * SINGLE-TAB SHAPE (operator order, later the same day — the
 * standalone Flows tab read as a second sidebar entry beside Media):
 * ONE tab only — Media (kind 'media', guide order 51). The composed
 * action cards (drafts) live exclusively behind the Media panel's
 * segmented Flows/Artifacts toggle (the flows face over
 * /infer-gallery/drafts, click loads onto the bench and opens the
 * cards tab). The deleted package's second registration
 * (infer-media:flows, kind 'flows', order 52) is deliberately NOT
 * restored; its component file died with it — no unregistered dead
 * tab code ships.
 *
 * The body is self-driving (useFeed → the gallery's own host routes —
 * no transport threading, the panel carries its own fetch caller).
 *
 * The seats this entry touches ride TYPE-ONLY imports (the card-view
 * entry's pattern, D4 cure 2026-11-05): the real registry/slot types
 * merge onto Context from the owning DSH packages' ./client entries,
 * so `ctx.sidebarRightTabs` / `ctx.slots` carry their declared faces —
 * a DSH registry-shape change surfaces at compile time, never as a
 * frozen local interface that passes while the truth moves.
 *
 * DOUBLE-APPLY LAW (D3 cure 2026-11-05, the estate pattern from
 * card-view): no module-global claim guard. apply runs once per page
 * by the loader's contract; a genuine second application collides at
 * the registries themselves and the per-site catches log it (walled by
 * tests/client-registration.spec.ts's double-apply arm).
 *
 * This entry is deliberately JSX-free (the shared preset only
 * discovers src/client/index.ts); the glyph lives in MediaPanel.tsx.
 *
 * The store + view exports below remain for headless harnesses.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry —
// the renderer owns ctx.slots, sidebar-right owns ctx.sidebarRightTabs.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { MediaPanel, MediaTabIcon } from './MediaPanel.tsx'
import { ArtifactTabBody } from './mesh-view.tsx'
import { artifactUrlOfAddress } from './artifact-address.ts'
import { artifactNameOf } from './artifact-ops.ts'
import { galleryCopy } from './galleryCopy.ts'

import { setContractToastSink } from '@melite/catalog'
import { useToastStore } from '@melite/card-base/client'

// CONTRACT TOASTS — wire the inlined catalog contract stores to the
// row's toast store (the one host that outlives every reporting
// surface); verdicts surface from the same instance that renders them.
setContractToastSink((type, message, action) => {
  useToastStore.getState().addToast(type, message, action)
})

/** The tab type's identity (the id its body registers under — the
 *  deleted package's contract spelling, restored). */
const MEDIA_TAB_ID = 'infer-media:media'
/** The estate-artifact resource type's identity (its body registers under it). */
const ESTATE_ARTIFACT_TAB_ID = 'infer-media:estate-artifact'

/** Required services (fiber inject waiting — the tab registry must be
 *  up first). NO uiSession: the pane-tab slot itself threads the
 *  session-scoped standard props to the body (the deliverables
 *  ReviewTab receipt — sessionId arrives as a prop). */
export const inject = ['slots', 'sidebarRightTabs']

/**
 * Client apply: registers
 * the Media tab (type + body) exactly as the deleted client and the
 * shipped tabs do.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  // Stage one — the tab type (page kind: no patterns, opened by kind
  // from the guide row). Logged, never thrown (shell law).
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: MEDIA_TAB_ID,
      kind: 'media',
      title: (): string => galleryCopy.mediaTabTitle,
      guide: [{
        id: 'media-tab-guide',
        order: 51,
        title: (): string => galleryCopy.mediaTabTitle,
        description: (): string => galleryCopy.mediaTabGuide,
        icon: MediaTabIcon,
      }],
    }), 'melite-gallery: media tab type')
  } catch (error: unknown) {
    console.error('[melite-gallery] media tab type registration failed:', error)
  }

  // Stage two — the body, dispatched under the type's id. THE
  // CANONICAL SEAT (2026-10-24, the deliverables receipt): the
  // shell's pane-tab slot threads the session-scoped standard props
  // to every body — useTabInfo AND sessionId arrive as PROPS (the
  // reference consumer, dsh-client-ui-deliverables' ReviewTab,
  // destructures exactly that face). MediaPanel IS that face; the
  // 2026-11-06 factory read uiSession.adapter.current (the MAIN
  // binding — absent on this host) and its explicit
  // sessionId={undefined} OVERWROTE the standard prop the forward
  // already delivered, so restores kept landing on 'main'
  // (gallery-draft-open's red). The props are the seam.
  try {
    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: MEDIA_TAB_ID },
      MediaPanel,
    ))
  } catch (error: unknown) {
    console.error('[melite-gallery] media tab body registration failed:', error)
  }

  // The estate-artifact tab (2026-09-10's cross-plugin contract, in-tree
  // since the external glb viewer left the profile): a RESOURCE type
  // claiming `dsh-resource://estate-artifact/**` — the address's b64url
  // segment decodes to the artifact URL, and THIS package's mesh seat
  // renders it. The media panel's model tiles open it through the
  // standard openResource hook; without this claim that open throws
  // (an address nothing claims is a refusal, not a no-op).
  try {
    ctx.effect(() => ctx.sidebarRightTabs.register({
      id: ESTATE_ARTIFACT_TAB_ID,
      kind: 'estate-artifact',
      patterns: ['dsh-resource://estate-artifact/**'],
      priority: 'builtin',
      title: (address: string): string => {
        const url = artifactUrlOfAddress(address)
        return url !== null ? artifactNameOf(url) : galleryCopy.artifactFallbackTitle
      },
    }), 'melite-gallery: estate-artifact tab type')
  } catch (error: unknown) {
    console.error('[melite-gallery] estate-artifact tab type registration failed:', error)
  }

  try {
    ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
      { name: 'sidebar.right.pane.tab', key: ESTATE_ARTIFACT_TAB_ID },
      ArtifactTabBody,
    ))
  } catch (error: unknown) {
    console.error('[melite-gallery] estate-artifact tab body registration failed:', error)
  }
}

// Re-exported for headless harnesses; the loader consumes only name/inject/apply.
export { MediaPanel, MediaTabIcon, kindOf, callsTextOf, flatten } from './MediaPanel.tsx'
export { artifactPathOfUrl, deleteArtifact, renameArtifact } from './artifact-ops.ts'
export { loadDraftOntoBench, loadRunOntoBench, cardsBenchAddress, cardsRunAddress } from './bench-load.ts'
export { useFeed } from './useFeed.ts'
export { decodeRuns, decodeDrafts } from './decode.ts'
export type { GalleryRunRow, RunArtifact, DraftRow } from './decode.ts'
export { MEDIA_KINDS } from './media-kinds.ts'
