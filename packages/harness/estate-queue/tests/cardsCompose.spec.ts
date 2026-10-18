// cardsCompose.spec.ts — the compose door's cards face: the primed
// registry serves every boarded family's compose seat (the
// every-address wall's journey half, estate-queue side). The heavy
// arms live in the walls (models-against-cards, compose-equivalence);
// this file pins the door's own shape — the registry primes with the
// FULL family table booted and image-gen's boarded roster rides the
// model plugins' DECL ids, never a hand row.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { QueueService } from "../src/service.ts";
import { cardRegistryProvider, type CardRegistryService } from "../src/cardsRegistry.ts";

/** The provider's inject reads the queue seat — the J12 mount: the
 *  REAL queue service on a temp root, hermetic. */
const mount = async (): Promise<CardRegistryService> => {
  const ctx = new Context();
  new QueueService(ctx, { stateRoot: mkdtempSync(join(tmpdir(), "cards-compose-")) });
  await ctx.plugin(cardRegistryProvider);
  return ctx.get("cardRegistry") as CardRegistryService;
};

describe("the compose door's cards face (the primed registry)", () => {
  it("primes with the full family table booted and serves the image-gen card", async () => {
    const svc = await mount();
    const def = svc.defsSync().get("image-gen");
    assert.ok(def, "the image-gen card def serves after prime");
    assert.ok((def.boarded ?? []).length > 0, "the card boards its families");
  });

  it("image-gen's boarded roster IS the model plugins' DECL ids (moss-image joins 2026-11-07)", async () => {
    const svc = await mount();
    const boarded = svc.defsSync().get("image-gen")?.boarded ?? [];
    assert.deepEqual([...boarded].sort(), [
      "anima", "flux-klein", "krea-2", "moss-image", "qwen-img-21", "z-image",
    ]);
  });
});
