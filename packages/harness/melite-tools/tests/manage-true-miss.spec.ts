// @contract gates-manage-true-miss
// manage-true-miss.spec.ts — the qa8 F6/GAPS-11 refusal cure: the
// install_extension all-missed 404 carries the ACTUAL per-node miss
// detail instead of stamping the "not declared" narrative.
//
// THE FALSE LAW (2026-10-31): both Impact packs ARE declared rows
// (extension-manifest.json:245/:265, pinned refs, required:true —
// proved upstream in receipts/2026-10-31-gates-impact-pack-resolution.md),
// yet the miss handler hardcoded "extension is not declared … no
// declared repo maps these ids" over EVERY all-nodes-threw miss —
// including plan-side throws that are not declaration misses at all
// (an unloadable manifest, a seat miswire).
//
// THE CURE: voice each miss; name the undeclared law only for the
// misses that speak the declaration port's own "is not declared"
// voice; the operator door (install_extension_url + operator-approved
// git URL + operator_confirmed) still rides every 404. Declared ids
// ride the normal provisioner path untouched (plan → ensure → the
// merged face, never this 404).
//
// DEPTH: the REAL dispatchManage door with a recording fake
// provisioning seat (the sibling impact-pack-resolution.spec.ts
// pattern) — never the tool face, never a re-derived plan.

import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dispatchManage } from '../../estate-queue/src/managePlane.ts'
import type { ManageCtx } from '../../estate-queue/src/managePlane.ts'

const managedCtx = (root: string, provisioning: unknown): ManageCtx => ({
  repoRoot: root,
  stateRoots: [root],
  endpoint: () => ({ provision: 'managed', url: 'http://engine:8188' }),
  autoProvision: false,
  models: { allDecls: () => [] },
  provisioning: provisioning as ManageCtx['provisioning'],
  timeout: (cb: () => void, ms: number): (() => void) => {
    const timer = setTimeout(cb, ms)
    return () => { clearTimeout(timer) }
  },
} as unknown as ManageCtx)

describe('qa8 F6/GAPS-11 — the all-missed 404 voices the real misses', () => {
  it('a DECLARED id rides the normal provisioner path — a provisioner-side miss is never the 404', async () => {
    // THE QA8 SHAPE: plan() resolves the declared id (the map was
    // never stale), ensure() throws the Manager-side failure. The
    // answer is the merged face carrying the per-node detail — the
    // 404's undeclared narrative must not fire for a declared id.
    const root = mkdtempSync(join(tmpdir(), 'true-miss-'))
    const ensureCalls: unknown[] = []
    const ctx = managedCtx(root, {
      reconcile: async () => [],
      plan: async (ref: { kind: string; id: string }) => ({
        ref,
        items: [{ key: ref.id, kind: ref.kind, id: ref.id }],
      }),
      ensure: async (ref: unknown) => {
        ensureCalls.push(ref)
        throw new Error('Manager POST /customnode/install/git_url refused HTTP 400 for the pinned git_url')
      },
    })
    try {
      const [code, env] = await dispatchManage(
        { action: 'install_extension', nodes: ['comfyui-impact-pack'] }, ctx,
      )
      assert.notEqual(code, 404, 'a declared id never takes the undeclared door')
      assert.deepEqual(ensureCalls.length, 1, 'the normal provisioner path runs: ensure is entered')
      assert.ok(
        String((env as { misses?: unknown }).misses ?? '').includes('Manager POST /customnode/install/git_url refused HTTP 400'),
        'the refusal carries the ACTUAL per-node miss detail (got: ' + JSON.stringify((env as { misses?: unknown }).misses) + ')',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('mixed misses voice EACH cause — the undeclared law names only the miss that speaks it', async () => {
    // One genuinely unknown id (the declaration voice) beside a
    // plan-side throw that is NOT a declaration miss. The old text
    // stamped "no declared repo maps these ids" over both; the cure
    // voices each miss under its own cause.
    const root = mkdtempSync(join(tmpdir(), 'true-miss-'))
    const ensureCalls: unknown[] = []
    const ctx = managedCtx(root, {
      reconcile: async () => [],
      plan: async (ref: { id: string }) => {
        if (ref.id === 'ghost-pack') throw new Error(`extension "${ref.id}" is not declared`)
        throw new Error('shipped extension manifest unloadable: ENOENT extension-manifest.json')
      },
      ensure: async (ref: unknown) => {
        ensureCalls.push(ref)
        throw new Error('must not be called when no plan resolved')
      },
    })
    try {
      const [code, env] = await dispatchManage(
        { action: 'install_extension', nodes: ['ghost-pack', 'comfyui-impact-pack'] }, ctx,
      )
      const detail = String(env.detail ?? '')
      assert.equal(code, 404)
      assert.match(detail, /extension is not declared: ghost-pack/, 'the undeclared miss keeps its law and its door')
      assert.match(detail, /no plan resolved: comfyui-impact-pack/, 'the plan-side miss voices its own cause')
      assert.ok(!detail.includes('no declared repo maps these ids'), 'the stamped blanket narrative is gone (got: ' + detail + ')')
      assert.match(detail, /install_extension_url/, 'the operator door still rides every 404')
      assert.match(detail, /operator_confirmed/, 'the approval flag still rides every 404')
      assert.deepEqual(ensureCalls, [], 'no plan resolved — the provisioner is never entered')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
