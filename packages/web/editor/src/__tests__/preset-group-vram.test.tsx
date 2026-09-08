/**
 * PresetGroup — the vram_peak_gb badge (2026-08-16).
 *
 * The GPU-variations fix, frontend side: vram_peak_gb was declared in 21
 * variant.yaml files, carried on the wire, typed here — and rendered
 * nowhere. This pins that the ONE variant-button primitive renders the
 * DECLARED peak next to every variant that carries one.
 *
 * Contract:
 *   • a variant with vram_peak_gb renders a small "12.5G" badge in its button
 *   • a variant without one renders no badge
 *   • clicking still applies overrides (the badge is inert)
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TooltipProvider } from '@melite/ui/tooltip'
import { PresetGroup } from '@/surfaces/generate/PresetGroup'

function setup(variants: PresetGroupTestVariant[]) {
  const setValues = vi.fn((fn: (prev: Record<string, unknown>) => Record<string, unknown>) => fn({}))
  render(
    <TooltipProvider>
      <PresetGroup variants={variants} values={{}} setValues={setValues} />
    </TooltipProvider>,
  )
  return { setValues }
}

interface PresetGroupTestVariant {
  id: string
  label: string
  defaults: Record<string, unknown>
  vram_peak_gb?: number
}

describe('PresetGroup — vram_peak_gb badge', () => {
  it('renders the declared peak as a badge on variants that carry one', () => {
    setup([
      { id: 'turbo', label: 'Turbo', defaults: { steps: 4 }, vram_peak_gb: 18 },
      { id: 'base', label: 'Base', defaults: { steps: 30 } },
    ])
    const turbo = screen.getByRole('button', { name: /turbo/i })
    expect(turbo).toHaveTextContent('18G')
    const base = screen.getByRole('button', { name: /base/i })
    expect(base).not.toHaveTextContent('G')
  })

  it('fractional peaks render with one decimal', () => {
    setup([{ id: 'q5', label: 'Q5', defaults: {}, vram_peak_gb: 10.5 }])
    expect(screen.getByRole('button', { name: /q5/i })).toHaveTextContent('10.5G')
  })

  it('the badge is inert — clicking applies overrides, no vram in the write', () => {
    const { setValues } = setup([
      { id: 'turbo', label: 'Turbo', defaults: { steps: 4 }, vram_peak_gb: 18 },
    ])
    fireEvent.click(screen.getByRole('button', { name: /turbo/i }))
    expect(setValues).toHaveBeenCalledTimes(1)
    const applied = setValues.mock.calls[0][0]({}) as Record<string, unknown>
    expect(applied).toEqual({ steps: 4 })
  })
})
