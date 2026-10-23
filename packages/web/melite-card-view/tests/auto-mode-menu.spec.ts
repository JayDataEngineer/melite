// auto-mode-menu.spec.ts — Q1 (operator 2026-11-09): Auto mode in the
// composer's + popup, mirroring /melite-runs (never replacing it).
//
// THE LAW: the + menu's Auto-mode entry flips the SAME delegation the
// slash half flips (seatRunDoors/unseatRunDoors + compose-loop copy in
// @melite/harness-tools) — one state, two handles. The decoration hangs
// on the host command (ui-commands' decorate, the permission-presets
// pattern): no second command, no manufactured row — the slash row keeps
// its catalog seat and the bare menu pick opens the On/Off popup whose
// onSelect submits the completed line back through the same command.
import { describe, expect, it, vi } from 'vitest'
import {
  autoModeCommandLine,
  autoModeOptions,
  decorateAutoMode,
} from '../src/client/auto-mode-decoration.ts'

describe('Q1 AUTO MODE MENU (mirror, never a second command)', () => {
  it('the popup offers exactly On and Off with operator-facing copy', () => {
    const options = autoModeOptions()
    expect(options.map((o) => o.id)).toEqual(['on', 'off'])
    expect(options[0]!.label).toMatch(/on/i)
    expect(options[1]!.label).toMatch(/off/i)
    // the detail says what changes (who presses Run) — never a bare toggle
    expect(options[0]!.detail ?? '').toMatch(/run/i)
    expect(options[1]!.detail ?? '').toMatch(/run/i)
  })

  it('every option maps to the SAME slash line the / half executes (one state)', () => {
    expect(autoModeCommandLine('on')).toBe('/melite-runs on')
    expect(autoModeCommandLine('off')).toBe('/melite-runs off')
    expect(() => autoModeCommandLine('sometimes')).toThrow()
  })

  it('registration decorates the host command (never registers a new one)', () => {
    const decorate = vi.fn()
    const command = vi.fn().mockResolvedValue({ ok: true, value: { matched: true } })
    const sessions = { binding: (): unknown => ({ session: { command } }) }
    const ctx = {
      get: (key: string): unknown => {
        if (key === 'commandUi') return { decorate }
        if (key === 'sessions') return sessions
        return undefined
      },
      // the property read stays as well: the pre-cure code reads it,
      // so this arm greens before AND after (never the firing arm).
      sessions,
      effect: (fn: () => void): void => { fn() },
    }
    decorateAutoMode(ctx as never)
    expect(decorate).toHaveBeenCalledTimes(1)
    const def = decorate.mock.calls[0]![0] as {
      name: string
      ui: { kind: string; options: unknown; onSelect: unknown }
    }
    expect(def.name).toBe('melite-runs')
    expect(def.ui.kind).toBe('popupSelect')
    expect(typeof def.ui.options).toBe('function')
    expect(typeof def.ui.onSelect).toBe('function')
  })

  it('picking an option submits the completed line through the session command door', async () => {
    const decorate = vi.fn()
    const command = vi.fn().mockResolvedValue({ ok: true, value: { matched: true } })
    const sessions = { binding: (): unknown => ({ session: { command } }) }
    const ctx = {
      get: (key: string): unknown => {
        if (key === 'commandUi') return { decorate }
        if (key === 'sessions') return sessions
        return undefined
      },
      // the property read stays as well: the pre-cure code reads it,
      // so this arm greens before AND after (never the firing arm).
      sessions,
      effect: (fn: () => void): void => { fn() },
    }
    decorateAutoMode(ctx as never)
    const def = decorate.mock.calls[0]![0] as {
      ui: {
        onSelect(
          option: { id: string },
          session: { sessionId: string },
        ): Promise<void> | void
      }
    }
    await def.ui.onSelect({ id: 'on' }, { sessionId: 's1' })
    expect(command).toHaveBeenCalledWith('/melite-runs on')
  })

  it('a client without the command seat stays silent (no seat, no log, never thrown)', () => {
    const errors: unknown[][] = []
    const orig = console.error
    console.error = (...args: unknown[]): void => { errors.push(args) }
    try {
      const ctx = {
        get: (): unknown => undefined,
        effect: (fn: () => void): void => { fn() },
      }
      expect(() => decorateAutoMode(ctx as never)).not.toThrow()
      expect(errors).toEqual([])
    } finally {
      console.error = orig
    }
  })

  it('a mid-reload context (sessions without inject) stays silent — the throwing read never fires', () => {
    // THE RELOAD RACE (journeys k/j/c, 2026-10-23): cordis raises on
    // property access without inject. The fake mirrors that throw so
    // a revert to `ctx.sessions` reds this arm on its own path.
    const decorate = vi.fn()
    const ctx = {
      get: (key: string): unknown => (key === 'commandUi' ? { decorate } : undefined),
      effect: (fn: () => void): void => { fn() },
    }
    Object.defineProperty(ctx, 'sessions', {
      get: (): unknown => {
        throw new Error('cannot get property "sessions" without inject')
      },
    })
    expect(() => decorateAutoMode(ctx as never)).not.toThrow()
    expect(decorate).not.toHaveBeenCalled()
  })
})
