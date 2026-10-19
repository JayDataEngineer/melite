import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// THE TYPERT ARTIFACT LAW (2026-09-29, the bench-outage postmortem):
// the generator recognizes @Remote ONLY when the protocol's
// declarations sit inside a registered package root under packages/
// (its loadRegistrations accepts packages/ roots alone). A store-side
// protocol resolution registers nothing and generation silently finds
// ZERO Remote methods — the estate artifacts then keep whatever stale
// codecs the last healthy generation emitted, and the 0.2.0-rc.1
// registry client refuses them at boot ("strict codec has no create()
// factory"). These walls pin the three faces of that law:
//
//   1. the GENERATION FACE (packages/vendor/typert-protocol) must
//      match the RUNTIME FACE (whatever the estate packages resolve
//      from their own node_modules) — a version split means the
//      artifacts were generated against a protocol the runtime never
//      sees;
//   2. the vendor must never leak out of generation: the pnpm HOIST
//      layer once linked node_modules/.pnpm/node_modules onto the
//      workspace vendor (same name+version), splitting RemoteResult
//      identity in every consumer tsc program — the workspace
//      exclusion (pnpm-workspace.yaml) keeps it dead;
//   3. every generated artifact must satisfy the registry's own
//      validateCodec law — the same judgment the lane applies at
//      boot, asserted here so a stale artifact dies in the walls,
//      not in the operator's bench.
//
// The mutations each assertion kills are named inline.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ESTATE_PACKAGES = ["drafts", "runs", "media", "manage"] as const;

/** The registry client's own law (dsh-typert-registry@0.2.0-rc.1
 * lib/client.js validateCodec), mirrored verbatim: this is the exact
 * judgment the runtime applies, not a paraphrase of it. */
function validateCodec(codec: { mode?: string; typeSymbol?: string; create?: unknown }, subject: string): void {
  if (codec.mode === "src-json") return;
  const typeSymbol = codec.typeSymbol ?? "";
  expect(typeSymbol.length, `${subject} type symbol must be nonempty`).toBeGreaterThan(0);
  expect(typeof codec.create, `${subject} strict codec has no create() factory`).toBe("function");
}

describe("the typert artifact law — generation face, runtime face, one law", () => {
  it("the vendored generation face matches the runtime face the estate packages resolve", () => {
    const vendorVersion = JSON.parse(
      readFileSync(join(ROOT, "packages/vendor/typert-protocol/package.json"), "utf8"),
    ).version as string;
    // MUTATION KILLED: deleting the vendor (the li-bo de-vendor)
    // silently returns generation zero Remote methods — the version
    // parity dies here before any artifact goes stale.
    expect(existsSync(join(ROOT, "packages/vendor/typert-protocol/lib/index.js")), "the vendor's lib must be built").toBe(true);
    for (const name of ESTATE_PACKAGES) {
      const require = createRequire(join(ROOT, `packages/estate/${name}/package.json`));
      const resolved = require.resolve("@deepseek-ai/dsh-typert-protocol/package.json");
      const runtimeVersion = JSON.parse(readFileSync(resolved, "utf8")).version as string;
      // MUTATION KILLED: a store bump to a newer protocol while the
      // vendor stays pinned (or vice versa) — the faces split and the
      // generated artifacts describe a protocol the runtime never
      // mounted.
      expect(runtimeVersion, `estate/${name} runtime protocol version`).toBe(vendorVersion);
    }
  });

  it("the vendor never leaks out of generation — no hoist-layer link onto packages/vendor", (ctx) => {
    const hoist = join(ROOT, "node_modules/.pnpm/node_modules");
    // A bare return here is a vacuous PASS wearing the arm's name
    // (R4-05): the absence is a no-pnpm-install tree (fresh clone
    // before install), and the skip is REPORTED, never passed.
    if (!existsSync(hoist)) {
      ctx.skip(true, "no pnpm hoist layer on this tree (run pnpm install) — the vendor-leak arm has nothing to walk");
      return;
    }
    const offenders = readdirSync(hoist).filter((entry) => {
      try {
        return realpathSync(join(hoist, entry)).startsWith(join(ROOT, "packages/vendor"));
      } catch {
        return false;
      }
    });
    // MUTATION KILLED: re-adding packages/vendor/typert-protocol to
    // the pnpm workspace (removing the exclusion in
    // pnpm-workspace.yaml) re-links the hoist layer onto the vendor
    // and splits RemoteResult identity in every consumer tsc program
    // (card-view's stream registration died TS2322 this way while the
    // runtime kept the store copy).
    expect(offenders, "no .pnpm/node_modules entry may realpath into packages/vendor").toEqual([]);
  });

  for (const name of ESTATE_PACKAGES) {
    it(`estate/${name}: every generated codec satisfies the registry's validateCodec law`, async () => {
      const artifactUrl = new URL(`../../../../packages/estate/${name}/lib/typert.remote-client.js`, import.meta.url);
      const mod = (await import(artifactUrl.href)) as {
        default: { package: string; descriptors: Array<{ id: string; parameters: Array<{ name: string; codec: { mode?: string; typeSymbol?: string; create?: unknown } }>; result: { mode?: string; typeSymbol?: string; create?: unknown } }> };
      };
      const descriptors = mod.default.descriptors;
      // MUTATION KILLED: generation finding ZERO Remote methods (the
      // vendor evicted, the protocol resolved store-side) rewrites the
      // artifact with an empty descriptor list — the floor kills it.
      expect(descriptors.length, `estate/${name} descriptor floor`).toBeGreaterThan(0);
      for (const descriptor of descriptors) {
        validateCodec(descriptor.result, `${descriptor.id} result`);
        for (const parameter of descriptor.parameters) {
          validateCodec(parameter.codec, `${descriptor.id} parameter ${parameter.name}`);
        }
      }
      // MUTATION KILLED: the stale 0.1.7-rc.2 vocabulary (`schema:`
      // codec fields the 0.2.0-rc.1 registry cannot read) — the text
      // gate kills any regenerated-then-reverted artifact. The rc.2
      // generator's only legal "schema:" faces are the jsonSchemaError
      // message prose ("typert tool schema: …"), stripped first; any
      // other occurrence is the retired codec field.
      const text = readFileSync(fileURLToPath(artifactUrl), "utf8").replaceAll(
        "typert tool schema: ",
        "",
      );
      expect(text.includes("schema:"), `estate/${name} artifact carries the stale schema: codec vocabulary`).toBe(false);
    });
  }
});
