// scratch — dump the served h3-timeline variants, look for dupes
import { describe, test } from "vitest";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";
import "../../../../tests/helpers/boot-models.ts";

describe("scratch", () => {
  test("dump h3-timeline variants", async () => {
    const doc = await formSpecArm("h3-timeline");
    const variants = (doc as unknown as { variants: Array<Record<string, unknown>> }).variants ?? [];
    for (const v of variants) console.log("VARIANT:", JSON.stringify(v));
  });
});
