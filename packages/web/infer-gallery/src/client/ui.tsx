/**
 * Shared primitives for the media family (audit F6: the two panels
 * declared a "sibling styling family" by copy-paste — these are the
 * copies, promoted). Tokens live in ui.tokens.ts; every structural
 * element used twice lives here once.
 *
 * PRIMITIVE LAW (2026-09-09, restored with the full port): anything
 * DSH ships rides DSH — Input, Button, Pill, Modal, Tooltip come
 * from `@deepseek-ai/dsh-client-ui-primitives` (a platform module —
 * the frozen module table answers it, the bundle never inlines it).
 * The panels run inside the DSH host where the --dsw-* tokens live.
 * What remains handrolled below has NO DSH counterpart
 * (shell/stat/empty/error text chrome) — if DSH ships it later, the
 * handroll dies the same day.
 */
import type { JSX, ReactNode } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  bgLayer1,
  bgLayer2,
  bgOverlay1,
  fillSubtleCaption,
  labelPrimary1,
  labelSecondary2,
  stateErrorPrimary1,
  stateWarnPrimary1,
} from './ui.tokens.ts'

export const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
export const MONO = 'ui-monospace, monospace'

/** The stage every non-image tile/card sits on. */
export const gradientStage =
  `linear-gradient(160deg, ${bgLayer1} 0%, ${bgLayer2} 100%)`
/** Caption scrim over posters. */
export const gradientCaption =
  `linear-gradient(to top, ${fillSubtleCaption}, transparent)`

export function PanelShell({ dataAttr, children }: { dataAttr: string; children: ReactNode }): JSX.Element {
  return (
    <div {...{ ['data-' + dataAttr]: '1' }} style={{
      padding: 14, fontFamily: FONT, color: labelPrimary1,
      height: '100%', overflowY: 'auto', boxSizing: 'border-box',
    }}>{children}</div>
  )
}

export function Stat({ children }: { children: ReactNode }): JSX.Element {
  return <span style={{ fontSize: 11, color: labelSecondary2 }}>{children}</span>
}

export function SearchInput({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}): JSX.Element {
  // DSH Input (passthrough value/onChange/placeholder/style onto the
  // native input; the DSW module CSS owns the chrome — the handrolled
  // bordered-input replica died here).
  return (
    <Input
      value={value}
      onChange={(e) => { onChange(e.target.value) }}
      placeholder={placeholder}
      style={{ width: 170 }}
    />
  )
}

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }): JSX.Element {
  // DSH Button outline/sm — the transparent-bordered small-button
  // replica died here (disabled + children passthrough are native).
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      {loading ? 'loading\u2026' : 'refresh'}
    </Button>
  )
}

export function Empty({ children }: { children: ReactNode }): JSX.Element {
  return <div style={{ color: labelSecondary2, fontSize: 13, padding: 20 }}>{children}</div>
}

export function ErrorBanner({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div role="status" style={{
      padding: 14, borderRadius: 8, background: bgOverlay1,
      border: '1px solid ' + stateErrorPrimary1, fontSize: 13,
    }}>{children}</div>
  )
}

export interface FeedError { gateway: string; message: string }

/** Per-gateway notes: transport failures, door drops and dedupe overlap
 * all ride the same errors channel — the message says which. */
export function FeedErrors({ errors }: { errors: FeedError[] }): JSX.Element | null {
  if (errors.length === 0) return null
  return (
    <>
      {errors.map((e) => (
        <div key={e.gateway + e.message} style={{ fontSize: 11, color: stateWarnPrimary1, marginBottom: 4 }}>
          gateway {e.gateway}: {e.message}
        </div>
      ))}
    </>
  )
}
