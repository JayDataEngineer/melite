/**
 * drilldown.tsx — THE MEDIA DRILLDOWN, one component for every surface
 * (the operator's hour-24 order: "clicking the preview component should
 * mirror the media drilldown view 1:1"). Extracted VERBATIM from the
 * gallery's MediaPanel Overlay — the gallery's media tiles and the
 * cards' stage previews ride the SAME face: DSH's Modal (headless —
 * body portal, mask, Escape, aria-modal and focus handling are the
 * primitive's, never ours), the kind-switched full-size artifact, the
 * caption, the esc hint.
 *
 * The gallery's MediaItem EXTENDS MediaDrilldownItem; the cards map
 * their stage artifact onto it (mesh kind → 'model' — the media vocab
 * alignment, one spelling).
 */
import * as React from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'

import css from './client/overlay.module.css'
import { bgBase1, labelPrimary2, stateBusinessPrimary, textTertiary3 } from './client/ui.tokens'

/** The drilldown's own currency — everything the face reads, nothing
 *  it doesn't (the gallery's richer item satisfies it structurally). */
export interface MediaDrilldownItem {
  kind: 'image' | 'video' | 'audio' | 'model'
  url: string
  file: string
  head: string
  time: string
}

/** 3D artifact view — hands the artifact to the sidebar as a RESOURCE
 *  (estate-artifact address, claimed by a viewer tab type; the mesh
 *  renders in the right panel, orbitable beside the run list).
 *  The download link stays: when the viewer plugin is absent no tab
 *  type claims the address and openResource is a no-op — the artifact
 *  must still be reachable. openArtifact is OPTIONAL: a surface with
 *  no sidebar door (the card zoom) simply hides the link. */
function ModelView({ item, openArtifact }: { item: MediaDrilldownItem; openArtifact?: (item: MediaDrilldownItem) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      {openArtifact !== undefined
        ? (
            <a
              role="button"
              tabIndex={0}
              style={{ color: stateBusinessPrimary, fontSize: 14, cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); openArtifact(item) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); openArtifact(item) } }}
            >open 3D view in sidebar</a>
          )
        : null}
      <a
        href={item.url}
        download={item.file}
        style={{ color: textTertiary3, fontSize: 13, cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation() }}
      >download {item.file}</a>
    </div>
  )
}

/** THE MEDIA DRILLDOWN (the gallery Overlay, verbatim — one face). */
export function MediaDrilldown({ item, onClose, openArtifact }: {
  item: MediaDrilldownItem
  onClose: () => void
  openArtifact?: (item: MediaDrilldownItem) => void
}): React.JSX.Element {
  return (
    <Modal
      open
      onClose={onClose}
      title={item.file || 'media preview'}
      headless
      className={css.lightbox}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
        {item.kind === 'video'
          ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, background: bgBase1 }}
              />
            )
          : item.kind === 'audio'
            ? (
                <audio
                  src={item.url}
                  controls
                  autoPlay
                  style={{ width: 'min(560px, 90vw)' }}
                />
              )
            : item.kind === 'model'
            ? (
                <ModelView item={item} openArtifact={openArtifact} />
              )
            : item.kind === 'image'
            ? (
                <img
                  src={item.url}
                  alt={item.file}
                  style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, objectFit: 'contain' }}
                />
              )
            : null}
        <div style={{ color: labelPrimary2, fontSize: 13, maxWidth: '80vw', textAlign: 'center', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{item.head}</div>
          <div style={{ opacity: 0.7 }}>{[item.time, item.file].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ color: textTertiary3, fontSize: 12 }}>Esc or click the mask to close</div>
      </div>
    </Modal>
  )
}
