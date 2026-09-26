/**
 * tests/lane/analysis.ts — THE 3088 LANE ANALYST (the harness's
 * analysis core, 2026-09-26).
 *
 * The runbook's analyst pass, as code: after a maker exits, judge the
 * VIDEO paths and the 3D paths (non-Unity) from what the run tree and
 * the transcript actually hold. The laws this encodes, each from
 * RUNBOOK-3088-AGENT.md:
 *
 * - "A run is complete only when it has a terminal state AND the
 *   claimed artifact is present and inspectable. A prompt id, graph
 *   snapshot, or window render is not a film receipt." So a run with a
 *   rendered image but no encoded film FAILS, and a completed run
 *   whose artifact cannot be parsed FAILS.
 * - The collision law: the transcript is minted at FINISH time with a
 *   `<HHMM>` suffix the caller cannot predict, so discovery is a GLOB
 *   filtered by mtime >= the harness's own boot.
 * - "A self-skip is not a pass": a blocked prerequisite reports
 *   `blocked` with its exact prerequisite, never `pass`.
 *
 * Every function here is pure over bytes/rows it is handed (the fs
 * walking is a thin, injectable shell), so the analyst is walled by
 * fixtures with no GPU, no engine, and no maker.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname, relative, basename } from 'node:path'
import { probeMedia } from '../../packages/harness/melite-tools/src/tools/mp4Probe.ts'

/** The two path families the lane harness judges. Unity is NOT one
 *  of them: it is an MCP engine lane, commissioned through its own
 *  editor bridge, not through the 3088 media maker. */
export type PathName = 'video' | '3d'

export const PATH_NAMES: readonly PathName[] = ['video', '3d'] as const

export type ArtifactKind = 'video' | 'mesh' | 'image' | 'audio' | 'sidecar' | 'other'

/** The kinds each path family must PRODUCE. A video commission whose
 *  run tree holds no encoded video is not a film receipt; a 3D
 *  commission whose tree holds no mesh is not a mesh receipt. */
export const PATH_KINDS: Readonly<Record<PathName, readonly ArtifactKind[]>> = {
  video: ['video'],
  '3d': ['mesh'],
} as const

/** THE FILM-TAIL LAW (filmLead.ts's own regex, reused as the
 *  analyst's): when the engine composes the film itself the film
 *  leads the names, and the FILM is the receipt. The per-window
 *  renders (`h3_t4_w<k>_*`) are real videos that parse, so a
 *  name-blind "any mp4" rule would pass a run that never assembled a
 *  film — the runbook's own refusal ("a window render is not a film
 *  receipt"). A tree with ONLY window renders fails, naming them. */
const ENGINE_FILM_RE = /(?:^|\/)h3_t4_film_\d+_\.mp4$/
const WINDOW_RE = /(?:^|\/)h3_t4_w\d+_.*\.mp4$/

export function isFilmArtifact(rel: string): boolean {
  return ENGINE_FILM_RE.test(rel)
}

export function isWindowRender(rel: string): boolean {
  return WINDOW_RE.test(rel)
}

const KIND_BY_EXT: Readonly<Record<string, ArtifactKind>> = {
  '.mp4': 'video',
  '.mov': 'video',
  '.webm': 'video',
  '.mkv': 'video',
  '.glb': 'mesh',
  '.gltf': 'mesh',
  '.obj': 'mesh',
  '.fbx': 'mesh',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
  '.wav': 'audio',
  '.flac': 'audio',
  '.mp3': 'audio',
  '.qvoice': 'audio',
  '.json': 'sidecar',
  '.md': 'other',
}

export function classifyArtifact(path: string): ArtifactKind {
  return KIND_BY_EXT[extname(path).toLowerCase()] ?? 'other'
}

/** The statuses that END a run (runsTypes' RunStatus). `stopping` and
 *  `running` are not terminal: a run still working is not a receipt. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed', 'stopped'])

export function isTerminal(status: unknown): boolean {
  return typeof status === 'string' && TERMINAL_STATUSES.has(status)
}

export interface ArtifactRow {
  /** absolute path on disk */
  path: string
  /** path relative to the run dir (the receipt's stable name) */
  rel: string
  kind: ArtifactKind
  ext: string
  bytes: number
  mtime_ms: number
}

export interface StageReceipt {
  id: string
  status: string
  card?: string
  engine?: string
  error?: string
}

export interface RunReceipt {
  run_id: string
  dir: string
  status: string
  terminal: boolean
  error?: string
  created_at?: number
  stages: StageReceipt[]
  artifacts: ArtifactRow[]
  /** which durable sidecars the run dir actually carries */
  sidecars: string[]
  /** the estate's own loudness measurement, when the run stamped one
   *  (the loudness chip's receipt: a fact about the encoded audio,
   *  measured engine-side — the analyst never decodes) */
  loudness?: { loudness_lufs: number; peak_db: number }
  mtime_ms: number
}

const SIDECARS = ['_request.json', '_flow.json'] as const

/** How deep the artifact walk goes. A run dir nests by STAGE
 *  (`h3/film_00001.mp4`, `img-to-mesh/creature.glb`), so the analyst
 *  must descend to find the artifact at all; three levels covers a
 *  stage dir plus one card-lane subdir without walking a whole tree. */
const ARTIFACT_WALK_DEPTH = 3

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch {
    return undefined
  }
}

/** Every file under `dir`, excluding the durable sidecars (the `_`
 *  prefix is the run's own receipt namespace) and the desk chair
 *  directories a run never writes. */
function walkArtifacts(dir: string, depth: number, root: string = dir): ArtifactRow[] {
  if (depth > ARTIFACT_WALK_DEPTH) return []
  const out: ArtifactRow[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.startsWith('_')) continue
    const path = join(dir, entry)
    let st
    try {
      st = statSync(path)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      out.push(...walkArtifacts(path, depth + 1, root))
      continue
    }
    if (!st.isFile()) continue
    out.push({
      path,
      rel: relative(root, path),
      kind: classifyArtifact(entry),
      ext: extname(entry).toLowerCase(),
      bytes: st.size,
      mtime_ms: st.mtimeMs,
    })
  }
  return out
}

/** ONE RUN DIR → its receipt. A run dir with no _flow.json is still
 *  reported (status `unknown`), because "the run tree holds a folder
 *  with no durable receipt" is itself a finding — the analyst must be
 *  able to SAY that, not skip the folder. */
export function readRunReceipt(dir: string): RunReceipt {
  const flow = readJson(join(dir, '_flow.json')) as Record<string, unknown> | undefined
  const rawStages = Array.isArray(flow?.['stages']) ? (flow['stages'] as unknown[]) : []
  const stages: StageReceipt[] = rawStages
    .filter((s: unknown): boolean => s !== null && typeof s === 'object' && !Array.isArray(s))
    .map((s: unknown): StageReceipt => {
      const row = s as Record<string, unknown>
      const out: StageReceipt = {
        id: typeof row['id'] === 'string' ? row['id'] : '(unnamed)',
        status: typeof row['status'] === 'string' ? row['status'] : 'unknown',
      }
      if (typeof row['name'] === 'string') out.card = row['name']
      if (typeof row['error'] === 'string') out.error = row['error']
      return out
    })
  const artifacts: ArtifactRow[] = walkArtifacts(dir, 0)
  let mtime = 0
  for (const row of artifacts) {
    if (mtime === 0 || row.mtime_ms > mtime) mtime = row.mtime_ms
  }
  const status = typeof flow?.['status'] === 'string' ? flow['status'] : 'unknown'
  const out: RunReceipt = {
    run_id: typeof flow?.['run_id'] === 'string' ? flow['run_id'] : basename(dir),
    dir,
    status,
    terminal: isTerminal(status),
    stages,
    artifacts,
    sidecars: SIDECARS.filter((s) => existsSync(join(dir, s))),
    mtime_ms: mtime,
  }
  if (typeof flow?.['error'] === 'string') out.error = flow['error']
  if (typeof flow?.['created_at'] === 'number') out.created_at = flow['created_at']
  const loud = flow?.['loudness']
  if (loud !== null && typeof loud === 'object' && !Array.isArray(loud)) {
    const row = loud as Record<string, unknown>
    const lufs = row['loudness_lufs']
    const peak = row['peak_db']
    if (typeof lufs === 'number' && Number.isFinite(lufs) && typeof peak === 'number' && Number.isFinite(peak)) {
      out.loudness = { loudness_lufs: lufs, peak_db: peak }
    }
  }
  return out
}

/** The two run seats under a state root: `output/` for real runs
 *  and `test-output/` for the test-flagged ones (queueLock.ts's own
 *  layout — a test run's artifacts are REAL receipts; the analyst
 *  must not go blind to them). */
export const RUN_SEATS: readonly string[] = ['output', 'test-output']

/** The runs tree. The state root's own run dirs are the primary
 *  seat; a caller may pass extra roots (the §23 cross-root law: the
 *  shared read-only studio root is a real second seat, not a myth). */
export function scanRunTree(roots: readonly string[]): RunReceipt[] {
  const receipts: RunReceipt[] = []
  for (const root of roots) {
   for (const seat of RUN_SEATS) {
    const output = join(root, seat)
    if (!existsSync(output)) continue
    let entries: string[]
    try {
      entries = readdirSync(output)
    } catch {
      continue
    }
    for (const entry of entries) {
      // the ledger sidecar is a file, not a run dir
      if (entry.startsWith('_')) continue
      const dir = join(output, entry)
      try {
        if (!statSync(dir).isDirectory()) continue
      } catch {
        continue
      }
      receipts.push(readRunReceipt(dir))
    }
   }
  }
  receipts.sort((a, b) => a.run_id.localeCompare(b.run_id))
  return receipts
}

/** THE VIDEO VERDICT — a real parse of the encoded bytes, never a
 *  filename or a byte count. The probe is the estate's own
 *  (mp4Probe: ISO-BMFF + RIFF/WAV, no ffmpeg dependency), so the
 *  analyst reads the same rows the `melite_view` observe arm serves. */
export interface VideoVerdict {
  ok: boolean
  reasons: string[]
  probe?: {
    duration_s?: number
    size_bytes: number
    streams: Array<{
      codec: string
      codec_type?: 'video' | 'audio'
      width?: number
      height?: number
      fps?: string
      frames?: number
      sample_rate?: number
      channels?: number
    }>
  }
}

export function analyzeVideoBytes(
  bytes: Uint8Array,
  opts: { requireAudio?: boolean } = {},
): VideoVerdict {
  const reasons: string[] = []
  if (bytes.length === 0) return { ok: false, reasons: ['artifact is empty (0 bytes)'] }
  // The probe refuses an unrecognized container by THROWING (its
  // container dispatch, not its bounds-checked readers); the analyst
  // turns that into a verdict — an artifact that is not a film is a
  // FINDING, never a crash that hides the rest of the tree.
  let probe: ReturnType<typeof probeMedia>
  try {
    probe = probeMedia(bytes)
  } catch (e) {
    return {
      ok: false,
      reasons: [`not a readable media container: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
  const video = probe.streams.filter((s) => s.codec_type === 'video')
  const audio = probe.streams.filter((s) => s.codec_type === 'audio')
  if (video.length === 0) reasons.push('no video stream in the encoded bytes')
  // THE WIRED-FILM DEMAND (a live commission's finding, 2026-09-26):
  // the container fact that the lane's film deliverable is missing its
  // whole point without a sound track — the brief asks for the voice
  // and the bed wired in, so a silent film is not a film receipt for
  // THIS path. A card-run film may legitimately be silent, so the
  // demand is per-call (the path table states the lane's own), never
  // guessed from the file.
  if (opts.requireAudio === true && audio.length === 0) {
    reasons.push('no audio stream — the commissioned film must carry its wired sound (voice + bed)')
  }
  else {
    if (typeof video[0]?.width !== 'number' || typeof video[0]?.height !== 'number') {
      reasons.push('video stream states no geometry')
    }
  }
  if (typeof probe.duration_s !== 'number' || !(probe.duration_s > 0)) {
    reasons.push('no positive duration — a graph or window render is not a film receipt')
  }
  return { ok: reasons.length === 0, reasons, probe }
}

/** THE MESH VERDICT — a structural GLB parse (magic, version,
 *  declared length, chunk walk, then the JSON chunk's mesh
 *  primitives and accessor counts). It proves the artifact is a
 *  parseable glTF binary with real geometry, which is what the 3D
 *  paths promise; it does NOT claim the mesh is aesthetically right
 *  (that is the operator's eyeball). */
export interface MeshVerdict {
  ok: boolean
  reasons: string[]
  facts?: {
    version: number
    declared_bytes: number
    chunks: string[]
    meshes: number
    primitives: number
    vertices: number
    materials: number
    images: number
    buffer_bytes: number
  }
}

const GLB_MAGIC = 0x46546c67 // 'glTF' little-endian
const CHUNK_JSON = 0x4e4f534a
const CHUNK_BIN = 0x004e4942

export function analyzeMeshBytes(bytes: Uint8Array): MeshVerdict {
  const reasons: string[] = []
  if (bytes.length < 12) return { ok: false, reasons: ['shorter than a GLB header (12 bytes)'] }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const magic = view.getUint32(0, true)
  if (magic !== GLB_MAGIC) return { ok: false, reasons: ['no glTF magic — not a GLB container'] }
  const version = view.getUint32(4, true)
  const declared = view.getUint32(8, true)
  if (declared !== bytes.length) {
    reasons.push(`header declares ${declared} bytes, the file holds ${bytes.length}`)
  }
  const chunks: string[] = []
  let json: Record<string, unknown> | undefined
  let at = 12
  while (at + 8 <= bytes.length) {
    const length = view.getUint32(at, true)
    const type = view.getUint32(at + 4, true)
    const body = at + 8
    if (body + length > bytes.length) {
      reasons.push(`chunk at byte ${at} declares ${length} bytes past the end of the file`)
      break
    }
    if (type === CHUNK_JSON) {
      chunks.push('JSON')
      try {
        json = JSON.parse(new TextDecoder().decode(bytes.subarray(body, body + length))) as Record<string, unknown>
      } catch (e) {
        reasons.push(`the JSON chunk is not JSON: ${e instanceof Error ? e.message : String(e)}`)
      }
    } else if (type === CHUNK_BIN) {
      chunks.push('BIN')
    } else {
      chunks.push(`0x${type.toString(16)}`)
    }
    at = body + length
  }
  if (json === undefined) {
    reasons.push('no JSON chunk — the container declares no glTF document')
    return { ok: false, reasons }
  }
  return meshVerdictFromDocument(json, reasons, {
    version,
    declared_bytes: declared,
    chunks,
    meshes: Array.isArray(json['meshes']) ? json['meshes'].length : 0,
    primitives: 0,
    vertices: 0,
    materials: Array.isArray(json['materials']) ? json['materials'].length : 0,
    images: Array.isArray(json['images']) ? json['images'].length : 0,
    buffer_bytes: 0,
  })
}

/** THE DOCUMENT VERDICT — one judge for both mesh containers (the
 *  GLB JSON chunk and a bare `.gltf` document are the same claims in
 *  the same shape, so they must not drift into two truths). */
function meshVerdictFromDocument(
  json: Record<string, unknown>,
  reasons: string[],
  container: {
    version: number
    declared_bytes: number
    chunks: string[]
    meshes: number
    primitives: number
    vertices: number
    materials: number
    images: number
    buffer_bytes: number
  },
): MeshVerdict {
  if (json['asset'] === undefined) reasons.push('the glTF document carries no asset block')
  const docVersion = (json['asset'] as Record<string, unknown> | undefined)?.['version']
  if (docVersion !== '2.0') reasons.push(`glTF asset version is ${String(docVersion)}, expected 2.0`)
  const meshes = Array.isArray(json['meshes']) ? (json['meshes'] as unknown[]) : []
  let primitives = 0
  for (const m of meshes) {
    if (m !== null && typeof m === 'object' && Array.isArray((m as Record<string, unknown>)['primitives'])) {
      primitives += ((m as Record<string, unknown>)['primitives'] as unknown[]).length
    }
  }
  if (primitives === 0) reasons.push('no mesh primitives — the document declares no geometry')
  const accessors = Array.isArray(json['accessors']) ? (json['accessors'] as unknown[]) : []
  let vertices = 0
  for (const a of accessors) {
    if (a !== null && typeof a === 'object') {
      const n = (a as Record<string, unknown>)['count']
      if (typeof n === 'number') vertices += n
    }
  }
  const buffers = Array.isArray(json['buffers']) ? (json['buffers'] as unknown[]) : []
  let bufferBytes = 0
  for (const b of buffers) {
    if (b !== null && typeof b === 'object') {
      const n = (b as Record<string, unknown>)['byteLength']
      if (typeof n === 'number') bufferBytes += n
    }
  }
  if (bufferBytes === 0) reasons.push('no buffer bytes — the document declares no payload')
  return {
    ok: reasons.length === 0,
    reasons,
    facts: {
      ...container,
      meshes: meshes.length,
      primitives,
      vertices,
      materials: Array.isArray(json['materials']) ? json['materials'].length : 0,
      images: Array.isArray(json['images']) ? json['images'].length : 0,
      buffer_bytes: bufferBytes,
    },
  }
}

/** THE OBJ ARM: the 3D lanes write both binary glTF (.glb) and Wavefront
 *  OBJ (.obj — the AutoRemesh/mesh-export chains' own format), so the
 *  mesh verdict dispatches on the container the bytes ARE rather than
 *  refusing a real mesh for lacking a glTF header. An OBJ is text: a
 *  `v ` line per vertex and an `f ` line per face is the whole
 *  structural claim, and an OBJ with neither is a finding. */
export interface ObjVerdict {
  ok: boolean
  reasons: string[]
  facts?: { vertices: number; faces: number; groups: number }
}

export function analyzeObjBytes(bytes: Uint8Array): ObjVerdict {
  const reasons: string[] = []
  if (bytes.length === 0) return { ok: false, reasons: ['artifact is empty (0 bytes)'] }
  let text: string
  try {
    text = new TextDecoder().decode(bytes)
  } catch (e) {
    return { ok: false, reasons: [`not readable text: ${e instanceof Error ? e.message : String(e)}`] }
  }
  let vertices = 0
  let faces = 0
  let groups = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('v ')) vertices++
    else if (line.startsWith('f ')) faces++
    else if (line.startsWith('g ') || line === 'g') groups++
  }
  if (vertices === 0) reasons.push('no `v ` vertex lines — the OBJ declares no geometry')
  if (faces === 0) reasons.push('no `f ` face lines — the OBJ declares no surface')
  return { ok: reasons.length === 0, reasons, facts: { vertices, faces, groups } }
}

/** The mesh verdict for a mesh artifact, dispatched on its container. */
export function analyzeMeshArtifactBytes(ext: string, bytes: Uint8Array): MeshVerdict | ObjVerdict {
  if (ext === '.obj') return analyzeObjBytes(bytes)
  // .gltf is JSON glTF (no binary header) — a mesh that declares
  // geometry is judged on its document, not on a GLB container
  if (ext === '.gltf') return analyzeGltfJsonBytes(bytes)
  return analyzeMeshBytes(bytes)
}

/** A `.gltf` file IS its JSON document: no magic, no BIN chunk. The
 *  structural claim is the same one the GLB arm makes (geometry,
 *  buffers), read from the document itself. */
export function analyzeGltfJsonBytes(bytes: Uint8Array): MeshVerdict {
  const reasons: string[] = []
  let json: Record<string, unknown> | undefined
  try {
    json = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
  } catch (e) {
    return { ok: false, reasons: [`not a readable glTF document: ${e instanceof Error ? e.message : String(e)}`] }
  }
  return meshVerdictFromDocument(json, reasons, {
    version: 2,
    declared_bytes: bytes.length,
    chunks: ['JSON'],
    meshes: Array.isArray(json['meshes']) ? json['meshes'].length : 0,
    primitives: 0,
    vertices: 0,
    materials: Array.isArray(json['materials']) ? json['materials'].length : 0,
    images: Array.isArray(json['images']) ? json['images'].length : 0,
    buffer_bytes: 0,
  })
}

/** THE FIDELITY FACT: this harness proves STRUCTURE — the bytes parse,
 *  the geometry exists, the film carries a video (and, under the wired
 *  demand, an audio) stream. It never proves SUBJECT MATCH: whether the
 *  mesh is of the thing the brief asked for, or the film shows the right
 *  scene, is the operator's eye (or an image-capable model's). The claim
 *  is stated on every mesh receipt so a reader can never mistake "it
 *  opens" for "it is right". */
export const FIDELITY_NOTE = 'structure proven by the analyst; subject match is UNVERIFIED here (the operator\'s eye, or an image-capable model)'

export function analyzeArtifactBytes(
  kind: ArtifactKind,
  bytes: Uint8Array,
  ext = '',
): VideoVerdict | MeshVerdict | ObjVerdict {
  return kind === 'mesh' ? analyzeMeshArtifactBytes(ext, bytes) : analyzeVideoBytes(bytes)
}

/** THE TRANSCRIPT DISCOVERY (the collision law): the maker mints
 *  `transcript-<slug>-<HHMM>.md` at FINISH time, so the caller
 *  cannot predict the name. A file matching the slug glob whose
 *  mtime is at or after THIS harness's boot is the commission's
 *  transcript; anything older is a prior session's receipt and is
 *  never claimed. */
/** THE TRANSCRIPT-FLOOR LAW (a live commission's own finding,
 *  2026-09-26): the transcript's mtime floor is the COMMISSION's
 *  boot, not the analysis's own clock. A harness that stamps `now`
 *  after the maker exits has, by construction, put every transcript
 *  the commission just wrote BEHIND its floor — and then reports a
 *  finished commission as missing. With commissions in hand, the
 *  floor is the EARLIEST boot among them (the first launch opens the
 *  window both paths share); with none, the CALLER'S window floor is
 *  the honest one (a stand-alone `--since` analysis must look for the
 *  transcripts of the window it just judged, not only for ones that
 *  appear after its own clock). */
export function transcriptFloor(
  commissions: readonly { boot_ms: number }[],
  fallbackMs: number,
): number {
  if (commissions.length === 0) return fallbackMs
  return Math.min(...commissions.map((c) => c.boot_ms), fallbackMs)
}

export interface TranscriptDiscovery {
  path: string | null
  candidates: string[]
  /** why the discovery came out as it did — always populated */
  reason: string
  boot_ms: number
}

export function discoverTranscript(dir: string, slug: string, bootMs: number): TranscriptDiscovery {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch (e) {
    return {
      path: null,
      candidates: [],
      reason: `cannot read the transcript dir ${dir}: ${e instanceof Error ? e.message : String(e)}`,
      boot_ms: bootMs,
    }
  }
  const matches = entries
    .filter((name) => name.startsWith(`transcript-${slug}`) && name.endsWith('.md'))
    .map((name) => {
      const path = join(dir, name)
      let mtime = 0
      try {
        mtime = statSync(path).mtimeMs
      } catch {
        mtime = 0
      }
      return { path, name, mtime }
    })
    .sort((a, b) => b.mtime - a.mtime)
  const fresh = matches.filter((m) => m.mtime >= bootMs)
  if (fresh.length === 0) {
    return {
      path: null,
      candidates: matches.map((m) => m.path),
      reason:
        matches.length === 0
          ? `no transcript-${slug}-*.md in ${dir}`
          : `the ${matches.length} matching transcript(s) predate this harness boot (${bootMs}) — a bare predicted path would misread a finished commission as a flake`,
      boot_ms: bootMs,
    }
  }
  return {
    path: fresh[0]?.path ?? null,
    candidates: fresh.map((m) => m.path),
    reason: `freshest post-boot match of transcript-${slug}-*.md (${fresh.length} candidate(s))`,
    boot_ms: bootMs,
  }
}

/** THE PATH VERDICT. A path passes only when some run in the tree is
 *  TERMINAL, succeeded, and holds a REAL artifact of that path's
 *  kind whose bytes parse. Everything else — no runs, no terminal
 *  run, a terminal failure, a missing artifact, an unparseable one —
 *  is a `fail` with its exact reason. A missing prerequisite is
 *  `blocked`, never `pass`. */
export interface PathVerdict {
  path: PathName
  state: 'pass' | 'fail' | 'blocked'
  ok: boolean
  /** blocking findings — a non-empty list is a fail */
  reasons: string[]
  /** NON-blocking findings: a sibling run in the window failed while
   *  another delivered the real receipt. The path passed, and the
   *  failure is still reported (a harness that hides a failed run
   *  behind a passing sibling is not an analyst). */
  notes: string[]
  /** runs that carried this path's kind */
  runs: string[]
  artifacts: Array<{
    run_id: string
    rel: string
    bytes: number
    /** whether this artifact is a RECEIPT for the path at all (a
     *  per-window render is not); only receipts can fail the path */
    receipt: boolean
    verdict_ok: boolean
    reasons: string[]
  }>
}

export function assessPath(
  name: PathName,
  receipts: readonly RunReceipt[],
  opts: {
    loadBytes?: (row: ArtifactRow) => Uint8Array
    blocked?: string[]
    /** THE WINDOW LAW: only runs whose artifacts are NEWER than this
     *  floor are judged. The run tree is cumulative (hundreds of
     *  historical runs, most of them old failures), so an unfiltered
     *  verdict drowns the signal in history and reports the tree, not
     *  the commission. The harness passes the commission's own boot;
     *  the default (0) judges everything, for the forensic pass. */
    sinceMs?: number
    /** the path's own demand: a lane film must carry sound (see the
     *  path table); a card-run film may be silent. */
    requireAudio?: boolean
  } = {},
): PathVerdict {
  const kinds = PATH_KINDS[name]
  const reasons: string[] = []
  const notes: string[] = []
  const artifacts: PathVerdict['artifacts'] = []
  const runs = new Set<string>()
  if (opts.blocked !== undefined && opts.blocked.length > 0) {
    return { path: name, state: 'blocked', ok: false, reasons: [...opts.blocked], notes: [], runs: [], artifacts: [] }
  }
  const since = opts.sinceMs ?? 0
  for (const receipt of receipts) {
    const held = receipt.artifacts.filter((a) => kinds.includes(a.kind) && a.mtime_ms >= since)
    if (held.length === 0) continue
    runs.add(receipt.run_id)
    if (!receipt.terminal) {
      notes.push(`${receipt.run_id}: status ${receipt.status} is not terminal`)
      continue
    }
    if (receipt.status !== 'completed') {
      notes.push(`${receipt.run_id}: terminal status ${receipt.status}${receipt.error === undefined ? '' : ` (${receipt.error})`}`)
      continue
    }
    if (receipt.sidecars.length === 0) {
      reasons.push(`${receipt.run_id}: no durable sidecar (_request.json/_flow.json) — the run left no receipt of what it sent`)
    }
    for (const row of held) {
      // THE FILM-TAIL LAW: a per-window render is a real video that
      // parses, so it is reported as NOT a receipt rather than
      // silently judged (a run that rendered three windows and never
      // assembled a film must not pass this harness).
      if (name === 'video' && isWindowRender(row.rel)) {
        artifacts.push({
          run_id: receipt.run_id,
          rel: row.rel,
          bytes: row.bytes,
          receipt: false,
          verdict_ok: false,
          reasons: ['window render — the film tail (h3_t4_film_*.mp4) is the receipt; a window render is not a film'],
        })
        continue
      }
      let bytes: Uint8Array
      try {
        bytes = opts.loadBytes !== undefined ? opts.loadBytes(row) : readFileSync(row.path)
      } catch (e) {
        artifacts.push({
          run_id: receipt.run_id,
          rel: row.rel,
          bytes: row.bytes,
          receipt: true,
          verdict_ok: false,
          reasons: [`unreadable: ${e instanceof Error ? e.message : String(e)}`],
        })
        continue
      }
      const verdict = row.kind === 'video'
        ? analyzeVideoBytes(bytes, { requireAudio: opts.requireAudio })
        : analyzeArtifactBytes(row.kind, bytes, row.ext)
      artifacts.push({
        run_id: receipt.run_id,
        rel: row.rel,
        bytes: bytes.length,
        receipt: true,
        verdict_ok: verdict.ok,
        reasons: verdict.reasons,
      })
    }
  }
  if (runs.size === 0) {
    reasons.push(`no run in the tree holds a ${kinds.join('/')} artifact`)
  } else if (name === 'video' && artifacts.length > 0 && artifacts.every((a) => !a.receipt)) {
    reasons.push(
      'the tree holds window renders only — the assembled film (h3_t4_film_*.mp4) is the video path receipt, and a run of window renders is not a film',
    )
  } else {
    for (const art of artifacts) {
      if (art.receipt && !art.verdict_ok) reasons.push(`${art.run_id}/${art.rel}: ${art.reasons.join('; ')}`)
    }
    if (!artifacts.some((a) => a.receipt)) reasons.push('the matching runs hold no receipt artifact to judge')
  }
  // THE SIBLING LAW: the path's verdict asks whether the deliverable
  // exists, so a real passing receipt carries the path. Every failed
  // or unfinished sibling run in the window is still REPORTED (as a
  // note), never dropped — and with no passing receipt at all, those
  // notes ARE the reasons.
  const delivered = artifacts.some((a) => a.receipt && a.verdict_ok)
  const ok = reasons.length === 0 && delivered
  const blocking = ok ? reasons : [...reasons, ...notes]
  return {
    path: name,
    state: ok ? 'pass' : 'fail',
    ok,
    reasons: ok ? reasons : blocking,
    notes: ok ? notes : [],
    runs: [...runs].sort(),
    artifacts,
  }
}

export interface LaneReport {
  /** the harness's own boot — the transcript mtime floor */
  boot_ms: number
  roots: string[]
  runs_scanned: number
  /** the receipts behind the verdicts (the loudness facts ride here) */
  runs?: RunReceipt[]
  transcript: TranscriptDiscovery
  paths: PathVerdict[]
  blocked: string[]
}

export function renderReport(report: LaneReport): string {
  const lines: string[] = []
  lines.push(`3088 lane analyst — boot ${report.boot_ms}, ${report.runs_scanned} run(s) under ${report.roots.join(', ')}`)
  lines.push(`transcript: ${report.transcript.path ?? 'NONE'} — ${report.transcript.reason}`)
  // THE ESTATE'S OWN LOUDNESS FACTS: run-level, so they are stated
  // once (a measured audio fact, never re-derived by the analyst and
  // never repeated per path).
  for (const receipt of report.runs ?? []) {
    if (receipt.loudness !== undefined) {
      lines.push(
        `  · ${receipt.run_id}: estate loudness receipt ${receipt.loudness.loudness_lufs.toFixed(2)} LUFS / ${receipt.loudness.peak_db.toFixed(2)} dBTP`,
      )
    }
  }
  // A path can carry hundreds of runs; the report names a readable few
  // and says how many it did not print (never a silent truncation).
  const RUNS_SHOWN = 6
  const ARTS_SHOWN = 12
  for (const verdict of report.paths) {
    const mark = verdict.state === 'pass' ? 'PASS' : verdict.state === 'blocked' ? 'BLOCKED' : 'FAIL'
    const shownRuns = verdict.runs.slice(0, RUNS_SHOWN)
    const restRuns = verdict.runs.length - shownRuns.length
    lines.push(
      `  [${mark}] ${verdict.path} — ${verdict.runs.length} run(s)${
        verdict.runs.length === 0 ? '' : `: ${shownRuns.join(', ')}${restRuns > 0 ? ` (+${restRuns} more)` : ''}`
      }`,
    )
    for (const art of verdict.artifacts.slice(0, ARTS_SHOWN)) {
      lines.push(`      ${art.verdict_ok ? 'ok  ' : 'BAD '} ${art.run_id}/${art.rel} (${art.bytes} bytes)${art.reasons.length === 0 ? '' : ` — ${art.reasons.join('; ')}`}`)
      if (art.verdict_ok && verdict.path === '3d') {
        lines.push(`           ↳ ${FIDELITY_NOTE}`)
      }
    }
    const restArts = verdict.artifacts.length - Math.min(verdict.artifacts.length, ARTS_SHOWN)
    if (restArts > 0) lines.push(`      … ${restArts} more artifact(s) in the verdict receipt`)
    // the sibling law keeps failed runs visible without drowning the
    // report: the first few, counted
    for (const reason of verdict.reasons.slice(0, 8)) lines.push(`      · ${reason}`)
    if (verdict.reasons.length > 8) lines.push(`      · … ${verdict.reasons.length - 8} more reason(s) in the verdict receipt`)
    for (const note of verdict.notes.slice(0, 3)) lines.push(`      ~ ${note}`)
    if (verdict.notes.length > 3) lines.push(`      ~ … ${verdict.notes.length - 3} more note(s) in the verdict receipt`)
  }
  return lines.join('\n')
}
