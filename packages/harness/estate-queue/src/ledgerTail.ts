// ledgerTail.ts — the journal tail, RE-HOMED (REBUILD-19,
// 2026-09-10): the dead gateway's GET /v1/ledger arm (the
// doors/assets.ts _h_ledger, killed with the gateway app) ports
// verbatim as a pure over the state root — the queue seat's own
// journal (appendLedger writes it; this reads it back).
//
// The door's law rides EXACTLY (assets.ts 698-764): limit default
// 50, clamp 1..500, garbage -> 50 (NEVER a 400); event truncated
// to 64 chars, matched on the RAW line substring
// '"event":"<ev>'; the tail keeps the LAST N lines; unparseable
// lines count as matched but never as entries; output oldest ->
// newest within the tail; a missing journal reads empty.
import { readFileSync } from "node:fs";

/** The parsed tail answer (the seat serves the object; the door
 *  serialized it — the HTTP rim is dead). */
export interface LedgerTailAnswer {
  entries: unknown[];
  shown: number;
  matched: number;
}

export function tailLedger(
  ledgerPath: string,
  rawLimit: string,
  rawEvent: string,
): LedgerTailAnswer {
  let limit: number;
  if (/^\s*[+-]?\d+\s*$/.test(rawLimit)) {
    limit = Math.max(1, Math.min(500, Number(rawLimit.trim())));
  } else {
    limit = 50;
  }
  const ev: string = rawEvent.slice(0, 64);
  const needle: string = '"event":"' + ev;
  const entries: string[] = [];
  let matched = 0;
  try {
    const text: string = readFileSync(ledgerPath, "utf8");
    // File iteration (`for line in f`): a trailing newline is NOT
    // a phantom line, but a real blank line mid-file IS iterated
    // (matched, then parse-skipped below).
    const lines: string[] = text.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "" && text.endsWith("\n")) {
      lines.pop();
    }
    for (const line of lines) {
      if (ev !== "" && !line.includes(needle)) continue;
      matched++;
      entries.push(line);
      if (entries.length > limit) entries.shift();
    }
  } catch {
    // Missing journal reads empty (OSError -> pass).
  }
  const out: unknown[] = [];
  for (const e of entries) {
    try {
      out.push(JSON.parse(e));
    } catch {
      continue;
    }
  }
  return { entries: out, shown: out.length, matched };
}
