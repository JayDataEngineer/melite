/**
 * The run-status PURE laws' unit plane (stroke 81: the transport
 * walls moved to melite-card-view over the bind seam; what remains
 * here is transport-free — the status-row normalize, the ONE url
 * rewrite, the terminal vocabulary, and the catalog door).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  defaultFamilyForCard,
  fetchCardFamilies,
  isTerminalRun,
  listArtifactMediaUrl,
  listRowMediaUrl,
  readGraphReceipt,
  readRunStatus,
  resetCardFamiliesCache,
  toRunMediaUrl,
} from '../src/index.ts'

afterEach(() => {
  vi.restoreAllMocks()
  resetCardFamiliesCache()
})
describe('the status law (readRunStatus)', () => {
  it('bare run-relative urls ride the media route once; absolute pass verbatim', () => {
    const row = readRunStatus('r/1', {
      status: 'running',
      draft_id: 'bench-main',
      stages: [
        { id: 's_1', status: 'running', url: 'out/mesh.glb' },
        { id: 's_2', status: 'done', url: '/melite-media/runs/r%2F1/flat.png' },
        { id: 's_3', status: 'done', url: 'https://x/y.png' },
        { id: 's_4', status: 'queued' },
      ],
    })
    expect(row.stages[0]?.url).toBe('/melite-media/runs/r%2F1/out/mesh.glb')
    expect(row.stages[1]?.url).toBe('/melite-media/runs/r%2F1/flat.png')
    expect(row.stages[2]?.url).toBe('https://x/y.png')
    expect(row.stages[3]?.url).toBeUndefined()
    expect(row.draftId).toBe('bench-main')
  })

  it('the tap fold rides through: live progress + activity kept, junk dropped', () => {
    // THE PROGRESS CARRY (2026-09-13, the operator's "forward the
    // comfyui progress webhooks like before"): well-formed
    // {value,max} + activity strings pass verbatim; malformed pairs
    // and empty strings drop (terminal rows carry none — the
    // finisher deletes).
    const row = readRunStatus('r1', {
      status: 'running',
      stages: [
        { id: 's_1', status: 'running', progress: { value: 7, max: 20 }, activity: 'sampling 7/20' },
        { id: 's_2', status: 'running', progress: { value: 'x', max: 20 }, activity: '' },
      ],
    })
    expect(row.stages[0]?.progress).toEqual({ value: 7, max: 20 })
    expect(row.stages[0]?.activity).toBe('sampling 7/20')
    expect(row.stages[1]?.progress).toBeUndefined()
    expect(row.stages[1]?.activity).toBeUndefined()
  })

  it('a missing draft_id is null; terminal statuses are the seat vocabulary', () => {
    const row = readRunStatus('r1', { status: 'completed', stages: [] })
    expect(row.draftId).toBeNull()
    expect(isTerminalRun('completed')).toBe(true)
    expect(isTerminalRun('failed')).toBe(true)
    expect(isTerminalRun('stopped')).toBe(true)
    expect(isTerminalRun('running')).toBe(false)
  })

  // THE SILENT-FAILURE CURE (2026-09-13): runs/status serves the
  // ComfyUI refusal on stages[].error + the run-level error — the
  // reader must CARRY it, not drop it (a dropped reason reads as
  // "no response at all" in the UI).
  it('carries the stage error and the run-level error (the silent-failure cure)', () => {
    const row = readRunStatus('r/1', {
      status: 'failed',
      error: 'ComfyError: POST /prompt 400 value_not_in_list',
      stages: [
        { id: 'edit', status: 'error', url: '', error: "clip_name 'x' not in [14 clips]" },
        { id: 'clean', status: 'done', url: 'ok.png', error: '' },
      ],
    })
    expect(row.status).toBe('failed')
    expect(row.error).toBe('ComfyError: POST /prompt 400 value_not_in_list')
    expect(row.stages[0]?.error).toBe("clip_name 'x' not in [14 clips]")
    // empty-string errors are deleted (absent ≡ empty, never a
    // phantom "error:" caption on a healthy stage)
    expect(row.stages[1]?.error).toBeUndefined()
  })

  it('absent errors stay absent (no phantom keys on healthy rows)', () => {
    const row = readRunStatus('r1', {
      status: 'completed',
      stages: [{ id: 's', status: 'done', url: 'a.png' }],
    })
    expect(row.error).toBeUndefined()
    expect(row.stages[0]?.error).toBeUndefined()
  })
})

describe('the url laws (pure)', () => {
  it('toRunMediaUrl is the one rewrite (bare rides the route; absolute and rooted pass)', () => {
    expect(toRunMediaUrl('r1', 'img-to-mesh/f.glb')).toBe('/melite-media/runs/r1/img-to-mesh/f.glb')
    expect(toRunMediaUrl('r1', '/already/rooted.png')).toBe('/already/rooted.png')
    expect(toRunMediaUrl('r1', 'https://cdn/x.png')).toBe('https://cdn/x.png')
  })

  it('listArtifactMediaUrl roots run-prefixed urls; verbatim arms pass', () => {
    expect(listArtifactMediaUrl('r1/img-to-mesh/f.glb')).toBe('/melite-media/runs/r1/img-to-mesh/f.glb')
    expect(listArtifactMediaUrl('')).toBeNull()
    expect(listArtifactMediaUrl('/rooted/x.png')).toBe('/rooted/x.png')
    expect(listArtifactMediaUrl('https://cdn/x.png')).toBe('https://cdn/x.png')
  })
})

describe('the graph-receipt fold (readGraphReceipt, the purge P1)', () => {
  const completeDoc = {
    nodes: 2,
    populated: ['guidance', 'prompt'],
    carried: ['guidance', 'prompt'],
    dropped: [],
    verdict: 'complete',
    stages: [
      { stage: 's_0', nodes: 2, populated: ['guidance', 'prompt'], carried: ['guidance', 'prompt'], dropped: [], verdict: 'complete' },
    ],
  }

  it('a well-formed receipt rides verbatim (run rollup + per-stage rows)', () => {
    const row = readRunStatus('r1', { status: 'completed', stages: [], graph_receipt: completeDoc })
    expect(row.graph_receipt).toEqual(completeDoc)
  })

  it('the execute stamp rides: a string prompt_id is carried', () => {
    const row = readRunStatus('r1', {
      status: 'completed', stages: [], graph_receipt: { ...completeDoc, prompt_id: 'p-1' },
    })
    expect(row.graph_receipt?.prompt_id).toBe('p-1')
  })

  it('absent stays absent (inline runs stamp no receipt — never a phantom key)', () => {
    const row = readRunStatus('r1', { status: 'completed', stages: [] })
    expect(row.graph_receipt).toBeUndefined()
    expect('graph_receipt' in row).toBe(false)
  })

  it('malformed is absent, never a throw (a broken receipt is no receipt)', () => {
    // verdict outside the vocabulary
    expect(readGraphReceipt({ ...completeDoc, verdict: 'lost' })).toBeUndefined()
    // dropped with a non-string entry
    expect(readGraphReceipt({ ...completeDoc, dropped: ['ok', 42] })).toBeUndefined()
    // a stage row missing its verdict
    expect(readGraphReceipt({
      ...completeDoc,
      stages: [{ stage: 's_0', nodes: 2, populated: [], carried: [], dropped: [] }],
    })).toBeUndefined()
    // a non-string prompt_id poisons the shape
    expect(readGraphReceipt({ ...completeDoc, prompt_id: 42 })).toBeUndefined()
    // not an object at all
    expect(readGraphReceipt('graph_receipt')).toBeUndefined()
    expect(readGraphReceipt(null)).toBeUndefined()
    // and through the row fold: the status still reads, the receipt drops
    const row = readRunStatus('r1', { status: 'completed', stages: [], graph_receipt: { verdict: 'lost' } })
    expect(row.status).toBe('completed')
    expect(row.graph_receipt).toBeUndefined()
  })

  it('the rejection lattice is total (every early-refuse arm names its own malformed shape)', () => {
    // an ARRAY is not a receipt object (the typeof-object pass admits
    // arrays — the Array.isArray refuse is its own arm)
    expect(readGraphReceipt([])).toBeUndefined()
    // a non-number nodes count (the rollup's own gate, never a stage's)
    expect(readGraphReceipt({ ...completeDoc, nodes: '2' })).toBeUndefined()
    // a top-level list that is not an array at all (the !Array.isArray
    // clause — the 42-entry arm above covers only the .every refuse)
    expect(readGraphReceipt({ ...completeDoc, populated: 'guidance' })).toBeUndefined()
    // stages not an array (a naked object row is not a list of rows)
    expect(readGraphReceipt({ ...completeDoc, stages: { stage: 's_0' } })).toBeUndefined()
    // a stage row that is not an object (the list carried, its entry junk)
    expect(readGraphReceipt({ ...completeDoc, stages: ['s_0'] })).toBeUndefined()
    // the null entry and the nested-array entry (the same refuse's
    // remaining clauses — the lattice is total)
    expect(readGraphReceipt({ ...completeDoc, stages: [null] })).toBeUndefined()
    expect(readGraphReceipt({ ...completeDoc, stages: [[]] })).toBeUndefined()
    // an OBJECT row that never names its stage/nodes (the row-shape
    // gate one clause past the object gate — { } is an object)
    expect(readGraphReceipt({ ...completeDoc, stages: [{}] })).toBeUndefined()
    expect(readGraphReceipt({ ...completeDoc, stages: [{ stage: 's_0', nodes: '2' }] })).toBeUndefined()
    // a stage row's own list gate (same lattice, one level down)
    expect(readGraphReceipt({
      ...completeDoc,
      stages: [{ stage: 's_0', nodes: 2, populated: {}, carried: [], dropped: [], verdict: 'complete' }],
    })).toBeUndefined()
  })
})
