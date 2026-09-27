import { RUN_ID_RE } from "@melite/contracts/benchStage"
/**
 * melite_read — the estate's TEXT observe arm for a run (2026-09-25).
 *
 * WHY IT EXISTS: the commission loop's own report named the hole. A
 * maker could view images/film/audio (melite_view) and could read run
 * state through melite_flow/run_status, but NOTHING could read a run's
 * TEXT artifacts — the `_request.json` a run actually executed, the
 * `_flow.json` sidecar, a handoff STATE file. On wire surfaces whose
 * deferred file tools cannot see the `/melite-media` mount, and on the
 * native maker face where those tools are intentionally absent, that
 * left the agent unable to answer "what did this run actually send?"
 * without shelling out — which agent mode forbids.
 *
 * THE CONTAINMENT LAW (melite_view's, verbatim): the run id must
 * match the queue's RUN_ID grammar, the file is chosen from the walk's
 * OWN rows (never caller text building a path), the caller's `path` is
 * a substring FILTER, and the resolved real path must stay inside the
 * run directory (the symlink-escape check is the point — a run tree
 * holding a link out of the estate must not become a filesystem
 * browser). Roots ride the §23 manifest: own root first, a miss names
 * every searched tree.
 *
 * TEXT ONLY, BY DESIGN: a byte cap, an extension vocabulary, and a
 * binary sniff. Media is melite_view's door (it commits the pixels);
 * this door answers text, so a `.mp4` named `.json` refuses instead of
 * dumping megabytes of bytes into the model's context.
 */
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import type { Dirent } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import { rootsManifest, searchedVoice } from '@melite/estate-queue'
import type { JsonValue, ToolDefinition } from '../types.ts'

/** The run-id grammar (estate/media's containment law, verbatim). */
const RUN_ID = RUN_ID_RE

/** The text vocabulary this door answers. A run's own sidecars are
 *  json/jsonl/md/txt/yaml/log; anything else is media (melite_view),
 *  a checkpoint (never read into a context window), or a refusal. */
export const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  'json', 'jsonl', 'md', 'txt', 'yaml', 'yml', 'log', 'csv', 'tsv',
])

/** The byte cap: a sidecar is a receipt, not a dataset. 256 KB is far
 *  past any run sidecar and far below a context window. */
export const TEXT_BYTE_CAP = 256 * 1024

/** Walk depth (run/stage/file), matching the media list arm. */
const MAX_DEPTH = 3
/** Row cap for the miss voice and the listing. */
const ROW_CAP = 200

/** Binary sniff: a NUL byte in the first 8 KB is not text. */
const BINARY_SNIFF_BYTES = 8 * 1024

export interface TextRow {
  /** path relative to the run dir, POSIX-ish (`stage/_request.json`) */
  readonly path: string
  readonly bytes: number
}

export interface QueueSeatSeam {
  stateRoot: string
}

/** The run-id gate, exported for the door pins. */
export function assertRunId(runId: string): void {
  if (!RUN_ID.test(runId)) {
    throw new Error(
      `"${runId}" is not a run id — melite_read reads a run's own files, and a run id is `
      + 'run-<hex>-<token> (the directory name under the runs tree)',
    )
  }
}

/** Is this name a text row by extension? */
export function isTextName(name: string): boolean {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return false
  return TEXT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase())
}

/** Walk one run directory for its text rows (pure over the tree, the
 *  media list arm's shape: depth-bounded, mtime-newest first, capped). */
export async function listRunText(runDir: string): Promise<TextRow[]> {
  const rows: TextRow[] = []
  const walk = async (dir: string, rel: string, depth: number): Promise<void> => {
    // the depth bound guards entry; the ROW_CAP guard lives in the
    // entry loop below, which is the ONLY place a further walk can be
    // requested — an entry check here would be dead code
    if (depth > MAX_DEPTH) return
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (rows.length >= ROW_CAP) return
      if (e.isDirectory()) {
        await walk(join(dir, e.name), rel === '' ? e.name : `${rel}/${e.name}`, depth + 1)
        continue
      }
      // A SYMLINK IS A ROW, not a silent skip: a run tree that links
      // out of the estate must surface at the door, where the read
      // refuses with the containment voice. Dropping it here would be
      // exactly the silent-skip class this estate refuses, and the
      // containment check below would be dead code.
      if ((!e.isFile() && !e.isSymbolicLink()) || !isTextName(e.name)) continue
      const name = rel === '' ? e.name : `${rel}/${e.name}`
      let bytes = 0
      try {
        bytes = (await stat(join(dir, e.name))).size
      } catch {
        // a DANGLING link still belongs on the list — the read names it
        bytes = 0
      }
      rows.push({ path: name, bytes })
    }
  }
  await walk(runDir, '', 1)
  return rows
}

/** The first manifest root holding the run's directory wins (own
 *  writes win); a miss names every searched tree. */
async function firstRootWithRunDir(
  seat: QueueSeatSeam,
  runId: string,
): Promise<{ dir: string, root: string } | null> {
  for (const root of rootsManifest(seat.stateRoot)) {
    const dir = join(root, 'output', runId)
    try {
      if ((await stat(dir)).isDirectory()) return { dir, root }
    } catch {
      continue
    }
  }
  return null
}

/** The refusal voice for a miss: the run's text rows when it has any,
 *  else the searched roots. Never a bare "not found". */
function missVoice(runId: string, rows: readonly TextRow[], roots: string[]): string {
  const held = rows.length === 0
    ? 'the run holds no text files'
    : 'the run holds: ' + rows.slice(0, 8).map((r) => r.path).join(', ')
  return `run "${runId}" has no text file matching that path — ${held} ` + searchedVoice(roots)
}

type ReadResult = {
  runId: string
  path?: string
  bytes?: number
  text?: string
  truncated?: boolean
  files?: string
  error?: string
} & Record<string, JsonValue>

/** Read one text artifact of one run. With no `path`, LIST the run's
 *  text rows (the door's discovery arm — a maker needs to know what it
 *  can read before naming one). */
export async function readRunText(
  seat: QueueSeatSeam,
  runId: string,
  path: string,
): Promise<ReadResult> {
  assertRunId(runId)
  const roots = rootsManifest(seat.stateRoot)
  const rootsSpoken = [...roots]
  const found = await firstRootWithRunDir(seat, runId)
  if (found === null) {
    throw new Error(`run "${runId}" is not in the runs tree ` + searchedVoice(rootsSpoken))
  }
  const rows = await listRunText(found.dir)
  const want = path.trim()
  if (want === '') {
    if (rows.length === 0) {
      throw new Error(`run "${runId}" holds no text files ` + searchedVoice(rootsSpoken))
    }
    return {
      runId,
      files: rows.slice(0, ROW_CAP).map((r) => r.path + ' (' + String(r.bytes) + 'b)').join(', '),
    }
  }
  // the caller's path is a FILTER over the walk's own rows — the
  // resolved path is always the walk's, never caller text
  const matches = rows.filter((r) => r.path === want || r.path.includes(want))
  if (matches.length === 0) {
    throw new Error(missVoice(runId, rows, rootsSpoken))
  }
  if (matches.length > 1) {
    throw new Error(
      `"${want}" matches ${String(matches.length)} text files in run "${runId}" — name one exactly: `
      + matches.slice(0, 8).map((r) => r.path).join(', '),
    )
  }
  const row = matches[0]!
  const abs = resolve(found.dir, row.path)
  // CONTAINMENT: the resolved real path must still live inside the run
  // directory — a symlink out of the estate is a refusal, not a read
  const root = await realpath(found.dir)
  const real = await realpath(abs)
  if (real !== root && !real.startsWith(root + sep)) {
    throw new Error(
      `"${row.path}" resolves outside run "${runId}" — melite_read reads a run's own files, never a link out of it`,
    )
  }
  const data = await readFile(abs)
  if (data.byteLength > TEXT_BYTE_CAP) {
    throw new Error(
      `"${row.path}" is ${String(data.byteLength)} bytes, over melite_read's ${String(TEXT_BYTE_CAP)}-byte text cap `
      + '— a run sidecar is a receipt, not a dataset (read the slice you need at the estate, not into the context)',
    )
  }
  if (data.subarray(0, BINARY_SNIFF_BYTES).includes(0)) {
    throw new Error(
      `"${row.path}" is not text (a NUL byte in its first ${String(BINARY_SNIFF_BYTES)} bytes) — `
      + 'media is melite_view\'s door, and a checkpoint is never read into a context window',
    )
  }
  return {
    runId,
    path: row.path,
    bytes: data.byteLength,
    text: data.toString('utf8'),
  }
}

export function meliteRead(ctx: { get(name: string): unknown }): ToolDefinition {
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (typeof args === 'object' && args !== null ? args : {}) as { run_id?: unknown, path?: unknown }
    return {
      card: 'generic',
      title: `Read run file ${String(a.run_id ?? '?')}`,
      kind: 'read',
      rawInput: { run_id: String(a.run_id ?? '?'), ...(a.path === undefined ? {} : { path: String(a.path) }) },
    }
  }
  const def = defineTool({
    name: 'melite_read',
    description:
      'Read a TEXT file from one finished run — the sidecars a run actually wrote (`_request.json`, `_flow.json`, '
      + 'a handoff STATE.md). Omit `path` to list the run\'s text files. Run-scoped and text-only: media is '
      + '`melite_view`\'s door, and nothing outside the run directory is reachable. Use it to answer "what did this '
      + 'run send?" without shelling out. Args: run_id (required), path (optional substring of the file name).',
    parameters: {
      run_id: {
        type: 'string',
        description: 'The run id (a "run-…" directory name under the runs tree).',
        required: true,
      },
      path: {
        type: 'string',
        description: 'Optional: a substring of the text file\'s path inside the run. Omit to list what the run holds.',
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          runId: { type: 'string', required: true },
          path: { type: 'string', description: 'The read file, relative to the run directory.' },
          bytes: { type: 'number', description: 'The file size in bytes.' },
          text: { type: 'string', description: 'The file content (UTF-8) on the read arm.' },
          files: { type: 'string', description: 'Present on the listing arm: the run\'s text files with sizes.' },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused.' },
        },
      },
      render: (_args, value) => {
        const v = value as ReadResult
        if (typeof v.error === 'string' && v.error !== '') {
          return [{ type: 'text', text: 'melite_read REFUSED: ' + v.error }]
        }
        if (typeof v.files === 'string') {
          return [{ type: 'text', text: 'melite_read ' + v.runId + ' text files: ' + v.files }]
        }
        // THE BODY RIDES: the render IS the model-facing response —
        // a listing with no body leaves the agent having read nothing.
        return [{ type: 'text', text: 'melite_read ' + v.runId + '/' + String(v.path ?? '?') + ': ' + String(v.text ?? '') }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args): Promise<ReadResult> {
      // defineTool validates the arg types in the wrapper BEFORE the
      // body (ToolArgsError/INVALID_ARGS); run_id is a required
      // string here, so honest casts ride.
      const a = args as { run_id?: unknown, path?: unknown }
      const seat = ctx.get('queue') as QueueSeatSeam | undefined
      if (seat === undefined || typeof seat.stateRoot !== 'string') {
        throw new Error('melite_read: the queue seat is not available — a run\'s files are read through the estate runs tree')
      }
      return await readRunText(seat, a.run_id as string, typeof a.path === 'string' ? a.path : '')
    },
  })
  def.presentCall = presentCall
  return def
}
