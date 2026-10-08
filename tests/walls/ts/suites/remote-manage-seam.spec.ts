// remote-manage-seam.spec.ts — the three-hop service seam the
// incident exposed (the composition-seams audit's S9, 2026-10-18:
// the deck pended `waiting for service: remote.manage` behind the
// dead plugins, and ZERO tests named `remote.manage` — any hop's
// absence is a silent forever-pend, invisible to every wall).
//
// The seam, as the code composes it:
//
//   hop 3  dsh-estate (src/index.ts) mounts manageRemotePlugin —
//          the estate row's child composition provides the service
//          (@melite/estate-manage, imported and spread into the
//          plugin list). Without the estate bundle there is no
//          provider, and the deck pends.
//   hop 2  card-view (src/client/index.ts) $mounts the MANAGE_
//          TYPERT_REMOTE namespace from @melite/estate-manage's
//          remote contract — the loader-level mount that exposes
//          the service namespace to every client in the graph.
//   hop 1  the deck (src/client/index.ts) declares `remote.manage`
//          in its inject array — a manifest-level fact — AND calls
//          ctx.remote.manage at seat time (a code-only edge the
//          manifest does not carry; the audit's S13: analysis that
//          reads only manifests misses this hop by construction).
//
// The wall pins all three hops textually in the source that owns
// each. It cannot prove the runtime wiring (the boot probe in
// provisioner-boot.spec.ts owns the served-graph verdict); it
// proves the seam's SHAPE — that deleting or renaming any hop
// fails HERE with the hop named, not on an operator's pend.
//
// Run: npx vitest run tests/walls/ts/suites/remote-manage-seam.spec.ts
import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO: string = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function src(rel: string): string {
  return readFileSync(join(REPO, rel), "utf8");
}

test("the remote.manage seam holds all three hops (provider, mount, consumer)", () => {
  // hop 3 — the provider rides the estate's child composition
  const estate = src("packages/web/melite-estate/src/index.ts");
  assert.ok(estate.includes('from "@melite/estate-manage"'),
    "dsh-estate no longer imports @melite/estate-manage — the remote.manage provider lost its seat (hop 3)");
  assert.ok(/manageRemotePlugin/.test(estate),
    "dsh-estate no longer mounts manageRemotePlugin — the deck would pend on remote.manage forever (hop 3)");

  // hop 2 — the namespace mount the loader honors
  const view = src("packages/web/melite-card-view/src/client/index.ts");
  assert.ok(view.includes("TYPERT_REMOTE as MANAGE_TYPERT_REMOTE"),
    "card-view no longer imports the manage remote contract — the namespace never mounts (hop 2)");
  assert.ok(/\$mount\(MANAGE_TYPERT_REMOTE\)/.test(view),
    "card-view no longer $mounts the manage remote — the service namespace is dead in the client graph (hop 2)");

  // hop 1 — the consumer declares AND uses the namespace
  const deck = src("packages/web/melite-card-deck/src/client/index.ts");
  assert.ok(deck.includes("'remote.manage'"),
    "the deck no longer declares remote.manage in its inject array (hop 1, manifest edge)");
  assert.ok(/ctx\.remote\.manage/.test(deck),
    "the deck no longer calls ctx.remote.manage — the code-only edge the manifest cannot carry (hop 1, S13)");
});
