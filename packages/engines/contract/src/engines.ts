// engines.ts — the 'engines' seat: one registry every engine
// provider registers into and every run-path consumer resolves
// through (stroke 53, the engine-generics seam). The ComfyUI
// adapter (comfyui-cordis's engine row) is the first provider; MCP
// engines register as 'mcp:<serverName>' (blender, unity, godot)
// next. DSH law held here: registrations are effects (register
// returns its disposer, HMR disposal removes the row), duplicates
// refuse LOUD, unknown ids resolve LOUD with the registered list,
// and misconfiguration never silently skips a referent.
//
// ENGINE ID GRAMMAR (pinned): the bare words 'comfyui', 'craft'
// (the loop engine — stroke 55) and 'agent' (the spawner — stroke
// 60, plan §5), or 'mcp:<serverName>'
// where serverName matches dsh-mcp-client's namespace rule
// [A-Za-z0-9_-]{1,32} — the MCP engine ids are the MCP server
// namespaces verbatim, so a stage row's engine and the tool
// bridge's mcp__<serverName>__ names share one vocabulary.
import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import type { EngineRecord } from "./types.ts";

/** The MCP server-name rule, copied verbatim from dsh-mcp-client's
 * serverName contract (`[A-Za-z0-9_-]{1,32}`). */
const MCP_SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/;

/** Whether an engine id is grammatical (the pinned grammar — see
 * the module header). Exported for the door's pre-flight: the runs
 * door refuses ungrammatical ids with its own voice BEFORE the
 * registry is consulted. */
/** THE BARE ENGINE IDS (the owner's names): every site that names
 *  an engine takes it from here — a card's inject row, a stage's
 *  engine field, a gate's default. One owner per token (the closure
 *  gate's rule 2b). */
export const COMFYUI_ENGINE_ID = "comfyui";
export const CRAFT_ENGINE_ID = "craft";
export const AGENT_ENGINE_ID = "agent";

export function engineIdOk(id: string): boolean {
  return id === COMFYUI_ENGINE_ID || id === CRAFT_ENGINE_ID || id === AGENT_ENGINE_ID || (id.startsWith("mcp:") && MCP_SERVER_NAME.test(id.slice(4)));
}

export class EnginesService extends Service {
  private readonly engines = new Map<string, EngineRecord>();

  constructor(ctx: Context) {
    super(ctx, "engines");
  }

  /** Register one engine. LOUD on a non-grammatical id (drift, not
   * a fallback case) and on a duplicate id (one id, one provider —
   * the scope-aware tools registry's same-law simplification: THIS
   * seat is per-fiber, so a second registration under the same id
   * on one fiber is a wiring bug). Returns the disposer (the
   * provider wraps it in ctx.effect — the fiber owns the row's
   * lifetime). */
  register(id: string, record: EngineRecord): () => void {
    if (!engineIdOk(id)) {
      throw new Error(
        "[engines] engine id '" + id + "' is not grammatical — 'comfyui', 'craft', 'agent' or 'mcp:<server>' ([A-Za-z0-9_-]{1,32})",
      );
    }
    if (this.engines.has(id)) {
      throw new Error(
        "[engines] engine '" + id + "' registered twice — one id, one provider",
      );
    }
    this.engines.set(id, record);
    return (): void => {
      this.engines.delete(id);
    };
  }

  /** Resolve one engine. LOUD on an unknown id (an engine call
   * without an engine is never a silent module fallback —
   * needComfyUI's law, generalized): the error names every
   * registered id so the miswire is diagnosable at the door. */
  resolve(id: string): EngineRecord {
    const record: EngineRecord | undefined = this.engines.get(id);
    if (record === undefined) {
      const known: string = this.engines.size === 0
        ? "none registered on this fiber"
        : [...this.engines.keys()].sort().join(", ");
      throw new Error(
        "[engines] no engine '" + id + "' — registered: " + known,
      );
    }
    return record;
  }

  /** Whether an engine id is registered (the door's membership
   * check — grammar first, then this). */
  has(id: string): boolean {
    return this.engines.has(id);
  }

  /** The registered ids, sorted (diagnostic + door voice). */
  ids(): string[] {
    return [...this.engines.keys()].sort();
  }
}

/** The contract's provider plugin: mounts the 'engines' seat. Ride
 * BEFORE every engine adapter row (the estate bundle's mount order
 * is load order). */
export const enginesContract: Plugin = {
  name: "engine-contract",
  apply(ctx: Context): void {
    new EnginesService(ctx);
  },
};

export default enginesContract;
