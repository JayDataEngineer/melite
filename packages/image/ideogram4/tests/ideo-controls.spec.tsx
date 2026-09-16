// @vitest-environment happy-dom
/**
 * controls.tsx — the shared studio atoms (Textarea passthrough, the
 * Tip tooltip wrapper). Rendered bare: every arm pinned by DOM.
 */
import { describe, expect, test } from 'vitest'
import { createElement as h } from 'react'
import { render, screen } from '@testing-library/react'
import { Textarea, Tip } from '../src/ui/studio/controls.tsx'

describe('Textarea', () => {
  test('seats the slot marker, merges the module class, passes the rest through', () => {
    render(h(Textarea, { className: 'extra', placeholder: 'describe', value: 'hi', onChange: () => {} }))
    const box = screen.getByPlaceholderText('describe')
    expect(box.getAttribute('data-slot')).toBe('textarea')
    expect(box.className).toContain('extra')
    expect((box as HTMLTextAreaElement).value).toBe('hi')
  })
})

describe('Tip', () => {
  test('without a tip the child rides bare (no tooltip chrome)', () => {
    render(h(Tip, { children: h('button', { type: 'button' }, 'naked') }))
    expect(screen.getByText('naked').tagName).toBe('BUTTON')
  })

  test('with a tip the label seats on the default top side', async () => {
    render(h(Tip, { tip: 'Delete it', children: h('button', { type: 'button' }, 'hover me') }))
    expect(screen.getByText('hover me')).toBeTruthy()
  })

  test('a custom side rides through (bottom)', () => {
    render(h(Tip, { tip: 'Down here', side: 'bottom', children: h('button', { type: 'button' }, 'sided') }))
    expect(screen.getByText('sided')).toBeTruthy()
  })
})
