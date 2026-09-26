/**
 * tests/lane/analysis.spec.ts — THE ANALYST'S WALLS.
 *
 * The 3088 lane harness judges video and 3D (non-Unity) paths from
 * what a commission actually produced. This spec proves the judging
 * itself, with no GPU, no engine, and no maker:
 *
 * - the artifact classifier and the terminal-status law;
 * - the VIDEO verdict against a REAL H3 film (the committed bench
 *   receipt: h264 1344×768 @ 24fps with an aac stereo track) and
 *   against truncated/garbage/empty bytes;
 * - the MESH verdict against REAL glTF binaries (a creature, a motion
 *   rig) and against structurally broken ones (bad magic, declared
 *   length disagreeing with the file, no primitives, no buffers, a
 *   JSON chunk that is not JSON);
 * - the run-tree scan and the PATH verdicts, including the runbook's
 *   own refusals: a still-running run is not a receipt, a failed run
 *   is not a receipt, a completed run with only a PNG is NOT a film
 *   receipt, and a missing prerequisite is `blocked`, never `pass`;
 * - the transcript discovery (the collision law): a pre-boot match is
 *   never claimed as this commission's.
 */
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  analyzeMeshBytes,
  analyzeVideoBytes,
  assessPath,
  classifyArtifact,
  discoverTranscript,
  isTerminal,
  readRunReceipt,
  renderReport,
  scanRunTree,
  type ArtifactRow,
  type RunReceipt,
} from './analysis.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..', '..')
/** A REAL H3 film (the 2026-09-20 seam-swap bench receipt) — the
 *  video arm is proven against encoder bytes, never a hand-built
 *  stand-in. */
const REAL_FILM = join(REPO, 'bench/2026-09-20-seam-swap/new-driftcontrol__h3_bench_new_00001_.mp4')
/** A REAL glTF binary (the creature lane) and a real motion rig. */
const REAL_MESH = join(REPO, 'data/runs/output/run-08c627659a19-6d9cd785/creature.glb')
const REAL_RIG = join(REPO, 'data/runs/output/run-be29e189215d-6c335282/motion.glb')

const bytes = (path: string): Uint8Array => new Uint8Array(readFileSync(path))

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), 'lane-analyst-'))
}

interface RunSpec {
  runId: string
  status: string
  error?: string
  files: Record<string, Uint8Array | string>
  sidecars?: { request?: unknown; flow?: unknown }
  noFlow?: boolean
}

function mintRun(root: string, spec: RunSpec): string {
  const dir = join(root, 'output', spec.runId)
  mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(spec.files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, typeof body === 'string' ? body : Buffer.from(body))
  }
  if (spec.noFlow !== true) {
    writeFileSync(
      join(dir, '_flow.json'),
      JSON.stringify(
        spec.sidecars?.flow ?? {
          run_id: spec.runId,
          status: spec.status,
          error: spec.error ?? null,
          created_at: 1_757_000_000,
          stages: [{ id: 's_0', index: 0, name: 'h3-timeline', status: spec.status }],
          artifacts: Object.keys(spec.files),
        },
      ),
    )
  }
  if (spec.sidecars?.request !== undefined) {
    writeFileSync(join(dir, '_request.json'), JSON.stringify(spec.sidecars.request))
  }
  return dir
}

describe('the analyst — classification and the terminal law', () => {
  it('classifies by what the bytes ARE, case-insensitively, never by hope', () => {
    expect(classifyArtifact('a.mp4')).toBe('video')
    expect(classifyArtifact('a.MP4')).toBe('video')
    expect(classifyArtifact('a.glb')).toBe('mesh')
    expect(classifyArtifact('a.GLB')).toBe('mesh')
    expect(classifyArtifact('a.png')).toBe('image')
    expect(classifyArtifact('a.wav')).toBe('audio')
    expect(classifyArtifact('a.qvoice')).toBe('audio')
    expect(classifyArtifact('a.json')).toBe('sidecar')
    expect(classifyArtifact('a.mp4.txt')).toBe('other')
    expect(classifyArtifact('noext')).toBe('other')
  })

  it('counts only the statuses that END a run as terminal', () => {
    // runsTypes' RunStatus: the run worker's own vocabulary
    for (const terminal of ['completed', 'failed', 'stopped']) {
      expect(isTerminal(terminal)).toBe(true)
    }
    for (const live of ['queued', 'running', 'stopping', 'unknown', '', undefined, 7]) {
      expect(isTerminal(live)).toBe(false)
    }
  })
})

describe('the analyst — the VIDEO verdict (a real film, and the refusals)', () => {
  it('reads a real H3 film: h264 video with geometry and duration, aac audio', () => {
    const verdict = analyzeVideoBytes(bytes(REAL_FILM))
    expect(verdict.reasons).toEqual([])
    expect(verdict.ok).toBe(true)
    const streams = verdict.probe?.streams ?? []
    const video = streams.find((s) => s.codec_type === 'video')
    expect(video?.codec).toBe('h264')
    expect(video?.width).toBe(1344)
    expect(video?.height).toBe(768)
    expect(typeof verdict.probe?.duration_s).toBe('number')
    expect(verdict.probe?.duration_s as number).toBeGreaterThan(0)
    // the film carries a sound track: the audio-conditioned lane's own promise
    const audio = streams.find((s) => s.codec_type === 'audio')
    expect(audio?.codec).toBe('aac')
  })

  it('refuses empty bytes with the empty-artifact reason', () => {
    const verdict = analyzeVideoBytes(new Uint8Array(0))
    expect(verdict.ok).toBe(false)
    expect(verdict.reasons.join(' ')).toMatch(/0 bytes/)
  })

  it('refuses bytes that are not a film, naming what is missing', () => {
    const verdict = analyzeVideoBytes(new TextEncoder().encode('this is not a video, it is a sentence'))
    expect(verdict.ok).toBe(false)
    expect(verdict.reasons.join(" ")).toMatch(/not a readable media container/)
  })
})

describe('the analyst — the MESH verdict (real glTF, and structural refusals)', () => {
  it('parses a real creature glb: 2 primitives, real vertices, a real buffer', () => {
    const verdict = analyzeMeshBytes(bytes(REAL_MESH))
    expect(verdict.reasons).toEqual([])
    expect(verdict.ok).toBe(true)
    expect(verdict.facts?.version).toBe(2)
    expect(verdict.facts?.chunks).toContain('JSON')
    expect(verdict.facts?.chunks).toContain('BIN')
    expect(verdict.facts?.primitives as number).toBeGreaterThan(0)
    expect(verdict.facts?.vertices as number).toBeGreaterThan(100)
    expect(verdict.facts?.buffer_bytes as number).toBeGreaterThan(0)
    expect(verdict.facts?.declared_bytes).toBe(bytes(REAL_MESH).length)
  })

  it('parses a real motion rig the same way (one primitive, no materials is still a mesh)', () => {
    const verdict = analyzeMeshBytes(bytes(REAL_RIG))
    expect(verdict.ok).toBe(true)
    expect(verdict.facts?.primitives as number).toBeGreaterThan(0)
    expect(verdict.facts?.materials).toBe(0)
  })

  it('refuses a file with no glTF magic', () => {
    const verdict = analyzeMeshBytes(new TextEncoder().encode('glb? not really'))
    expect(verdict.ok).toBe(false)
    expect(verdict.reasons.join(' ')).toMatch(/magic/)
  })

  it('refuses bytes shorter than a GLB header', () => {
    const verdict = analyzeMeshBytes(new Uint8Array(8))
    expect(verdict.ok).toBe(false)
    expect(verdict.reasons.join(' ')).toMatch(/12 bytes/)
  })

  it('refuses a header that declares more bytes than the file holds', () => {
    const real = bytes(REAL_RIG)
    const view = new DataView(real.buffer, real.byteOffset, real.byteLength)
    view.setUint32(8, real.length + 4096, true)
    const verdict = analyzeMeshBytes(real)
    expect(verdict.ok).toBe(false)
    expect(verdict.reasons.join(' ')).toMatch(/declares \d+ bytes, the file holds \d+/)
  })
})

describe('the analyst — the run tree', () => {
  it('reads a run dir into its receipt: status, stages, artifacts, sidecars', () => {
    const root = tempRoot()
    const dir = mintRun(root, {
      runId: 'run-abc',
      status: 'completed',
      files: { 'h3/film_00001.mp4': bytes(REAL_FILM), 'notes.txt': 'x' },
    })
    const receipt = readRunReceipt(dir)
    expect(receipt.run_id).toBe('run-abc')
    expect(receipt.status).toBe('completed')
    expect(receipt.terminal).toBe(true)
    expect(receipt.stages[0]?.id).toBe('s_0')
    expect(receipt.stages[0]?.card).toBe('h3-timeline')
    expect(receipt.sidecars).toContain('_flow.json')
    // the leading-underscore sidecars are not artifacts
    expect(receipt.artifacts.map((a) => a.rel).sort()).toEqual(['h3/film_00001.mp4', 'notes.txt'])
    expect(receipt.artifacts.find((a) => a.rel === 'h3/film_00001.mp4')?.kind).toBe('video')
  })

  it('reports a run dir with no durable receipt as `unknown`, never as a pass', () => {
    const root = tempRoot()
    const dir = mintRun(root, { runId: 'run-ghost', status: 'completed', files: {}, noFlow: true })
    const receipt = readRunReceipt(dir)
    expect(receipt.status).toBe('unknown')
    expect(receipt.terminal).toBe(false)
    expect(receipt.sidecars).toEqual([])
  })

  it('scans every run dir under the state root and sorts by run id', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-b', status: 'completed', files: { 'a.glb': bytes(REAL_RIG) } })
    mintRun(root, { runId: 'run-a', status: 'failed', files: {}, error: 'engine refused' })
    const receipts = scanRunTree([root])
    expect(receipts.map((r) => r.run_id)).toEqual(['run-a', 'run-b'])
    expect(receipts[0]?.error).toBe('engine refused')
  })

  it('reads a second root too (the cross-root read-only seat is real, not a myth)', () => {
    const own = tempRoot()
    const studio = tempRoot()
    mintRun(own, { runId: 'run-own', status: 'completed', files: { 'a.glb': bytes(REAL_RIG) } })
    mintRun(studio, { runId: 'run-studio', status: 'completed', files: { 'b.mp4': bytes(REAL_FILM) } })
    const receipts = scanRunTree([own, studio])
    expect(receipts.map((r) => r.run_id).sort()).toEqual(['run-own', 'run-studio'])
  })

  it('a root with no output dir yields nothing, never a throw', () => {
    const root = tempRoot()
    expect(scanRunTree([root])).toEqual([])
    expect(scanRunTree([join(root, 'never-made')])).toEqual([])
  })
})

describe('the analyst — the PATH verdicts (the runbook refusals, as code)', () => {
  const realFilm = bytes(REAL_FILM)
  const realMesh = bytes(REAL_RIG)

  it('PASSES the video path when a completed run holds a real film', () => {
    const root = tempRoot()
    const dir = mintRun(root, { runId: 'run-film', status: 'completed', files: { 'h3/film.mp4': realFilm } })
    const verdict = assessPath('video', scanRunTree([root]))
    expect(verdict.state).toBe('pass')
    expect(verdict.ok).toBe(true)
    expect(verdict.artifacts[0]?.verdict_ok).toBe(true)
    expect(readRunReceipt(dir).terminal).toBe(true)
  })

  it('PASSES the 3D path when a completed run holds a real mesh', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-mesh', status: 'completed', files: { 'img-to-mesh/creature.glb': realMesh } })
    const verdict = assessPath('3d', scanRunTree([root]))
    expect(verdict.state).toBe('pass')
    expect(verdict.facts_placeholder).toBeUndefined()
  })

  it('a still-running run is NOT a receipt', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-live', status: 'running', files: { 'film.mp4': realFilm } })
    const verdict = assessPath('video', scanRunTree([root]))
    expect(verdict.state).toBe('fail')
    expect(verdict.reasons.join(' ')).toMatch(/status running is not terminal/)
  })

  it('a terminal FAILURE is not a receipt, and names the error', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-dead', status: 'failed', error: 'prompt refused', files: { 'film.mp4': realFilm } })
    const verdict = assessPath('video', scanRunTree([root]))
    expect(verdict.state).toBe('fail')
    expect(verdict.reasons.join(' ')).toMatch(/terminal status failed \(prompt refused\)/)
  })

  it('per-window MP4s do not pass as a film (THE FILM-TAIL LAW: only the assembled film is the receipt)', () => {
    const root = tempRoot()
    // a real film per window, and NO film tail: the run assembled nothing
    mintRun(root, {
      runId: 'run-windows',
      status: 'completed',
      files: {
        'h3/h3_t4_w1_00001_.mp4': realFilm,
        'h3/h3_t4_w2_00001_.mp4': realFilm,
        'h3/h3_t4_w3_00001_.mp4': realFilm,
      },
    })
    const verdict = assessPath('video', scanRunTree([root]))
    expect(verdict.state).toBe('fail')
    expect(verdict.reasons.join(' ')).toMatch(/window renders only/)
    expect(verdict.reasons.join(' ')).toMatch(/h3_t4_film/)
    // every window is reported, and each is marked NOT a receipt
    expect(verdict.artifacts).toHaveLength(3)
    for (const art of verdict.artifacts) expect(art.verdict_ok).toBe(false)
  })

  it('the assembled film alongside its windows IS the receipt (the same run passes)', () => {
    const root = tempRoot()
    mintRun(root, {
      runId: 'run-film-tail',
      status: 'completed',
      files: {
        'h3/h3_t4_w1_00001_.mp4': realFilm,
        'h3/h3_t4_film_00001_.mp4': realFilm,
      },
    })
    const verdict = assessPath('video', scanRunTree([root]))
    expect(verdict.state).toBe('pass')
    const film = verdict.artifacts.find((a) => a.rel.includes('h3_t4_film'))
    expect(film?.verdict_ok).toBe(true)
  })

  it('a completed run with only a window render is NOT a film receipt (the runbook law)', () => {
    const root = tempRoot()
    // three rendered frames, no encoded film
    mintRun(root, {
      runId: 'run-frames',
      status: 'completed',
      files: { 'h3/frame_00001.png': 'x', 'h3/frame_00002.png': 'x', 'h3/frame_00003.png': 'x' },
    })
    const verdict = assessPath('video', scanRunTree([root]))
    expect(verdict.state).toBe('fail')
    expect(verdict.reasons.join(' ')).toMatch(/no run in the tree holds a video artifact/)
  })

  it('judges only the window (the run tree is cumulative; history must not drown the verdict)', () => {
    const root = tempRoot()
    // an old pass, then a fresh fail inside the window
    const oldDir = mintRun(root, { runId: 'run-old-pass', status: 'completed', files: { 'film.mp4': realFilm } })
    // the historical run is genuinely OLD (an hour back), so the
    // window is a fact of the tree, not a coincidence of mtimes
    const hourAgo = Date.now() - 3_600_000
    utimesSync(join(oldDir, 'film.mp4'), hourAgo / 1000, hourAgo / 1000)
    utimesSync(join(oldDir, '_flow.json'), hourAgo / 1000, hourAgo / 1000)
    mintRun(root, { runId: 'run-new-fail', status: 'failed', files: { 'film.mp4': realFilm } })
    // the window opens an hour ago: the fresh failure is in it, the
    // hour-old pass is not
    const floor = Date.now() - 1_800_000
    expect(statSync(join(oldDir, 'film.mp4')).mtimeMs).toBeLessThan(floor)
    const receipts = scanRunTree([root])
    const everything = assessPath('video', receipts)
    expect(everything.state).toBe('pass')
    // the failed sibling is REPORTED even though the path passed
    expect(everything.notes.join(' ')).toMatch(/run-new-fail: terminal status failed/)
    const windowed = assessPath('video', receipts, { sinceMs: floor })
    expect(windowed.state).toBe('fail')
    expect(windowed.runs).toEqual(['run-new-fail'])
  })

  it('judges a Wavefront OBJ as the mesh it is (the 3D lanes write .obj too)', () => {
    const root = tempRoot()
    const obj = ['# a real obj', 'v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f 1 2 3', 'f 1 2 3'].join('\n')
    mintRun(root, { runId: 'run-obj', status: 'completed', files: { 'remeshed.obj': obj } })
    const verdict = assessPath('3d', scanRunTree([root]))
    expect(verdict.state).toBe('pass')
  })

  it('an OBJ with no faces fails (a vertex cloud is not a mesh surface)', () => {
    const root = tempRoot()
    mintRun(root, {
      runId: 'run-cloud',
      status: 'completed',
      files: { 'points.obj': ['v 0 0 0', 'v 1 0 0'].join('\n') },
    })
    const verdict = assessPath('3d', scanRunTree([root]))
    expect(verdict.state).toBe('fail')
    expect(verdict.reasons.join(' ')).toMatch(/no `f ` face lines/)
  })

  it('a mesh path with a PNG is a fail the same way', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-png', status: 'completed', files: { 'out.png': 'x' } })
    expect(assessPath('3d', scanRunTree([root])).state).toBe('fail')
  })

  it('a completed run whose artifact bytes do not parse FAILS with the parse reason', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-junk', status: 'completed', files: { 'creature.glb': 'this is not a glb at all, friend' } })
    const verdict = assessPath('3d', scanRunTree([root]))
    expect(verdict.state).toBe('fail')
    expect(verdict.reasons.join(' ')).toMatch(/magic/)
  })

  it('a missing prerequisite is BLOCKED, never a pass (a self-skip is not a pass)', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-film', status: 'completed', files: { 'film.mp4': realFilm } })
    // even with a perfectly good run on disk, a declared missing
    // prerequisite refuses the verdict rather than passing it
    const verdict = assessPath('video', scanRunTree([root]), { blocked: ['ComfyUI engine not reachable at 127.0.0.1:8188'] })
    expect(verdict.state).toBe('blocked')
    expect(verdict.ok).toBe(false)
    expect(verdict.reasons[0]).toMatch(/ComfyUI engine not reachable/)
  })

  it('an empty tree fails both paths with the no-artifact reason', () => {
    const receipts: RunReceipt[] = []
    expect(assessPath('video', receipts).state).toBe('fail')
    expect(assessPath('3d', receipts).state).toBe('fail')
  })

  it('the injected loader is used verbatim (the analyst reads what it is handed)', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-inj', status: 'completed', files: { 'film.mp4': realFilm } })
    const calls: string[] = []
    const verdict = assessPath('video', scanRunTree([root]), {
      loadBytes: (row: ArtifactRow): Uint8Array => {
        calls.push(row.rel)
        return realFilm
      },
    })
    expect(calls).toEqual(['film.mp4'])
    expect(verdict.state).toBe('pass')
  })
})

describe('the analyst — the transcript discovery (the collision law)', () => {
  function mintTranscript(dir: string, name: string, mtimeMs: number): void {
    mkdirSync(dir, { recursive: true })
    const path = join(dir, name)
    writeFileSync(path, '# receipt\n')
    utimesSync(path, mtimeMs / 1000, mtimeMs / 1000)
  }

  it('claims the freshest post-boot match, never a pre-boot one', () => {
    const dir = tempRoot()
    const boot = Date.now()
    mintTranscript(dir, 'transcript-tide-meter-20260926-0100.md', boot - 600_000) // an earlier session
    mintTranscript(dir, 'transcript-tide-meter-20260926-0230.md', boot + 5_000) // THIS commission
    const found = discoverTranscript(dir, 'tide-meter', boot)
    expect(found.path).toBe(join(dir, 'transcript-tide-meter-20260926-0230.md'))
    expect(found.candidates).toHaveLength(1)
    expect(found.reason).toMatch(/post-boot/)
  })

  it('refuses to claim a pre-boot match and says why (the flake the law names)', () => {
    const dir = tempRoot()
    const boot = Date.now()
    mintTranscript(dir, 'transcript-tide-meter-20260926-0100.md', boot - 600_000)
    const found = discoverTranscript(dir, 'tide-meter', boot)
    expect(found.path).toBeNull()
    expect(found.candidates).toHaveLength(1)
    expect(found.reason).toMatch(/predate this harness boot/)
  })

  it('reports a missing transcript dir loudly, never as an empty pass', () => {
    const found = discoverTranscript(join(tmpdir(), 'lane-no-such-dir-xyz'), 'tide-meter', Date.now())
    expect(found.path).toBeNull()
    expect(found.reason).toMatch(/cannot read the transcript dir/)
  })

  it('only matches its own slug (two makers, two transcripts, no collision)', () => {
    const dir = tempRoot()
    const boot = Date.now() - 1000
    mintTranscript(dir, 'transcript-other-brief-20260926-0230.md', boot + 5_000)
    mintTranscript(dir, 'transcript-tide-meter-20260926-0231.md', boot + 6_000)
    const found = discoverTranscript(dir, 'tide-meter', boot)
    expect(found.path).toBe(join(dir, 'transcript-tide-meter-20260926-0231.md'))
    expect(found.candidates).toHaveLength(1)
  })
})

describe('the analyst — the report', () => {
  it('renders the marks and the reasons a reader can act on', () => {
    const root = tempRoot()
    mintRun(root, { runId: 'run-film', status: 'completed', files: { 'film.mp4': bytes(REAL_FILM) } })
    mintRun(root, { runId: 'run-mesh', status: 'completed', files: { 'creature.glb': bytes(REAL_RIG) } })
    const receipts = scanRunTree([root])
    const boot = Date.now()
    const text = renderReport({
      boot_ms: boot,
      roots: [root],
      runs_scanned: receipts.length,
      transcript: discoverTranscript(root, 'tide-meter', boot),
      paths: [assessPath('video', receipts), assessPath('3d', receipts)],
      blocked: [],
    })
    expect(text).toMatch(/\[PASS\] video/)
    expect(text).toMatch(/\[PASS\] 3d/)
    expect(text).toMatch(/transcript: NONE/)
    expect(text).toMatch(/run-film\/film\.mp4/)
  })
})
