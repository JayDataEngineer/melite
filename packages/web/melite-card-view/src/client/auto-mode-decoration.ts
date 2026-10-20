/**
 * Q1 AUTO MODE MENU (operator 2026-11-09): the composer's `+` popup
 * carries Auto mode, mirroring `/melite-runs` (never replacing it).
 *
 * THE MIRROR LAW: one delegation, two handles. The Host owns the state
 * (seatRunDoors/unseatRunDoors + the compose-loop copy in
 * @melite/harness-tools); this decoration hangs the bare-invocation
 * popup on the SAME host command (ui-commands' decorate — the
 * permission-presets pattern), so the slash row keeps its catalog seat
 * and a bare menu pick opens the On/Off popup whose onSelect submits
 * the completed line back through the same command. No second command
 * is ever registered; a collision would fail loud at candidate
 * synthesis, and this module never risks one.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {
  CommandUiContract,
  SelectOption,
} from '@deepseek-ai/dsh-client-ui-commands/client'
import type { ClientSessionContext } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { chromeCopy } from '../chromeCopy.ts'

/** The host command this decorates (without the leading slash). */
export const AUTO_MODE_COMMAND = 'melite-runs'

/** The popup's option ids — the only verbs the submitter accepts. */
export type AutoModeOptionId = 'on' | 'off'

/**
 * The popup's rows: On hands the AI the run press, Off hands it back
 * to the user. The detail says what changes (who presses Run) because
 * a bare On/Off toggle never explains its own blast radius. Copy is
 * locale-owned — the words ride chromeCopy.
 */
export function autoModeOptions(): readonly SelectOption[] {
  return [
    {
      id: 'on',
      label: chromeCopy.autoModeOnLabel,
      detail: chromeCopy.autoModeOnDetail,
    },
    {
      id: 'off',
      label: chromeCopy.autoModeOffLabel,
      detail: chromeCopy.autoModeOffDetail,
    },
  ]
}

/**
 * The completed slash line one option submits — the SAME line the `/`
 * half executes, so both handles flip the one delegation.
 * @param optionId - the picked popup option.
 */
export function autoModeCommandLine(optionId: string): string {
  if (optionId !== 'on' && optionId !== 'off') {
    throw new Error(`auto-mode: unknown option "${optionId}" (want on or off) — refusing to invent a verb`)
  }
  return `/${AUTO_MODE_COMMAND} ${optionId}`
}

/** Minimal session face the submitter needs (the command door). */
interface CommandSession {
  command(line: string): Promise<{ ok: boolean; value?: { matched?: boolean }; error?: { code: string; message: string } }>
}

/**
 * Hang the Auto-mode popup on `/melite-runs`. A client without the
 * command seat (a composition that never mounted ui-commands) stays
 * silent — logged, never thrown (the plugin's failure policy: an
 * external plugin must not take the GUI boot down).
 * @param ctx - the client root context.
 */
export function decorateAutoMode(ctx: ClientContext): void {
  const commandUi = ctx.get('commandUi') as CommandUiContract | undefined
  // NO commandUi = NO menu in this composition (headless embeds, the
  // spec fakes): the decoration has nowhere to hang, so it stays
  // silent — absence of the seat is a composition variant, never a
  // failure (the boot never depends on it).
  if (commandUi === undefined) return
  const sessions = ctx.sessions as
    | { binding(sessionId: string): { session: CommandSession } | undefined }
    | undefined
  const submit = async (sessionId: string, optionId: string): Promise<void> => {
    const live = sessions?.binding(sessionId)?.session
    if (live === undefined) throw new Error('auto-mode: this session is not materialized yet')
    const line = autoModeCommandLine(optionId)
    const result = await live.command(line)
    if (!result.ok) {
      throw new Error(`auto-mode switch failed: ${result.error?.code}: ${result.error?.message}`)
    }
    if (result.value?.matched !== true) throw new Error('auto-mode: the host offers no /melite-runs command')
  }
  ctx.effect(
    () =>
      commandUi.decorate({
        name: AUTO_MODE_COMMAND,
        // The directory gates the row: a session whose catalog lacks
        // the host command never reaches the decoration — availability
        // here is the composition half only (always true where the seat
        // exists; headless one-shots never mount it by design).
        available: () => true,
        ui: {
          kind: 'popupSelect',
          options: async (_session: ClientSessionContext): Promise<readonly SelectOption[]> => autoModeOptions(),
          onSelect: (option: SelectOption, session: ClientSessionContext): Promise<void> =>
            submit(session.sessionId, option.id),
        },
      }),
    'melite-card-view: auto-mode menu decoration',
  )
}
