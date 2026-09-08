/**
 * Shared primitives for the media family (audit F6: the two panels
 * declared a "sibling styling family" by copy-paste — these are the
 * copies, promoted). Tokens live in ui.tokens.ts; every structural
 * element used twice lives here once.
 */
import type { JSX, ReactNode } from 'react'
import {
  bgLayer1,
  bgLayer2,
  bgOverlay1,
  borderL1,
  borderL2,
  fillSubtle1,
  labelPrimary1,
  labelSecondary1,
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
  'linear-gradient(to top, var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92)), transparent)'

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
  return (
    <input
      value={value}
      onChange={(e) => { onChange(e.target.value) }}
      placeholder={placeholder}
      style={{
        background: fillSubtle1, border: '1px solid ' + borderL2, color: labelPrimary1,
        borderRadius: 8, padding: '5px 10px', fontSize: 12, width: 170, fontFamily: 'inherit',
      }}
    />
  )
}

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }): JSX.Element {
  return (
    <button onClick={onClick} disabled={loading}
      style={{
        border: '1px solid ' + borderL2, background: 'transparent', color: labelSecondary1,
        borderRadius: 8, padding: '5px 10px', fontSize: 12,
        cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
      }}>{loading ? 'loading\u2026' : 'refresh'}</button>
  )
}

export function Empty({ children }: { children: ReactNode }): JSX.Element {
  return <div style={{ color: labelSecondary2, fontSize: 13, padding: 20 }}>{children}</div>
}

export function ErrorBanner({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div style={{
      padding: 14, borderRadius: 8, background: bgOverlay1,
      border: '1px solid ' + stateErrorPrimary1, fontSize: 13,
    }}>{children}</div>
  )
}

export interface GatewayError { gateway: string; message: string }

/** Per-gateway notes: transport failures, door drops and dedupe overlap
 *  all ride the same errors channel — the message says which. */
export function GatewayErrors({ errors }: { errors: GatewayError[] }): JSX.Element | null {
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

/** The gradient card rows (drafts, templates-when-they-return). */
export function RowCard({ children, onClick }: { children: ReactNode; onClick?: () => void }): JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        border: '1px solid ' + borderL1, borderRadius: 10, padding: '8px 12px',
        background: gradientStage, color: labelPrimary1, fontFamily: 'inherit',
      }}
    >{children}</div>
  )
}
