import type { Context } from '@deepseek-ai/cordis';
import { type UserLoraRow } from '../userLoras.ts';
export declare const inject: string[];
/** The tray's own rows for a loras dir: one row per weights file
 * under a FAMILY dir. A root-level weights file names no family and
 * is skipped (a row rides a model); non-weights files are skipped
 * (README, part files, dotfiles). PURE — the caller owns the
 * registration and the dedup.
 * @param dir the engine's own loras dir (resolveEngineLorasDir's value) */
export declare function trayLoraRows(dir: string): UserLoraRow[];
export declare function apply(ctx: Context): void;
