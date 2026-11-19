// @contract gates-impact-pack-resolution
// impact-pack-resolution.spec.ts — the qa8 F6 wall (GAPS-11): the
// registry-id → git_url map for the two Impact packs, and the loud
// refusal for unknown ids.
//
// THE INVARIANT: `install_extension comfyui-impact-pack` (and
// `-subpack`) resolves the real upstream repos —
// https://github.com/ltdrdata/ComfyUI-Impact-Pack and
// https://github.com/ltdrdata/ComfyUI-Impact-Subpack — at their
// pinned commits; an UNKNOWN id refuses LOUD naming the operator
// door (`install_extension_url` with the operator-approved git URL),
// never a silent 400 passthrough, and no Manager call is attempted
// for an id no row declares. The URL door rides THE AUTO-PROVISION
// LAW (operator 2026-11-01): a URL the shipped manifest declares
// provisions from its byte-verified pin with NO operator gesture;
// an undeclared URL keeps the operator_confirmed gate (409 before
// any fetch). ARM C drives the REAL dispatch door for both faces.
//
// DEPTH: arm A reads the SHIPPED manifest through the declaration
// plane's own loader (the file `extensionManifest()` dereferences at
// runtime), never a spec-local copy of the URLs; arm B drives the
// REAL dispatch door (`dispatchManage`), not the tool face.

import { describe, it, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dispatchManage } from '../../estate-queue/src/managePlane.ts'
import type { ManageCtx } from '../../estate-queue/src/managePlane.ts'
import { loadShippedExtensionManifest } from '../../../engines/comfyui-cordis/scripts/provision-extensions-manifest.ts'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.MELITE_EXTENSION_MANIFEST
})

// The canonical upstreams (ltdrdata's Impact repos — the aux_id the
// Manager serves them under, minus the host prefix) at the pins the
// mask card DECL carries. Both repos exist upstream and both SHAs
// resolve to real upstream commits (verified 2026-10-31 against the
// public GitHub API); a re-pin edits THESE literals deliberately,
// never silently.
const IMPACT_PACK_URL = 'https://github.com/ltdrdata/ComfyUI-Impact-Pack'
const IMPACT_PACK_REF = '429d0159ad429e64d2b3916e6e7be9c22d025c3c'
const IMPACT_SUBPACK_URL = 'https://github.com/ltdrdata/ComfyUI-Impact-Subpack'
const IMPACT_SUBPACK_REF = '50c7b71a6a224734cc9b21963c6d1926816a97f1'

describe('qa8 F6 — the impact id → git_url map resolves the real upstreams', () => {
  it('arm A: both impact ids resolve to their exact upstream repos at the pinned refs', () => {
    // The default path: the exact file the declaration plane reads
    // (no MELITE_EXTENSION_MANIFEST override in this package's
    // suite — an override would judge the fixture, not the map).
    delete process.env.MELITE_EXTENSION_MANIFEST
    const rows = loadShippedExtensionManifest()
    assert.ok(rows.length > 0, 'the shipped manifest carries rows')
    for (const [id, url, ref] of [
      ['comfyui-impact-pack', IMPACT_PACK_URL, IMPACT_PACK_REF],
      ['comfyui-impact-subpack', IMPACT_SUBPACK_URL, IMPACT_SUBPACK_REF],
    ] as const) {
      const row = rows.find((r) => r.name === id)
      assert.ok(row !== undefined, id + ' is a declared manifest row')
      assert.equal(row.url, url, id + ' resolves to its upstream repo')
      assert.equal(row.ref, ref, id + ' carries the pinned commit the git arm verifies')
      assert.equal(row.required, true, id + ' stays required — preflight judges required rows only')
    }
  })

  it('arm B: an UNKNOWN id refuses loud with the operator-door text — no Manager call attempted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'impact-f6-'))
    let railCalls = 0
    globalThis.fetch = (async () => {
      railCalls++
      return new Response('unused', { status: 500 })
    }) as typeof fetch
    const ensureCalls: unknown[] = []
    const ctx = {
      repoRoot: root,
      stateRoots: [root],
      endpoint: () => ({ provision: 'managed', url: 'http://engine:8188' }),
      autoProvision: false,
      models: { allDecls: () => [] },
      provisioning: {
        reconcile: async () => [],
        plan: async (ref: { id: string }) => {
          throw new Error(`extension "${ref.id}" is not declared`)
        },
        ensure: async (ref: unknown) => {
          ensureCalls.push(ref)
          throw new Error('must not be called for an undeclared id')
        },
      },
      timeout: (cb: () => void, ms: number): (() => void) => {
        const timer = setTimeout(cb, ms)
        return () => { clearTimeout(timer) }
      },
    } as unknown as ManageCtx
    try {
      const [code, env] = await dispatchManage({ action: 'install_extension', nodes: ['comfyui-impact-pack-typo'] }, ctx)
      assert.equal(code, 404)
      assert.equal(env.ok, false)
      assert.match(env.detail ?? '', /extension is not declared: comfyui-impact-pack-typo/)
      // THE OPERATOR DOOR (the F6 cure): the refusal names the URL
      // door + the approval flag — never a bare 400 passthrough that
      // loops the agent back onto the dead id door.
      assert.match(env.detail ?? '', /install_extension_url/)
      assert.match(env.detail ?? '', /operator_confirmed/)
      assert.deepEqual(ensureCalls, [], 'the provisioner is never entered for an undeclared id')
      assert.equal(railCalls, 0, 'no Manager rail call is attempted for an undeclared id')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('arm C — THE AUTO-PROVISION LAW: a declared pin provisions with NO operator gesture; an unpinned URL keeps the human gate', async () => {
    // THE LAW (operator 2026-11-01): packs the shipped manifest
    // declares ride BYTE-VERIFIED pins — installing one through the
    // URL door IS the provisioning path (the L2#12 sam2 live
    // receipts need nothing operator-side). The declared URL
    // auto-provisions from THE PIN (an omitted ref installs the
    // row's pinned ref, never a floating HEAD; the manifest row is
    // the approval recorded with the operation); a ref that is not
    // the pin is an external acquisition and keeps the
    // operator_confirmed gate; an UNDECLARED url refuses 409
    // unchanged, and rides the flag through when the human approves.
    const root = mkdtempSync(join(tmpdir(), 'impact-f6-gate-'))
    const acquireCalls: unknown[] = []
    const ctx = {
      repoRoot: root,
      stateRoots: [root],
      endpoint: () => ({ provision: 'managed', url: 'http://engine:8188' }),
      autoProvision: false,
      models: { allDecls: () => [] },
      provisioning: {
        reconcile: async () => [],
        plan: async () => { throw new Error('must not be called on the URL door') },
        ensure: async () => { throw new Error('must not be called on the URL door') },
        acquireExternal: async (req: unknown, opts: unknown) => {
          acquireCalls.push([req, opts])
          return { operationId: 'op-gate', ref: { kind: 'extension', id: 'external:test' }, state: 'active', outcome: 'active', items: [], restartRequired: false }
        },
      },
      timeout: (cb: () => void, ms: number): (() => void) => {
        const timer = setTimeout(cb, ms)
        return () => { clearTimeout(timer) }
      },
    } as unknown as ManageCtx
    const calls = acquireCalls as Array<[Record<string, unknown>, Record<string, unknown>]>
    try {
      // 1. THE DECLARED PACK, NO GESTURE: the Impact URL is the
      // manifest's own row — it provisions unconfirmed, from THE PIN
      const [autoCode, autoEnv] = await dispatchManage(
        { action: 'install_extension_url', url: IMPACT_PACK_URL },
        ctx,
      )
      assert.equal(autoCode, 200, 'a declared pin auto-provisions without operator_confirmed')
      assert.equal(autoEnv.ok, true)
      assert.equal(calls.length, 1, 'the provisioner is entered for a declared pin')
      assert.equal(calls[0]![0]!['url'], IMPACT_PACK_URL, 'the declared URL rides')
      assert.equal(calls[0]![0]!['ref'], IMPACT_PACK_REF, 'the declared PIN rides — an omitted ref never floats to HEAD')
      assert.equal(calls[0]![1]!['operatorConfirmed'], true, 'the manifest row IS the recorded approval')
      // 2. A REF THAT IS NOT THE PIN: an external acquisition — the
      // human gate keeps it (409 without the flag, no provisioner)
      acquireCalls.length = 0
      const [wrongRefCode, wrongRefEnv] = await dispatchManage(
        { action: 'install_extension_url', url: IMPACT_PACK_URL, ref: 'not-the-pin' },
        ctx,
      )
      assert.equal(wrongRefCode, 409, 'a floating ref on a declared URL is not the provisioning path')
      assert.match(wrongRefEnv.detail ?? '', /operator_confirmed/)
      assert.deepEqual(acquireCalls, [], 'a non-pin ref never reaches the provisioner unconfirmed')
      // 3. THE STATED PIN EQUAL TO THE ROW: the same auto-provision face
      acquireCalls.length = 0
      const [pinnedCode] = await dispatchManage(
        { action: 'install_extension_url', url: IMPACT_PACK_URL, ref: IMPACT_PACK_REF },
        ctx,
      )
      assert.equal(pinnedCode, 200, 'a stated ref equal to the pin auto-provisions too')
      assert.equal(calls.length, 1)
      assert.equal(calls[0]![0]!['ref'], IMPACT_PACK_REF)
      // 4. THE UNPINNED URL: the unchanged human gate — 409, the
      // provisioner never entered
      acquireCalls.length = 0
      const [noFlagCode, noFlagEnv] = await dispatchManage(
        { action: 'install_extension_url', url: 'https://github.com/someone/undeclared-pack' },
        ctx,
      )
      assert.equal(noFlagCode, 409, 'an undeclared URL refuses 409 without the flag')
      assert.equal(noFlagEnv.ok, false)
      assert.match(noFlagEnv.detail ?? '', /operator_confirmed/)
      assert.deepEqual(acquireCalls, [], 'the provisioner is never entered without the flag on an undeclared URL')
      // 5. THE UNPINNED URL + THE FLAG: the external door rides
      // through (unchanged)
      const [okCode, okEnv] = await dispatchManage(
        { action: 'install_extension_url', url: 'https://github.com/someone/undeclared-pack', operator_confirmed: true },
        ctx,
      )
      assert.equal(okCode, 200)
      assert.equal(okEnv.ok, true)
      assert.equal(calls.length, 1, 'the confirmed call reaches the provisioner')
      assert.equal(calls[0]![1]!['operatorConfirmed'], true, 'the flag rides through to the provisioner')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
