// loadRegistry.ts — the load seat (REBUILD-17, 2026-09-10): Melite
// load opens ONE card or flow over the loadPlane pures. The seat
// assembles the two service deps (card registry + models) from
// the estate's own seams; unknown names answer the door's voice.
//
// Erasable-syntax TS only (node --experimental-strip-types).

import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import { modelsService, resolveRepoRoot } from "@melite/comfyui-cordis";
import { loadCard, loadFlow } from "./loadPlane.ts";

export class LoadService extends Service {
  static inject = ["cardRegistry"];

  constructor(ctx: Context) {
    super(ctx, "load");
  }

  /** GET /v1/load?inference_type=card|flow&name=<n> — the bundle.
   *  The door's parameter law rides verbatim: inference_type must
   *  be card|flow (nothing else executes), name is required. */
  load(inferenceType: string, name: string): Record<string, unknown> {
    if (inferenceType !== "card" && inferenceType !== "flow") {
      throw new Error(
        "load needs inference_type=card|flow (a card or a flow tool call — nothing else executes)",
      );
    }
    if (name === "") {
      throw new Error("load needs name (discover it first)");
    }
    const repo = resolveRepoRoot();
    if (inferenceType === "flow") {
      return { bundle: loadFlow(repo, name) };
    }
    return { bundle: loadCard(repo, this.ctx.cardRegistry, modelsService(), name) };
  }
}

/** The load row: gates on the card registry seat. */
export const loadProvider = {
  name: "estate-load",
  inject: ["cardRegistry"] as const,
  apply(ctx: Context): void {
    new LoadService(ctx);
  },
};
