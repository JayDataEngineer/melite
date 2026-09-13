/**
 * preview.tsx — THE SHARED PREVIEW COMPONENTS (the preview seam's
 * built-in claims, hour-9 2026-09-13 — the operator's law: "Where
 * the VIDEO PREVIEW and the IMAGE PREVIEW of other cards go in a
 * SLOT with SHARED DSH PRIMITIVES"). One preview per media kind,
 * DSH-pure: native media elements on card-base chrome, DSW tokens
 * BARE (no fallbacks — the hour-8 name law), zero bespoke islands.
 *
 * These are the DEFAULTS the pattern prescribes (the ui-tool law:
 * "central default views"); a card claims its kind's preview only
 * to specialize — the h3 studio rides the shared VIDEO preview for
 * its hero, exactly as an image-gen card rides the IMAGE one.
 */
import { createElement as h } from 'react'
import { GlbStagePreview } from './glb-stage.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'
import { cn } from './chrome.ts'
import s from './preview.module.css'

/** THE VIDEO PREVIEW — one hero film, one native player (the kit's
 *  FilmPlayer law: native <video controls>; no library, no kit). The
 *  stitch/hero is artifacts[0]; named windows follow in the strip
 *  row. Honest empty state while no artifact has landed. */
export function VideoStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const hero = props.artifacts[0]
  return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-video' },
    hero === undefined
      ? h('div', { className: s.empty },
          props.runStatus === 'running' ? 'rendering… the film lands here' : 'No render yet — run lands the film here')
      : h('video', {
          className: s.hero, controls: true, playsInline: true, key: hero.url,
          src: hero.url, 'data-testid': 'stage-preview-video-hero',
        }),
    props.artifacts.length > 1
      ? h('div', { className: s.strip },
          props.artifacts.slice(1, 12).map((a) => h('a', {
            key: a.url + a.name, className: s.stripLink, href: a.url, target: '_blank', rel: 'noreferrer',
            title: a.name,
          }, a.name)))
      : null,
  )
}

/** THE IMAGE PREVIEW — the latest render hero (native <img>), the
 *  gallery thumbs beneath. Same chrome, same law. */
export function ImageStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const hero = props.artifacts[0]
  return h('div', { className: cn(s.stagePreview), 'data-testid': 'stage-preview-image' },
    hero === undefined
      ? h('div', { className: s.empty },
          props.runStatus === 'running' ? 'rendering… the image lands here' : 'No render yet — run lands the image here')
      : h('img', { className: s.heroImg, key: hero.url, src: hero.url, alt: hero.name, 'data-testid': 'stage-preview-image-hero' }),
    props.artifacts.length > 1
      ? h('div', { className: s.thumbRow },
          props.artifacts.slice(1, 12).map((a) => h('img', {
            key: a.url, className: s.thumb, src: a.url, alt: a.name, loading: 'lazy',
          })))
      : null,
  )
}

/** THE AUDIO PREVIEW — one hero track, one native player (the same
 *  law as the video preview: native <audio controls>; no library).
 *  Named clips follow in the strip row. */
export function AudioStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  const hero = props.artifacts[0]
  return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-audio' },
    hero === undefined
      ? h('div', { className: s.empty },
          props.runStatus === 'running' ? 'rendering… the track lands here' : 'No render yet — run lands the track here')
      : h('audio', {
          className: s.heroAudio, controls: true, key: hero.url,
          src: hero.url, 'data-testid': 'stage-preview-audio-hero',
        }),
    props.artifacts.length > 1
      ? h('div', { className: s.strip },
          props.artifacts.slice(1, 12).map((a) => h('a', {
            key: a.url + a.name, className: s.stripLink, href: a.url, target: '_blank', rel: 'noreferrer',
            title: a.name,
          }, a.name)))
      : null,
  )
}

/** THE MESH PREVIEW — the seam's adapter onto the raw-three
 *  multi-asset stage (GlbStagePreview, the substrate law: NO
 *  @react-three in any client bundle). Artifacts become stage
 *  assets; the empty hint honors the live-run flag. */
export function MeshStagePreview(props: PreviewOwnerProps): ReturnType<typeof h> {
  return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-mesh' },
    h(GlbStagePreview, {
      assets: props.artifacts.map((a, i) => ({ id: `${props.stageId}:${a.name || i}`, url: a.url, name: a.name })),
      emptyHint: props.runStatus === 'running' ? 'rendering… the mesh lands here' : 'No render yet — run lands the mesh here',
    }),
  )
}

/** THE MESH PREVIEW — the raw-three multi-asset stage (the substrate
 *  law: NO @react-three in any client bundle). Re-exported here so
 *  the preview seam stays ONE subpath: import { GlbStagePreview }
 *  from '@melite/card-base/preview'. */
export { GlbStagePreview, autoFitToHeight, type StageAsset } from './glb-stage.tsx'
export { ViewportFrame, ViewportAnchor, ReferenceImageBadge } from './viewportChrome.tsx'
export type { ViewportFrameProps, ViewportAnchorProps, ReferenceImageBadgeProps, ViewportAnchorDock } from './viewportChrome.tsx'
