import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@melite/ui/tooltip'
import type { ReactElement } from 'react'

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { LoraPicker } from '../components/LoraPicker'
import type { LoRAEntry } from "@melite/contracts"

// Mock apiJson so we control the /v1/loras response. LoraPicker must
// tolerate: missing meta, missing note, malformed filenames, and HTTP
// errors (surfaced via onError).
vi.mock('@melite/catalog/api', () => ({
  apiJson: vi.fn(),
}))
import { apiJson } from '@melite/catalog'
const mockedApiJson = vi.mocked(apiJson)

function resp(loras: string[], meta: Record<string, any> = {}, note: string | null = null) {
  return Promise.resolve({ model: 'z-image', loras, meta, note })
}

// The base-ui Select renders options lazily — option labels only appear
// after the trigger is clicked. This helper opens the dropdown so tests
// can assert on option text/labels.
async function openList() {
  fireEvent.click(screen.getByRole('combobox'))
}

describe('LoraPicker', () => {
  beforeEach(() => {
    mockedApiJson.mockReset()
  })

  it('shows a loading state then exposes available LoRAs in the dropdown', async () => {
    mockedApiJson.mockReturnValue(resp(['Lightning.safetensors', 'Detailer.safetensors']))
    renderWithTooltip(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    expect(screen.getByText(/Loading/)).toBeTruthy()
    // Once loaded, opening the dropdown shows both LoRAs.
    await waitFor(async () => {
      await openList()
      expect(await screen.findByRole('option', { name: 'Lightning' })).toBeTruthy()
      expect(screen.getByRole('option', { name: 'Detailer' })).toBeTruthy()
    })
  })

  it('renders an honest empty state when the catalog returns no LoRAs', async () => {
    mockedApiJson.mockReturnValue(resp([]))
    renderWithTooltip(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText(/No LoRAs installed/)).toBeTruthy()
    })
  })

  it('surfaces fetch failures via onError and falls back to empty state', async () => {
    mockedApiJson.mockRejectedValue(new Error('HTTP 503'))
    const onError = vi.fn()
    renderWithTooltip(<LoraPicker model="z-image" value={[]} onChange={() => {}} onError={onError} />)
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/HTTP 503/))
      expect(screen.getByText(/No LoRAs installed/)).toBeTruthy()
    })
  })

  it('uses catalog metadata labels when available', async () => {
    mockedApiJson.mockReturnValue(resp(
      ['Lightning-4steps.safetensors'],
      { 'Lightning-4steps': { label: '⚡ Lightning 4-step', default_strength: 0.7 } },
    ))
    renderWithTooltip(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(async () => {
      await openList()
      expect(await screen.findByRole('option', { name: '⚡ Lightning 4-step' })).toBeTruthy()
    })
  })

  it('falls back to the bare stem when no catalog label is set', async () => {
    mockedApiJson.mockReturnValue(resp(['Some-Custom.safetensors']))
    renderWithTooltip(<LoraPicker model="z-image" value={[]} onChange={() => {}} />)
    await waitFor(async () => {
      await openList()
      // No meta — display the stem (filename minus .safetensors)
      expect(await screen.findByRole('option', { name: 'Some-Custom' })).toBeTruthy()
    })
  })

  it('uses default_strength from metadata when adding a LoRA', async () => {
    mockedApiJson.mockReturnValue(resp(
      ['Lightning.safetensors'],
      { 'Lightning': { default_strength: 0.5 } },
    ))
    const onChange = vi.fn()
    renderWithTooltip(<LoraPicker model="z-image" value={[]} onChange={onChange} />)
    await waitFor(async () => {
      await openList()
      const opt = await screen.findByRole('option', { name: 'Lightning' })
      fireEvent.click(opt)
    })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'Lightning.safetensors', strength: 0.5 },
    ])
  })

  it('clamps manual strength edits to [0, 5]', async () => {
    mockedApiJson.mockReturnValue(resp(['Lightning.safetensors']))
    // value contains the LoRA → it renders in a row with label + number input
    const value: LoRAEntry[] = [{ id: 'Lightning.safetensors', strength: 1.0 }]
    const onChange = vi.fn()
    renderWithTooltip(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    const num = document.querySelector('input[type="number"]') as HTMLInputElement
    expect(num).toBeTruthy()
    fireEvent.change(num, { target: { value: '99' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'Lightning.safetensors', strength: 5 },  // clamped down
    ])
  })

  it('clamps manual strength edits to a minimum of 0', async () => {
    mockedApiJson.mockReturnValue(resp(['Lightning.safetensors']))
    const value: LoRAEntry[] = [{ id: 'Lightning.safetensors', strength: 1.0 }]
    const onChange = vi.fn()
    renderWithTooltip(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    const num = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(num, { target: { value: '-10' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'Lightning.safetensors', strength: 0 },
    ])
  })

  it('rounds strength to two decimal places', async () => {
    mockedApiJson.mockReturnValue(resp(['Lightning.safetensors']))
    const value: LoRAEntry[] = [{ id: 'Lightning.safetensors', strength: 1.0 }]
    const onChange = vi.fn()
    renderWithTooltip(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    const num = document.querySelector('input[type="number"]') as HTMLInputElement
    fireEvent.change(num, { target: { value: '0.123456' } })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'Lightning.safetensors', strength: 0.12 },
    ])
  })

  it('clears all selected LoRAs when the clear button is clicked', async () => {
    mockedApiJson.mockReturnValue(resp(['Lightning.safetensors']))
    const value: LoRAEntry[] = [{ id: 'Lightning.safetensors', strength: 1.0 }]
    const onChange = vi.fn()
    renderWithTooltip(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Lightning')).toBeTruthy())

    fireEvent.click(screen.getByText('clear'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('removes a single LoRA when its ✕ button is clicked', async () => {
    mockedApiJson.mockReturnValue(resp(['A.safetensors', 'B.safetensors']))
    const value: LoRAEntry[] = [
      { id: 'A.safetensors', strength: 1 },
      { id: 'B.safetensors', strength: 1 },
    ]
    const onChange = vi.fn()
    const { container } = renderWithTooltip(<LoraPicker model="z-image" value={value} onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy())

    const removeBtns = container.querySelectorAll('button[aria-label^="Remove"]')
    expect(removeBtns.length).toBe(2)
    fireEvent.click(removeBtns[0])
    expect(onChange).toHaveBeenCalledWith([
      { id: 'B.safetensors', strength: 1 },
    ])
  })
})
