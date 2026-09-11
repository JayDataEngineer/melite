/**
 * E2.5 — Audio track mute/solo state in the timeline store.
 *
 *   - setTrackMuted toggles the muted flag
 *   - setTrackSolo toggles the solo flag
 *   - mute and solo persist via the standard persist path (we just
 *     verify the in-memory state here; persistence is covered by the
 *     existing timeline-store tests).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore } from "@melite-plugin/timeline/ui/store"

beforeEach(() => {
  useTimelineStore.getState().reset()
})

describe('E2.5 — setTrackMuted', () => {
  it('sets muted=true on the named track', () => {
    const t = useTimelineStore.getState().addAudioTrack('Music')
    useTimelineStore.getState().setTrackMuted(t.id, true)
    const after = useTimelineStore.getState().audioTracks.find(x => x.id === t.id)
    expect(after?.muted).toBe(true)
  })

  it('sets muted=false on the named track', () => {
    const t = useTimelineStore.getState().addAudioTrack('Music')
    useTimelineStore.getState().setTrackMuted(t.id, true)
    useTimelineStore.getState().setTrackMuted(t.id, false)
    const after = useTimelineStore.getState().audioTracks.find(x => x.id === t.id)
    expect(after?.muted).toBe(false)
  })

  it('does not affect other tracks', () => {
    const a = useTimelineStore.getState().addAudioTrack('Music')
    const b = useTimelineStore.getState().addAudioTrack('Vo')
    useTimelineStore.getState().setTrackMuted(a.id, true)
    const ba = useTimelineStore.getState().audioTracks.find(x => x.id === a.id)
    const bb = useTimelineStore.getState().audioTracks.find(x => x.id === b.id)
    expect(ba?.muted).toBe(true)
    expect(bb?.muted).toBeFalsy()
  })
})

describe('E2.5 — setTrackSolo', () => {
  it('sets solo=true on the named track', () => {
    const t = useTimelineStore.getState().addAudioTrack('Music')
    useTimelineStore.getState().setTrackSolo(t.id, true)
    const after = useTimelineStore.getState().audioTracks.find(x => x.id === t.id)
    expect(after?.solo).toBe(true)
  })

  it('does NOT automatically clear solo on other tracks (UI does that)', () => {
    // Multiple tracks can be soloed simultaneously (solo-in-group semantics).
    // The useAudioPlayback hook treats any-solo as "only soloed tracks pass".
    const a = useTimelineStore.getState().addAudioTrack('Music')
    const b = useTimelineStore.getState().addAudioTrack('Vo')
    useTimelineStore.getState().setTrackSolo(a.id, true)
    useTimelineStore.getState().setTrackSolo(b.id, true)
    const after = useTimelineStore.getState().audioTracks
    expect(after.find(x => x.id === a.id)?.solo).toBe(true)
    expect(after.find(x => x.id === b.id)?.solo).toBe(true)
  })
})
