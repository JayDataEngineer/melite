import { fireEvent, render, waitFor } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createElement as h } from 'react'
import { ScrollLockedDetail } from '../src/client/stage-drill.tsx'

test('THE SCROLL LOCK (operator 2026-09-21: "whenever progress updates, it jerks the view up"): the user\'s wheel-owned position survives ANY un-owned scroll — every programmatic thief is restored next frame, render-independent', async () => {
  const tall = h('div', { style: { height: '4000px' } }, 'content')
  const r = render(h(ScrollLockedDetail, null, tall))
  const el = r.container.querySelector('div')!
  // the user wheels deep — the gesture owns the position
  el.scrollTop = 300
  fireEvent.wheel(el, { deltaY: 10 })
  el.scrollTop = 310
  fireEvent.scroll(el) // the browser fires this natively; happy-dom needs the nudge
  // THE THIEF: a layout clamp yanks the scroll (no user gesture)
  el.scrollTop = 46
  fireEvent.scroll(el)
  await waitFor(() => { expect(el.scrollTop).toBe(310) }, { timeout: 2000 }) // restored next frame
  // a second thief — the law holds every time
  el.scrollTop = 0
  fireEvent.scroll(el)
  await waitFor(() => { expect(el.scrollTop).toBe(310) }, { timeout: 2000 })
})

test('NO USER INPUT, NO LOCK: before any wheel/touch/key the scroller is free', () => {
  const r = render(h(ScrollLockedDetail, null, h('div', { style: { height: '4000px' } })))
  const el = r.container.querySelector('div')!
  el.scrollTop = 120
  fireEvent.scroll(el) // not user-owned but userTop is null → free
  expect(el.scrollTop).toBe(120)
})
