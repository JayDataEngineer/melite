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
import type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";

// ROLE (cookbook adding-a-package role table): Resolver: computes/locates one named answer (the bundle) without owning it. Key "load" unchanged.
export class LoadResolverService extends Service {
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
      // The flow bundle composes from the LANES seat (the lane-seat
      // law, audit finding 4): the same read the runs doors thread, so
      // the disclosed body and the composed graph never diverge. ctx.get
      // is the injector API (an unmounted seat reads undefined and the
      // plane degrades to the booted singleton).
      return {
        bundle: loadFlow(
          repo,
          name,
          this.ctx.get("models") as FamilyModelsSeat | undefined,
        ),
      };
    }
    return { bundle: loadCard(repo, this.ctx.cardRegistry, modelsService(), name) };
  }
}

/** The load row: gates on the card registry seat. */
export const loadProvider = {
  name: "estate-load",
  inject: ["cardRegistry"] as const,
  apply(ctx: Context): void {
    new LoadResolverService(ctx);
  },
};

declare module "@deepseek-ai/cordis" {
  interface Context {
    load: LoadResolverService;
  }
}
