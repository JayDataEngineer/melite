/**
 * `@infer-media/dsh-media` — client half.
 *
 * Registers ONE native sidebar tab ("Media", order 55 — sits above the Melite
 * Media tab at 60) backed by the host half's merged /infer-media/runs route.
 * Tab contract mirrors the better-sidebar public registry (same shape the
 * melite-card-deck registers with): { id, title(), icon(size), order, single,
 * component }, disposed through the ctx.effect cleanup.
 *
 * This entry is deliberately JSX-free (the shared preset only discovers
 * src/client/index.ts); React elements are built with createElement and the
 * glyph lives in MediaPanel.tsx.
 */
import * as React from 'react'
import { claimMediaApply, releaseMediaApply } from './apply-guard.ts'
import { MediaPanel, MediaTabIcon } from './MediaPanel.tsx'

interface TabCtx {
  effect(fn: () => void, name?: string): unknown
  betterSidebar?: {
    registerTab?(tab: {
      id: string
      title(): string
      icon(size: number): React.ReactNode
      order: number
      single: boolean
      component: React.ComponentType<Record<string, unknown>>
    }): unknown
    /** Dock controls (optional on older host builds). */
    openTab?(seed: { type: string }): unknown
    getSnapshot?(): { bottomOpen?: boolean; bottomOpenedOnce?: boolean } | undefined
  }
}

export const inject = ['slots', 'betterSidebar']

export function apply(ctx: TabCtx): void {
  if (!claimMediaApply()) return
  ctx.effect(() => releaseMediaApply, 'infer-media: apply claim')

  const bs = ctx.betterSidebar
  if (bs == null || typeof bs.registerTab !== 'function') {
    console.warn('[infer-media] betterSidebar registry unavailable — tab not registered')
    return
  }
  ctx.effect(() => {
    const dispose = bs.registerTab({
      id: 'infer-media:media',
      title: () => 'Media',
      icon: (size: number) => React.createElement(MediaTabIcon, { size }),
      order: 55,
      single: true,
      component: MediaPanel as unknown as React.ComponentType<Record<string, unknown>>,
    })
    // DOCK REACHABILITY SELF-HEAL — tick machine, the pattern the melite
    // deck proved on this host (2026-08-26): fresh sessions boot the bottom
    // dock CLOSED, registered-tab launchers sit in the "+ New tab" menu, and
    // a ONE-SHOT openTab gets swallowed by boot races (React commit gaps).
    // Tick every 700ms calling openTab until the panel actually mounts
    // (latch: [data-infer-media-panel] present), capped at 12 rounds so we
    // never fight the deck's own machine for the active tab — if the deck
    // wins the dock, Media stays one click away in the strip and we stop.
    let rounds = 0
    const timer = window.setInterval(() => {
      rounds++
      const mounted = document.querySelector('[data-infer-media-panel]') != null
      if (mounted || rounds > 12) {
        window.clearInterval(timer)
        return
      }
      try {
        bs.openTab?.({ type: 'infer-media:media' })
      } catch {
        window.clearInterval(timer)
      }
    }, 700)
    return () => {
      window.clearInterval(timer)
      if (typeof dispose === 'function') dispose()
    }
  }, 'infer-media: media tab')
}
