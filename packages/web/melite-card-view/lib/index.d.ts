/**
 * `@melite-plugin/dsh-card-view` — host half.
 *
 * THE GATEWAY KILL, completed (2026-09-10): this package once
 * proxied the Melite estate lanes in-process under /melite-proxy so
 * the browser card could read the estate same-origin. The estate is
 * now served by named Typert remotes over the wire frame
 * (POST /api/<ns>/<method> — the client half rides them directly;
 * see src/client/draft.ts and src/client/cards-resource.ts), and the
 * proxy route — already answering 502 LOUD since the kill — is
 * DELETED: nothing calls it, so nothing serves it.
 *
 * What remains host-side is the bundle-row mount only: the package
 * rides as a PROFILE BUNDLE (its own dsh.bundle.patch inserts the
 * row, the dsh.client mechanism loads the browser half), and the
 * apply marker boots configless — a configless bundle row must boot
 * (the bundle world passes no config object).
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "melite-card-view";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map