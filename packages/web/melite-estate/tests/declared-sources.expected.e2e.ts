// THE TRUTH PROBE (2026-10-13, operator order: "is this model
// real"). The offline wall holds DECLARED coherence — a cell that
// names weights it cannot fetch, a plan that refuses. This probe
// holds UPSTREAM truth: every url a declared plan carries is asked
// HEAD, right now, before the app ships. The ace-step class — a
// family declaring four phantom downloads for weeks, every shape
// gate green — dies here: a declared source that 404s reds, named,
// with family + file + status.
//
// OWNER-LOCAL (pnpm run test:expected): this tier reaches the
// network; unit CI never runs it.
//
// The probe drives the SAME declaration port the seat consumes
// (zero drift) — every ref the assets tab can offer is probed, not
// a hand-copied url list.
import "../../../../tests/helpers/boot-models.ts";
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { declarationPort } from "../src/provisioning.ts";
import type { ProvisionPlan, ResourceRef } from "@melite/estate-provisioning";

// The registered half-shape families produce no urls (no artifact
// rows) — their debt lives in the offline wall's register. This
// probe judges only what DECLARES a fetchable url.
const probe = async (url: string): Promise<number> => {
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  return response.status;
};

describe("every declared download url answers upstream", () => {
  test("no declared source is dead", async () => {
    // The port needs only the card registry seat; the models table
    // rides the boot above.
    const ctx = new Context();
    const defs = await loadCardDefs();
    const original = ctx.get.bind(ctx);
    ctx.get = ((name: string, optional?: boolean) => {
      if (name === "cardRegistry") return { defsSync: () => defs };
      return original(name, optional);
    }) as typeof ctx.get;
    const port = declarationPort(ctx);
    // list is the optional walk door on the port — assert it loud
    // (the wall cannot run without it; an undefined door is a
    // provisioning contract break, not an empty walk).
    const listDoor = port.list;
    assert.ok(listDoor, "declarationPort serves no list door");
    const refs: readonly ResourceRef[] = await listDoor.call(port);

    const dead: string[] = [];
    const errors: string[] = [];
    let probed = 0;
    for (const ref of refs) {
      const key =
        ref.kind === "model"
          ? (ref.owner === "family" ? ref.id : `card/${ref.id}`)
          : `extension/${ref.id}`;
      let plan: ProvisionPlan;
      const probeItems = (): { kind: string; name?: string; url?: string }[] =>
        plan.items.map((it) => ({
          kind: it.kind,
          name: "name" in it ? it.name : undefined,
          url: "url" in it ? it.url : undefined,
        }));
      try {
        plan = await port.resolve(ref);
      } catch {
        continue; // the offline wall owns refusals
      }
      for (const item of probeItems()) {
        if ((item.url ?? "") === "") continue;
        probed += 1;
        try {
          const status = await probe(item.url!);
          if (status >= 400) {
            dead.push(
              `${key}: '${item.name ?? "?"}' → HTTP ${status} — ` +
                `${item.url}`,
            );
          }
        } catch (error: unknown) {
          errors.push(
            `${key}: '${item.name ?? "?"}' → ${(error as Error).message} ` +
              `— ${item.url}`,
          );
        }
      }
    }
    assert.ok(
      probed >= 30,
      `probed only ${probed} urls — the enumeration broke (expected ` +
        `dozens of declared sources)`,
    );
    assert.deepEqual(dead, [], "DECLARED SOURCES THAT ARE NOT REAL");
    assert.deepEqual(errors, [], "declared sources unreachable");
  });
});
