// runsDelegation walls (vitest, pure module + tmp DSH_HOME — no
// gateway, no plugin mount). Pins THE PERSISTED DELEGATION STATE
// (session 90a0b920 burn, 2026-11-05: "the melite_runs auto mode
// turned off... after I had it on"):
//   1. ROUNDTRIP: write → read returns the same record; the file
//      lives under the lane's DSH_HOME.
//   2. BOOT LAW: headless boots seated (config wins over any
//      record); a browser mount boots on the persisted record,
//      defaulting to the browser law (false) when nothing persists.
//   3. ABSENT: no file → null (the browser law's default).
//   4. CORRUPT/FOREIGN: a bad file refuses LOUD (the warn names the
//      path) and reads as absent — never a silent true.
//   5. WRITE FAILURE: returned as a message, never thrown — the
//      toggle's success voice can honestly say the flip did not
//      persist.
import { describe, test, beforeAll, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  delegationStatePath,
  readRunsDelegation,
  writeRunsDelegation,
  resolveDelegationAtBoot,
} from '../src/runsDelegation.ts'

let home: string
const previousHome = process.env.DSH_HOME

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'melite-runs-delegation-'))
  process.env.DSH_HOME = home
})

afterAll(() => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  rmSync(home, { recursive: true, force: true })
})

describe('THE PERSISTED DELEGATION — roundtrip', () => {
  test('write → read returns the same record, under the lane DSH_HOME', () => {
    assert.equal(writeRunsDelegation({ delegated: true }), undefined)
    assert.equal(delegationStatePath(), join(home, 'melite-runs-state.json'))
    assert.deepEqual(readRunsDelegation(), { delegated: true })
    assert.equal(readFileSync(delegationStatePath(), 'utf8'), '{"delegated":true}\n')

    assert.equal(writeRunsDelegation({ delegated: false }), undefined)
    assert.deepEqual(readRunsDelegation(), { delegated: false })
  })
})

describe('THE BOOT LAW (pure — the wiring\'s one decision)', () => {
  test('headless boots seated, whatever the record says (config wins)', () => {
    assert.equal(resolveDelegationAtBoot(true, null), true)
    assert.equal(resolveDelegationAtBoot(true, { delegated: false }), true)
  })

  test('a browser mount boots on the PERSISTED record — the operator\'s last toggle outlives the reload', () => {
    assert.equal(resolveDelegationAtBoot(false, { delegated: true }), true)
    assert.equal(resolveDelegationAtBoot(false, { delegated: false }), false)
  })

  test('nothing persisted → the browser law (false): runs start at the user\'s Run press', () => {
    assert.equal(resolveDelegationAtBoot(false, null), false)
  })
})

describe('reads refuse loud, never silent-true', () => {
  test('absent file reads as null', () => {
    rmSync(delegationStatePath(), { force: true })
    assert.equal(existsSync(delegationStatePath()), false)
    assert.equal(readRunsDelegation(), null)
  })

  test('corrupt JSON → null + a warn naming the path', () => {
    writeFileSync(delegationStatePath(), '{not json', 'utf8')
    const warns: Array<[string, ...unknown[]]> = []
    assert.equal(readRunsDelegation({ warn: (template, ...args) => { warns.push([template, ...args]) } }), null)
    assert.equal(warns.length, 1)
    assert.match(String(warns[0]![0]), /reading %s failed/)
    assert.ok(warns[0]!.slice(1).includes(delegationStatePath()), 'the warn names the state file')
  })

  test('a foreign record ({delegated: "yes"}) → null + a warn asking for the shape', () => {
    writeFileSync(delegationStatePath(), '{"delegated":"yes"}', 'utf8')
    const warns: Array<[string, ...unknown[]]> = []
    assert.equal(readRunsDelegation({ warn: (template, ...args) => { warns.push([template, ...args]) } }), null)
    assert.equal(warns.length, 1)
    assert.match(String(warns[0]![0]), /not a delegation record/)
    assert.ok(warns[0]!.slice(1).includes(delegationStatePath()), 'the warn names the state file')
  })
})

describe('write failures are values, never throws', () => {
  test('a DSH_HOME that cannot hold the file returns the failure\'s message', () => {
    // DSH_HOME pointed at an existing FILE: the parent "directory"
    // cannot be made, the write refuses — as a message.
    const notADir = join(home, 'not-a-dir')
    writeFileSync(notADir, 'occupied', 'utf8')
    process.env.DSH_HOME = notADir
    try {
      const failure = writeRunsDelegation({ delegated: true })
      assert.ok(typeof failure === 'string' && failure !== '', 'the failure is a message')
    } finally {
      if (previousHome === undefined) process.env.DSH_HOME = home
      else process.env.DSH_HOME = previousHome
    }
  })
})
