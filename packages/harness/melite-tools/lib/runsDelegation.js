// runsDelegation.ts — THE PERSISTED DELEGATION STATE (the session
// 90a0b920 burn, operator 2026-11-05: "the melite_runs auto mode
// turned off... after I had it on"). The /melite-runs toggle's state
// was memory-only: any lane reload or plugin re-mount rebooted
// browser lanes UNSEATED, and a mid-session reload silently stole
// the operator's ON — the session's own transcript is the receipt
// (melite_flow answered at 11:35, "unknown tool melite_flow" at
// 11:39, no /melite-runs off in between).
//
// THE LAW: the delegation survives the process. One JSON file under
// the lane's DSH home; boot reads it, every toggle writes it. Absent
// DSH_HOME (headless one-shots, alien mounts) has no file to keep —
// those boots are headless and seated by config anyway.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
/** The state file's home: the lane's DSH home (DSH_HOME when the
 * lane pins one, ~/.dsh otherwise), never the plugin's own tree. */
export function delegationStatePath() {
    const dshHome = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== ''
        ? process.env.DSH_HOME
        : join(homedir(), '.dsh');
    return join(dshHome, 'melite-runs-state.json');
}
/** Read the persisted delegation. Absent file reads as the browser
 * law's default (false — the user presses Run); a corrupt or
 * unreadable file refuses LOUD in the caller's log and reads as
 * absent (never a silent true). Null means no DSH home could be
 * resolved — memory-only mounts.
 *
 * @param log the boot's loud voice for a corrupt-file refusal.
 * @returns the persisted state, or null when nothing persists. */
export function readRunsDelegation(log) {
    const path = delegationStatePath();
    if (!existsSync(path))
        return null;
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        if (typeof parsed === 'object' && parsed !== null && typeof parsed.delegated === 'boolean') {
            return { delegated: parsed.delegated };
        }
        log?.warn('melite-tools: %s is not a delegation record (want {delegated: boolean}) — booting unseated', path);
        return null;
    }
    catch (error) {
        log?.warn('melite-tools: reading %s failed (%s) — booting unseated', path, error instanceof Error ? error.message : String(error));
        return null;
    }
}
/** Write the delegation. The toggle calls this on EVERY flip; a
 * write failure is returned (never thrown) so the command's success
 * voice can honestly say the flip did not persist.
 *
 * @param state the delegation to record.
 * @returns undefined on success, else the failure's message. */
export function writeRunsDelegation(state) {
    const path = delegationStatePath();
    try {
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, JSON.stringify(state) + '\n', 'utf8');
        return undefined;
    }
    catch (error) {
        return error instanceof Error ? error.message : String(error);
    }
}
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
export function resolveDelegationAtBoot(headless, persisted) {
    if (headless)
        return true;
    return persisted?.delegated === true;
}
//# sourceMappingURL=runsDelegation.js.map
