// provision-extensions-install — the extension install step.
//
// CHANNEL LAW (operator 2026-10-13): ComfyUI-Manager is the ONE
// vendor for extensions. Every declared row carries a git url —
// upstream packs at their upstream repos, first-party packs at
// github.com/JayDataEngineer/<pack> (the same repos this tree
// references as submodules under vendor/comfyui_extensions).
// Installs ride Manager's own git-url door
// (POST /customnode/install/git_url — the same endpoint the estate
// provider and Manager's UI use), which also runs each pack's
// requirements.txt pip leg; the CLI never clones, never
// pip-installs, never copies directories. Outcomes are verified on
// disk after each call (the installed clone's git remote).
import { execSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { defaultConfig, DRY, repo, runtime, die, info, warn } from "./provision-shared.js";
import { rowSharedDepDeltas } from "./provision-shared-deps.js";
import { engineLiveRoot, engineUrl, loadConfig } from "./provision-config.js";
import { mergeManifest } from "./provision-extensions-manifest.js";
/** The cold-cache retry window for Manager git-url installs: a
 *  just-booted Manager refuses installs (empty-body 400, or a 200
 *  that installs nothing) until its channel cache fetch lands —
 *  observed at ~13s on a warm box and minutes on a cold one. Each
 *  row retries this many times with this delay before failing. */
const INSTALL_RETRY = { attempts: 12, delayMs: 15_000 };
/** @param ms milliseconds to wait.
 *  @returns a promise that resolves after the wait. */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/** Normalize a git remote for identity comparison — case, a
 *  trailing slash and a .git suffix carry no identity.
 *  @param url a remote url in any of its spellings.
 *  @returns the comparable form. */
function normRemote(url) {
    return url.replace(/\/$/, "").toLowerCase().replace(/\.git$/, "");
}
/** Every remote url declared in one clone's .git/config.
 *  @param cloneDir the custom_nodes directory to read.
 *  @returns the normalized remotes; empty when the dir is no clone. */
function remotesOf(cloneDir) {
    const cfgF = join(cloneDir, ".git", "config");
    if (!existsSync(cfgF))
        return [];
    const text = readFileSync(cfgF, "utf8");
    return [...text.matchAll(/url\s*=\s*(\S+)/g)].map((m) => normRemote(m[1]));
}
/** The custom_nodes directory whose git remote IS this url — the only
 *  reliable identity of a Manager install. Manager renames install
 *  dirs (lrzjason/Comfyui-QwenEditUtils landed as "qweneditutils",
 *  numz/ComfyUI-SeedVR2_VideoUpscaler as "seedvr2_videoupscaler"), so
 *  a row's repo name is NOT its directory name; the remote is exact.
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns the matching directory name, or "" when none is. */
export function installedDirFor(url, workspace) {
    const want = normRemote(url);
    let kids = [];
    try {
        kids = readdirSync(join(workspace, "custom_nodes")).sort();
    }
    catch {
        return "";
    }
    for (const k of kids) {
        if (remotesOf(join(workspace, "custom_nodes", k)).includes(want))
            return k;
    }
    return "";
}
/** True if some custom_nodes clone's git remote IS this url (the
 *  Manager renames install dirs; matching the remote is exact).
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns true when a clone with this remote is installed. */
export function urlInstalled(url, workspace) {
    return installedDirFor(url, workspace) !== "";
}
/** The trees the install loop verifies against: the repo's IaC
 *  runtime FIRST (the tree provision owns), then the live engine's
 *  tree when the overlay declares one (engines.comfyui.live_root —
 *  the two-tree estate: Manager's door installs into the tree its
 *  engine runs from, which is not data/runtime). A declared live
 *  root that does not exist is a loud refusal, not a skip — the
 *  overlay named a tree the box does not have.
 *  @param cfg the endpoint config.
 *  @returns the deduped verify roots, IaC runtime first. */
export function verifyRoots(cfg) {
    const live = engineLiveRoot(cfg);
    if (live === "" || live === runtime())
        return [runtime()];
    if (!existsSync(live)) {
        die("engines.comfyui.live_root names a tree that does not exist: " +
            live + " — fix the overlay (data/inference.local.json); the " +
            "install loop refuses to verify against a missing tree");
    }
    return [runtime(), live];
}
/** Where a row's clone actually sits: the first verify root whose
 *  custom_nodes carries a clone with this remote. Manager installs
 *  into ITS engine's tree, so a row can be absent from the IaC
 *  runtime while landed exactly at its pin in the live tree.
 *  @param url the declared git remote.
 *  @param roots the verify roots, IaC first (see verifyRoots).
 *  @returns the root and install dir name, or null when no root
 *  carries the remote. */
export function landedIn(url, roots) {
    for (const root of roots) {
        const dir = installedDirFor(url, root);
        if (dir !== "")
            return { root, dir };
    }
    return null;
}
/** The installed clone's HEAD commit, for ref-pin verification.
 *  @param workspace the engine workspace root.
 *  @param dir the custom_nodes dir name Manager installed.
 *  @returns the commit sha, or "" when the dir is not a clone. */
export function installedHead(workspace, dir) {
    try {
        return execSync("git rev-parse HEAD", { cwd: join(workspace, "custom_nodes", dir), encoding: "utf8" })
            .trim();
    }
    catch {
        return "";
    }
}
/** The landed-HEAD verdict for one row, in the runtime provider's
 *  law (manager-provider.ts:415-432): a declared pin is verified
 *  against the commit on disk, and a row that cannot report one is
 *  unverifiable — its own refusal, not a pass. A row with no pin is
 *  a registry install (the impact packs) and carries no commit by
 *  design. The head is read from the directory whose git remote IS
 *  the declared url (installedDirFor), never from a name derived
 *  from the url — Manager renames install dirs, so a name-derived
 *  lookup verified a directory that does not exist and failed seven
 *  rows that had landed exactly at their pins (2026-10-15). Since
 *  2026-10-17 the read spans EVERY verify root (the two-tree
 *  estate: the clone sits in whichever tree Manager's engine runs
 *  from) and the verdict names the tree it read.
 *  @param name the row name, for the verdict text.
 *  @param url the declared git remote.
 *  @param ref the declared pin ("" for registry rows).
 *  @param roots the verify roots, IaC first (see verifyRoots).
 *  @returns "" when the row's landed state is the declared one. */
export function landedVerdict(name, url, ref, roots) {
    if (ref === undefined || ref === "")
        return "";
    const seat = landedIn(url, roots);
    const head = seat === null ? "" : installedHead(seat.root, seat.dir);
    if (head === "" || seat === null) {
        return "reports no landed commit in any verify tree — the declared " +
            "ref " + ref + " cannot be verified (no custom_nodes clone in " +
            roots.join(", ") + " carries remote " + url + ")";
    }
    if (!head.startsWith(ref) && !ref.startsWith(head)) {
        return "landed at " + head.slice(0, 10) + " in " + seat.root +
            " but the declaration pins " + ref.slice(0, 10) +
            " (the pin is the truth)";
    }
    return "";
}
/** Idempotently pin the manager's config.ini to the estate-proven
 *  install door: allow_git_url_install opens unknown-URL queue
 *  installs, and the ltdrdata channel_url replaces Manager 3.41's
 *  own default (Comfy-Org) — the default raises InvalidChannel in
 *  Manager's cache-update thread, the channel cache never warms,
 *  and every git-url install is refused with an empty-body 400
 *  (the fresh-clone probe's pass-6 receipt; the live estate works
 *  only because its config.ini carries the older ltdrdata line).
 *  Both keys are read once at engine startup; a change needs a
 *  restart.
 *  @param configPath the manager config.ini path.
 *  @returns true when the file already carried every pinned line. */
export function ensureManagerPinnedConfig(configPath) {
    const pinned = [
        "allow_git_url_install = true",
        "channel_url = https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main",
    ];
    if (!existsSync(configPath)) {
        mkdirSync(dirname(configPath), { recursive: true });
        writeFileSync(configPath, "[default]\n" + pinned.join("\n") + "\n");
        return false;
    }
    let text = readFileSync(configPath, "utf8");
    let stable = true;
    for (const line of pinned) {
        const key = line.slice(0, line.indexOf(" "));
        const current = text.split("\n").find((l) => new RegExp("^[ \\t]*" + key + "[ \\t]*=").test(l));
        if (current === undefined) {
            text = text.replace(/\n*$/u, "\n") + line + "\n";
            stable = false;
            continue;
        }
        if (current.trim() === line)
            continue;
        text = text.replace(new RegExp("^[ \\t]*" + key + "[ \\t]*=.*$", "m"), line);
        stable = false;
    }
    if (!stable)
        writeFileSync(configPath, text);
    return stable;
}
/** Clear a stale install shape at a url row's custom_nodes path —
 *  a Manager install of THIS remote is the only shape that may
 *  stay (urlInstalled decides); the dev-symlink era and real-copy
 *  era left links and plain directories that Manager correctly
 *  refuses to install over ("Already exists"). A symlink unlinks
 *  without touching its target; a git dir with a different remote
 *  is a declaration conflict — the declaration is the truth. The
 *  derived name is only the FIRST place to look: Manager renames
 *  install dirs, so a squatter can sit at any other casing of the
 *  repo name with a foreign remote (the impact packs' live shape —
 *  a clone of comfyanonymous/ComfyUI.git under "comfyui-impact-pack"
 *  — over which Manager answers "Already exists" and installs
 *  nothing).
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns "" when nothing was removed, else the removed shape
 *           ("symlink" | "file" | "directory" | "stale clone"). */
export function clearStaleInstall(url, workspace) {
    const dir = url.replace(/\/+$/, "").replace(/\.git$/, "")
        .split("/").pop() ?? "";
    const target = join(workspace, "custom_nodes", dir);
    let removed = "";
    try {
        const st = lstatSync(target);
        if (st.isSymbolicLink()) {
            rmSync(target, { force: true });
            removed = "symlink";
        }
        else if (!st.isDirectory()) {
            rmSync(target, { force: true });
            removed = "file";
        }
        else {
            if (urlInstalled(url, workspace))
                return "";
            removed = existsSync(join(target, ".git")) ? "stale clone" : "directory";
            rmSync(target, { recursive: true, force: true });
        }
    }
    catch {
        // the derived name is absent — the squatter, if any, is renamed.
    }
    // Manager's name for the row may be ANY casing of the repo name,
    // so the renamed scan runs after every removal too: a squatter left
    // behind makes Manager answer "Already exists" and install nothing
    // (the impact packs' live failure — the exact-name dir came off,
    // the lowercase junk clone stayed, and the install never landed).
    const squatter = clearRenamedSquatter(url, dir, workspace);
    return squatter !== "" ? squatter : removed;
}
/** Remove a directory whose name collides with the row's repo name
 *  case-insensitively while carrying a different git remote (or no
 *  git at all) — the shape Manager refuses to install over because
 *  its own name for the row is already occupied. A dir that carries
 *  the row's own remote is Manager's install and stays.
 *  @param url the declared git remote.
 *  @param dir the repo name derived from the url.
 *  @param workspace the engine workspace root.
 *  @returns "" when no squatter was found, else the removed shape
 *           ("stale clone" | "directory"). */
function clearRenamedSquatter(url, dir, workspace) {
    let kids = [];
    try {
        kids = readdirSync(join(workspace, "custom_nodes"));
    }
    catch {
        return "";
    }
    const want = normRemote(url);
    for (const k of kids) {
        if (k.toLowerCase() !== dir.toLowerCase())
            continue;
        const squatter = join(workspace, "custom_nodes", k);
        const wasClone = existsSync(join(squatter, ".git", "config"));
        if (wasClone && remotesOf(squatter).includes(want))
            continue;
        rmSync(squatter, { recursive: true, force: true });
        return wasClone ? "stale clone" : "directory";
    }
    return "";
}
export async function stepExtensions() {
    const exts = mergeManifest(repo());
    info(exts.length + " extensions declared");
    const cfg = loadConfig(defaultConfig());
    if (cfg.provision !== "managed") {
        die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
            "deployments own their custom_nodes; the estate never " +
            "installs into a user workspace");
    }
    const workspace = runtime();
    // THE TWO-TREE ESTATE (roadmap 2026-10-16): Manager's door
    // installs into the tree its engine runs from — the live engine
    // at engines.comfyui.live_root when the overlay names one —
    // while the IaC runtime stays data/runtime. Every verdict below
    // reads the tree the clone actually sits in and NAMES it.
    const roots = verifyRoots(cfg);
    const counts = { installed: 0, skipped: 0, failed: 0, blocked: 0 };
    let planned = 0;
    const pending = [];
    for (const e of exts) {
        const name = (e.name ?? "").trim();
        const url = (e.url ?? "").trim();
        const ref = (e.ref ?? "").trim();
        if (!name)
            continue;
        if (!url) {
            warn("  [" + name + "] has no url — every extension declares " +
                "its source (first-party packs: github.com/JayDataEngineer/" +
                name + ")");
            counts.failed += 1;
            continue;
        }
        const seat = landedIn(url, roots);
        if (seat !== null) {
            // AN ALREADY-PRESENT ROW IS STILL A DECLARED ROW: the law is
            // that every pinned row's LANDED HEAD is verified, not only the
            // ones this run installed.
            const drift = landedVerdict(name, url, ref, [seat.root]);
            if (drift !== "") {
                // THE PIN IS THE TRUTH, SO THE ESTATE CONVERGES (the IaC
                // law, operator 2026-10-15): a drifted head is re-queued
                // through Manager's git-url door at the declared ref — the
                // run ends either at the pin or red, never at a silent
                // acceptance of the drift.
                warn("  [" + name + "] " + drift + " — converging to the declared ref");
                if (DRY) {
                    planned += 1;
                    continue;
                }
                // the shared-dep guard owns this push too: a converged row
                // still hands Manager the venv (the same pip leg runs)
                const convergeDir = url.split("/").pop() ?? "";
                const convergeDeltas = rowSharedDepDeltas(join(repo(), "vendor", "comfyui_extensions"), convergeDir);
                if (convergeDeltas.length > 0) {
                    warn("  [" + name + "] BLOCKED — the pack's pip leg would move a pinned shared dep under the live engine:");
                    for (const delta of convergeDeltas) {
                        warn("    " + delta);
                    }
                    counts.blocked += 1;
                    continue;
                }
                rmSync(join(seat.root, "custom_nodes", seat.dir), { recursive: true, force: true });
                pending.push({ name, url, ref });
                continue;
            }
            counts.skipped += 1;
            info("  [" + name + "] already in custom_nodes at the declared ref" +
                " (" + seat.root + ") — skipping");
            continue;
        }
        if (DRY) {
            console.log("[dry-run] manager git_url install [" + name + "] " + url);
            planned += 1;
            continue;
        }
        // THE SHARED-DEP GUARD (ERRORS_2 2026-11-10, the owed SYSTEMIC
        // wall): Manager's git-url door runs the pack's requirements.txt
        // pip leg inside the install request — a pack that moves a pinned
        // shared dep (upgrade OR downgrade) mutates the LIVE venv under
        // the engine. The pack's vendored twin is the at-pin truth; any
        // delta from the record pack's pins blocks the row HERE, loud,
        // before Manager ever opens the venv.
        const guardDir = url.split("/").pop() ?? "";
        const deltas = rowSharedDepDeltas(join(repo(), "vendor", "comfyui_extensions"), guardDir);
        if (deltas.length > 0) {
            warn("  [" + name + "] BLOCKED — the pack's pip leg would move a pinned shared dep under the live engine:");
            for (const delta of deltas) {
                warn("    " + delta);
            }
            counts.blocked += 1;
            continue;
        }
        pending.push({ name, url, ref });
    }
    if (!DRY && pending.length > 0) {
        const endpoint = engineUrl(cfg);
        if (endpoint === "") {
            die("ComfyUI endpoint URL is not configured — the extension " +
                "queue rides the running engine's manager");
        }
        // The engine must be UP: the queue lives inside it.
        try {
            const probe = await fetch(endpoint + "/manager/version", { signal: AbortSignal.timeout(10_000) });
            if (!probe.ok)
                throw new Error("status " + probe.status);
        }
        catch (error) {
            die("ComfyUI-Manager is not answering at " + endpoint + " — " +
                "start the engine first (pnpm run provision -- boot-cmd); " +
                "extensions install through Manager's git-url door: " +
                (error instanceof Error ? error.message : String(error)));
        }
        const flagStable = ensureManagerPinnedConfig(join(runtime(), "user", "__manager", "config.ini"));
        if (!flagStable) {
            die("manager config pinned (allow_git_url_install, channel_url) — " +
                "the engine reads it once at startup: restart the engine, then " +
                "rerun this step");
        }
        // Install each row through Manager's own git-url door — the
        // same endpoint the estate provider and Manager's UI use. The
        // call is synchronous: Manager clones the repo and runs its
        // requirements.txt inside the request (a cold pip leg can take
        // minutes; the timeout is 15 minutes per row). The node QUEUE
        // (queue/install) resolves names through Manager's channel
        // registry — first-party pack names are not in it and the
        // worker refuses them ("not found in [default, cache]");
        // git_url is the door for arbitrary remotes.
        for (const row of pending) {
            const stale = clearStaleInstall(row.url, workspace);
            if (stale !== "") {
                warn("  [" + row.name + "] removed a stale " + stale +
                    " at custom_nodes/" + row.url.split("/").pop() +
                    " — Manager owns this path now");
            }
            // THE PIN RIDES THE DOOR (the same spelling the estate's
            // runtime provider uses, manager-provider.ts:402): Manager
            // checks the @suffix out, so a URL without it installs whatever
            // the branch points at today and floats.
            const target = row.ref === undefined || row.ref === ""
                ? row.url
                : row.url + "@" + row.ref;
            // THE COLD-CACHE WINDOW: a just-booted Manager answers git-url
            // installs with an empty-body 400 (or a 200 that installs
            // nothing) until its channel cache fetch lands — the engine
            // log reads "The ComfyRegistry cache update is still in
            // progress". The refusal is transient, so each row retries a
            // bounded window instead of failing the whole stranger path
            // (the fresh-clone probe's pass-5 receipt: 25/25 refused
            // seconds after boot; the same rows installed minutes later).
            let landed = false;
            // The tree each landed row verified against — every
            // installed report names it (the two-tree estate's receipt).
            let verifiedRoot = "";
            for (let attempt = 1; attempt <= INSTALL_RETRY.attempts; attempt += 1) {
                if (attempt > 1) {
                    info("  [" + row.name + "] retrying install in " +
                        INSTALL_RETRY.delayMs + "ms (attempt " + attempt + " of " +
                        INSTALL_RETRY.attempts + " — Manager's cache may still be warming)");
                    await sleep(INSTALL_RETRY.delayMs);
                }
                info("  [" + row.name + "] manager git_url install — " + target);
                // TRANSPORT FAILURES RETRY TOO (the same bounded window as
                // Manager's warm-up refusals): a connect reset or a briefly
                // stalled engine is transient, and a FATAL here would strand
                // rows the loop already converged (their drifted clones are
                // gone — the retry window is what finishes the install).
                let res;
                try {
                    res = await fetch(endpoint + "/customnode/install/git_url", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ url: target }),
                        signal: AbortSignal.timeout(900_000),
                    });
                }
                catch (error) {
                    if (attempt === INSTALL_RETRY.attempts) {
                        warn("  [" + row.name + "] install call failed — " +
                            (error instanceof Error ? error.message : String(error)) +
                            " (verified trees: " + roots.join(", ") + ")");
                    }
                    continue;
                }
                if (!res.ok) {
                    // Manager states its reason in the response body (JSON or
                    // plain text); surfacing it here is the diagnosis seam —
                    // "the engine log has the failure" is true but the body is
                    // the failure, verbatim. An empty-body 400 with "Already
                    // exists" semantics gets the SAME on-disk check the 200
                    // arm runs before any retry: the row can be already
                    // installed in the live tree (the tree Manager's engine
                    // runs from) while the IaC runtime never sees it — the
                    // 2026-10-16 misreport class, where the retry loop
                    // exhausted on a row that had landed at its pin.
                    let reason = "";
                    try {
                        reason = (await res.text()).trim().slice(0, 300);
                    }
                    catch {
                        reason = "(body unreadable)";
                    }
                    const seat = landedIn(row.url, roots);
                    if (seat !== null &&
                        landedVerdict(row.name, row.url, row.ref, [seat.root]) === "") {
                        info("  [" + row.name + "] refused (status " + res.status +
                            ") but already at the declared ref in " + seat.root +
                            " — verified there");
                        landed = true;
                        verifiedRoot = seat.root;
                        break;
                    }
                    if (seat !== null && attempt === 1) {
                        // THE SAME CONVERGE LAW THE SKIP ARM APPLIES (the pin is
                        // the truth, operator 2026-10-15): Manager refuses
                        // because a DRIFTED clone of this remote sits in the
                        // tree its engine runs from — remove it there and let
                        // the retry install at the declared ref.
                        warn("  [" + row.name + "] refused over a drifted clone in " +
                            seat.root + " (" + seat.dir + ") — converging to the declared ref");
                        rmSync(join(seat.root, "custom_nodes", seat.dir), { recursive: true, force: true });
                    }
                    if (attempt === INSTALL_RETRY.attempts) {
                        warn("  [" + row.name + "] install refused (status " + res.status +
                            ") — " + (reason === "" ? "the engine log has the failure" : reason) +
                            " (verified trees: " + roots.join(", ") + ")");
                    }
                    continue;
                }
                // Verify the outcome on disk: the clone's git remote IS the
                // row (a 200 with action=skip means it was already there) —
                // in ANY verify tree, not only the IaC runtime.
                const seat = landedIn(row.url, roots);
                if (seat === null) {
                    if (attempt === INSTALL_RETRY.attempts) {
                        warn("  [" + row.name + "] not present after a 200 in any " +
                            "verify tree (" + roots.join(", ") + ") — the engine log " +
                            "has the failure");
                    }
                    continue;
                }
                landed = true;
                verifiedRoot = seat.root;
                break;
            }
            if (!landed) {
                counts.failed += 1;
                continue;
            }
            counts.installed += 1;
            info("  [" + row.name + "] installed — verified against " + verifiedRoot);
            const drift = landedVerdict(row.name, row.url, row.ref, [verifiedRoot]);
            if (drift !== "") {
                warn("  [" + row.name + "] " + drift);
                counts.failed += 1;
            }
        }
    }
    info("extensions: " + counts.installed + " installed" +
        (planned > 0 ? ", " + planned + " planned" : "") + ", " +
        counts.skipped + " skipped, " + counts.failed + " failed, " +
        counts.blocked + " blocked");
    if (!DRY && counts.installed > 0) {
        info("restart required for new nodes (restart_comfyui is " +
            "operator-invoked: comfy restart, or the stop/boot doors)");
    }
    return counts.failed === 0 && counts.blocked === 0;
}
//# sourceMappingURL=provision-extensions-install.js.map