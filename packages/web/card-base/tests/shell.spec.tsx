// @vitest-environment happy-dom
// shell.spec.tsx — THE STUDIO SHELL CONTRACT (stroke 36 writes the
// walls the shell never had).
//
// THE LAWS PINNED:
//  1. THE THREE-SLOT SHAPE: params LEFT, preview RIGHT, bottom
//     OPTIONAL, errors as shell-owned chrome — one shape for every
//     card surface (timeline studio or standard form).
//  2. THE TOAST LAW (stroke 36): the shell mounts the ONE toast
//     viewport. Before: motion hand-mounted a copy in a slot the
//     contract never had (type drift), anny pushed toasts with NO
//     viewport mounted — silently dropped — and ideogram4 hand-wired
//     its own. The per-studio mount is DEAD; any toast pushed from
//     any seam renders inside the shell, once. No studio wires it,
//     no studio can forget it (the construction law).
//  3. THE ERROR LINE: loud failures render as DOM text, once.
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h, useEffect } from 'react'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

import { StudioShell } from '../src/shell.tsx'
import { useToastStore } from '../src/toast.tsx'
import { repoRoot } from './helpers/repo-root.ts'

/** A studio seam that pushes a toast on mount — exactly how anny's
 *  slotGrid or motion's export dialog does it. */
function ToastPushingSeam({ message }: { message: string }) {
  const add = useToastStore((s) => s.addToast)
  useEffect(() => { add('error', message) }, [add, message])
  return null
}

afterEach(cleanup)

test('the three-slot shape: params, preview, bottom render in the shell root', () => {
  render(h(StudioShell, {
    params: h('div', { 'data-testid': 'params-slot' }, 'PARAMS'),
    preview: h('div', { 'data-testid': 'preview-slot' }, 'PREVIEW'),
    bottom: h('div', { 'data-testid': 'bottom-slot' }, 'BOTTOM'),
  }))
  expect(screen.getByTestId('params-slot')).toBeTruthy()
  expect(screen.getByTestId('preview-slot')).toBeTruthy()
  expect(screen.getByTestId('bottom-slot')).toBeTruthy()
})

test('the error line: loud failures render as DOM text with role=alert', () => {
  render(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
    errors: [{ id: 'run', message: 'the engine refused the graph' }],
  }))
  const alert = screen.getByRole('alert')
  expect(alert.textContent).toContain('run: the engine refused the graph')
})

// ── THE DISMISS LAW (audit 017 C4): the shell error line carries a
//    dismiss × anchored to its own element — presence, the press
//    retires the face, a fresh failure re-voices, and the anchor
//    contract holds in the stylesheet (the × lands ON the error).

test('THE DISMISS LAW: the error line carries a × INSIDE its own element; the press retires the line', () => {
  render(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
    errors: [{ id: 'run', message: 'the engine refused the graph' }],
  }))
  const alert = screen.getByRole('alert')
  const dismiss = within(alert).getByRole('button', { name: 'Dismiss error' })
  // PLACEMENT: the marker renders INSIDE the error face's bounds —
  // the <p> row is the × 's own element (the anchor contract's DOM
  // half; the stylesheet half is judged below).
  const row = dismiss.closest('p')
  expect(row, 'the × rides INSIDE the error row, never a wrapper').not.toBeNull()
  expect(row!.textContent).toContain('run: the engine refused the graph')
  fireEvent.click(dismiss)
  // the press retires the FACE — the line (and its role=alert seat) leave
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.queryByText((t, el) => el?.tagName === 'P' && (el.textContent ?? '').includes('the engine refused'))).toBeNull()
})

test('THE DISMISS LAW: the silence is per failure — same words stay retired, new words re-voice', () => {
  const view = render(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
    errors: [{ id: 'run', message: 'the engine refused the graph' }],
  }))
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Dismiss error' }))
  // the SAME failure (id + words) re-derived on the next poll stays silent
  view.rerender(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
    errors: [{ id: 'run', message: 'the engine refused the graph' }],
  }))
  expect(screen.queryByRole('alert')).toBeNull()
  // a NEW failure under the same id re-voices — the silence never eats
  // a fresh refusal
  view.rerender(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
    errors: [{ id: 'run', message: 'the weights file went missing' }],
  }))
  expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Dismiss error' })).toBeTruthy()
  // a retired failure's return re-voices: the re-arm drops the silence
  // once the failure leaves the props
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Dismiss error' }))
  expect(screen.queryByRole('alert')).toBeNull()
  view.rerender(h(StudioShell, { params: h('div'), preview: h('div'), errors: [] }))
  view.rerender(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
    errors: [{ id: 'run', message: 'the weights file went missing' }],
  }))
  expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Dismiss error' })).toBeTruthy()
})

test('THE PLACEMENT LAW: the stylesheet anchors the × to the error row (relative parent, absolute child)', () => {
  const css = readFileSync(join(repoRoot(), 'packages/web/card-base/src/shell.module.css'), 'utf8')
  const block = (name: string): string => {
    const m = css.match(new RegExp('\\.' + name + '\\s*\\{[^}]*\\}', 'm'))
    expect(m, '.' + name + ' block exists in shell.module.css').not.toBeNull()
    return m![0]!
  }
  expect(block('errorRow'), '.errorRow must carry position:relative — the × ’s positioned ancestor is the error’s own element (the anchor cure, audit 017 C4)').toMatch(/position\s*:\s*relative/)
  expect(block('errorDismiss'), '.errorDismiss stays position:absolute — the anchor contract: absolute child, positioned error parent').toMatch(/position\s*:\s*absolute/)
})

test('THE TOAST LAW: a toast pushed from ANY seam renders INSIDE the shell — no studio mount needed', async () => {
  render(h(StudioShell, {
    // the seam rides inside a slot, like a real studio child
    params: h(ToastPushingSeam, { message: 'the slot wire refused the pick' }),
    preview: h('div'),
  }))
  await waitFor(() => {
    expect(document.body.textContent).toContain('the slot wire refused the pick')
  })
  // and it renders exactly ONCE — the shell is the single viewport
  const matches = (document.body.textContent ?? '').match(/the slot wire refused the pick/g) ?? []
  expect(matches.length).toBe(1)
})

test('NO PER-STUDIO MOUNT: motion hand-mounts are DELETED (the shell owns chrome; ideogram4 retired 2026-09-17)', () => {
  // structural wall: the studios import the store, never the viewport
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs')
  const motion = fs.readFileSync(join(repoRoot(), 'packages/motion/motion/src/ui/studio/component.tsx'), 'utf8')
  expect(motion).not.toContain('<ToastViewport')
  // the shell is the one mount
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const shell = fs.readFileSync(join(repoRoot(), 'packages/web/card-base/src/shell.tsx'), 'utf8')
  expect(shell).toContain('<ToastViewport />')
})
