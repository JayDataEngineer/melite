/**
 * melite_view — the estate's OBSERVE arm for images (the decide
 * loop's eye, 2026-09-14). One run's artifact, VIEWED: the tool
 * resolves the run's output tree through the queue seat, reads the
 * newest image (or the artifact the caller names), and commits it
 * through the harness attachment store — the model receives the
 * image itself, not a description of it.
 *
 * THE COPY LAW (DSH tool-fs `read_image`, studied then copied): the
 * route gate (`assertImageCapableRoute` — the session's routed
 * provider/model must DECLARE image input, or the tool refuses
 * BEFORE filesystem work), the signature sniffer (extension first,
 * bytes authoritative), `attachments.saveImage` → durable
 * `ImageAttachmentRef`, and the render pairing — one text summary
 * block + one `{type:'image', attachment}` block re-branded from
 * the structured value (`imageRefFromValue`). No inline base64, no
 * bespoke vision lane: the attachment service owns normalization,
 * limits, and the durable log.
 *
 * VIEWING IS NOT A RUN PRESS (the interface law): this tool lands
 * in the BASE toolset — browser sessions may look at what a run
 * produced; only the run DOORS stay headless-gated.
 *
 * CONTAINMENT (estate/media's law, same spelling): the run id must
 * match the queue's RUN_ID grammar, and the file path is BUILT from
 * the walk's own answer (`stateRoot/output/<runId>/<name>` from
 * `listMedia`) — never from caller text. The caller's `artifact` is
 * a substring FILTER over names the walk already produced.
 */
import { basename, extname, join } from 'node:path'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { AttachmentError, AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { listMedia } from '@melite/estate-media'
import type { MediaListRow } from '@melite/estate-media'
import { rootsManifest, searchedVoice } from '@melite/estate-queue'
import type { JsonValue, ToolDefinition } from '../types.ts'

/** §23 CROSS-ROOTS (2026-09-23): the view walk searches the
 *  manifest in order — own root first, then the maker's tree
 *  (MELITE_STATE_ROOTS). First root holding the run serves (own
 *  writes win); a miss names every searched root. */
const firstRootWithRun = async (
  seat: { stateRoot: string },
  kind: 'image' | 'video',
  runId: string,
): Promise<{ own: MediaListRow[]; root: string } | null> => {
  for (const root of rootsManifest(seat.stateRoot)) {
    const { items } = await listMedia(root, kind)
    const own = items.filter((i) => i.runId === runId)
    if (own.length > 0) return { own, root }
  }
  return null
}

/** The run-id grammar (estate/media's containment law, verbatim). */
const RUN_ID = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/

/** Extension → declared media type (read_image's map, copied). */
const IMAGE_EXTENSIONS: Record<string, ImageMediaType> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** PNG/JPEG file signatures; GIF/WebP match by ASCII (read_image). */
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const JPEG_SIGNATURE = [255, 216, 255]
const matchesBytes = (data: Uint8Array, offset: number, expected: readonly number[]): boolean => {
  if (data.byteLength < offset + expected.length) return false
  return expected.every((byte, index) => data[offset + index] === byte)
}
const matchesAscii = (data: Uint8Array, offset: number, value: string): boolean => {
  if (data.byteLength < offset + value.length) return false
  for (let index = 0; index < value.length; index += 1) {
    if (data[offset + index] !== value.charCodeAt(index)) return false
  }
  return true
}

/** Identify the media type declared by a supported image signature. */
export function sniffImageMediaType(data: Uint8Array): ImageMediaType | undefined {
  if (matchesBytes(data, 0, PNG_SIGNATURE)) return 'image/png'
  if (matchesBytes(data, 0, JPEG_SIGNATURE)) return 'image/jpeg'
  if (matchesAscii(data, 0, 'GIF87a') || matchesAscii(data, 0, 'GIF89a')) return 'image/gif'
  if (matchesAscii(data, 0, 'RIFF') && matchesAscii(data, 8, 'WEBP')) return 'image/webp'
  return undefined
}

/** Map a path to its declared image media type by extension. */
export function imageMediaTypeForPath(filePath: string): ImageMediaType | undefined {
  return IMAGE_EXTENSIONS[extname(filePath).toLowerCase()]
}

/** The structured outcome the output schema declares (read_image's
 * ImageReadValue shape, run-scoped). */
export interface ViewedImageValue {
  runId: string
  url: string
  image: {
    attachmentId: string
    mediaType: ImageMediaType
    bytes: number
    width: number
    height: number
    name?: string
    originalDimensions?: { width: number, height: number }
  }
  /** THE FILM ARM (§24): when the run holds a film instead of
   *  images, the viewed image IS the contact sheet and this row
   *  carries the film's own summary (ffprobe verdict, byte-cheap
   *  flags). Absent on the image path. */
  film?: {
    file: string
    duration_s?: number
    size_bytes?: number
    streams: Array<{ codec: string, width?: number, height?: number, fps?: string, frames?: number }>
    sheet_of: number
  }
}

/** A probed film stream (ffprobe's row, narrowed). */
export interface FilmStreamSummary {
  codec: string
  width?: number
  height?: number
  fps?: string
  frames?: number
}

/** THE FILM PROBE (§24, the byte-cheap flags the skill prescribes):
 *  format duration/size + per-stream codec/geometry/rate/count —
 *  never a decode, never a full stream dump. Pure: static strings
 *  pin every arm (the binary only delivers the text). */
export function parseProbeSummary(jsonText: string): { duration_s?: number, size_bytes?: number, streams: FilmStreamSummary[] } {
  let doc: unknown
  try {
    doc = JSON.parse(jsonText) as unknown
  } catch {
    throw new Error('the film probe returned unparsable output — the file may be truncated or corrupt')
  }
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('the film probe returned unparsable output — the file may be truncated or corrupt')
  }
  const rec = doc as Record<string, unknown>
  const format = (typeof rec['format'] === 'object' && rec['format'] !== null ? rec['format'] : {}) as Record<string, unknown>
  const streamsRaw = Array.isArray(rec['streams']) ? rec['streams'] as unknown[] : []
  const streams: FilmStreamSummary[] = []
  for (const raw of streamsRaw) {
    if (typeof raw !== 'object' || raw === null) continue
    const s = raw as Record<string, unknown>
    if (typeof s['codec_name'] !== 'string') continue
    const row: FilmStreamSummary = { codec: s['codec_name'] as string }
    if (typeof s['width'] === 'number') row.width = s['width'] as number
    if (typeof s['height'] === 'number') row.height = s['height'] as number
    if (typeof s['r_frame_rate'] === 'string') row.fps = s['r_frame_rate'] as string
    if (typeof s['nb_frames'] === 'string' && s['nb_frames'] !== '' && Number.isFinite(Number(s['nb_frames']))) row.frames = Number(s['nb_frames'])
    streams.push(row)
  }
  if (streams.length === 0) {
    throw new Error('the film probe found no streams — the file may be truncated or corrupt')
  }
  const out: { duration_s?: number, size_bytes?: number, streams: FilmStreamSummary[] } = { streams }
  if (typeof format['duration'] === 'string' && Number.isFinite(Number(format['duration']))) out.duration_s = Number(format['duration'])
  if (typeof format['size'] === 'string' && Number.isFinite(Number(format['size']))) out.size_bytes = Number(format['size'])
  return out
}

/** Contact-sheet plan: four timestamps across the film's span (a
 *  beginning, two middles, near the end — the observe arm wants the
 *  arc, not four copies of frame one). Duration unknown (a probe
 *  without a format row) → one early frame, never a blind seek past
 *  the end. Pure. */
export function sheetPlan(duration_s: number | undefined): number[] {
  if (duration_s === undefined || !Number.isFinite(duration_s) || duration_s <= 0) return [0.5]
  const at = (f: number): number => Math.round(duration_s * f * 100) / 100
  return [at(0.1), at(0.4), at(0.7), at(0.95)]
}

/** Re-brand the structured outcome into the durable reference an
 * ImageBlock carries (read_image's imageRefFromValue, copied). */
export function imageRefFromValue(image: ViewedImageValue['image']): ImageAttachmentRef {
  return {
    attachmentId: AttachmentId(image.attachmentId),
    mediaType: image.mediaType,
    bytes: image.bytes,
    width: image.width,
    height: image.height,
    ...(image.name === undefined ? {} : { name: image.name }),
    ...(image.originalDimensions === undefined ? {} : { originalDimensions: { ...image.originalDimensions } }),
  }
}

/** The process seam the film arm exercises (ffprobe + ffmpeg).
 *  Production runs the estate's own binaries; tests pin every arm
 *  with fakes and prove the success path once against the real
 *  binaries on the committed fixture. */
export type FilmProc = (bin: string, args: string[], signal: AbortSignal) => Promise<{ stdout: string }>
const execFileAsync = promisify(execFile)
/** Default proc: the estate's ffmpeg/ffprobe, 30s each (a probe is
 *  milliseconds; four frame seeks + a tile are seconds) — a hung
 *  binary never wedges the observe arm past the run's own budget. */
export const defaultFilmProc: FilmProc = async (bin, args, signal) => {
  const out = await execFileAsync(bin, args, { timeout: 30_000, maxBuffer: 8 << 20, signal })
  return { stdout: out.stdout }
}

/** View a film artifact: ffprobe summary + a contact sheet committed
 *  as the viewed image (the §24 gate — one view artifact, stream
 *  summary + frames the model can SEE). Containment rides the walk's
 *  own row (absPath built from runId + name, never caller text); the
 *  sheet lands in os.tmpdir (never the run tree — a view must not
 *  mint provenance). */
export async function viewFilmArtifact(
  seat: QueueSeatSeam,
  runId: string,
  artifact: string,
  exec: ViewExec,
  ctx: { get(name: string): unknown },
  attachments: AttachmentsSeam,
  proc: FilmProc = defaultFilmProc,
): Promise<ViewedImageValue> {
  // §23 CROSS-ROOTS: the video walk spans the manifest (own root
  // first); the miss names every searched tree.
  const found = await firstRootWithRun(seat, 'video', runId)
  if (found === null) {
    // §23 NAME-THE-ROOT: the miss names the searched tree(s) (same
    // law as the registry's unknown-run — a two-roots box stays
    // debuggable). The prefix keeps the old walls green.
    throw new Error('run "' + runId + '" produced no image artifacts (and no viewable film — the run holds no video artifacts either) ' + searchedVoice(rootsManifest(seat.stateRoot)))
  }
  const own = found.own
  const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own
  if (picked.length === 0) {
    throw new Error('run "' + runId + '" has no film artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', ') + ' ' + searchedVoice(rootsManifest(seat.stateRoot)))
  }
  const row = picked[0]!
  await assertImageCapableRoute(ctx, exec, runId)
  const absPath = join(found.root, 'output', row.runId, row.name)
  let probe: { duration_s?: number, size_bytes?: number, streams: FilmStreamSummary[] }
  try {
    const { stdout } = await proc('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames',
      '-of', 'json', absPath,
    ], exec.signal)
    probe = parseProbeSummary(stdout)
  } catch (error) {
    if (error instanceof Error && (error as { code?: unknown }).code === 'ENOENT') {
      throw new Error('cannot view the film "' + row.name + '": ffprobe is not installed on the estate host — images remain viewable', { cause: error })
    }
    throw new Error('cannot view the film "' + row.name + '": ' + (error instanceof Error ? error.message : String(error)), { cause: error })
  }
  const stamps = sheetPlan(probe.duration_s)
  const work = await mkdtemp(join(tmpdir(), 'melite-view-'))
  try {
    const frames: string[] = []
    try {
      let n = 0
      for (const t of stamps) {
        const out = join(work, 'frame-' + String(n) + '.png')
        await proc('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', absPath, '-frames:v', '1', '-vf', 'scale=320:-1', '-y', out], exec.signal)
        frames.push(out)
        n++
      }
      const sheet = join(work, 'sheet.png')
      if (frames.length === 1) {
        await proc('ffmpeg', ['-v', 'error', '-i', frames[0]!, '-y', sheet], exec.signal)
      } else {
        const inputs: string[] = []
        for (const f of frames) inputs.push('-i', f)
        const pairs: string[] = []
        for (let i = 0; i + 1 < frames.length; i += 2) pairs.push('[' + String(i) + ':v][' + String(i + 1) + ':v]hstack=inputs=2[r' + String(i) + ']')
        const stacked = pairs.map((_, i) => '[r' + String(i * 2) + ']').join('') + 'vstack=inputs=' + String(pairs.length)
        await proc('ffmpeg', ['-v', 'error', ...inputs, '-filter_complex', pairs.join(';') + ';' + stacked, '-y', sheet], exec.signal)
      }
    } catch (error) {
      throw new Error('cannot view the film "' + row.name + '": the contact sheet could not be built (' + (error instanceof Error ? error.message : String(error)) + ')', { cause: error })
    }
    const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes)
    const data = await readFile(join(work, 'sheet.png'), { signal: exec.signal })
    if (data.byteLength > byteCap) {
      throw new Error('cannot view the film "' + row.name + '": its contact sheet exceeds the ' + String(byteCap) + '-byte image cap')
    }
    let ref: ImageAttachmentRef
    try {
      ref = await attachments.saveImage({ data, mediaType: 'image/png', name: basename(row.name, extname(row.name)) + '-sheet.png' })
    } catch (error) {
      throw new Error('cannot commit the film contact sheet for "' + row.name + '": ' + (error instanceof Error ? error.message : String(error)), { cause: error })
    }
    return {
      runId: row.runId,
      url: row.url,
      image: {
        attachmentId: ref.attachmentId,
        mediaType: ref.mediaType,
        bytes: ref.bytes,
        width: ref.width,
        height: ref.height,
        ...(ref.name === undefined ? {} : { name: ref.name }),
        ...(ref.originalDimensions === undefined ? {} : { originalDimensions: { ...ref.originalDimensions } }),
      },
      film: {
        file: row.name,
        ...(probe.duration_s === undefined ? {} : { duration_s: probe.duration_s }),
        ...(probe.size_bytes === undefined ? {} : { size_bytes: probe.size_bytes }),
        streams: probe.streams.map((s) => ({ codec: s.codec, ...(s.width === undefined ? {} : { width: s.width }), ...(s.height === undefined ? {} : { height: s.height }), ...(s.fps === undefined ? {} : { fps: s.fps }), ...(s.frames === undefined ? {} : { frames: s.frames }) })),
        sheet_of: stamps.length,
      },
    }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}
/** FILM-ARM-INSERT — replaced below. */
/** The structural exec view the route gate reads (the types.ts
 * ToolExec adaptation, widened for THIS tool's need — the gate walks
 * exec.agent; contravariance-safe: a body accepting this accepts any
 * ToolRunContext). */
interface ViewExec {
  signal: AbortSignal
  agent?: {
    session?: { requestHeader?: () => { config?: { provider?: string, model?: string } } | undefined }
    options?: { provider?: string, model?: string }
  }
}

/** The structural llm service view (resolveModelInfo only). */
interface LlmInfoSeam {
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<{ inputModalities?: readonly string[] }>
}

/** The structural attachment-store view melite_view exercises. */
interface AttachmentsSeam {
  saveImage(input: { data: Uint8Array, mediaType: ImageMediaType, name?: string }): Promise<ImageAttachmentRef>
  imageLimits: { maxImageBytes: number, maxMessageImageBytes: number, maxImageDimension: number, maxImagePixels: number, mediaTypes: readonly ImageMediaType[] }
}

/** The queue seat's structural view (stateRoot owner). */
interface QueueSeatSeam {
  stateRoot: string
}

/** Enforce the strict image-capability gate for the calling route
 * (read_image's assertImageCapableRoute, copied): the session's
 * latest routed provider/model must declare `image` input — unknown
 * capability refuses, it never relies on an adapter failure after
 * the filesystem work. */
export async function assertImageCapableRoute(
  ctx: { get(name: string): unknown },
  exec: ViewExec,
  requestedRun: string,
): Promise<void> {
  const routed = exec.agent?.session?.requestHeader?.()?.config
  const provider = routed?.provider ?? exec.agent?.options?.provider
  const model = routed?.model ?? exec.agent?.options?.model
  const llm = ctx.get('llm') as LlmInfoSeam | undefined
  if (provider === undefined || model === undefined || llm === undefined) {
    throw new Error(`cannot view run "${requestedRun}": the current model route could not be resolved`)
  }
  const active = await llm.resolveModelInfo(provider, model, exec.signal)
  if (active.inputModalities === undefined || !active.inputModalities.includes('image')) {
    throw new Error(`cannot view run "${requestedRun}": model "${model}" does not declare image input; switch to an image-capable model to view artifacts`)
  }
}

/** The render: one text summary + the image block (read_image's
 * imageReadContent pairing, run-scoped). A film value's text leads
 * with the probe verdict (duration, streams, frame count) — the
 * image block IS the contact sheet. */
function viewedContent(value: ViewedImageValue): ContentBlock[] {
  if (value.film !== undefined) {
    const f = value.film
    const streams = f.streams.map((s) =>
      s.codec + (s.width !== undefined && s.height !== undefined ? ' ' + String(s.width) + 'x' + String(s.height) : '')
      + (s.fps !== undefined ? ' @' + s.fps : '') + (s.frames !== undefined ? ' ' + String(s.frames) + 'f' : '')).join(' + ')
    return [
      { type: 'text', text: 'melite_view film: ' + value.url + ' (' + f.file
        + (f.duration_s !== undefined ? ', ' + String(f.duration_s) + 's' : '')
        + (f.size_bytes !== undefined ? ', ' + String(f.size_bytes) + ' bytes' : '')
        + ', streams: ' + streams + '; contact sheet of ' + String(f.sheet_of)
        + ': ' + value.image.mediaType + ' ' + String(value.image.width) + 'x' + String(value.image.height) + ')' },
      { type: 'image', attachment: imageRefFromValue(value.image) },
    ]
  }
  return [
    { type: 'text', text: 'melite_view: ' + value.url + ' (' + value.image.mediaType + ', ' + String(value.image.width) + 'x' + String(value.image.height) + ', ' + String(value.image.bytes) + ' bytes)' },
    { type: 'image', attachment: imageRefFromValue(value.image) },
  ]
}

/** Build the melite_view tool against the live cordis context (the
 * seats: `attachments` — the durable store, `queue` — the runs tree
 * root owner, `llm` — the route gate; all optional probes, the
 * tool-fs inject law). */
export function meliteView(ctx: Context): ToolDefinition {
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (typeof args === 'object' && args !== null ? args : {}) as { run_id?: unknown, artifact?: unknown }
    return {
      card: 'generic',
      title: 'View run artifact',
      kind: 'read',
      rawInput: { run_id: a.run_id, artifact: a.artifact },
    }
  }
  const def = defineTool({
    name: 'melite_view',
    description:
      'View one image artifact from a finished (or running) estate run — the model receives the image itself, '
      + 'never a description of it. When the run holds no images but holds a film, the observe arm serves the film instead: '
      + 'an ffprobe stream summary (duration, codecs, frame count) plus a contact-sheet image of frames across its span. '
      + 'This is the observe arm of the act/observe/decide loop: after a run lands, '
      + 'VIEW it before deciding the next step (never claim a match without viewing). '
      + 'Args: run_id (required, the run directory under the runs tree), artifact (optional substring — when a run '
      + 'produced several images, name the one to view; default is the newest). Requires the current model to accept image input.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root.
    parameters: {
      run_id: {
        type: 'string',
        required: true,
        description: 'The run id (a "run-…" directory name under the runs tree).',
      },
      artifact: {
        type: 'string',
        description: 'Optional filename substring — when a run produced several images, pick the one whose name contains this.',
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          runId: { type: 'string', description: 'The run the artifact belongs to.', required: true },
          url: { type: 'string', description: 'The estate media URL of the viewed artifact.', required: true },
          image: {
            type: 'object',
            additionalProperties: true,
            description: 'The durable attachment metadata (attachmentId, mediaType, bytes, width, height). On the film path this IS the contact sheet.',
            required: true,
          },
          film: {
            type: 'object',
            additionalProperties: true,
            description: 'Present only on the film path: the ffprobe summary (file, duration_s, size_bytes, streams with codec/geometry/fps/frames) plus sheet_of (frames tiled).',
          },
        },
      },
      render: (_args, value) => viewedContent(value as unknown as ViewedImageValue),
    },
    isConcurrencySafe: () => true,
    async execute(args, exec0): Promise<{ runId: string, url: string, image: Record<string, JsonValue> } & Record<string, JsonValue>> {
      const exec = exec0 as ViewExec
      const a = args as { run_id?: unknown, artifact?: unknown }
      // run_id is schema-typed string: the wrapper gate rejects
      // non-strings before the body (a non-string run_id throws
      // ToolArgsError there), so no non-string arm rides here — the
      // old one was gate-dead (the ledger-tail law, 2026-09-12).
      const runId = (a.run_id as string).trim()
      if (runId.length === 0) throw new Error('run_id must be a non-empty string')
      if (!RUN_ID.test(runId)) {
        throw new Error('cannot view "' + runId + '": a run id is a "run-…" directory name under the runs tree (the containment grammar)')
      }
      const artifact = typeof a.artifact === 'string' ? a.artifact.trim() : ''

      const attachments = ctx.get('attachments') as AttachmentsSeam | undefined
      if (attachments === undefined) {
        throw new Error('cannot view run "' + runId + '": no attachment service is mounted')
      }
      const seat = ctx.get('queue', false) as QueueSeatSeam | undefined
      if (seat === undefined) {
        throw new Error('cannot view run "' + runId + '": the queue seat owns the runs tree root — mount @melite-plugin/melite-estate')
      }

      // THE WALK (listMedia over the §23 manifest — same trees the
      // media/list door walks, own root first): run-filtered,
      // image-kind, newest first; the artifact substring only
      // narrows names the walk itself produced. A no-image run
      // falls to the film arm (§24) which walks video the same way.
      const found = await firstRootWithRun(seat, 'image', runId)
      if (found === null) {
        // THE FILM ARM (§24): a film run holds no images — observe
        // it through its own artifact (ffprobe summary + a contact
        // sheet the model can SEE). The no-film voice keeps the old
        // prefix (the walls pin it); the value carries the film row.
        const filmed = await viewFilmArtifact(seat, runId, artifact, exec, ctx, attachments)
        return filmed as unknown as { runId: string, url: string, image: Record<string, JsonValue> } & Record<string, JsonValue>
      }
      const own = found.own
      const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own
      if (picked.length === 0) {
        throw new Error('run "' + runId + '" has no image artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', '))
      }
      const row = picked[0]!

      // CONTAINMENT BY CONSTRUCTION: the absolute path is built from
      // the walk's own root + runId + name — caller text never
      // reaches the filesystem as a path.
      const absPath = join(found.root, 'output', row.runId, row.name)
      const declared = imageMediaTypeForPath(row.name)
      if (declared !== undefined && !attachments.imageLimits.mediaTypes.includes(declared)) {
        throw new Error('cannot view "' + row.name + '": ' + declared + ' images are not accepted by this deployment')
      }
      await assertImageCapableRoute(ctx, exec, runId)
      const byteCap = Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes)
      const data = await readFile(absPath, { signal: exec.signal })
      if (data.byteLength > byteCap) {
        throw new Error('cannot view "' + row.name + '": the file exceeds the ' + String(byteCap) + '-byte image cap; downscale and retry')
      }
      const mediaType = declared ?? sniffImageMediaType(data)
      if (mediaType === undefined) {
        throw new Error('cannot view "' + row.name + '": the file content is not a supported image format (PNG/JPEG/WebP/GIF)')
      }
      if (declared === undefined && !attachments.imageLimits.mediaTypes.includes(mediaType)) {
        throw new Error('cannot view "' + row.name + '": ' + mediaType + ' images are not accepted by this deployment')
      }
      let ref: ImageAttachmentRef
      try {
        ref = await attachments.saveImage({ data, mediaType, name: basename(row.name) })
      } catch (error) {
        if (!(error instanceof AttachmentError)) throw error
        if (error.code === 'IMAGE_DIMENSION_TOO_LARGE') {
          throw new Error('cannot view "' + row.name + '": at least one image side exceeds the ' + String(attachments.imageLimits.maxImageDimension) + 'px limit; downscale the image and view the smaller copy', { cause: error })
        }
        if (error.code === 'IMAGE_TOO_MANY_PIXELS') {
          throw new Error('cannot view "' + row.name + '": the image exceeds the ' + String(attachments.imageLimits.maxImagePixels) + '-pixel decoded-size limit; downscale the image and view the smaller copy', { cause: error })
        }
        if (error.code === 'IMAGE_TOO_LARGE') {
          throw new Error('cannot view "' + row.name + '": the image cannot be stored within the deployment\'s byte limits; downscale the image and view the smaller copy', { cause: error })
        }
        if (error.code === 'INVALID_IMAGE' && declared === undefined) {
          throw new Error('cannot view "' + row.name + '": the bytes do not decode as a supported PNG/JPEG/WebP/GIF image; the file may be truncated or corrupt', { cause: error })
        }
        throw error
      }
      const value: ViewedImageValue = {
        runId: row.runId,
        url: row.url,
        image: {
          attachmentId: ref.attachmentId,
          mediaType: ref.mediaType,
          bytes: ref.bytes,
          width: ref.width,
          height: ref.height,
          ...(ref.name === undefined ? {} : { name: ref.name }),
          ...(ref.originalDimensions === undefined ? {} : { originalDimensions: { ...ref.originalDimensions } }),
        },
      }
      return value as unknown as { runId: string, url: string, image: Record<string, JsonValue> } & Record<string, JsonValue>
    },
  })
  def.presentCall = presentCall
  return def
}
