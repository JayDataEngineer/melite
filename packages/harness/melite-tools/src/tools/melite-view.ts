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
import { readFile } from 'node:fs/promises'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { AttachmentError, AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { listMedia } from '@melite/estate-media'
import type { JsonValue, ToolDefinition } from '../types.ts'

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
 * imageReadContent pairing, run-scoped). */
function viewedContent(value: ViewedImageValue): ContentBlock[] {
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
      + 'never a description of it. This is the observe arm of the act/observe/decide loop: after a run lands, '
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
            description: 'The durable attachment metadata (attachmentId, mediaType, bytes, width, height).',
            required: true,
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

      // THE WALK (listMedia — same tree the media/list door walks):
      // run-filtered, image-kind, newest first; the artifact substring
      // only narrows names the walk itself produced.
      const { items } = await listMedia(seat.stateRoot, 'image')
      const own = items.filter((i) => i.runId === runId)
      if (own.length === 0) {
        throw new Error('run "' + runId + '" produced no image artifacts (or the run id is unknown)')
      }
      const picked = artifact.length > 0 ? own.filter((i) => i.name.includes(artifact)) : own
      if (picked.length === 0) {
        throw new Error('run "' + runId + '" has no image artifact containing "' + artifact + '" — the run holds: ' + own.slice(0, 8).map((i) => i.name).join(', '))
      }
      const row = picked[0]!

      // CONTAINMENT BY CONSTRUCTION: the absolute path is built from
      // the walk's own runId + name — caller text never reaches the
      // filesystem as a path.
      const absPath = join(seat.stateRoot, 'output', row.runId, row.name)
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
