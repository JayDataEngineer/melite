import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { Slider } from '@melite/ui/slider'

describe('Slider thumb-grab drag', () => {
  afterEach(cleanup)

  it('fires when pointerdown lands on the THUMB (not the control)', () => {
    const onValueChange = vi.fn()
    const { container } = render(
      <Slider value={[50]} min={0} max={100} step={1} onValueChange={onValueChange} className="w-40 h-4" />
    )
    const thumb = container.querySelector('[data-slot="slider-thumb"]') as HTMLElement
    expect(thumb).toBeTruthy()
    // Real user grabs the thumb itself
    fireEvent.pointerDown(thumb, { clientX: 100, clientY: 10, button: 0 })
    fireEvent.pointerMove(document, { clientX: 150, clientY: 10, buttons: 1 })
    fireEvent.pointerUp(document, { clientX: 150, clientY: 10 })
    console.log('Thumb-grab onValueChange calls:', onValueChange.mock.calls.length)
    expect(onValueChange).toHaveBeenCalled()
  })

  it('respects disabled prop', () => {
    const onValueChange = vi.fn()
    const { container } = render(
      <Slider value={[50]} min={0} max={100} step={1} onValueChange={onValueChange} disabled className="w-40 h-4" />
    )
    const control = container.querySelector('[data-base-ui-slider-control]') as HTMLElement
    fireEvent.pointerDown(control, { clientX: 100, clientY: 10, button: 0 })
    fireEvent.pointerMove(document, { clientX: 150, clientY: 10, buttons: 1 })
    fireEvent.pointerUp(document, { clientX: 150, clientY: 10 })
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
