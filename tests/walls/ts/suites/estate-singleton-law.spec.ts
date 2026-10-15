import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

// THE ESTATE SINGLETON LAW (2026-09-29, the from-media outage's
// second layer): the client-bundle preset inlines card-base into
// every consumer bundle, so the estate singleton (`bound` in
// card-base's estate-remote.ts) exists PER BUNDLE. The mounts and
// one bind landed in card-view's copy; every studio bundle's copy
// stayed undefined and its picker answered "estate remote not
// mounted" with ZERO console errors — the mount layer above it had
// just been fixed, so the outage read as a picker bug.
//
// THE BIND, INJECT-FREE (the fifth lane receipt): every cordis-fiber
// binder died on the lane — dotted-only injects refuse `child.remote`
// on the proxy; parent-only starts the fiber INACTIVE; both levels
// break the runner's own inspect sync; a dormant fiber never wakes;
// and a studio's STATIC estate injects park it forever (studios load
// BEFORE the mounter in the plugin URL, so the wait is on the
// mounter's own $mount). The surviving shape is PLAIN JS over
// cordis' inject-free reflect seam — ctx.get, cordis' own type doc:
// "Read a service from the store without the inject requirement":
//
//   - the MOUNTER (card-view) binds directly after its $mounts,
//     reading ctx.get('remote.bench') &c;
//   - every CONSUMING studio arms a lazy getter over the same seam
//     (defineStageViewRegistration); the FIRST verb pulls it
//     (estateRemote()) — order-proof by construction, loud on a host
//     without the estates.
//
// These walls pin that law at three planes:
//
//   1. BUNDLE PLANE — every shipped bundle that embeds the
//      singleton's refusal embeds the reflect-seam read beside it;
//   2. SOURCE PLANE — the direct bind + lazy arm exist, no fiber
//      binder regrows, the studios carry NO estate injects, and
//      card-view (the mounter) binds through ctx.get;
//   3. STAMP PLANE — every client bundle's .src-stamp matches the
//      src tree it was built from (a rebuilt-src-without-rebuild
//      commit ships a bundle that lies about its own freshness).
//
// The mutations each assertion kills are named inline.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** ship-lane's own recipe (scripts/ship-lane.sh stamp_src): the
 * sorted src/*.ts(x) sha256 chain, first 16 hex chars. */
function stampSrc(pkgDir: string): string {
  const out = execFileSync(
    "bash",
    ["-c", `cd ${JSON.stringify(join(ROOT, pkgDir))} && find src \\( -name '*.ts' -o -name '*.tsx' \\) | sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16`],
    { encoding: "utf8" },
  ).trim();
  return out;
}

/** every shipped browser bundle: the lib/client.js files under
 * packages/ — flat (a lone src/client.ts) or the directory module
 * (src/client/index.ts → lib/client/index.js, the tsc flat-lib law).
 * The tsdown preset is dead; the build-plane tsc walk owns emit. */
function clientBundles(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry === "node_modules" || entry === "src") continue;
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (
        (entry === "client.js" && dir.endsWith("lib")) ||
        (entry === "index.js" && dir.endsWith(join("lib", "client")))
      ) {
        found.push(relative(ROOT, full));
      }
    }
  };
  walk(join(ROOT, "packages"));
  return found.sort();
}

describe("the estate singleton law — one binder per bundle, stamped honest", () => {
  it("BUNDLE PLANE: every bundle embedding the singleton refusal embeds the reflect-seam read", () => {
    const bundles = clientBundles();
    // MUTATION KILLED: an empty discovery — the walk returning
    // nothing would pass vacuously; the floor forces the law to have
    // teeth.
    expect(bundles.length, "the discovery must find the shipped client bundles").toBeGreaterThanOrEqual(5);
    for (const bundle of bundles) {
      const text = readFileSync(join(ROOT, bundle), "utf8");
      if (!text.includes("estate remote not mounted")) continue;
      // MUTATION KILLED: a bundle rebuilt WITHOUT the reflect-seam
      // read — its singleton can never bind, exactly the
      // "media library unavailable — estate remote not mounted"
      // outage. The ctx.get string members survive minification.
      expect(
        text.includes("remote.bench"),
        `${bundle} embeds the singleton refusal but NOT the reflect-seam read — this bundle's estate singleton can never bind`,
      ).toBe(true);
    }
  });

  it("SOURCE PLANE: direct bind + lazy arm over ctx.get; no fiber binder; studios carry NO estate injects", () => {
    const source = readFileSync(join(ROOT, "packages/web/card-base/src/estate-remote.ts"), "utf8");
    // MUTATION KILLED: the runtime child-fiber binder returning —
    // every spelling of it died on the lane (the five receipts in
    // the header); the inject-free seam is the only shape that ever
    // bound.
    expect(source.includes("bindEstateRemoteFromRemote"), "the direct bind must exist").toBe(true);
    expect(source.includes("armEstateRemoteLazyBind"), "the lazy arm must exist").toBe(true);
    expect(source.includes("bindEstateRemoteFor"), "no runtime fiber binder may return").toBe(false);
    expect(source.includes("ensureEstateRemote"), "no fiber-based lazy kick may return").toBe(false);
    // the factory arms the lazy getter over the inject-free seam
    const slots = readFileSync(join(ROOT, "packages/web/card-base/src/slots.ts"), "utf8");
    expect(slots.includes("armEstateRemoteLazyBind"), "the factory must arm the lazy bind").toBe(true);
    expect(slots.includes("ctx.get('remote.bench')"), "the getter reads the reflect seam").toBe(true);
    expect(slots.includes("bindEstateRemoteFor"), "the factory must not fire a runtime fiber").toBe(false);
    // MUTATION KILLED: estate injects reappearing on a studio entry —
    // the loader parks the studio forever (it loads BEFORE the
    // mounter; the wait is on the mounter's own $mount) and the
    // studio's card never registers. The studios' entries must carry
    // ONLY their true seats.
    const STUDIOS: Array<[string, string]> = [
      ["packages/video/h3-timeline", "h3-timeline"],
      ["packages/3d/img-to-mesh", "img-to-mesh"],
    ];
    for (const [pkg, name] of STUDIOS) {
      const entry = readFileSync(join(ROOT, pkg, "src/client/index.ts"), "utf8");
      expect(
        entry.includes("export const inject = ['slots']"),
        `${name}'s entry must inject only its true seats — estate injects park the studio before the mounter`,
      ).toBe(true);
      expect(entry.includes("remote.bench"), `${name}'s entry must not declare estate injects`).toBe(false);
    }
    // THE MOUNTER'S LAW: card-view $mounts the namespaces, so its
    // entry injects the parent 'remote' (never the dotted names —
    // that wait is its own $mount) and binds directly through the
    // inject-free ctx.get after the mounts land. 'uiConversation'
    // rides the same list since the meliteCards fold landed: the
    // conversation engine is a parent-level seat the entry registers
    // against, not an estate remote (the dotted-name ban below is
    // untouched).
    const cardView = readFileSync(join(ROOT, "packages/web/melite-card-view/src/client/index.ts"), "utf8");
    // 'uiSession' joined the parent-level set with D2's typed inject
// (2026-11-05, cures-2026-11-05-web-cards.md): the session engine is
// a parent seat the entry registers against — same class as
// 'uiConversation', never an estate remote.
expect(cardView.includes("export const inject = ['slots', 'sidebarRightTabs', 'resources', 'sidebarRight', 'remote', 'uiConversation', 'uiSession']"), "card-view's injects are exactly the parent-level set").toBe(true);
    expect(cardView.includes("ctx.get('remote.bench')"), "card-view binds through the inject-free reflect seam").toBe(true);
    expect(cardView.includes("bindEstateRemoteFromRemote"), "card-view's bind is the shared direct bind").toBe(true);
  });

  it("STAMP PLANE: every client bundle's .src-stamp matches its src tree", () => {
    const bundles = clientBundles();
    // the stamp lives at the lib root — lib/.src-stamp — also for the
    // directory-module bundle (lib/client/index.js)
    const stamped = bundles.filter((b) => {
      const d = dirname(b);
      return existsSync(join(ROOT, d.endsWith("client") ? dirname(d) : d, ".src-stamp"));
    });
    // MUTATION KILLED: a stale stamp floor — if no bundle carries a
    // stamp the wall passes vacuously; the shipped five must.
    expect(stamped.length, "the shipped client bundles must all carry .src-stamp").toBeGreaterThanOrEqual(5);
    for (const bundle of stamped) {
      const d = dirname(bundle);
      const libDir = d.endsWith("client") ? dirname(d) : d;
      const pkg = dirname(libDir);
      // THE VANISHED-BUNDLE GUARD (audit 2026-10-12-audit-race-class,
      // rec 3): the census walk and the stamp read are two moments —
      // a fixture that lived under packages/ mid-walk (the
      // card-base-synthetic class) deletes itself before stampSrc
      // cd's into it and the wall dies on ENOENT, not on law. A
      // path that no longer exists at read time is by construction
      // not a shipped bundle; skip it. This is NOT a tolerance for
      // stale stamps — the stamp comparison below still refuses
      // every bundle that survives the walk.
      if (!existsSync(join(ROOT, libDir))) continue;
      const want = stampSrc(pkg);
      const have = readFileSync(join(ROOT, libDir, ".src-stamp"), "utf8").trim();
      // MUTATION KILLED: editing card-base's binder (or any studio
      // src) and committing without rebuilding — the stamp stops
      // matching and the lane's year-immutable cache would serve the
      // OLD bundle under a NEW tree.
      expect(have, `${pkg}: lib/.src-stamp is stale — rebuild the bundle before shipping`).toBe(want);
    }
  });
});
