/**
 * embed-bridge -- the DSH<->canvas integration (ALL of it lives here, the
 * editor is untouched; 3rd-party seams carry the weight):
 *
 * (a) THEME -- DSH's ui-theme presenter projects --dsw-alias-* tokens as
 *     inline vars on the DSH <body>. The bridge copies them onto the
 *     canvas iframe's <html> custom properties (the editor's tailwind
 *     @theme-inline utilities all resolve through them), so the canvas
 *     re-skins with Skin Center -- live, polled.
 * (b) RAIL  -- the canvas's own left ActivityBar and its Agent lane are
 *     hidden in embed; the DSH details column (the layout extension)
 *     hosts the canvas controls instead (DetailsPanel).
 * (c) LLM   -- the editor's Agent-settings lane is dead surface here
 *     (the assistant IS DSH); hiding it removes the second-LLM
 *     appearance. No /v1/llm call is ever issued from the embed.
 */

/** editor token <- DSW alias token (computed values, flipped by Skin Center) */
const THEME_MAP: Array<[editor: string, dsw: string]> = [
  ['--background', '--dsw-alias-bg-base'],
  ['--foreground', '--dsw-alias-label-primary'],
  ['--card', '--dsw-alias-bg-layer-2'],
  ['--card-foreground', '--dsw-alias-label-primary'],
  ['--popover', '--dsw-alias-bg-layer-3'],
  ['--popover-foreground', '--dsw-alias-label-primary'],
  ['--secondary', '--dsw-alias-bg-module-platform'],
  ['--secondary-foreground', '--dsw-alias-label-primary'],
  ['--muted', '--dsw-alias-bg-module-platform'],
  ['--muted-foreground', '--dsw-alias-label-secondary'],
  ['--accent', '--dsw-alias-interactive-bg-hover-solid'],
  ['--accent-foreground', '--dsw-alias-label-primary'],
  ['--border', '--dsw-alias-border-l2'],
  ['--input', '--dsw-alias-border-l3'],
  ['--destructive', '--dsw-alias-state-error-primary'],
  ['--sidebar', '--dsw-specific-sidebar-fill'],
  ['--sidebar-border', '--dsw-alias-border-l2'],
  // TECH-NOIR chromatics -> the DSH signal estate, 1:1, BY NAME. Every
  // value is read live off the DSH <body> at each tick -- Skin Center
  // flips the canvas wholesale. The DSH signal color (links, info
  // buttons, active accents) is state-business-primary.
  ['--brand', '--dsw-alias-state-business-primary'],
  ['--brand-foreground', '--dsw-alias-label-primary-inverted'],
  ['--primary', '--dsw-alias-state-business-primary'],
  ['--primary-foreground', '--dsw-alias-label-primary-inverted'],
  ['--ring', '--dsw-alias-state-business-primary'],
  ['--sidebar-primary', '--dsw-alias-state-business-primary'],
  ['--sidebar-primary-foreground', '--dsw-alias-label-primary-inverted'],
  ['--sidebar-ring', '--dsw-alias-state-business-primary'],
  ['--sidebar-accent', '--dsw-alias-interactive-bg-hover-solid'],
  ['--sidebar-accent-foreground', '--dsw-alias-label-primary'],
  ['--sidebar-foreground', '--dsw-alias-label-primary'],
  ['--chart-1', '--dsw-alias-state-business-primary'],
  ['--chart-2', '--dsw-alias-state-success-primary'],
  ['--chart-3', '--dsw-alias-state-warn-primary'],
  ['--chart-4', '--dsw-alias-state-business-primary'],
  ['--chart-5', '--dsw-alias-state-error-primary'],
]

/** editor button labels whose lanes are DEAD in the DSH embed */
const HIDDEN_LANES = ['Agent settings']

/** The tailwind default palette is a SECOND manual color source
 *  (bg-emerald-500 etc. resolve var(--color-emerald-500)). Under DSH it
 *  does not exist: every chromatic hue is re-pointed at a live alias,
 *  so no palette class can render outside the DSH theme. */
const PALETTE_HUES: Record<string, string> = {
  emerald: '--dsw-alias-state-success-primary',
  green: '--dsw-alias-state-success-primary',
  lime: '--dsw-alias-state-success-primary',
  teal: '--dsw-alias-state-business-primary',
  cyan: '--dsw-alias-state-business-primary',
  sky: '--dsw-alias-state-business-primary',
  blue: '--dsw-alias-state-business-primary',
  indigo: '--dsw-alias-state-business-primary',
  violet: '--dsw-alias-state-business-primary',
  purple: '--dsw-alias-state-business-primary',
  fuchsia: '--dsw-alias-state-business-primary',
  pink: '--dsw-alias-state-business-primary',
  red: '--dsw-alias-state-error-primary',
  rose: '--dsw-alias-state-error-primary',
  orange: '--dsw-alias-state-warn-primary',
  amber: '--dsw-alias-state-warn-primary',
  yellow: '--dsw-alias-state-warn-primary',
}
const PALETTE_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

export interface EmbedHandle { stop(): void }

/** Start the bridge for one iframe. Idempotent per frame; poll follows
 *  Skin Center changes and canvas re-mounts until stopped. */
export function startEmbedBridge(frame: HTMLIFrameElement): EmbedHandle {
  let stopped = false

  const tick = (): void => {
    if (stopped) return
    const doc = frame.contentDocument
    if (!doc || !doc.documentElement) return
    closeRightPanelTabs()

    // (a) theme: DSH body aliases -> canvas <html> tokens
    const parentStyle = window.getComputedStyle(document.body)
    const root = doc.documentElement
    for (const pair of THEME_MAP) {
      const value = parentStyle.getPropertyValue(pair[1]).trim()
      if (value !== '') root.style.setProperty(pair[0], value)
    }
    // the tailwind palette: re-pointed wholesale at DSH aliases
    for (const hue of Object.keys(PALETTE_HUES)) {
      const value = parentStyle.getPropertyValue(PALETTE_HUES[hue]).trim()
      if (value === '') continue
      for (const shade of PALETTE_SHADES) root.style.setProperty('--color-' + hue + '-' + shade, value)
    }
    // dark-mode class follows DSH's color-scheme marker
    const dshDark = document.body.hasAttribute('data-ds-dark-theme')
    root.classList.toggle('dark', dshDark)
    root.style.setProperty('color-scheme', dshDark ? 'dark' : 'light')
    // neon halos: the DSH theme carries no text glow -- kill it wholesale
    if (!doc.getElementById('dsw-bridge-style')) {
      const style = doc.createElement('style')
      style.id = 'dsw-bridge-style'
      style.textContent = '*,*::before,*::after{text-shadow:none!important}'
      ;(doc.head ?? doc.documentElement).appendChild(style)
    }

    // (b)+(c) de-chrome: the canvas's own LEFT ActivityBar is redundant
    // with the DSH sidebar -- hide the whole column. Rail buttons are
    // ICON buttons: the label lives in aria-label/title, not text.
    const buttonLabel = (btn: HTMLElement): string =>
      (btn.getAttribute('aria-label') ?? btn.getAttribute('title') ?? btn.textContent ?? '').trim()
    for (const btn of Array.from(doc.querySelectorAll('button'))) {
      const label = buttonLabel(btn)
      if (HIDDEN_LANES.some((lane) => label.includes(lane))) {
        btn.style.display = 'none'
      }
      // the ActivityBar column: the aria-label='Library' icon lives in it
      if (label === 'Library') {
        let col: HTMLElement | null = btn.closest('div')
        while (col && col !== doc.body) {
          const cls = (col.className ?? '').toString()
          if (cls.includes('w-12') && cls.includes('flex-col')) {
            col.style.display = 'none'
            break
          }
          col = col.parentElement
        }
      }
    }
    // dead-lane TABS in the right-panel strip (aria-labeled divs) stay hidden
    for (const el of Array.from(doc.querySelectorAll<HTMLElement>('[aria-label]'))) {
      const a = el.getAttribute('aria-label') ?? ''
      if (HIDDEN_LANES.some((lane) => a === lane)) el.style.display = 'none'
    }
  }

  /** Close the canvas's right-panel default tabs -- the strip is the
   *  frame-within-frame right sidebar; closing the last tab closes the
   *  rail itself (RightPanelHost contract). Latched: once the strip is
   *  down, panes the user reopens are never re-closed. JS clicks work
   *  on hidden elements, so order vs. lane-hiding is irrelevant. */
  let rightPanelClosed = false
  const closeRightPanelTabs = (): void => {
    if (rightPanelClosed) return
    const doc2 = frame.contentDocument
    if (!doc2) return
    const strip = doc2.querySelector('[aria-label="Right sidebar panes"]')
    if (!strip || strip.childElementCount === 0) return // not mounted yet
    for (const closeBtn of Array.from(doc2.querySelectorAll<HTMLButtonElement>('button[aria-label]'))) {
      const a = closeBtn.getAttribute('aria-label') ?? ''
      if (a.startsWith('Close ') && a.endsWith(' tab')) closeBtn.click()
    }
    rightPanelClosed = true
  }

  tick()
  const timer = window.setInterval(tick, 1200)
  frame.addEventListener('load', () => { tick(); closeRightPanelTabs() })
  return {
    stop(): void {
      stopped = true
      window.clearInterval(timer)
      frame.removeEventListener('load', tick)
    },
  }
}

/** Open a canvas lane from OUTSIDE the frame (the DSH sidebar rows
 *  drive the embed): clicks the canvas's own (hidden) rail button --
 *  the rail buttons are ICON buttons, so the label lives in aria-label /
 *  title; hidden buttons still click; the pane opens in the canvas. */
export function driveCanvasLane(label: string): boolean {
  const frame = document.querySelector<HTMLIFrameElement>(
    '[data-plugin="ray-card-deck-canvas"] iframe',
  )
  const doc = frame?.contentDocument
  if (!doc) return false
  const btn = Array.from(doc.querySelectorAll('button')).find((b) => {
    const l = (b.getAttribute('aria-label') ?? b.getAttribute('title') ?? b.textContent ?? '').trim()
    return l === label || l.startsWith(label)
  })
  if (!btn) return false
  btn.click()
  return true
}
