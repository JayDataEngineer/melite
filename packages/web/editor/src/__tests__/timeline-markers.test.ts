/**
 * E2.7 — Chapter marker store tests.
 *
 * Verifies add / remove / update / clear behavior plus sort-by-time
 * invariant and reset() semantics.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore } from "@melite-plugin/timeline/ui/store"

beforeEach(() => {
  useTimelineStore.getState().reset()
})

describe('E2.7 — chapter markers', () => {
  it('starts with no markers', () => {
    expect(useTimelineStore.getState().markers).toEqual([])
  })

  it('addMarker at explicit time', () => {
    const m = useTimelineStore.getState().addMarker(2.5)
    expect(m.time).toBe(2.5)
    expect(m.label).toBe('Marker 1')
    expect(useTimelineStore.getState().markers).toHaveLength(1)
  })

  it('addMarker defaults to playhead when no time given', () => {
    useTimelineStore.getState().setPlayback({ currentTime: 4.2 })
    const m = useTimelineStore.getState().addMarker()
    expect(m.time).toBe(4.2)
  })

  it('auto-increments label', () => {
    useTimelineStore.getState().addMarker(1.0)
    useTimelineStore.getState().addMarker(2.0)
    const m3 = useTimelineStore.getState().addMarker(3.0)
    expect(m3.label).toBe('Marker 3')
  })

  it('clamps time to >= 0', () => {
    const m = useTimelineStore.getState().addMarker(-5)
    expect(m.time).toBe(0)
  })

  it('keeps markers sorted by time after insert', () => {
    useTimelineStore.getState().addMarker(5)
    useTimelineStore.getState().addMarker(1)
    useTimelineStore.getState().addMarker(3)
    const markers = useTimelineStore.getState().markers
    expect(markers.map(m => m.time)).toEqual([1, 3, 5])
  })

  it('removeMarker by id', () => {
    const a = useTimelineStore.getState().addMarker(1)
    const b = useTimelineStore.getState().addMarker(2)
    useTimelineStore.getState().removeMarker(a.id)
    const markers = useTimelineStore.getState().markers
    expect(markers).toHaveLength(1)
    expect(markers[0].id).toBe(b.id)
  })

  it('updateMarker label', () => {
    const m = useTimelineStore.getState().addMarker(1)
    useTimelineStore.getState().updateMarker(m.id, { label: 'Intro' })
    expect(useTimelineStore.getState().markers[0].label).toBe('Intro')
  })

  it('updateMarker retime re-sorts', () => {
    const a = useTimelineStore.getState().addMarker(1)
    const b = useTimelineStore.getState().addMarker(2)
    useTimelineStore.getState().updateMarker(b.id, { time: 0.5 })
    const markers = useTimelineStore.getState().markers
    expect(markers.map(m => m.time)).toEqual([0.5, 1])
    expect(markers[0].id).toBe(b.id)
    expect(markers[1].id).toBe(a.id)
  })

  it('clearMarkers empties the list', () => {
    useTimelineStore.getState().addMarker(1)
    useTimelineStore.getState().addMarker(2)
    useTimelineStore.getState().clearMarkers()
    expect(useTimelineStore.getState().markers).toEqual([])
  })

  it('reset() clears markers', () => {
    useTimelineStore.getState().addMarker(1)
    useTimelineStore.getState().reset()
    expect(useTimelineStore.getState().markers).toEqual([])
  })
})
