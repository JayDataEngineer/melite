/**
 * Test-env type shims (types only — no runtime).
 *
 * viewer-base ships peer-only (react) plus dev-only UI leaves, so its
 * node-lane spec renders through the estate's SINGLE React 18.3.1
 * instance (the gallery tree's react-dom, same store file the
 * viewer-base react resolves to — never a second copy) and root
 * jsdom. Neither ships its own types here, so the spec's imports
 * are declared below with the exact faces the spec touches.
 */
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { url?: string })
    readonly window: Window
  }
}

declare module '*@testing-library/react' {
  import type { ReactElement } from 'react'
  export interface RenderResult {
    readonly container: HTMLElement
    unmount(): void
    findByText(
      text: string | RegExp,
      options?: Record<string, unknown>,
      waitOptions?: { timeout?: number },
    ): Promise<HTMLElement>
    queryByText(text: string | RegExp): HTMLElement | null
  }
  export function render(ui: ReactElement): RenderResult
  export function cleanup(): void
}
