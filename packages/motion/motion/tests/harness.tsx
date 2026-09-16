/**
 * The motion lane's React-19-pure render harness (2026-09-16).
 *
 * WHY NOT @testing-library/react: motion-motion pins its own React 18
 * tree while the dom lane aliases react/react-dom at 19 (the studio
 * host, card-view, is React 19). testing-library's renderer resolves
 * its react through node resolution — the nested 18 copy — while the
 * lane's sources bind aliased 19 (dual-React trap: 18's reconciler
 * rejects 19 elements as invalid children). vitest 4 reads neither
 * `server.deps.inline` nor `ssr.noExternal` for this (probed
 * 2026-09-16: inline:true at root changes nothing), so the lane's
 * motion specs render through the aliased 19 copy DIRECTLY:
 * createRoot (react-dom/client, lane-aliased) + act (react 19) for
 * mounting, @testing-library/dom (zero react imports — pure DOM
 * events + queries) for gestures and role queries.
 */
import { act, createElement as h, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { fireEvent } from '@testing-library/dom'
import { vi } from 'vitest'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mounted: Array<{ root: Root; container: HTMLElement }> = []

/** Mount UI into document.body (RTL render, minus the renderer). */
export async function render19(ui: ReactElement): Promise<{
  container: HTMLElement
  rerender: (next: ReactElement) => Promise<void>
}> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push({ root, container })
  await act(async () => {
    root.render(ui)
  })
  const rerender = async (next: ReactElement): Promise<void> => {
    await act(async () => {
      root.render(next)
    })
  }
  return { container, rerender }
}

/** Unmount everything render19 mounted (RTL cleanup). */
export async function cleanup19(): Promise<void> {
  while (mounted.length > 0) {
    const next = mounted.pop()!
    await act(async () => {
      next.root.unmount()
    })
    next.container.remove()
  }
}

export { act, fireEvent, h }

function matches(re: string | RegExp, text: string): boolean {
  return typeof re === 'string' ? text.includes(re) : re.test(text)
}

/** Poll document.body until content matching re appears (RTL findBy). */
export async function waitForText(re: string | RegExp, timeout = 6000): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const all = [...document.body.querySelectorAll('*')]
    const hit = all.find((el) => matches(re, el.textContent ?? ''))
    if (!hit) throw new Error(`waitForText: nothing matches ${String(re)} yet`)
    return hit as HTMLElement
  }, { timeout })
}

/** All body elements whose text matches (mirrored-note counting). */
export function allByText(re: string | RegExp): HTMLElement[] {
  return [...document.body.querySelectorAll('*')].filter(
    (el) => matches(re, el.textContent ?? ''),
  ) as HTMLElement[]
}
