import type { EndpointConfig } from "./provision-config.ts";
/** The custom_nodes directory whose git remote IS this url — the only
 *  reliable identity of a Manager install. Manager renames install
 *  dirs (lrzjason/Comfyui-QwenEditUtils landed as "qweneditutils",
 *  numz/ComfyUI-SeedVR2_VideoUpscaler as "seedvr2_videoupscaler"), so
 *  a row's repo name is NOT its directory name; the remote is exact.
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns the matching directory name, or "" when none is. */
export declare function installedDirFor(url: string, workspace: string): string;
/** True if some custom_nodes clone's git remote IS this url (the
 *  Manager renames install dirs; matching the remote is exact).
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns true when a clone with this remote is installed. */
export declare function urlInstalled(url: string, workspace: string): boolean;
/** The trees the install loop verifies against: the repo's IaC
 *  runtime FIRST (the tree provision owns), then the live engine's
 *  tree when the overlay declares one (engines.comfyui.live_root —
 *  the two-tree estate: Manager's door installs into the tree its
 *  engine runs from, which is not data/runtime). A declared live
 *  root that does not exist is a loud refusal, not a skip — the
 *  overlay named a tree the box does not have.
 *  @param cfg the endpoint config.
 *  @returns the deduped verify roots, IaC runtime first. */
export declare function verifyRoots(cfg: EndpointConfig): string[];
/** Where a row's clone actually sits: the first verify root whose
 *  custom_nodes carries a clone with this remote. Manager installs
 *  into ITS engine's tree, so a row can be absent from the IaC
 *  runtime while landed exactly at its pin in the live tree.
 *  @param url the declared git remote.
 *  @param roots the verify roots, IaC first (see verifyRoots).
 *  @returns the root and install dir name, or null when no root
 *  carries the remote. */
export declare function landedIn(url: string, roots: readonly string[]): {
    root: string;
    dir: string;
} | null;
/** The installed clone's HEAD commit, for ref-pin verification.
 *  @param workspace the engine workspace root.
 *  @param dir the custom_nodes dir name Manager installed.
 *  @returns the commit sha, or "" when the dir is not a clone. */
export declare function installedHead(workspace: string, dir: string): string;
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
export declare function landedVerdict(name: string, url: string, ref: string, roots: readonly string[]): string;
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
export declare function ensureManagerPinnedConfig(configPath: string): boolean;
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
export declare function clearStaleInstall(url: string, workspace: string): string;
export declare function stepExtensions(): Promise<boolean>;
