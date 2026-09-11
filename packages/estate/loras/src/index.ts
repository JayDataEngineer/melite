// index.ts — `@melite/estate-loras`: the lora catalog Typert remote
// (the thin adapter over the comfyui seat's mod catalog).
//
// Shape per references/deepseek-harness/docs/cookbook/adding-a-remote-api.md:
// a host-side Cordis service extending TypertRemoteService, `@Remote`
// adapters (signal always final). This package is BUILT (tsc, the
// manage recipe) because decorators are not erasable syntax — the
// BUSINESS (the lora pick catalog: family rows win over the union,
// the RUNTIME CATALOG LAW) lives decorator-free on the ComfyUI
// service (`ctx.comfyui.modCatalog`), and the adapter delegates to
// that seat. The seat boundary is STRUCTURAL (declared below): this
// package must not import the engine package's sources into its
// build graph (they are bundler-resolved source-run files; the wall
// pins the delegation end-to-end instead).
//
// THE /v1/loras DOOR DIED WITH THE GATEWAY APP (nothing serves /v1,
// by design). The lora list is FAMILY-OWNED DATA living in the mods
// tree (packages/models/<family>/mods/loras.ts — the operator's
// "THAT IS IN MODS"): each family declares its rows as a flavor on
// the comfyui seat (pack 'loras'); this remote serves ONE family's
// pick catalog over the wire frame.
import type { Context } from "@deepseek-ai/cordis";
import {
  Remote,
  RemoteError,
  TypertRemoteService,
} from "@deepseek-ai/dsh-typert-protocol";

/** One lora row as the mods tree declares it (LoraRowDecl,
 *  structural — the engine seat's shape). */
export interface LoraRow {
  readonly id: string;
  readonly filename: string;
  readonly source_url: string;
  readonly label?: string;
  readonly category?: string;
  readonly default_strength?: number;
}

/** `loras/list`'s answer — the picker's exact consumption shape
 *  (the old /v1/loras lane's row, kept verbatim so the UI logic is
 *  untouched): filenames plus meta keyed by filename stem. */
export interface LoraCatalogRow {
  readonly model: string;
  readonly loras: readonly string[];
  readonly meta: Readonly<Record<string, LoraMetaRow>>;
  readonly note: string | null;
}

/** Catalog-declared per-LoRA metadata (keyed by filename stem). */
export interface LoraMetaRow {
  readonly label?: string;
  readonly category?: string;
  readonly default_strength?: number;
}

/** The remote's failure codes, merged into the protocol's ONE
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** The model argument is not a non-empty family id. */
    "loras/invalid-request": {
      readonly loc: string;
      readonly got: unknown;
    };
  }
}

/** The comfyui seat's adapter-facing surface (structural — the
 *  implementation is ComfyUIService in @melite/comfyui-cordis; the
 *  wall pins the delegation). */
interface ComfySeat {
  modCatalog(
    pack: string,
    family: string,
  ): { rows: readonly LoraRow[]; shared: boolean };
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    lorasRemote: LorasRemoteService;
    /** The engine seat (@melite/comfyui-cordis's ComfyUIService —
     *  structural here, per the header). */
    comfyui: ComfySeat;
  }
}

function stemOf(filename: string): string {
  return filename.replace(/\.(safetensors|pt|bin)$/, "");
}

/** The loras remote: one list over the seat's mod catalog. */
export class LorasRemoteService extends TypertRemoteService {
  static inject = ["comfyui"];

  constructor(ctx: Context) {
    super(ctx, "lorasRemote", { namespace: "loras" });
  }

  /** Endpoint `loras/list` — one family's pick catalog (the
   *  runtime catalog law rides the seat: family rows win over the
   *  union; a family with no lora flavor answers empty, honestly —
   *  an empty catalog is DATA, never an error). */
  @Remote("list")
  async remoteExportList(
    model: string,
    signal: AbortSignal,
  ): Promise<LoraCatalogRow> {
    signal.throwIfAborted();
    if (typeof model !== "string" || model === "") {
      throw new RemoteError(
        "loras/invalid-request",
        "model must be a non-empty family id",
        { loc: "args.model", got: model },
      );
    }
    const { rows, shared } = this.ctx.comfyui.modCatalog("loras", model);
    const meta: Record<string, LoraMetaRow> = {};
    for (const row of rows) {
      const entry: {
        label?: string;
        category?: string;
        default_strength?: number;
      } = {};
      if (row.label !== undefined) entry.label = row.label;
      if (row.category !== undefined) entry.category = row.category;
      if (row.default_strength !== undefined) {
        entry.default_strength = row.default_strength;
      }
      meta[stemOf(row.filename)] = entry;
    }
    return {
      model,
      loras: rows.map((r) => r.filename),
      meta,
      note: shared
        ? "shared catalog — no family rows declared (the union of every family's loras serves)"
        : rows.length === 0
          ? `no loras declared for ${model} (family-owned data — declare rows in packages/models/${model}/mods/loras.ts)`
          : null,
    };
  }
}

/** The loras remote row (the estate mounts it after the seat). */
export const lorasRemotePlugin = {
  name: "estate-loras",
  inject: ["comfyui"] as const,
  apply(ctx: Context): void {
    new LorasRemoteService(ctx);
  },
};
