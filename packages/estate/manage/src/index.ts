// index.ts — `@melite/estate-manage`: the management Typert remote
// (the thin adapter over the manage seat).
//
// Shape per references/deepseek-harness/docs/cookbook/adding-a-remote-api.md:
// a host-side Cordis service extending TypertRemoteService, `@Remote`
// adapters (signal always final). This package is BUILT (tsc, the
// runs recipe) because decorators are not erasable syntax — the
// BUSINESS (the ComfyUI-Manager plane: status/logs/snapshots/
// provisioning, the refusal envelope) lives decorator-free in
// `@melite/estate-queue`'s ManageService (source-run), and the
// adapter delegates to that seat (`ctx.manage`). The seat boundary
// is STRUCTURAL (declared below): this package must not import the
// queue package's sources into its build graph (they are
// bundler-resolved source-run files; the wall pins the delegation
// end-to-end instead).
//
// Failures arrive as the protocol's ONE RemoteError (thrown by the
// seat, codes declared next to the throws in estate-queue —
// manage/refused carries the envelope in its details) — the adapter
// adds nothing, never catches, never wraps.
import type { Context } from "@deepseek-ai/cordis";
import {
  Remote,
  TypertRemoteService,
} from "@deepseek-ai/dsh-typert-protocol";
import type { ManageActDoc, ManageEnvelopeRow } from "./types.ts";

export type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from "./types.ts";

/** The manage seat's adapter-facing surface (structural — the
 *  implementation is ManageService in @melite/estate-queue; the
 *  wall pins the delegation byte-for-byte). */
interface ManageSeat {
  act(doc: unknown, signal: AbortSignal): Promise<ManageEnvelopeRow>;
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    manageRemote: ManageRemoteService;
    /** The management seat (@melite/estate-queue's ManageService —
     *  structural here, per the header). */
    manage: ManageSeat;
  }
}

/** The manage remote: one act over the manage seat. */
export class ManageRemoteService extends TypertRemoteService {
  static inject = ["manage"];

  constructor(ctx: Context) {
    super(ctx, "manageRemote", { namespace: "manage" });
  }

  /** Endpoint `manage/act` — the whole management plane (the
   *  action rides the doc; the seat dispatches). */
  @Remote("act")
  async remoteExportAct(
    doc: ManageActDoc,
    signal: AbortSignal,
  ): Promise<ManageEnvelopeRow> {
    return await this.ctx.manage.act(doc, signal);
  }
}

/** The manage remote row (the estate mounts it after the seat). */
export const manageRemotePlugin = {
  name: "estate-manage",
  inject: ["manage"] as const,
  apply(ctx: Context): void {
    new ManageRemoteService(ctx);
  },
};
