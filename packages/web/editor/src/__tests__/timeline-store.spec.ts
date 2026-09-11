import { describe, it, expect, beforeEach } from 'vitest'
import { useTimelineStore, flushPersist } from "@melite-plugin/timeline/ui/store"
import { primeCatalog } from '@melite/catalog'
import type { TimelineSegment } from "@melite/contracts"
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts"

// ─── Reset store between tests ───────────────────────────────────────────────
// E2.12: flushPersist before reset so any pending debounced write from the
// previous test doesn't race the reset and bring stale state back.
beforeEach(async () => {
  await flushPersist()
  useTimelineStore.getState().reset()
})

describe('TimelineStore — segment CRUD', () => {
  it('starts with zero segments', () => {
    const { segments } = useTimelineStore.getState()
    expect(segments).toHaveLength(0)
  })

  it('addSegment creates a segment with defaults', () => {
    const seg = useTimelineStore.getState().addSegment()
    expect(seg.id).toBeTruthy()
    expect(seg.order).toBe(0)
    expect(seg.start).toBe(0)
    expect(seg.duration).toBe(5)
    expect(seg.status).toBe('empty')
    expect(seg.prompt).toBe('')
    expect(seg.params.seed).toBe(42)
    expect(seg.params.fps).toBe(16) // VACE default
    expect(seg.params.model).toBe('wan-vace')
    expect(seg.params.profile).toBe('fast')
    expect(seg.params.motionAmplitude).toBe(1.0)
    expect(seg.negativePrompt).toBe('')
    // Phase 11 — lip-sync variant fields default to null/false
    expect(seg.lipSyncedVideoUrl).toBeNull()
    expect(seg.lipSyncPreferOriginal).toBe(false)

    const { segments } = useTimelineStore.getState()
    expect(segments).toHaveLength(1)
    expect(segments[0].id).toBe(seg.id)
  })

  it('addSegment respects partial overrides', () => {
    const seg = useTimelineStore.getState().addSegment({
      prompt: 'forest scene',
      duration: 10,
      status: 'ready',
      params: { ...DEFAULT_SEGMENT_PARAMS, seed: 99, width: 1024, height: 576, frames: 200, fps: 30, guideScale: 4.0 },
    })
    expect(seg.prompt).toBe('forest scene')
    expect(seg.duration).toBe(10)
    expect(seg.status).toBe('ready')
    expect(seg.params.seed).toBe(99)
    expect(seg.params.width).toBe(1024)
  })

  it('addSegment positions second segment after first', () => {
    useTimelineStore.getState().addSegment({ duration: 5 })
    const seg2 = useTimelineStore.getState().addSegment({ duration: 8 })
    expect(seg2.order).toBe(1)
    expect(seg2.start).toBe(5) // after first segment
  })

  it('removeSegment removes and re-indexes', () => {
    const s1 = useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    const s3 = useTimelineStore.getState().addSegment()

    useTimelineStore.getState().removeSegment(s2.id)

    const { segments } = useTimelineStore.getState()
    expect(segments).toHaveLength(2)
    expect(segments.map(s => s.id)).toEqual([s1.id, s3.id])
    // Re-indexed
    expect(segments[0].order).toBe(0)
    expect(segments[1].order).toBe(1)
  })

  it('removeSegment clears selectedSegmentId if that segment was selected', () => {
    const seg = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().setSelectedSegment(seg.id)
    useTimelineStore.getState().removeSegment(seg.id)
    expect(useTimelineStore.getState().selectedSegmentId).toBeNull()
  })

  it('updateSegment patches fields', () => {
    const seg = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().updateSegment(seg.id, {
      prompt: 'updated',
      duration: 15,
      status: 'generating',
    })
    const updated = useTimelineStore.getState().segments.find(s => s.id === seg.id)!
    expect(updated.prompt).toBe('updated')
    expect(updated.duration).toBe(15)
    expect(updated.status).toBe('generating')
  })

  it('updateSegment with params patch replaces entire params', () => {
    const seg = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().updateSegment(seg.id, {
      params: { ...seg.params, fps: 60 },
    })
    const updated = useTimelineStore.getState().segments.find(s => s.id === seg.id)!
    expect(updated.params.fps).toBe(60)
    expect(updated.params.seed).toBe(42) // other fields preserved
  })
})

// ─── G9: splitSegmentAtPlayhead ────────────────────────────────────────────
describe('TimelineStore — G9 split at playhead', () => {
  it('splits a segment into two halves', () => {
    useTimelineStore.getState().addSegment({
      prompt: 'hello',
      duration: 5,
      params: { ...DEFAULT_SEGMENT_PARAMS, frames: 80, fps: 16 }, // 5s at 16fps
    })
    // Playhead at 2s (mid-segment).
    useTimelineStore.getState().setPlayback({ currentTime: 2 })
    useTimelineStore.getState().splitSegmentAtPlayhead()

    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(2)
    // First half: 0 to ~2s, second half: ~2s to 5s
    expect(segs[0].start).toBe(0)
    expect(segs[0].duration).toBeCloseTo(2, 0)
    expect(segs[1].start).toBeCloseTo(2, 0)
    expect(segs[1].duration).toBeCloseTo(3, 0)
    // Prompt copied to both
    expect(segs[0].prompt).toBe('hello')
    expect(segs[1].prompt).toBe('hello')
    // Frames split proportionally
    expect(segs[0].params.frames).toBe(32)  // round(2 * 16)
    expect(segs[1].params.frames).toBe(48)  // 80 - 32
  })

  it('clears video URLs on split (invalidates render)', () => {
    useTimelineStore.getState().addSegment({
      duration: 5,
      status: 'ready',
      videoUrl: 'http://example.com/video.mp4',
      params: { ...DEFAULT_SEGMENT_PARAMS, frames: 80, fps: 16 },
    })
    useTimelineStore.getState().setPlayback({ currentTime: 2 })
    useTimelineStore.getState().splitSegmentAtPlayhead()

    const segs = useTimelineStore.getState().segments
    expect(segs[0].videoUrl).toBeNull()
    expect(segs[0].status).toBe('empty')
    expect(segs[1].videoUrl).toBeNull()
    expect(segs[1].status).toBe('empty')
  })

  it('partitions prompt beats across the split', () => {
    useTimelineStore.getState().addSegment({
      duration: 5,
      promptBeats: [
        { id: 'b1', time: 1, prompt: 'before' },
        { id: 'b2', time: 3, prompt: 'after' },
      ],
      params: { ...DEFAULT_SEGMENT_PARAMS, frames: 80, fps: 16 },
    })
    useTimelineStore.getState().setPlayback({ currentTime: 2 })
    useTimelineStore.getState().splitSegmentAtPlayhead()

    const segs = useTimelineStore.getState().segments
    // First half gets beat at t=1 (before split)
    expect(segs[0].promptBeats).toHaveLength(1)
    expect(segs[0].promptBeats![0].time).toBe(1)
    // Second half gets beat at t=3, re-relative to split point (3-2=1)
    expect(segs[1].promptBeats).toHaveLength(1)
    expect(segs[1].promptBeats![0].time).toBe(1) // 3 - 2 (split offset)
  })

  it('no-ops when playhead is outside any segment', () => {
    useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().setPlayback({ currentTime: 10 })
    useTimelineStore.getState().splitSegmentAtPlayhead()
    expect(useTimelineStore.getState().segments).toHaveLength(1)
  })

  it('no-ops when playhead is at segment boundary', () => {
    useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().setPlayback({ currentTime: 0 })
    useTimelineStore.getState().splitSegmentAtPlayhead()
    expect(useTimelineStore.getState().segments).toHaveLength(1)
  })

  it('increments seed on second half', () => {
    useTimelineStore.getState().addSegment({
      duration: 5,
      params: { ...DEFAULT_SEGMENT_PARAMS, frames: 80, fps: 16, seed: 100 },
    })
    useTimelineStore.getState().setPlayback({ currentTime: 2 })
    useTimelineStore.getState().splitSegmentAtPlayhead()

    const segs = useTimelineStore.getState().segments
    expect(segs[0].params.seed).toBe(100)
    expect(segs[1].params.seed).toBe(101)
  })
})

// ─── G11: Timeline JSON export/import ──────────────────────────────────────
describe('TimelineStore — G11 JSON export/import', () => {
  it('exportTimeline returns valid JSON with segments', () => {
    useTimelineStore.getState().addSegment({ prompt: 'scene A', duration: 5 })
    useTimelineStore.getState().addSegment({ prompt: 'scene B', duration: 3 })
    const json = useTimelineStore.getState().exportTimeline()
    const data = JSON.parse(json)
    expect(data.version).toBe(1)
    expect(data.segments).toHaveLength(2)
    expect(data.segments[0].prompt).toBe('scene A')
    expect(data.segments[1].prompt).toBe('scene B')
  })

  it('importTimeline replaces current timeline', () => {
    // Start with one segment
    useTimelineStore.getState().addSegment({ prompt: 'old', duration: 5 })
    expect(useTimelineStore.getState().segments).toHaveLength(1)

    // Import a new timeline with 2 segments
    const json = JSON.stringify({
      version: 1,
      segments: [
        { id: 'x1', order: 0, start: 0, duration: 4, prompt: 'new A', params: DEFAULT_SEGMENT_PARAMS },
        { id: 'x2', order: 1, start: 4, duration: 6, prompt: 'new B', params: DEFAULT_SEGMENT_PARAMS },
      ],
      audioCues: [],
    })
    const ok = useTimelineStore.getState().importTimeline(json)
    expect(ok).toBe(true)
    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(2)
    expect(segs[0].prompt).toBe('new A')
    expect(segs[1].prompt).toBe('new B')
  })

  it('importTimeline returns false on invalid JSON', () => {
    const ok = useTimelineStore.getState().importTimeline('not valid json{')
    expect(ok).toBe(false)
  })

  it('importTimeline returns false when segments missing', () => {
    const ok = useTimelineStore.getState().importTimeline(JSON.stringify({ version: 1 }))
    expect(ok).toBe(false)
  })

  it('export → import round-trip preserves data', () => {
    useTimelineStore.getState().addSegment({ prompt: 'round trip', duration: 7 })
    useTimelineStore.getState().addSegment({ prompt: 'second', duration: 3 })
    const json = useTimelineStore.getState().exportTimeline()
    useTimelineStore.getState().reset()
    expect(useTimelineStore.getState().segments).toHaveLength(0)
    useTimelineStore.getState().importTimeline(json)
    const segs = useTimelineStore.getState().segments
    expect(segs).toHaveLength(2)
    expect(segs[0].prompt).toBe('round trip')
    expect(segs[1].prompt).toBe('second')
  })
})

describe('TimelineStore — reorder', () => {
  it('reorderSegments reorders and recomputes start positions', () => {
    const s1 = useTimelineStore.getState().addSegment({ duration: 5 })
    const s2 = useTimelineStore.getState().addSegment({ duration: 8 })
    const s3 = useTimelineStore.getState().addSegment({ duration: 3 })

    // Reverse order: s3, s2, s1
    useTimelineStore.getState().reorderSegments([s3.id, s2.id, s1.id])

    const { segments } = useTimelineStore.getState()
    expect(segments[0].id).toBe(s3.id)
    expect(segments[0].order).toBe(0)
    expect(segments[0].start).toBe(0)

    expect(segments[1].id).toBe(s2.id)
    expect(segments[1].order).toBe(1)
    expect(segments[1].start).toBe(3) // s3.duration

    expect(segments[2].id).toBe(s1.id)
    expect(segments[2].order).toBe(2)
    expect(segments[2].start).toBe(11) // 3 + 8
  })

  it('reorderSegments updates totalDuration', () => {
    useTimelineStore.getState().addSegment({ duration: 5 })
    useTimelineStore.getState().addSegment({ duration: 8 })

    const before = useTimelineStore.getState().playback.totalDuration
    // Total should be sum of durations
    expect(before).toBe(13)
  })
})

describe('TimelineStore — playback', () => {
  it('setPlayback updates playback state', () => {
    useTimelineStore.getState().setPlayback({ isPlaying: true, currentTime: 2.5 })
    const { playback } = useTimelineStore.getState()
    expect(playback.isPlaying).toBe(true)
    expect(playback.currentTime).toBe(2.5)
  })
})

describe('TimelineStore — audio cues', () => {
  it('addAudioCue creates a cue with generated id', () => {
    useTimelineStore.getState().addAudioCue({
      track: 'voice',
      start: 0,
      duration: 5,
      label: 'Narration',
      audioUrl: '/audio/test.wav',
      volume: 0.8,
      waveformPeaks: null,
      audioB64: null,
      sourceStepId: 'voice',
    })
    const { audioCues } = useTimelineStore.getState()
    expect(audioCues).toHaveLength(1)
    expect(audioCues[0].track).toBe('voice')
    expect(audioCues[0].id).toBeTruthy()
  })

  it('removeAudioCue removes the cue', () => {
    useTimelineStore.getState().addAudioCue({
      track: 'sfx', start: 0, duration: 2, label: 'Boom',
      audioUrl: null, volume: 1, waveformPeaks: null, audioB64: null,
      sourceStepId: null,
    })
    const { audioCues } = useTimelineStore.getState()
    useTimelineStore.getState().removeAudioCue(audioCues[0].id)
    expect(useTimelineStore.getState().audioCues).toHaveLength(0)
  })

  it('removeAudioCue clears selectedAudioCueId if that cue was selected', () => {
    useTimelineStore.getState().addAudioCue({
      track: 'sfx', start: 0, duration: 2, label: 'Boom',
      audioUrl: null, volume: 1, waveformPeaks: null, audioB64: null,
      sourceStepId: null,
    })
    const cueId = useTimelineStore.getState().audioCues[0].id
    useTimelineStore.getState().setSelectedAudioCue(cueId)
    useTimelineStore.getState().removeAudioCue(cueId)
    expect(useTimelineStore.getState().selectedAudioCueId).toBeNull()
  })

  it('updateAudioCue patches fields', () => {
    useTimelineStore.getState().addAudioCue({
      track: 'music', start: 0, duration: 10, label: 'BGM',
      audioUrl: '/music.mp3', volume: 0.4, waveformPeaks: null, audioB64: null,
      sourceStepId: null,
    })
    const cueId = useTimelineStore.getState().audioCues[0].id
    useTimelineStore.getState().updateAudioCue(cueId, { volume: 0.7, label: 'Updated BGM' })
    const cue = useTimelineStore.getState().audioCues[0]
    expect(cue.volume).toBe(0.7)
    expect(cue.label).toBe('Updated BGM')
  })
})

describe('TimelineStore — reset', () => {
  it('reset clears all state', () => {
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addAudioCue({
      track: 'sfx', start: 0, duration: 2, label: 'Test',
      audioUrl: null, volume: 1, waveformPeaks: null, audioB64: null,
      sourceStepId: null,
    })
    useTimelineStore.getState().setSelectedSegment('anything')

    useTimelineStore.getState().reset()

    const state = useTimelineStore.getState()
    expect(state.segments).toHaveLength(0)
    expect(state.audioCues).toHaveLength(0)
    expect(state.selectedSegmentId).toBeNull()
    expect(state.selectedAudioCueId).toBeNull()
    expect(state.playback.isPlaying).toBe(false)
    expect(state.playback.currentTime).toBe(0)
  })
})

describe('TimelineStore — persistence', () => {
  it('persists segments to localStorage on addSegment', async () => {
    useTimelineStore.getState().addSegment({ prompt: 'test persistence', duration: 7 })
    // E2.12: persistence is debounced; flush before asserting.
    await flushPersist()
    const raw = localStorage.getItem('tech_noir_timeline')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.segments).toHaveLength(1)
    expect(parsed.segments[0].prompt).toBe('test persistence')
    expect(parsed.segments[0].duration).toBe(7)
  })

  it('persists segments on updateSegment', async () => {
    const seg = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().updateSegment(seg.id, { prompt: 'updated prompt', status: 'ready' })
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.segments[0].prompt).toBe('updated prompt')
    expect(parsed.segments[0].status).toBe('ready')
  })

  it('persists on removeSegment', async () => {
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    const segs = useTimelineStore.getState().segments
    useTimelineStore.getState().removeSegment(segs[0].id)
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.segments).toHaveLength(1)
  })

  it('persists audio cues on addAudioCue', async () => {
    useTimelineStore.getState().addAudioCue({
      track: 'music', start: 0, duration: 5, label: 'BGM',
      audioUrl: '/music.mp3', volume: 0.5, waveformPeaks: null, audioB64: null,
      sourceStepId: null,
    })
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.audioCues).toHaveLength(1)
    expect(parsed.audioCues[0].label).toBe('BGM')
  })

  it('persists audio tracks', async () => {
    useTimelineStore.getState().addAudioTrack('Test Track')
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.audioTracks).toHaveLength(1)
    expect(parsed.audioTracks[0].label).toBe('Test Track')
  })

  it('persists relay video state', async () => {
    const seg = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().setRelayVideo('http://example.com/video.mp4', [seg.id], 'asset-1')
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.relayVideoUrl).toBe('http://example.com/video.mp4')
    expect(parsed.relaySegmentIds).toEqual([seg.id])
    expect(parsed.relayAssetId).toBe('asset-1')
  })

  it('strip large data URLs from localStorage metadata (use IndexedDB placeholders)', async () => {
    const fakeB64 = 'data:video/mp4;base64,' + 'A'.repeat(1000)
    useTimelineStore.getState().addSegment({
      videoUrl: fakeB64,
      firstFrameB64: 'data:image/png;base64,AAABBB',
    })
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    const seg = parsed.segments[0]
    // The videoUrl and firstFrameB64 should be placeholder keys, NOT the actual data
    expect(seg.videoUrl).not.toBe(fakeB64)
    expect(seg.videoUrl).toMatch(/^TLB:/)
    expect(seg.firstFrameB64).toMatch(/^TLB:/)
  })

  it('leaves non-data-URL values as-is (no stripping for server URLs)', async () => {
    useTimelineStore.getState().addSegment({
      videoUrl: '/v1/wf/test/runs/123/artifacts/step/video.mp4',
    })
    await flushPersist()

    const raw = localStorage.getItem('tech_noir_timeline')
    const parsed = JSON.parse(raw!)
    expect(parsed.segments[0].videoUrl).toBe('/v1/wf/test/runs/123/artifacts/step/video.mp4')
  })

  it('reset clears localStorage timeline data', async () => {
    useTimelineStore.getState().addSegment()
    await flushPersist()
    expect(localStorage.getItem('tech_noir_timeline')).toBeTruthy()

    useTimelineStore.getState().reset()
    expect(localStorage.getItem('tech_noir_timeline')).toBeNull()
  })

  it('initialize restores segments from localStorage', async () => {
    // Write some timeline data directly to localStorage
    const segId = 'seg_restore_test'
    localStorage.setItem('tech_noir_timeline', JSON.stringify({
      segments: [{
        id: segId, order: 0, start: 0, duration: 5,
        prompt: 'restored!', negativePrompt: '', thumbnailUrl: null,
        videoUrl: null, firstFrameB64: null, lastFrameB64: null,
        params: { seed: 42, width: 768, height: 512, frames: 121, fps: 24,
          guideScale: 5, samplingSteps: 8, model: 'ltx2', guidePhases: 2,
          epsilon: 0.001, denoisingStrength: 1, inputVideoStrength: 1,
          spatialUpscale: false, loras: [], perturbationSwitch: 0,
          perturbationLayers: [28], perturbationStartPerc: 0, perturbationEndPerc: 100,
          cameraPanX: 0, cameraPanY: 0, cameraZoom: 1, resizeMethod: 'fit',
          distilledMode: true, apgSwitch: false, cfgStarSwitch: false,
          nagScale: 1, nagTau: 3.5, nagAlpha: 0.5, altGuideScale: 1,
          altScale: 0, audioGuideScale: 1, audioCfgScale: 1, sampleSolver: 'euler',
          selfRefinerSetting: 0, selfRefinerPlan: '', selfRefinerFUncertainty: 0.1,
          selfRefinerCertainPercentage: 0.999, slidingWindow: false,
          slidingWindowSize: 241, slidingWindowOverlap: 9, videoPromptType: '',
          maskingStrength: 0, maskingSource: '', outpaintingEnabled: false,
          outpaintingRatio: '', audioPromptType: '', enhancePrompt: false,
        },
        trimStart: 0, sourceStepId: null, status: 'ready', error: null,
        controlVideoUrl: null,
      }],
      audioCues: [],
      audioTracks: [],
      relayVideoUrl: null,
      relaySegmentIds: [],
      relayAssetId: null,
    }))

    await useTimelineStore.getState().initialize()

    const { segments, initialized } = useTimelineStore.getState()
    expect(initialized).toBe(true)
    expect(segments).toHaveLength(1)
    expect(segments[0].prompt).toBe('restored!')
    expect(segments[0].status).toBe('ready')
  })

  it('initialize handles empty localStorage gracefully', async () => {
    localStorage.removeItem('tech_noir_timeline')
    await useTimelineStore.getState().initialize()
    expect(useTimelineStore.getState().initialized).toBe(true)
    expect(useTimelineStore.getState().segments).toHaveLength(0)
  })

  it('initialize: catalog membership is the ONLY authority for persisted model ids', async () => {
    // Prime a minimal catalog — the migration check is membership-based:
    // persisted ids NOT in the catalog reset to the default route, real
    // catalog routes are kept. No legacy remap tables.
    primeCatalog({
      families: {
        'wan-vace': { label: 'Wan VACE', genre: 'video' },
        'krea-2': { label: 'Krea 2', genre: 'image' },
      },
      models: {
        'wan-vace': { family: 'wan-vace', form: 'form_video_director', label: 'wan-vace' },
        'krea-2': { family: 'krea-2', form: 'form_generate', label: 'krea-2' },
      },
    })
    const mkSeg = (id: string, model: string): TimelineSegment => ({
      id, order: 0, start: 0, duration: 5,
      prompt: '', negativePrompt: '', thumbnailUrl: null,
      videoUrl: null, firstFrameB64: null, lastFrameB64: null,
      params: { ...DEFAULT_SEGMENT_PARAMS, model },
      trimStart: 0, sourceStepId: null, status: 'empty', error: null,
      controlVideoUrl: null,
      lipSyncedVideoUrl: null, lipSyncPreferOriginal: false,
    })
    localStorage.setItem('tech_noir_timeline', JSON.stringify({
      segments: [
        mkSeg('s1', 'wan-vace'),           // legacy family id → reset
        mkSeg('s2', 'wan-vace-turbo'),     // legacy variant → reset
        mkSeg('s3', 'wan-vace-base'),      // legacy tier → reset (no remap table)
        mkSeg('s4', 'some-unknown-id'),    // non-catalog → reset
        mkSeg('s5', 'krea-2'),             // real catalog route → KEPT
      ],
      audioCues: [], audioTracks: [],
      relayVideoUrl: null, relaySegmentIds: [], relayAssetId: null,
    }))

    await useTimelineStore.getState().initialize()
    const { segments } = useTimelineStore.getState()
    expect(segments).toHaveLength(5)
    for (let i = 0; i < 4; i++) {
      expect(segments[i].params.model).toBe('wan-vace')
    }
    expect(segments[4].params.model).toBe('krea-2')
  })
})

// ─── G8: Multi-select + in/out points ─────────────────────────────────────

describe('TimelineStore — G8 multi-select', () => {
  it('setSelectedSegment clears multi-select on plain click', () => {
    useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    // Build a multi-select set manually.
    useTimelineStore.getState().selectAllSegments()
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(3)
    // Plain click → single-select.
    useTimelineStore.getState().setSelectedSegment(s2.id)
    expect(useTimelineStore.getState().selectedSegmentId).toBe(s2.id)
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(1)
    expect(useTimelineStore.getState().selectedSegmentIds.has(s2.id)).toBe(true)
  })

  it('selectSegmentRange selects range between anchor and target', () => {
    const s1 = useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    const s3 = useTimelineStore.getState().addSegment()
    const s4 = useTimelineStore.getState().addSegment()
    const s5 = useTimelineStore.getState().addSegment()
    // Anchor on s2.
    useTimelineStore.getState().setSelectedSegment(s2.id)
    // Shift-click s4 → range s2..s4 selected.
    useTimelineStore.getState().selectSegmentRange(s4.id)
    const ids = useTimelineStore.getState().selectedSegmentIds
    expect(ids.size).toBe(3)
    expect(ids.has(s2.id)).toBe(true)
    expect(ids.has(s3.id)).toBe(true)
    expect(ids.has(s4.id)).toBe(true)
    expect(ids.has(s1.id)).toBe(false)
    expect(ids.has(s5.id)).toBe(false)
    // Anchor stays as primary.
    expect(useTimelineStore.getState().selectedSegmentId).toBe(s2.id)
  })

  it('selectSegmentRange works backwards (target before anchor)', () => {
    const s1 = useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    const s3 = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().setSelectedSegment(s3.id)
    // Shift-click s1 → range s1..s3 selected.
    useTimelineStore.getState().selectSegmentRange(s1.id)
    const ids = useTimelineStore.getState().selectedSegmentIds
    expect(ids.size).toBe(3)
    expect(ids.has(s1.id)).toBe(true)
    expect(ids.has(s2.id)).toBe(true)
    expect(ids.has(s3.id)).toBe(true)
  })

  it('selectSegmentRange with no anchor just single-selects', () => {
    useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    // Clear selection first (no anchor).
    useTimelineStore.getState().setSelectedSegment(null)
    useTimelineStore.getState().selectSegmentRange(s2.id)
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(1)
    expect(useTimelineStore.getState().selectedSegmentId).toBe(s2.id)
  })

  it('toggleSegmentInSelection adds segments', () => {
    const s1 = useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().setSelectedSegment(s1.id)
    // Ctrl-click s2 → toggle on.
    useTimelineStore.getState().toggleSegmentInSelection(s2.id)
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(2)
    expect(useTimelineStore.getState().selectedSegmentIds.has(s2.id)).toBe(true)
  })

  it('toggleSegmentInSelection removes segments', () => {
    const s1 = useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().setSelectedSegment(s1.id)
    useTimelineStore.getState().toggleSegmentInSelection(s2.id)
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(2)
    // Toggle s2 off.
    useTimelineStore.getState().toggleSegmentInSelection(s2.id)
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(1)
    expect(useTimelineStore.getState().selectedSegmentIds.has(s2.id)).toBe(false)
  })

  it('toggleSegmentInSelection clears primary when set empties', () => {
    const s1 = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().setSelectedSegment(s1.id)
    // Toggle s1 off → set empties, primary clears.
    useTimelineStore.getState().toggleSegmentInSelection(s1.id)
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(0)
    expect(useTimelineStore.getState().selectedSegmentId).toBeNull()
  })

  it('clearMultiSelection collapses to just the primary', () => {
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().selectAllSegments()
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(3)
    useTimelineStore.getState().clearMultiSelection()
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(1)
  })

  it('selectAllSegments selects every segment', () => {
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().selectAllSegments()
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(3)
  })

  it('removeSegment cleans up the multi-select set', () => {
    const s1 = useTimelineStore.getState().addSegment()
    const s2 = useTimelineStore.getState().addSegment()
    useTimelineStore.getState().selectAllSegments()
    expect(useTimelineStore.getState().selectedSegmentIds.has(s1.id)).toBe(true)
    useTimelineStore.getState().removeSegment(s1.id)
    expect(useTimelineStore.getState().selectedSegmentIds.has(s1.id)).toBe(false)
    expect(useTimelineStore.getState().selectedSegmentIds.has(s2.id)).toBe(true)
  })
})

describe('TimelineStore — G8 in/out points', () => {
  it('markInAtPlayhead sets the in point', () => {
    useTimelineStore.getState().addSegment({ duration: 10 })
    useTimelineStore.getState().setPlayback({ currentTime: 3 })
    useTimelineStore.getState().markInAtPlayhead()
    const io = useTimelineStore.getState().inOutPoints
    expect(io).not.toBeNull()
    expect(io!.start).toBe(3)
  })

  it('markInAtPlayhead clears out point if before playhead', () => {
    useTimelineStore.getState().addSegment({ duration: 10 })
    // Set out at 2s.
    useTimelineStore.getState().setPlayback({ currentTime: 2 })
    useTimelineStore.getState().markOutAtPlayhead()
    // Mark in at 5s → out should be pushed past 5.
    useTimelineStore.getState().setPlayback({ currentTime: 5 })
    useTimelineStore.getState().markInAtPlayhead()
    const io = useTimelineStore.getState().inOutPoints
    expect(io!.start).toBe(5)
    expect(io!.end).toBeGreaterThan(5)
  })

  it('markOutAtPlayhead sets the out point', () => {
    useTimelineStore.getState().addSegment({ duration: 10 })
    useTimelineStore.getState().setPlayback({ currentTime: 7 })
    useTimelineStore.getState().markOutAtPlayhead()
    const io = useTimelineStore.getState().inOutPoints
    expect(io).not.toBeNull()
    expect(io!.end).toBe(7)
  })

  it('markOutAtPlayhead defaults in to 0 if unset', () => {
    useTimelineStore.getState().addSegment({ duration: 10 })
    useTimelineStore.getState().setPlayback({ currentTime: 5 })
    useTimelineStore.getState().markOutAtPlayhead()
    const io = useTimelineStore.getState().inOutPoints
    expect(io!.start).toBe(0)
    expect(io!.end).toBe(5)
  })

  it('markOutAtPlayhead pushes in back to 0 if playhead before in', () => {
    useTimelineStore.getState().addSegment({ duration: 10 })
    // Mark in at 5s.
    useTimelineStore.getState().setPlayback({ currentTime: 5 })
    useTimelineStore.getState().markInAtPlayhead()
    // Mark out at 2s (before in).
    useTimelineStore.getState().setPlayback({ currentTime: 2 })
    useTimelineStore.getState().markOutAtPlayhead()
    const io = useTimelineStore.getState().inOutPoints
    expect(io!.start).toBe(0)
    expect(io!.end).toBe(2)
  })

  it('markSelectionFromPlayhead spans segments under playhead', () => {
    useTimelineStore.getState().addSegment({ start: 0, duration: 3 })
    useTimelineStore.getState().addSegment({ start: 3, duration: 4 })
    useTimelineStore.getState().addSegment({ start: 7, duration: 3 })
    // Playhead at 4s → in s2 (3..7).
    useTimelineStore.getState().setPlayback({ currentTime: 4 })
    useTimelineStore.getState().markSelectionFromPlayhead()
    const io = useTimelineStore.getState().inOutPoints
    expect(io).not.toBeNull()
    expect(io!.start).toBe(3)
    expect(io!.end).toBe(7)
  })

  it('markSelectionFromPlayhead is a no-op when playhead outside any segment', () => {
    useTimelineStore.getState().addSegment({ start: 0, duration: 3 })
    useTimelineStore.getState().setPlayback({ currentTime: 10 })
    useTimelineStore.getState().markSelectionFromPlayhead()
    expect(useTimelineStore.getState().inOutPoints).toBeNull()
  })

  it('setInOutPoints normalizes order (min/max)', () => {
    useTimelineStore.getState().setInOutPoints(8, 2)
    const io = useTimelineStore.getState().inOutPoints
    expect(io!.start).toBe(2)
    expect(io!.end).toBe(8)
  })

  it('clearInOutPoints nulls the range', () => {
    useTimelineStore.getState().setInOutPoints(1, 5)
    useTimelineStore.getState().clearInOutPoints()
    expect(useTimelineStore.getState().inOutPoints).toBeNull()
  })

  it('reset clears both multi-select and in/out', () => {
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().addSegment()
    useTimelineStore.getState().selectAllSegments()
    useTimelineStore.getState().setInOutPoints(1, 3)
    useTimelineStore.getState().reset()
    expect(useTimelineStore.getState().selectedSegmentIds.size).toBe(0)
    expect(useTimelineStore.getState().inOutPoints).toBeNull()
  })
})
