// @vitest-environment happy-dom
// contract-sink.spec.ts — THE VERDICT CHANNEL IS WIRED, IN THE ROW THAT
// OWNS IT. The catalog contract stores (catalogContractStore,
// runStatusContractStore) report through `contractToast`, a sink seam
// that THROWS when unwired — a verdict must never drop silently
// (run-status errors are toast-only). The row's own browser face wires
// that seam to the row's useToastStore at module materialization, so a
// verdict raised anywhere in the graph surfaces on THIS instance — the
// same store that renders the viewport.
//
// This wall exists because that wiring was invisible to every test
// plane: nothing booted the row's own apply, so the sink call
// executed in zero tests and a regression in it would ship silently.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'

import { Context } from '@deepseek-ai/cordis'
import { contractToast } from '@melite/catalog'
import { useToastStore } from '../src/toastStore.ts'
// The door: importing the face and booting its apply runs the row's
// own sink wiring (the wire rides apply — the ordering proof).
import * as row from '@melite/card-base/client'
import { repoRoot } from './helpers/repo-root.ts'

// the boot loop's own step: registry.plugin runs apply for the row,
// and apply wires the seam (the ordering proof: every fire is
// event-time, after this synchronous boot)
row.apply(new Context())

const realAddToast = useToastStore.getState().addToast

afterEach(() => {
  useToastStore.setState({ addToast: realAddToast })
})

test('the row apply wires the contract seam to its own toast store', () => {
  const seen: Array<{ type: string; message: string; action?: { label: string } }> = []
  useToastStore.setState({
    addToast: ((type: string, message: string, action?: { label: string }) => {
      seen.push({ type, message, action })
    }) as typeof realAddToast,
  })

  contractToast('error', 'the run gate refused stage 2')
  contractToast('success', 'the retry landed', { label: 'Retry', onClick: () => {} })

  expect(seen).toHaveLength(2)
  expect(seen[0]!.type).toBe('error')
  expect(seen[0]!.message).toContain('refused stage 2')
  expect(seen[1]!.type).toBe('success')
  expect(seen[1]!.action?.label).toBe('Retry')
})

test('the unwired seam THROWS — a dead verdict channel stays visible', () => {
  // The loud half of the seam. A fresh instance cannot be built inside
  // this module graph (the row already wired this one), so the refusal
  // is pinned at its source: the exact error the runtime raises.
  const src = readFileSync(join(repoRoot(), 'packages/web-kit/catalog/src/contractToast.ts'), 'utf8')
  expect(src).toMatch(/throw new Error\(/)
  expect(src).toMatch(/contract toast sink unset/)
  // ...and the sink starts empty, so the throw is reachable at all.
  expect(src).toMatch(/let sink: ContractToast \| null = null/)
})
