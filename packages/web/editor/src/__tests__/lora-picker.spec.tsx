import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoraPicker } from '../components/LoraPicker'
import type { LoRAEntry } from "@melite/contracts"

// UI-kit seams mocked to their lightest faithful shape: the base-ui
// Select drags a second React into the test env (the known dual-react
// disease — field-grammar fails the same way rendering it); a native
// <select> exercises the picker's OWN logic (add/strength/clamp/
// clear/remove) identically. The kit's rendering is covered by the
// kit's own tests.
vi.mock('@melite/ui/select', () => ({
  Select: ({ children, onValueChange, disabled }: {
    children: React.ReactNode
    onValueChange: (v: string) => void
    disabled?: boolean
  }) => (
    <select
      data-testid="lora-add"
      disabled={disabled}
      value=""
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: (): null => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))
vi.mock('@melite/ui/tip', () => ({
  Tip: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@melite/ui/label', () => ({
  Label: ({ children }: { children?: React.ReactNode }) => <label>{children}</label>,
}))

const renderPicker = (el: React.ReactElement) => render(el)

// ALL BUILT IN (operator order, 2026-09-10): the picker rides the
// SPEC CONTRACT STORE — the same path every card surface rides. There
// is no /v1/loras fetch and no loras remote to mock: the stub IS the
// store's record (a loaded spec whose modifiers block carries the
// lora kind's options — the family-owned catalog, composed into the
// served spec server-side).
const { storeState, mockedLoadFormSpec } = vi.hoisted(() => {
  const storeState = {
    records: {} as Record<string, Record<string, unknown>>,
  }
  return {
    storeState,
    mockedLoadFormSpec: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../surfaces/shared/specContractStore', () => ({
  useSpecContractStore: (sel: (s: unknown) => unknown) =>
    sel({ records: storeState.records, loadFormSpec: mockedLoadFormSpec }),
}))

/** One lora kind's options as the served spec carries them — the
 *  ModifierOptionSpec wire shape (value = the catalog id, label,
 *  defaults.strength). */
function specOf(options: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    fields: [],
    schema_groups: [],
    features: { modifiers: [{ kind: 'lora', fields: [], options }] },
  }
}

type Rec = { spec: Record<string, unknown> | null; state: string; violations: unknown[]; error: string | null }

function loaded(options: Array<Record<string, unknown>>): Rec {
  return { spec: specOf(options), state: 'loaded', violations: [], error: null }
}

function setRecord(rec: Rec): void {
  storeState.records = { 'z-image': rec as unknown as Record<string, unknown> }
}

// The mocked select renders options eagerly — no click-to-open dance.
async function openList(): Promise<void> {}

describe('LoraPicker', () => {
  beforeEach(() => {
    mockedLoadFormSpec.mockClear()
    setRecord(loaded([]))
  })

  it('loads the spec through the store and shows the loading state', async () => {
    setRecord({ spec: null, state: 'loading', violations: [], error: null })
    renderPicker(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    // The mount drives the store's loadFormSpec (the ONE ingest gate).
    expect(mockedLoadFormSpec).toHaveBeenCalledWith('z-image')
    expect(screen.getByText(/Loading/)).toBeTruthy()
  })

  it('renders the adapter options once the spec is loaded', async () => {
    setRecord(loaded([
      { value: 'lightning', label: 'Lightning' },
      { value: 'detailer', label: 'Detailer' },
    ]))
    renderPicker(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(async () => {
      await openList()
      expect(await screen.findByRole('option', { name: 'Lightning' })).toBeTruthy()
      expect(screen.getByRole('option', { name: 'Detailer' })).toBeTruthy()
    })
  })

  it('renders an honest empty state when the family declares no loras', async () => {
    setRecord(loaded([]))
    renderPicker(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/No LoRAs installed/)).toBeTruthy()
    })
  })

  it('surfaces the store error inline (no double-toast — the store toasts)', async () => {
    setRecord({ spec: null, state: 'error', violations: [], error: 'HTTP 503' })
    const value: LoRAEntry[] = [{ id: 'lightning', strength: 1 }]
    renderPicker(<LoraPicker model="z-image" value={value} onChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/HTTP 503/)).toBeTruthy()
    })
  })

  it('uses the declared label when the option carries one', async () => {
    setRecord(loaded([
      { value: 'lightning-4steps', label: '⚡ Lightning 4-step' },
    ]))
    renderPicker(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(async () => {
      await openList()
      expect(await screen.findByRole('option', { name: '⚡ Lightning 4-step' })).toBeTruthy()
    })
  })

  it('falls back to the bare catalog id when no label is set', async () => {
    setRecord(loaded([{ value: 'some-custom' }]))
    renderPicker(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(async () => {
      await openList()
      expect(await screen.findByRole('option', { name: 'some-custom' })).toBeTruthy()
    })
  })

  it('seeds added entries with the option default_strength', async () => {
    setRecord(loaded([
      { value: 'lightning', label: 'Lightning', defaults: { strength: 0.5 } },
    ]))
    const onChange = vi.fn()
    renderPicker(<LoraPicker model="z-image" value={[]} onChange={onChange} />)
    await waitFor(() => {
      const sel = screen.getByTestId('lora-add') as HTMLSelectElement
      expect(sel.options.length).toBe(1)
    })
    fireEvent.change(screen.getByTestId('lora-add'), { target: { value: 'lightning' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'lightning', strength: 0.5 },
    ])
  })

  it('clamps manual strength edits to [0, 5]', async () => {
    setRecord(loaded([{ value: 'lightning', label: 'Lightning' }]))
    const value: LoRAEntry[] = [{ id: 'lightning', strength: 1.0 }]
    const onChange = vi.fn()
    renderPicker(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    const num = document.querySelector('input[type="number"]') as HTMLInputElement
    expect(num).toBeTruthy()
    fireEvent.change(num, { target: { value: '99' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'lightning', strength: 5 },
    ])
  })

  it('clamps manual strength edits to a minimum of 0', async () => {
    setRecord(loaded([{ value: 'lightning', label: 'Lightning' }]))
    const value: LoRAEntry[] = [{ id: 'lightning', strength: 1.0 }]
    const onChange = vi.fn()
    renderPicker(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    const num = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(num, { target: { value: '-10' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'lightning', strength: 0 },
    ])
  })

  it('rounds strength to two decimal places', async () => {
    setRecord(loaded([{ value: 'lightning', label: 'Lightning' }]))
    const value: LoRAEntry[] = [{ id: 'lightning', strength: 1.0 }]
    const onChange = vi.fn()
    renderPicker(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    const num = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(num, { target: { value: '0.123456' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'lightning', strength: 0.12 },
    ])
  })

  it('clears all selected LoRAs when the clear button is clicked', async () => {
    setRecord(loaded([{ value: 'lightning', label: 'Lightning' }]))
    const value: LoRAEntry[] = [{ id: 'lightning', strength: 1.0 }]
    const onChange = vi.fn()
    renderPicker(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    fireEvent.click(screen.getByText('clear'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('removes a single LoRA when its ✕ button is clicked', async () => {
    setRecord(loaded([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]))
    const value: LoRAEntry[] = [
      { id: 'a', strength: 1 },
      { id: 'b', strength: 1 },
    ]
    const onChange = vi.fn()
    const { container } = renderPicker(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy())

    const removeBtns = container.querySelectorAll('button[aria-label^="Remove"]')
    expect(removeBtns.length).toBe(2)
    fireEvent.click(removeBtns[0])
    expect(onChange).toHaveBeenCalledWith([
      { id: 'b', strength: 1 },
    ])
  })
})
