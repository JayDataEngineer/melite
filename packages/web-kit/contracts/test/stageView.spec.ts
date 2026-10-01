import { expect, test } from 'vitest'

import {
  cardResultFromRecord,
  projectStageView,
  projectUpstreamStages,
  type StageViewOwnerProps,
} from '../src/stageView.ts'

function owner(
  row: Record<string, unknown> = {},
  over: Partial<StageViewOwnerProps> = {},
): StageViewOwnerProps {
  return {
    stageId: 's_1',
    cardName: 'motion',
    row,
    runStatus: '',
    onPatch: () => {},
    onRun: () => {},
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    upstream: [],
    runId: null,
    ...over,
  }
}

test('cardResultFromRecord normalizes artifacts, media, metadata, gallery, and previews', () => {
  expect(cardResultFromRecord(null)).toBeNull()
  expect(cardResultFromRecord({ artifacts: { good: '/a', empty: '', number: 3 }, assetUrls: ['/a', '', 3] })).toEqual({
    artifacts: { good: '/a' },
    assetUrls: ['/a'],
    metadata: {},
  })
  expect(cardResultFromRecord({
    artifacts: { video: '/video' },
    assetUrls: ['/video'],
    metadata: { runId: 'run-1' },
    durationSec: 2.5,
    gallery: [null, 'bad', { name: 'gallery', url: '/gallery' }, { name: '', url: '/bad' }, { name: 5, url: '/bad' }],
    motionPreviews: [
      null,
      { label: 'pose', url: null, artifact: 'pose.npz' },
      { label: '', url: '/bad', artifact: 'bad' },
      { label: 5, url: '/bad', artifact: 'bad' },
      { label: 'missing-url', artifact: 'missing' },
    ],
  })).toEqual({
    artifacts: { video: '/video' },
    assetUrls: ['/video'],
    metadata: { runId: 'run-1' },
    durationSec: 2.5,
    gallery: [{ name: 'gallery', url: '/gallery' }],
    motionPreviews: [
      { label: 'pose', url: null, artifact: 'pose.npz' },
      { label: 'missing-url', url: null, artifact: 'missing' },
    ],
  })
  expect(cardResultFromRecord({
    artifacts: { video: '/video' },
    durationSec: 'bad',
    gallery: 'bad',
    motionPreviews: 'bad',
  })).toEqual({ artifacts: { video: '/video' }, assetUrls: [], metadata: {} })
})

test('cardResultFromRecord omits empty gallery and preview collections', () => {
  expect(cardResultFromRecord({
    artifacts: { video: '/video' },
    gallery: [null, {}, { name: '', url: '/no-name' }, { name: 'no-url', url: '' }],
    motionPreviews: [null, {}, { label: '', artifact: 'no-label' }, { label: 'no-artifact', artifact: '' }],
  })).toEqual({ artifacts: { video: '/video' }, assetUrls: [], metadata: {} })
})

test('projectStageView preserves effective identity, wiring, results, and host context', () => {
  const props = owner({
    card: '',
    title: '',
    service: '',
    resolved: { model: 'resolved-model' },
    params: { model: 'bench-model', prompt: 'bench' },
    inputs: {
      source: { stage: 's_0' },
      mask: { stage: 's_2', output: 'mask' },
      initial: { initial: 'image' },
      invalid: { stage: 3 },
    },
     result: {
       artifacts: { video: '/video', empty: '', count: 3 },
       assetUrls: ['/video', '', 7],
       metadata: { error: 'failed in metadata', runId: 'run-meta' },
     },
     history: [{ run_id: 'run-old', url: '/old.mp4' }],
     tags: ['ai_generated', 'other'],
    saveToAssets: false,
  }, {
    runStatus: 'done',
    effective: {
      model: 'client-model',
      params: { model: 'client-model', prompt: 'effective' },
      inputSlots: ['source', 'mask', 'initial', '', 3] as unknown as string[],
    },
    priorStageIds: ['s_0', 's_2'],
  })
  expect(projectStageView(props, {
    kind: 'motion-studio',
    service: 'motion-service',
    genre: 'motion',
  })).toEqual({
    id: 's_1',
    title: 'motion',
    kind: 'motion-studio',
    service: 'motion-service',
    model: 'client-model',
    genre: 'motion',
    tags: ['ai_generated'],
    params: { model: 'client-model', prompt: 'effective' },
    inputSlots: ['source', 'mask', 'initial'],
    inputBindings: [
      { slot: 'source', source: { stage: 's_0' } },
      { slot: 'mask', source: { stage: 's_2', output: 'mask' } },
      { slot: 'initial', source: { initial: true } },
    ],
    inputs: ['s_0', 's_2'],
    inputOutputs: [null, 'mask', null],
    inputIndices: [0, 1],
     result: {
       artifacts: { video: '/video' },
       assetUrls: ['/video'],
       metadata: { error: 'failed in metadata', runId: 'run-meta' },
     },
     history: [{ run_id: 'run-old', url: '/old.mp4' }],
     status: 'done',
    error: 'failed in metadata',
    runId: 'run-meta',
    saveToAssets: false,
  })
})

test('projectStageView falls back through row identity and permits an explicit null result', () => {
  const noCard = projectStageView(owner({
    params: { model: 'bench-model' },
    inputs: { source: { stage: 'u_0' } },
  }, {
    upstream: [{ id: 'u_0', title: 'upstream', url: '/upstream' }],
  }))
  expect(noCard).toMatchObject({
    id: 's_1',
    title: 'motion',
    kind: 'motion',
    service: 'motion',
    model: 'bench-model',
    inputs: ['u_0'],
    inputIndices: [0],
    result: null,
    status: 'pending',
    runId: null,
  })
  expect(noCard.genre).toBeUndefined()
  expect(noCard.tags).toBeUndefined()
  expect(noCard.inputSlots).toBeUndefined()
  expect(noCard.error).toBeUndefined()
  expect(noCard.saveToAssets).toBeUndefined()
  const bare = projectStageView(owner())
  expect(bare.inputBindings).toBeUndefined()
  expect(bare.inputOutputs).toBeUndefined()

  const explicitNull = projectStageView(owner({
    card: 'timeline',
    service: 'timeline-service',
    model: 'row-model',
    resolved: { model: 'resolved-model' },
    result: { artifacts: { video: '/video' }, metadata: {} },
    error: 'row failure',
    runId: 'run-row',
    tags: 'bad',
    saveToAssets: 'bad',
  }), { result: () => null })
  expect(explicitNull).toMatchObject({
    title: 'timeline',
    kind: 'timeline',
    service: 'timeline-service',
    model: 'resolved-model',
    result: null,
    error: 'row failure',
    runId: 'run-row',
  })
  expect(projectStageView(owner({ resolved: { model: 'resolved-only' } })).model).toBe('resolved-only')
  expect(projectStageView(owner({})).model).toBe('motion')
})

test('projectStageView uses stage identity when the owner has no card name', () => {
  expect(projectStageView(owner({}, { cardName: '' }))).toMatchObject({
    id: 's_1',
    title: 's_1',
    kind: 'stage',
    service: 'stage',
    model: 'stage',
  })
})

test('projectStageView maps every run status and result run identity', () => {
  // the full fold table (2026-10-01, pending→queued same day): the
  // estate's own words (completed/succeeded/success) fold to done;
  // every failure word folds to error; every stopped word
  // (stopped/interrupted/unknown) folds to stopped; wind-down
  // (stopping) reads running; the estate's queued-for-start stage
  // word (pending) reads queued — agreeing with isLiveRunStatus, its
  // own live set — while the no-information words (the dead 'ready'
  // sentinel, garbage, the empty word) alone read pending: never a
  // dot, never a spinner.
  const statuses = [
    ['done', 'done'],
    ['completed', 'done'],
    ['succeeded', 'done'],
    ['success', 'done'],
    ['failed', 'error'],
    ['error', 'error'],
    ['running', 'running'],
    ['live', 'running'],
    ['stopping', 'running'],
    ['queued', 'queued'],
    ['pending', 'queued'],
    ['stopped', 'stopped'],
    ['interrupted', 'stopped'],
    ['unknown', 'stopped'],
    ['stale', 'stale'],
    ['cached', 'cached'],
    ['skipped', 'skipped'],
    ['reused', 'reused'],
    ['ready', 'pending'],
    ['gibberish', 'pending'],
  ] as const
  for (const [runStatus, expected] of statuses) {
    expect(projectStageView(owner({}, { runStatus })).status).toBe(expected)
  }
  expect(projectStageView(owner({}, { runStatus: 'x', runId: 'run-owner' })).runId).toBe('run-owner')
  expect(projectStageView(owner({ result: { error: 'result failure', runId: 'run-result', assets: [] } })).runId).toBe('run-result')
  expect(projectStageView(owner({ result: { run_id: 'run-snake', assetUrls: ['/asset'] } })).runId).toBe('run-snake')
  expect(projectStageView(owner({ result: { error: 'result failure', assetUrls: ['/asset'] } })).error).toBe('result failure')
})

test('projectUpstreamStages maps candidates with defaults and card-specific faces', () => {
  const props = owner({}, {
    upstream: [
      { id: 'u_0', title: '', url: '' },
      { id: 'u_1', title: 'up.png', url: '/up.png' },
    ],
  })
  expect(projectUpstreamStages(props)).toEqual([
    {
      id: 'u_0',
      title: '',
      kind: 'image',
      service: '',
      genre: 'image',
      params: {},
      inputs: [],
      inputIndices: [],
      result: { artifacts: {}, assetUrls: [], metadata: {} },
      status: 'done',
    },
    {
      id: 'u_1',
      title: 'up.png',
      kind: 'image',
      service: '',
      genre: 'image',
      params: {},
      inputs: [],
      inputIndices: [],
      result: { artifacts: { 'up.png': '/up.png' }, assetUrls: ['/up.png'], metadata: {} },
      status: 'done',
    },
  ])
  expect(projectUpstreamStages(props, { kind: 'mesh', service: '3d', genre: '3d' })[1]).toMatchObject({
    kind: 'mesh',
    service: '3d',
    genre: '3d',
  })
})
