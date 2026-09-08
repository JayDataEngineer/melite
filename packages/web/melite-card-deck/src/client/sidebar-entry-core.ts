// Vendored from dsh-web-ui shared/client/sidebar-entry-core.ts (the
// installed extension family's committed-copy convention, scripts/sync-shared.mjs).
// dsh's sidebar shell exposes no registrable slot for external plugins
// (sidebar.workspaces/sidebar.settings are single-occupant and taken), so
// entry rows are injected as plain DOM under the New Session button,
// self-healing across React re-renders. Adjusted only in attribution.

/** Per-package configuration for one sidebar entry row. */
export interface SidebarEntryOptions {
  /** Full attribute name identifying the injected row (idempotency key), e.g. 'data-dsh-ssh-entry'. */
  rowAttribute: string
  /** CSS selector matching the injected row, e.g. '[data-dsh-ssh-entry]'. */
  rowSelector: string
  /** Optional semantic-attribute plugin id: also outputs data-dsh-plugin / data-dsh-part. */
  plugin?: string
  /** Inline icon markup (matches the shell's 16px nav-icon look). */
  icon: string
  /** CSS module class names for the row and its two spans (entry / entryIcon / entryLabel). */
  css: Record<string, string>
  /** Localized row label (aria-label + visible text). */
  label(): string
  /** Optional localized tooltip (title attribute). */
  tooltip?(): string
  /** Click action (open/toggle the owning panel). */
  onToggle(): void
  /** Family-block position: 'before' inserts ahead of sibling plugin rows, 'after' behind them. */
  position: 'before' | 'after'
  /** Selectors of the sibling plugin entry rows this package orders against (its own included). */
  familySelectors: readonly string[]
  /** Optional active-state bridge; highlights the row while the panel is open. */
  active?: {
    subscribe(listener: () => void): () => void
    isOpen(): boolean
  }
}

/** Find the sidebar shell root element, or undefined while not yet mounted. */
function sidebarRoot(): HTMLElement | undefined {
  const column = document.querySelector<HTMLElement>('[data-pane="sidebar"], [class*="sidebarCol"]')
  if (column === null) return undefined
  // Current shells wrap the sidebar UI: column > wrapper > root(logoRow owner).
  const logoOwner = column.querySelector<HTMLElement>('[class*="logoRow"]')?.parentElement
  return logoOwner ?? (column.firstElementChild as HTMLElement | undefined)
}

/** The New Session button: nested in the logo row on current shells, a direct child on legacy shells. */
function newSessionButton(root: HTMLElement): HTMLButtonElement | undefined {
  const nested = root.querySelector<HTMLButtonElement>('button[class*="newSession"]')
  if (nested !== null) return nested
  for (const child of root.children) {
    if (child.tagName === 'BUTTON') return child as HTMLButtonElement
  }
  return undefined
}

/** Build the entry row (a detached button; insert once the shell is up). */
function createEntry(options: SidebarEntryOptions): HTMLButtonElement {
  const entry = document.createElement('button')
  entry.type = 'button'
  entry.setAttribute(options.rowAttribute, '')
  if (options.plugin !== undefined) {
    entry.setAttribute('data-dsh-plugin', options.plugin)
    entry.setAttribute('data-dsh-part', 'sidebar-entry')
  }
  entry.className = options.css['entry'] ?? ''
  entry.setAttribute('aria-label', options.label())
  if (options.tooltip !== undefined) entry.setAttribute('title', options.tooltip())
  entry.innerHTML = '<span class="' + (options.css['entryIcon'] ?? '') + '">' + options.icon
    + '</span><span class="' + (options.css['entryLabel'] ?? '') + '">' + options.label() + '</span>'
  entry.addEventListener('click', options.onToggle)
  return entry
}

/** Re-insert the entry after the New Session row (before the browser region). */
function placeEntry(root: HTMLElement, entry: HTMLButtonElement, options: SidebarEntryOptions): boolean {
  const button = newSessionButton(root)
  if (button === undefined) return false
  if (entry.parentElement !== root) {
    // Position relative to the family block (entries injected by sibling
    // plugins), never relative to transient logoRow geometry. No
    // append-to-end fallback: appending would reorder the block randomly.
    const row = button.closest('[class*="logoRow"]')
    const base = (row !== null && row.parentElement === root) ? row : button
    const family = Array.from(root.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.matches(options.familySelectors.join(', ')),
    )
    const anchor = options.position === 'before'
      ? (family.length > 0 ? family[0]! : base.nextElementSibling)
      : (family.length > 0 ? family[family.length - 1]!.nextElementSibling : base.nextElementSibling)
    root.insertBefore(entry, anchor)
  }
  return true
}

/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param options - the row's attribute/icon/copy/action/ordering configuration.
 * @returns disposer removing the entry and its observers.
 */
export function mountSidebarEntry(options: SidebarEntryOptions): () => void {
  // DOM-level idempotency: whatever path mounted an entry row before this
  // call, never mount a second one.
  if (typeof document !== 'undefined' && document.querySelector(options.rowSelector) !== null) {
    return () => {}
  }
  const entry = createEntry(options)
  let root: HTMLElement | undefined
  let placed = false

  const tryPlace = (): void => {
    if (root !== undefined && !root.isConnected) {
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    if (placed) {
      if (document.body.contains(entry)) return
      rootObserver.disconnect()
      root = undefined
      placed = false
    }
    root ??= sidebarRoot()
    if (root === undefined) return
    placed = placeEntry(root, entry, options)
    if (placed) {
      rootObserver.observe(root, { childList: true, subtree: true })
    }
  }

  // Body-level watcher as the whole-rebuild fallback.
  const waitObserver = new MutationObserver(() => { tryPlace() })
  waitObserver.observe(document.body, { childList: true, subtree: true })

  // Self-heal: if a React re-render displaces the row, re-insert it in the
  // same frame (microtask before paint -> no visible flicker).
  const rootObserver = new MutationObserver(() => {
    if (root === undefined || !root.isConnected) {
      placed = false
      tryPlace()
      return
    }
    if (!root.contains(entry)) {
      placed = placeEntry(root, entry, options)
    }
  })

  // Reflect the panel's open state on the row (active highlight). Note:
  // assigning undefined to dataset.active materializes data-active="undefined"
  // and keeps the row permanently highlighted — delete the attribute instead.
  const unsubscribeActive = options.active === undefined ? undefined : (() => {
    const syncActive = (): void => {
      if (options.active!.isOpen()) entry.dataset.active = 'true'
      else delete entry.dataset.active
    }
    const unsubscribe = options.active.subscribe(syncActive)
    syncActive()
    return unsubscribe
  })()

  tryPlace()

  return () => {
    waitObserver.disconnect()
    rootObserver.disconnect()
    unsubscribeActive?.()
    entry.remove()
  }
}
