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
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h, useEffect } from 'react'

import { StudioShell } from '../src/shell.tsx'
import { useToastStore } from '../src/toast.tsx'

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

test('NO PER-STUDIO MOUNT: motion and ideogram4 hand-mounts are DELETED (the shell owns chrome)', () => {
  // structural wall: the studios import the store, never the viewport
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs')
  const motion = fs.readFileSync('packages/motion/motion/src/ui/studio/component.tsx', 'utf8')
  const ideo = fs.readFileSync('packages/image/ideogram4/src/ui/studio/component.tsx', 'utf8')
  expect(motion).not.toContain('<ToastViewport')
  expect(ideo).not.toContain('<ToastViewport')
  // the shell is the one mount
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const shell = fs.readFileSync('packages/web/card-base/src/shell.tsx', 'utf8')
  expect(shell).toContain('<ToastViewport />')
})
