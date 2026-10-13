// errors.ts — the compose door's refusal type (its own module so the
// wiring wall can throw it without importing the service — a cycle
// the 2026-10-10 extraction would otherwise have created).

export class ComposeRefusal extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
