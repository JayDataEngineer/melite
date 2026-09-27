// Shared partial-host exec fake for the tool specs.
//
// Every tool body under test reads only exec.signal at runtime (the
// src/types.ts ToolExec adaptation: the full upstream ToolRunContext
// chain is host-plane machinery the plugin never touches). The fake
// therefore carries just the signal — plus optional extra props such
// as a stub agent — and casts to the full ToolRunContext the registry
// would supply in production. The cast is honest: the omitted fields
// (callId, token, deferContext, concludeTurn, ...) are host machinery
// the bodies never read, so no test can observe their absence.
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'

export function fakeExec(
  signal: AbortSignal = AbortSignal.timeout(2000),
  extra?: Record<string, unknown>,
): ToolRunContext {
  return (extra === undefined ? { signal } : { signal, ...extra }) as unknown as ToolRunContext
}
