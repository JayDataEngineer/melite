/**
 * FlowsPanel — the RIGHT-SIDEBAR Flows tab.
 *
 * Lists the composed action cards (drafts) from the host half's merged
 * /infer-media/drafts door — every gateway's queue-native flow
 * instances, newest first. Click a row: the Cards studio opens with THAT
 * card hydrated (the deck's own DECK_OPEN_WITH_DRAFT seam — the same
 * door the media panel's run wand uses), ready to refine and Run.
 *
 * Sibling to MediaPanel through the SHARED family (ui.ts primitives,
 * ui.tokens.ts, useFeed) — one system, zero copy-paste.
 */
import { useState } from 'react'
import { openWithDraft } from './apply-guard.ts'
import { decodeDrafts } from './decode.ts'
import type { DraftRow } from './decode.ts'
import { useFeed } from './useFeed.ts'
import {
  Empty,
  ErrorBanner,
  GatewayErrors,
  MONO,
  PanelShell,
  RefreshButton,
  SearchInput,
  Stat,
  gradientStage,
} from './ui.tsx'
import {
  borderL1,
  borderL2,
  labelPrimary1,
  labelSecondary1,
  stateWarnPrimary1,
  textTertiary2,
} from './ui.tokens.ts'

/** Sidebar tab glyph — a flow arrow, exported for the client entry. */
export function FlowsTabIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h5a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="2.8" cy="4" r="1.4" fill="currentColor" />
      <circle cx="13.2" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function FlowsPanel(): JSX.Element {
  const feed = useFeed('/infer-media/drafts', decodeDrafts, { drafts: [], errors: [] })
  const [search, setSearch] = useState('')
  const [uiError, setUiError] = useState('')

  const openDraft = (draftId: string): void => {
    if (draftId === '') return
    const res = openWithDraft(draftId)
    if (res === 'no-seam') setUiError('Cards studio unavailable (deck plugin not loaded)')
    else if (res === 'refused') setUiError('Cards studio refused to open')
  }

  const q = search.trim().toLowerCase()
  const shown = q === ''
    ? feed.data.drafts
    : feed.data.drafts.filter((d) =>
        [d.name ?? '', d.model ?? '', d.draft_id ?? ''].join(' ').toLowerCase().includes(q))

  return (
    <PanelShell dataAttr="infer-flows-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Flows</span>
        <Stat>
          {feed.data.drafts.length} cards{feed.data.errors.length > 0 ? ' · ' + feed.data.errors.length + ' gateway note' + (feed.data.errors.length > 1 ? 's' : '') : ''}
        </Stat>
        <span style={{ flex: 1 }} />
        <SearchInput value={search} onChange={setSearch} placeholder="search name, model\u2026" />
        <RefreshButton loading={feed.loading} onClick={feed.reload} />
      </div>

      <GatewayErrors errors={feed.data.errors} />
      {feed.error !== '' || uiError !== ''
        ? <ErrorBanner>{feed.error !== '' ? feed.error : uiError}</ErrorBanner>
        : feed.loading && feed.data.drafts.length === 0
          ? <Empty>loading cards\u2026</Empty>
          : shown.length === 0
            ? <Empty>no composed cards yet — build one in a chat.</Empty>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {shown.map((d) => (
                  <button
                    key={d.draft_id ?? Math.random()}
                    onClick={() => { openDraft(d.draft_id ?? '') }}
                    data-draft={d.draft_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      border: '1px solid ' + borderL1, borderRadius: 10, padding: '8px 12px',
                      background: gradientStage, cursor: 'pointer',
                      color: labelPrimary1, fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 0, color: stateWarnPrimary1 }}>▸</span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name || d.draft_id}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: MONO, color: labelSecondary1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.model || 'card'} · {d.draft_id}
                      </span>
                    </span>
                    {typeof d.source === 'string' && d.source !== ''
                      ? <span style={{ fontSize: 9, color: textTertiary2, border: '1px solid ' + borderL2, borderRadius: 6, padding: '2px 6px' }}>
                          {d.source.replace(/^https?:\/\//, '')}
                        </span>
                      : null}
                  </button>
                ))}
              </div>)}
    </PanelShell>
  )
}
