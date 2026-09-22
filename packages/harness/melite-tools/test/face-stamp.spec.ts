// face-stamp.spec.ts — F-7: the served faces carry the tree version.
//
// Tiers: PURE (formatStamp matrix + readStamp against injected fake
// git runs — no binaries) always runs; LIVE proves the real repo
// checkout stamps a short hash. The cache arm rides its own file
// (the module caches per process — one file, one registry).
import { describe, expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import { faceStamp, formatStamp, readStamp, type GitRun } from '../src/faceStamp.ts'

describe('formatStamp (pure)', () => {
  test('clean hash stamps bare', () => {
    expect(formatStamp('abc1234', false)).toBe('abc1234')
  })
  test('dirty hash stamps +dirty', () => {
    expect(formatStamp('abc1234', true)).toBe('abc1234+dirty')
  })
  test('empty hash stamps unknown (never a bare guess)', () => {
    expect(formatStamp('', false)).toBe('unknown')
    expect(formatStamp('   \n', true)).toBe('unknown')
  })
  test('surrounding whitespace trims', () => {
    expect(formatStamp('  abc1234\n', false)).toBe('abc1234')
  })
})

describe('readStamp (injected git)', () => {
  const run: GitRun = (args) => {
    if (args[0] === 'rev-parse') return 'deadbee\n'
    return ''
  }
  test('clean tree stamps the short hash', () => {
    expect(readStamp(run, '/repo')).toBe('deadbee')
  })
  test('porcelain output stamps +dirty', () => {
    const dirty: GitRun = (args) => (args[0] === 'rev-parse' ? 'deadbee' : ' M src/x.ts\n')
    expect(readStamp(dirty, '/repo')).toBe('deadbee+dirty')
  })
  test('rev-parse failure stamps unknown', () => {
    const failing: GitRun = () => {
      throw new Error('not a repo')
    }
    expect(readStamp(failing, '/tmp')).toBe('unknown')
  })
  test('status failure stamps unknown (never a clean lie)', () => {
    const statusFails: GitRun = (args) => {
      if (args[0] === 'rev-parse') return 'deadbee'
      throw new Error('status unreadable')
    }
    expect(readStamp(statusFails, '/repo')).toBe('unknown')
  })
  test('empty hash stamps unknown', () => {
    const empty: GitRun = () => ''
    expect(readStamp(empty, '/repo')).toBe('unknown')
  })
})

describe('faceStamp (live repo)', () => {
  test('the checkout stamps its own short HEAD', () => {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
    }).trim()
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    const porcelain = execFileSync('git', ['status', '--porcelain'], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    const want = porcelain !== '' ? `${head}+dirty` : head
    expect(faceStamp(root)).toBe(want)
  })
})
