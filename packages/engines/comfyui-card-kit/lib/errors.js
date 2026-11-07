// errors.ts — the compose door's refusal type (its own module so the
// wiring wall can throw it without importing the service — a cycle
// the 2026-10-10 extraction would otherwise have created).
export class ComposeRefusal extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map