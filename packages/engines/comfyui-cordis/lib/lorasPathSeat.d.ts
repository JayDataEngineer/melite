/**
 * lorasPathSeat — THE ROWS-FILE LOCATION SEAT (config-pinned).
 *
 * Split out of userLoras.ts (the rows reader) so the CONFIG setter
 * rides its own module: the lora-roster-reader census pins the
 * importer set of the user-loras seam (the rows-file reader plane),
 * and the estate's manage registry may pin the LOCATION without
 * becoming a rows reader — it imports this seat through the package
 * root, never the rows module.
 *
 * THE ONE SPELLING LAW is unchanged: the config-pinned override
 * (ManageConfig.userLorasPath — the 2026-11-17 audit's config twin:
 * where the estate's data tree lives is a deployment-varying choice,
 * a validated config field changeable from cordis.yml, never an
 * env-only seam) wins, the documented MELITE_USER_LORAS env fallback
 * is next, the repo default last. Every reader resolves through
 * `userLorasPath()` — a second literal is a second truth about the
 * same file.
 */
/** Pin the rows-file location from a validated config field (the
 *  manage door's plugin calls this from its apply, before any reader
 *  runs; an empty value clears the pin back to the default).
 *  @param path the cordis.yml-declared rows file, or '' to unpin.
 */
export declare function setUserLorasPath(path: string): void;
/** ONE spelling of the rows-file location: the config-pinned
 *  override wins (ManageConfig.userLorasPath), the documented
 *  MELITE_USER_LORAS env fallback next, the repo default last.
 *  @returns the rows-file path every reader resolves through. */
export declare function userLorasPath(): string;
//# sourceMappingURL=lorasPathSeat.d.ts.map
