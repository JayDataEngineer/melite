/** The persisted record's shape (one key — the delegation flag). */
export interface RunsDelegationState {
    /** true — the AI owns the run press (melite_flow + run_status
     * seated); false — the user's Run press owns runs. */
    delegated: boolean;
}
/** The state file's home: the lane's DSH home (DSH_HOME when the
 * lane pins one, ~/.dsh otherwise), never the plugin's own tree. */
export declare function delegationStatePath(): string;
/** Read the persisted delegation. Absent file reads as the browser
 * law's default (false — the user presses Run); a corrupt or
 * unreadable file refuses LOUD in the caller's log and reads as
 * absent (never a silent true). Null means no DSH home could be
 * resolved — memory-only mounts.
 *
 * @param log the boot's loud voice for a corrupt-file refusal.
 * @returns the persisted state, or null when nothing persists. */
export declare function readRunsDelegation(log?: {
    warn: (template: string, ...args: unknown[]) => void;
}): RunsDelegationState | null;
/** Write the delegation. The toggle calls this on EVERY flip; a
 * write failure is returned (never thrown) so the command's success
 * voice can honestly say the flip did not persist.
 *
 * @param state the delegation to record.
 * @returns undefined on success, else the failure's message. */
export declare function writeRunsDelegation(state: RunsDelegationState): string | undefined;
/** THE BOOT LAW (pure — the wiring's one decision): which
 * delegation does this mount boot with? headless boots seated (the
 * delegated operator, config's own law); a browser mount boots on
 * the PERSISTED record — the operator's last toggle outlives the
 * reload — defaulting to the browser law (false) when nothing
 * persists.
 *
 * @param headless the config's interface flag.
 * @param persisted the record read at boot (null when none).
 * @returns the delegation this boot seats. */
export declare function resolveDelegationAtBoot(headless: boolean, persisted: RunsDelegationState | null): boolean;
//# sourceMappingURL=runsDelegation.d.ts.map