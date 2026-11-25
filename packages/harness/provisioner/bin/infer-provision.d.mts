/** Type face for the provisioner bin's in-process exports — the walls
 *  (tests/lane-pairing-fence.spec.ts, tests/workspace-globs-posix.spec.ts)
 *  import them statically and the test tier's noEmit tsc refuses an
 *  undeclared .mjs (TS7016). The .mjs carries the full contracts; these
 *  lines only type them. */

/** Absolute repo root the running bin self-locates from. */
export declare const RENDER_ROOT: string;

/** The pairing verdict: `refusal` is present exactly when `ok` is
 *  false (the wall's expect-assertions read it un-narrowed, so the
 *  faces stay flat rather than a discriminated union). */
interface PairingVerdict {
  ok: boolean;
  reParented: boolean;
  refusal?: string;
}

/** Judge a previous provenance root against the current one (the
 *  lane-pairing fence): same or absent passes; a mismatch passes only
 *  with reParent, else refuses with the standing sentence. */
export declare function pairingVerdict(
  prevRoot: string | null | undefined,
  currentRoot: string,
  opts?: { reParent?: boolean },
): PairingVerdict;

/** Read dst's render-provenance stamp and judge the pairing (the
 *  bin's render door throws on the refused verdict; this export
 *  returns it): the pairing-verdict shape plus the previous stamp
 *  root (null when absent or unparseable). */
export declare function enforcePairing(
  dst: string,
  opts?: { reParent?: boolean; currentRoot?: string },
): PairingVerdict & { prevRoot: string | null };

/** `full` made relative to `root` with forward slashes (the form the
 *  POSIX workspace globs match); `full` must begin with `root` plus
 *  one separator. */
export declare function relPosix(root: string, full: string): string;

/** One pnpm-workspace glob as an anchored RegExp over repo-relative
 *  POSIX paths (`**` spans directories, `*` stays in one segment). */
export declare function workspaceGlobRegExp(glob: string): RegExp;
