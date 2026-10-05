import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "@melite/viewer";
export declare const inject: string[];
/** R5: the viewer answers over the estate lanes (in-process) — no
 *  gateway URL, no port; the ctx carries the mounted listeners. */
export interface Config {
    gateway?: string;
}
export declare const Config: Schema<Config>;
/** One estate lane read, JSON or bytes (testable in isolation).
 *  THE GATEWAY KILL (2026-09-10): the lanes are dead — every proxy
 *  answers 502 LOUD until the viewer rides named remotes/DHS faces. */
export declare function proxyDoor(ctx: Context, upstreamPath: string, json: boolean, respond: (status: number, headers: Record<string, string>, body: string | Buffer) => void): Promise<void>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
