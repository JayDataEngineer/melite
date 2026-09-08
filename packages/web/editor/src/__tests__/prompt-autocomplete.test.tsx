/**
 * E4.7 — PromptAutocomplete component tests.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { PromptAutocomplete } from '../surfaces/generate/PromptAutocomplete'

afterEach(() => cleanup())

function renderAC(props: Partial<Parameters<typeof PromptAutocomplete>[0]> = {}) {
  const onChange = vi.fn()
  const utils = render(
    <PromptAutocomplete
      value={props.value ?? ''}
      onChange={props.onChange ?? onChange}
      onBlur={props.onBlur}
      placeholder={props.placeholder}
      className={props.className}
    />,
  )
  return { ...utils, onChange }
}

describe('PromptAutocomplete (E4.7)', () => {
  it('renders a textarea', () => {
    const { container } = renderAC()
    expect(container.querySelector('[data-prompt-textarea]')).not.toBeNull()
  })

  it('shows no suggestions initially (empty value)', () => {
    const { container } = renderAC({ value: '' })
    expect(container.querySelector('[data-prompt-suggestions]')).toBeNull()
  })

  it('shows matching suggestions when the token matches a tag', () => {
    const { container } = renderAC({ value: 'a cat, gold' })
    const sug = container.querySelector('[data-prompt-suggestions]')
    expect(sug).not.toBeNull()
    // Should contain "golden hour" (and maybe more).
    expect(sug!.querySelector('[data-suggestion-item="golden hour"]')).not.toBeNull()
  })

  it('does NOT show suggestions for a non-matching token', () => {
    const { container } = renderAC({ value: 'a cat, zzqqxx' })
    expect(container.querySelector('[data-prompt-suggestions]')).toBeNull()
  })

  it('typing forwards into the textarea fires onChange', () => {
    const { container, onChange } = renderAC({ value: '' })
    const ta = container.querySelector('[data-prompt-textarea]') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'cinematic' } })
    expect(onChange).toHaveBeenCalledWith('cinematic')
  })

  it('clicking a suggestion inserts the tag + ", " separator', () => {
    const onChange = vi.fn()
    const { container } = render(
      <PromptAutocomplete value="a cat, gold" onChange={onChange} />,
    )
    const sug = container.querySelector('[data-suggestion-item="golden hour"]') as HTMLElement
    expect(sug).not.toBeNull()
    // mousedown (not click) is the real event the component handles.
    fireEvent.mouseDown(sug)
    expect(onChange).toHaveBeenCalledTimes(1)
    const inserted = onChange.mock.calls[0][0] as string
    expect(inserted).toContain('golden hour')
    expect(inserted.endsWith(', ')).toBe(true)
    // The partial token "gold" should be replaced by "golden hour".
    expect(inserted).not.toMatch(/gold,/i)
  })

  it('Escape closes the suggestion dropdown', () => {
    const { container } = renderAC({ value: 'gold' })
    expect(container.querySelector('[data-prompt-suggestions]')).not.toBeNull()
    const ta = container.querySelector('[data-prompt-textarea]') as HTMLTextAreaElement
    fireEvent.keyDown(ta, { key: 'Escape' })
    expect(container.querySelector('[data-prompt-suggestions]')).toBeNull()
  })

  it('ArrowDown moves the highlight', () => {
    const { container } = renderAC({ value: 'close' })
    const ta = container.querySelector('[data-prompt-textarea]') as HTMLTextAreaElement
    const highlighted0 = container.querySelector('[data-highlighted="true"]') as HTMLElement
    expect(highlighted0).not.toBeNull()
    const firstVal = highlighted0.getAttribute('data-suggestion-item')
    fireEvent.keyDown(ta, { key: 'ArrowDown' })
    const highlighted1 = container.querySelector('[data-highlighted="true"]') as HTMLElement
    expect(highlighted1.getAttribute('data-suggestion-item')).not.toBe(firstVal)
  })

  it('Tab inserts the highlighted suggestion', () => {
    const onChange = vi.fn()
    const { container } = render(
      <PromptAutocomplete value="gold" onChange={onChange} />,
    )
    const ta = container.querySelector('[data-prompt-textarea]') as HTMLTextAreaElement
    fireEvent.keyDown(ta, { key: 'Tab' })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toContain('golden hour')
  })

  it('Enter inserts the highlighted suggestion (no shift)', () => {
    const onChange = vi.fn()
    const { container } = render(
      <PromptAutocomplete value="neon" onChange={onChange} />,
    )
    const ta = container.querySelector('[data-prompt-textarea]') as HTMLTextAreaElement
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('Shift+Enter does NOT insert (lets textarea insert a newline)', () => {
    const onChange = vi.fn()
    const { container } = render(
      <PromptAutocomplete value="neon" onChange={onChange} />,
    )
    const ta = container.querySelector('[data-prompt-textarea]') as HTMLTextAreaElement
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true })
    expect(onChange).not.toHaveBeenCalled()
  })
})
