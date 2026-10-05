// contract-sink.spec.ts — THE VERDICT CHANNEL IS WIRED IN THE ROW
// THAT OWNS IT. The catalog contract stores (catalogContractStore,
// runStatusContractStore) report through `contractToast`, a sink
// seam that THROWS when unwired — a verdict must never drop
// silently. This row's own browser face calls setContractToastSink
// at module materialization, so a verdict raised from the timeline
// card's own doors surfaces on the estate toast store the studio
// renders.
//
// card-base/tests/contract-sink.spec.ts proves the SEAM's own
// throwing half; this file proves THIS ROW installs a sink, and
// installs it over whatever sink a previous face left behind — the
// only proof that survives card-base's client face (which the row
// imports) having wired the same store one module earlier.
import { afterEach, expect, test } from 'vitest'

import { contractToast, setContractToastSink } from '@melite/catalog'
import { useToastStore } from '@melite/card-base/client'

interface Seen {
  type: string
  message: string
  action?: { label: string }
}

const realAddToast = useToastStore.getState().addToast
const seen: Array<Seen> = []
useToastStore.setState({
  addToast: ((type: string, message: string, action?: { label: string }) => {
    seen.push({ type, message, action })
  }) as typeof realAddToast,
})

afterEach(() => {
  useToastStore.setState({ addToast: realAddToast })
})

test('this row face installs the contract sink over a foreign one', async () => {
  // The prior sink: whatever a face loaded BEFORE this row left in
  // the seam. The row must overwrite it — a row that merely inherits
  // card-base's wiring would leave this list full.
  const prior: string[] = []
  setContractToastSink(() => { prior.push('prior sink') })

  // The door: importing the card package's own browser face runs its
  // wiring — the composition-root correction: a card's studio row
  // wires its own seam, never the bench host's.
  await import('../src/client/index.ts')

  contractToast('error', 'the timeline door refused the stitch')
  contractToast('success', 'the film landed', { label: 'Open', onClick: () => {} })

  expect(prior).toEqual([])
  expect(seen).toHaveLength(2)
  expect(seen[0]!.type).toBe('error')
  expect(seen[0]!.message).toBe('the timeline door refused the stitch')
  expect(seen[1]!.type).toBe('success')
  expect(seen[1]!.action?.label).toBe('Open')
})
