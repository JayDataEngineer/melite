/**
 * Session-fixture storage rules for the recorded-session corpus — the
 * Melite-owned subset of DSH's snapshots/AGENTS.md contract
 * (references/deepseek-harness/snapshots/AGENTS.md): parent filenames
 * are `session[.vN].jsonl`; child roles are
 * `session.<ordinal>[.vN].jsonl`; v0 omits `.v0`, positive versions
 * require lowercase `.vN`; replay, record, and refresh select each
 * role's numerically highest generation; record and refresh write
 * version-named outputs without renaming or deleting a committed
 * generation. Used by every `*.snapshot.ts` driver and the corpus gate
 * (scripts/session-snapshot-corpus.corpus.ts).
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** A session fixture's role and generation, parsed from its filename. */
export interface SessionFixtureName {
  readonly role: 'parent' | `child-${number}`
  readonly generation: number
}

/**
 * Parse one session-fixture filename; names outside the grammar return null.
 * @param name - bare filename, e.g. `session.jsonl`, `session.v1.jsonl`, `session.2.v1.jsonl`.
 * @returns the role and generation, or null for non-fixture names.
 */
export function parseSessionFixtureName(name: string): SessionFixtureName | null {
  const match = /^session(?:\.([1-9]\d*))?(?:\.v([1-9]\d*))?\.jsonl$/.exec(name)
  if (!match) return null
  const ordinal = match[1] === undefined ? 0 : Number(match[1])
  const generation = match[2] === undefined ? 0 : Number(match[2])
  return { role: ordinal === 0 ? 'parent' : `child-${ordinal}`, generation }
}

/** One session fixture: its filename, parsed name, and shape-checked rows. */
export interface SessionFixture {
  readonly file: string
  readonly name: SessionFixtureName
  readonly rows: Record<string, unknown>[]
}

/**
 * Read and shape-check one fixture: the first row must be a header whose
 * `format` is a `vN` string — the filename/header agreement the corpus owns.
 * @param dir - scenario directory holding the fixture.
 * @param file - bare fixture filename.
 * @returns the parsed fixture.
 */
function readFixture(dir: string, file: string): SessionFixture {
  const text = readFileSync(join(dir, file), 'utf8').trim()
  const rows = (text === '' ? [] : text.split('\n')).map((line) => JSON.parse(line) as Record<string, unknown>)
  assert.ok(rows.length > 0, `${file}: empty fixture`)
  const header = rows[0]
  assert.equal(header.type, 'header', `${file}: first row must be the header`)
  assert.match(String(header.format), /^v\d+$/, `${file}: header.format must be vN`)
  return { file, name: parseSessionFixtureName(file)!, rows }
}

/**
 * Select one role's fixture in a scenario directory: the numerically
 * highest committed generation, the one replay, record, and refresh use.
 * @param dir - scenario directory.
 * @param role - the role to select; defaults to the parent.
 * @returns the selected, shape-checked fixture.
 */
export function selectGeneration(dir: string, role: SessionFixtureName['role'] = 'parent'): SessionFixture {
  const candidates = readdirSync(dir)
    .map((file) => ({ file, name: parseSessionFixtureName(file) }))
    .filter((x): x is { file: string; name: SessionFixtureName } => x.name !== null && x.name.role === role)
    .sort((a, b) => a.name.generation - b.name.generation)
  assert.ok(candidates.length > 0, `${dir}: no ${role} session fixture`)
  return readFixture(dir, candidates[candidates.length - 1].file)
}

/** The flat snapshot.yml manifest subset the corpus gate owns. */
export interface SnapshotManifest {
  readonly profile: string
  readonly composition: string
  readonly headerClass: string
  readonly recordingPolicy: string
  readonly borrows?: string
}

/**
 * Parse a scenario's snapshot.yml — the flat top-level `key: value`
 * subset every Melite manifest uses (indented blocks and `#` comments
 * are skipped; nested values are not part of the subset).
 * @param text - the manifest file's contents.
 * @param file - path used in failure messages.
 * @returns the manifest fields.
 */
export function parseSnapshotManifest(text: string, file: string): SnapshotManifest {
  const entries = new Map<string, string>()
  for (const rawLine of text.split('\n')) {
    if (rawLine === '' || rawLine.startsWith('#') || /^\s/.test(rawLine)) continue
    const sep = rawLine.indexOf(':')
    assert.ok(sep > 0, `${file}: manifest line is not \`key: value\`: ${rawLine}`)
    entries.set(rawLine.slice(0, sep).trim(), rawLine.slice(sep + 1).trim())
  }
  const need = (key: string): string => {
    const value = entries.get(key)
    assert.ok(value !== undefined && value !== '', `${file}: missing manifest key ${key}`)
    return value
  }
  return {
    profile: need('profile'),
    composition: need('composition'),
    headerClass: need('headerClass'),
    recordingPolicy: need('recordingPolicy'),
    borrows: entries.get('borrows'),
  }
}
