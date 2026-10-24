// bench-tour-mint.spec.ts — THE BENCH TOUR MINT WALL (operator
// commission 2026-10-24: "e2e wall: bench tour mint"). The tour spine
// (packages/web/melite-card-view/e2e/tour.ts) mints a conversation for
// every browser wall; this suite pins the mint hop's OWN laws against
// the spine's real bytes, keylessly (the CI seat). The LIVE half — the
// lane ride that proves the same laws against the real estate — is
// e2e/mint.spec.ts, judged here by its vacuity arm so the live judge
// cannot go orphaned silently.
//
// The laws (each its own firing arm — one arm per invariant, never a
// conjunction that masks a dead gate):
//   R — THE READINESS GATE PRECEDES THE MINT: settle() waits the
//       estate's boot-race pending gate out (the never-authored probe
//       key; a 404 IS the ready answer) before any mint types.
//   K — THE KEY IS A RECEIPT FROM THE REQUEST FRAME: the session/
//       prompt listener attaches BEFORE Enter, filters the mint's own
//       frame, reads payload.args.request.sessionId, keeps the first
//       frame, polls the receipt bounded, and detaches.
//   T — THE ANSWER GATE IS THE WHOLE COMPLETION LAW: the gate arms
//       before Enter, is awaited after it, and is bounded (existence,
//       never value — the drive-8 lesson). The bound is judged on the
//       GATE'S OWN SPAN (arm → answered), never the mint body: the
//       body carries lawful bounds of its own (the composer click,
//       the seat wait) and a body-wide match stayed green through the
//       2026-10-24 drive burn that deleted the gate's own bound. The
//       send verb's re-enable is
//       REFUSED as a completion signal: the verb stays disabled on an
//       empty composer, so a poll there can never fire — a dead wait
//       burning the mint's budget while the commission-brain keeps
//       mutating the bench (2026-10-24, adjudicated live after the
//       drive-7/8 reds; the answered gate is the whole law).
//   W — THE BENCH WIRE IS BOUNDED: callBench's in-page fetch carries
//       an abort timeout — the estate's bench doors can queue behind
//       the conversation's in-flight model turn, and an unbounded
//       fetch hung the whole 420s test budget (2026-10-24, the
//       drive-8 authoring red). Existence, never value.
//   B — THE BIRTH RIDES THE ENSURE DOOR ONLY: seedBenchH3 reads
//       bench/get first, ensures ONLY on the not-found refusal,
//       re-reads, and adds the h3 stage idempotently under the live
//       CAS rev — never a blind ensure, never a disk write.
//   O — THE ORDER LAW: the tab's landing view reads the bench once at
//       open, so the minted key seeds BEFORE the tab opens and the
//       fallback arm seeds AFTER, on the captured tab frame.
//   V — THE LIVE HALF EXISTS: e2e/mint.spec.ts imports the spine,
//       rides the same two bench doors, judges the floor's grammar
//       import, and self-skips without the AI opt-in (the opt-in law's
//       own census covers the skip line; this arm pins the wall's live
//       half cannot vanish with all suites green).
//
// Run: npx vitest run tests/walls/ts/suites/bench-tour-mint.spec.ts
// (or the whole gate: pnpm run test)

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import assert from "node:assert/strict";

const E2E_DIR = path.resolve(
  import.meta.dirname,
  "../../../../packages/web/melite-card-view/e2e",
);

const tourSource = readFileSync(path.join(E2E_DIR, "tour.ts"), "utf8");

/** Body of the first top-level `function`/`const` whose declaration
 * line matches `name`, from the declaration line through the matching
 * closing brace ('' when absent). The declaration match starts AFTER
 * the preceding JSDoc, so the body never carries another law's prose. */
function extractBody(source: string, name: string): string {
  const re = new RegExp(`(?:export )?(?:async )?(?:function|const) ${name}\\b`);
  const start = source.search(re);
  if (start < 0) return "";
  let depth = 0;
  let bodyOpen = -1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") {
      if (depth === 0) bodyOpen = i;
      depth++;
    } else if (source[i] === "}") {
      depth--;
    }
  }
  if (bodyOpen < 0) return "";
  depth = 0;
  for (let i = bodyOpen; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  return "";
}

describe("THE BENCH TOUR MINT — the mint hop's laws hold on the real spine", () => {
  it("R — the readiness gate precedes the mint: settle waits the boot-race pending gate out", () => {
    const settle = extractBody(tourSource, "settle");
    assert.notEqual(settle, "", "settle not found in tour.ts");
    assert.match(
      settle,
      /await waitForEstate\(page\)/,
      "settle must call the readiness gate — a mint typed before the gate lifts reads the boot race and calls it a contract failure",
    );
    const gate = extractBody(tourSource, "waitForEstate");
    assert.notEqual(gate, "", "waitForEstate not found in tour.ts");
    assert.match(
      gate,
      /pollPastPending\(page, '\/v1\/bench\/' \+ READY_PROBE_KEY/,
      "the gate polls a NEVER-AUTHORED key — a probe on a real conversation's bench would read (or birth) host state",
    );
    assert.match(
      gate,
      /not\.toContain\('estate\/pending'\)/,
      "the gate asserts the pending answer is GONE — the boot race must be waited out, never asserted against",
    );
    assert.match(
      tourSource,
      /export const READY_PROBE_KEY = '__e2e_wall_ready__'/,
      "the probe key must stay the never-authored literal the gate reads",
    );
  });

  it("K — the mint's key is a receipt from the request frame: attached before Enter, first frame wins, bounded poll, detached", () => {
    const mint = extractBody(tourSource, "openAConversation");
    assert.notEqual(mint, "", "openAConversation not found in tour.ts");
    const attach = mint.indexOf("page.on('request', onPrompt)");
    const enter = mint.indexOf("keyboard.press('Enter')");
    assert.notEqual(attach, -1, "the spine never attaches the request listener — the mint cannot name its key");
    assert.notEqual(enter, -1, "the spine never presses Enter — no mint happens at all");
    assert.ok(
      attach < enter,
      "the request listener must attach BEFORE Enter — a later attach misses the send's own frame and the key falls to a guess",
    );
    assert.match(mint, /\/api\/session\/prompt/, "the listener must filter the mint's own frame (/api/session/prompt)");
    assert.match(
      mint,
      /payload\?\.args\?\.request\?\.sessionId/,
      "the key reads the frame's args.request.sessionId — the shell stages the id client-side, so this is the only receipt",
    );
    assert.match(mint, /mintedKey === ''/, "first frame wins — a later frame (a follow-up send) must never re-key the mint");
    assert.match(
      mint,
      /for \(let i = 0; i < 40 && mintedKey === ''/,
      "the key is POLLED, not hoped for — a flat wait can outrun a slow send and hand back an empty key",
    );
    assert.match(mint, /page\.off\('request', onPrompt\)/, "the listener detaches — the spine leaks no frame collector into the caller");
  });

  it("T — the answer gate is the whole completion law: armed before Enter, awaited, bounded — never a send-verb poll", () => {
    const mint = extractBody(tourSource, "openAConversation");
    assert.notEqual(mint, "", "openAConversation not found in tour.ts");
    const armed = mint.indexOf("page.waitForResponse(");
    const enter = mint.indexOf("keyboard.press('Enter')");
    const answered = mint.indexOf("await answered");
    assert.notEqual(armed, -1, "the spine never arms the answer gate — a mint that races the reply fails downstream on re-layout, never at its own cause");
    assert.notEqual(enter, -1, "the spine never presses Enter — no mint happens at all");
    assert.notEqual(answered, -1, "the answer gate is never awaited");
    assert.ok(
      armed < enter && enter < answered,
      "the answer gate must arm BEFORE Enter and be awaited AFTER it — a later arm misses the mint's own response frame, and proceeding before the await races the turn's rerenders",
    );
    assert.match(
      mint.slice(armed, answered),
      /timeout: \d[\d_]*\b/,
      "the answer gate is bounded — a dead brain must still fail at the mint's named cause (the bound's EXISTENCE is the law, its value is the drive's own tunable). The clause judges the GATE'S OWN span (arm → answered), never the mint body: the body carries lawful bounds of its own (the composer click, the seat wait), and a body-wide match stayed green through the 2026-10-24 drive burn that deleted the gate's bound — dropping waitForResponse to Playwright's 30s default while a keyed lane answers in 10–40s, so the timeout swallows a lawful reply and the mint proceeds mid-turn",
    );
    assert.ok(
      !mint.includes("name: 'Send message'"),
      "the spine polls the send verb's re-enable for completion — the verb stays disabled on an empty composer, so the poll can never fire: a dead wait burning the mint's budget while the commission-brain keeps mutating the bench (2026-10-24, adjudicated live after the drive-7/8 reds)",
    );
    assert.ok(
      !mint.includes("isDisabled()"),
      "the spine reads completion off the send verb's disabled state — the same dead signal in its other spelling; the answered gate is the whole law",
    );
  });

  it("W — the mint's bench wire is bounded: callBench's fetch carries an abort timeout", () => {
    const wire = extractBody(tourSource, "callBench");
    assert.notEqual(wire, "", "callBench not found in tour.ts");
    assert.match(
      wire,
      /fetch\('\/api\/' \+ method/,
      "the bench wire is not the in-page typed client-request fetch — a different client judges a different lane",
    );
    assert.match(
      wire,
      /signal: AbortSignal\.timeout\(\d[\d_]*\)/,
      "the bench fetch is UNBOUNDED — the estate's bench doors can queue behind the conversation's in-flight model turn, and an unbounded fetch hung the whole 420s test budget (the 2026-10-24 drive-8 authoring red); a hang must refuse at its own named cause",
    );
  });

  it("B — the birth rides the ensure door only: get first, ensure only on the refusal, idempotent add under the live rev", () => {
    const seed = extractBody(tourSource, "seedBenchH3");
    assert.notEqual(seed, "", "seedBenchH3 not found in tour.ts");
    const firstGet = seed.indexOf("'bench/get'");
    const catchIdx = seed.indexOf("catch {");
    assert.notEqual(firstGet, -1, "the seed never reads the bench — it cannot know whether the birth is owed");
    assert.notEqual(catchIdx, -1, "the refusal arm is missing — the ensure must ride the not-found catch");
    assert.ok(firstGet < catchIdx, "bench/get precedes the catch — the read is the seed's first step, not a post-birth formality");
    const tryHalf = seed.slice(0, catchIdx);
    assert.ok(
      !tryHalf.includes("'bench/ensure'"),
      "the ensure fired OUTSIDE the refusal arm — a blind ensure pre-births benches the door's birth law owes to the first write",
    );
    const catchHalf = seed.slice(catchIdx);
    assert.match(catchHalf, /'bench\/ensure'/, "the catch never ensures — a refusal that births nothing strands the fresh conversation");
    assert.match(catchHalf, /'bench\/get'/, "the catch re-reads after the birth — the ensure's row must be confirmed, never assumed");
    assert.match(
      seed,
      /stages\.some\(\(s\) => typeof s === 'object' && s !== null && 'card' in s/,
      "the add is gated on the aboard-census — a re-seed must stay idempotent, never a sibling stage per run",
    );
    assert.match(seed, /expect_rev: rev/, "the add carries the CAS rev read from the live doc — a stale rev refuses loud instead of clobbering");
    assert.ok(
      !/writeFileSync|appendFileSync/.test(seed),
      "the seed writes through the estate's own doors only — never a disk write",
    );
  });

  it("O — the order law: the minted key seeds before the tab opens, the fallback arm seeds after the captured frame", () => {
    const open = extractBody(tourSource, "openCardsWithBench");
    assert.notEqual(open, "", "openCardsWithBench not found in tour.ts");
    const seedMinted = open.indexOf("await seedBenchH3(page, mintedKey)");
    const expand = open.indexOf("[data-sidebar-right-expand]");
    const tab = open.indexOf("/Melite Bench/");
    const fallback = open.indexOf("await seedBenchH3(page, sessionKey)");
    assert.notEqual(seedMinted, -1, "the minted key never seeds");
    assert.notEqual(expand, -1, "the sidebar expand seat is missing");
    assert.notEqual(tab, -1, "the guide tab click is missing");
    assert.notEqual(fallback, -1, "the fallback arm (seeding after the tab's own frame) is missing");
    assert.ok(
      seedMinted < expand && seedMinted < tab,
      "the minted key must seed BEFORE the sidebar/tab open — the tab's landing view reads the bench once at open, and a post-open seed can miss the render",
    );
    assert.ok(
      fallback > tab,
      "the fallback arm trails the tab open — it exists for hosts where a conversation was already open and the mint carried no key",
    );
    assert.match(
      open,
      /if \(sessionKey !== '' && mintedKey === ''\) await seedBenchH3\(page, sessionKey\)/,
      "the fallback seeds only when the mint carried no key — a double-seed over the minted key would race the tab's own watch",
    );
  });

  it("V — the wall's live half exists: e2e/mint.spec.ts rides the spine and the same two bench doors", () => {
    const livePath = path.join(E2E_DIR, "mint.spec.ts");
    assert.ok(existsSync(livePath), "e2e/mint.spec.ts is gone — the mint wall's live judge went orphaned and this suite stayed green");
    const live = readFileSync(livePath, "utf8");
    assert.match(live, /openAConversation/, "the live half must mint through the spine — a hand-rolled mint judges nothing the tour rides");
    assert.match(live, /'bench\/get'/, "the live half never reads the bench — the birth law is unprovable without the get");
    assert.match(live, /'bench\/ensure'/, "the live half never ensures — the birth law is unprovable without the ensure");
    assert.match(
      live,
      /SESSION_RE/,
      "the live half must judge the FLOOR's grammar (@melite/contracts/benchStage SESSION_RE) — a hand-copied regex passes while the floor drifts",
    );
    assert.match(live, /MELITE_E2E_AI/, "the live half carries no opt-in skip (the AI opt-in census would also red — this is its own named arm)");
  });
});
