# Browser-plane wall (playwright) — the card studios in real Chromium

Born from the 2026-09-12 h3-timeline regression: a lane host booted
before a studio-bundle rebuild serves the generic form forever (the
browser's `window.__DSH_BOOT__` never carries the studio entry), and
no in-process wall can see it. This spec drives the real browser
plane — the only wall that catches it.

## The lane (infrastructure, never booted by the spec)

**The recipe lives in `scripts/e2e-studio-lane.sh`** (roadmap §9's
CI seat — ONE source of truth; this README documents the LAWS, the
script owns the commands). Boot, seed, run, teardown:

```sh
pnpm run test:e2e:studio
```

The script self-skips (exit 0) when it cannot own the lane: port
3907 busy, no dsh binary, no lane home to copy, or E2E_STUDIO_URL
already exported (a host is up; it reuses that). Teardown ALWAYS
runs (host process-group kill + throwaway home removal) — the port
is free after every run.

The LAWS the script encodes (why each step exists):

- **Depth-anchored throwaway home** at `data/runtime/e2e-studio-home`
  beside the real one — the profile's node_modules symlinks are
  RELATIVE to the repo layout, so the home must sit at the same
  depth for bundle resolution to hold. Fresh each run: the seeded
  bench stays OFF the operator's shared bench.
- **THE WORKSPACE PRE-STATE** (host state, seeded BEFORE boot): a
  host with no workspace serves only the "Choose a workspace to
  start" hero, the sessions tree stays empty, and the tour cannot
  open a conversation. One schema-valid row naming THIS repo;
  `createdAt`/`updatedAt` are ISO strings because the domain schema
  refuses anything else at boot.
- **`MELITE_STATE_ROOT` is not optional**: QueueService refuses to
  boot without a named runs root (the cwd-guess ban, stroke 45c),
  and a host booted without it silently serves NO runs plane —
  `runs/list` 404s and the tab's runs library dies with page errors
  the wall rejects. The scratch root keeps the lane's runs OFF the
  operator's tree too.
- **The bench seed** rides the host's own /api wire (cookie from
  the token redirect): `bench/ensure` + `bench/add-stage` card
  `h3-timeline`. The spec itself is read-only against the bench.
- **The studio bundle must be REBUILT before the run** (`npx
  tsdown` in `packages/video/h3-timeline`): a lane host booted
  against a stale `lib/client.js` serves the generic form — the
  2026-09-12 regression this wall was born from, and the 2026-09-21
  CI-seat repair caught it live within three runs.

- **THE COLD HOST IS NOT SERVED YET** (2026-10-11): the shell paints
  long before the estate composition leaves its activation gate, so a
  freshly booted lane answers EVERY seat door `503 estate/pending` for
  its first `ESTATE_PENDING_GRACE_MS` (120s, `doors.ts`). Three
  consequences, all owned by tour.ts's spine:
  - `dismissOnboarding` WAITS the first-run dialogs out and only
    returns once the composer is genuinely clickable — the API-key
    dialog's readiness join resolves *during* boot, so a fixed 3s
    dismissal raced it and ate the mint's composer click.
  - `waitForEstate` polls a never-authored bench key (a `404` IS the
    ready answer) until the gate lifts, so the mint types into a host
    whose doors actually serve; `readBenchRow` polls the receipt the
    same way. `playwright.config.ts`'s `timeout` covers that grace.
  - the boot-race frames are TRANSPORT, not page errors: the shared
    `collectPageErrors` drops exactly the `estate/pending` answer (by
    code) and the wall's own readiness probe, and `expectNoPageErrors`
    AWAITS the classification before asserting. Every other ≥400
    still fails the wall. **Every spec must use these two — a
    hand-rolled `page.on('response')` re-records the boot race and
    fails every cold-lane run** (this took the wall from 1/6 to 5/6
    in one pass, 2026-10-11).

(The first-run API-key onboarding dialog is CLIENT state — it
returns for every fresh browser context even on a configured host —
so the spec itself dismisses it via tour.ts's `dismissOnboarding`.)

- **THE SEAT BOOTS THE TRACKED SEED ONLY** (2026-10-12, the
  moss-404 lesson): the seed profile is the wall's one composition —
  a runtime lane whose patch watcher can mount→dispose→remount rows
  mid-run boards cards the estate then un-serves under it (form-spec
  404s land as page errors; the defs refresh blanks neighbor axes).
  A wall seat asserts STABLE serving: it boots the committed
  seed-only profile. Operator pins ride `settings.yaml` (copied
  separately), never the profile. (Single-setup law 2026-10-18: the
  runtime lane boots from `~/.dsh/profiles/melite-test` — the
  provisioner's render — and the seed ⊇ base wall pins this seed's
  roster to a superset of that base, so the wall can never green a
  composition weaker than the operator's lane.)

## The every-card wall (cards-catalog.spec.ts, 2026-10-12)

The operator's law — "you do Playwright, you test every last card,
multiple variations" — is two tests that read the LIVE catalog (never
a baked list) and drive EVERY card through the real lane UI:

- **EVERY CARD boards and opens its declared face**: reads
  `/v1/forms` + `/v1/model-catalog` (the same doors the GUI reads),
  mints a fresh conversation (the mint names the bench key), boards
  every card (the `mcp` card's seat refusal is PINNED by voice —
  never skipped), then drives each tile: the drill must open and
  render a declared face — the model axis, the studio preview seat,
  or the custom studio's own controls (motion renders sliders/seed
  with NO model axis; a `data-status` filter or a Model-select-only
  assert both miss real faces). A zero-error page ledger closes it.
- **EVERY MULTI-FAMILY CARD switches its family axis**: per card,
  the drilled form must offer every declared family on SOME select
  (usually the Model select; matrix/studio cards may seat families
  on a group axis), and each switch must refetch that family's own
  form-spec.

THE DOM LAWS the wall encodes (each probed, not guessed):

- **THE STABLE CATALOG READ**: a lane booted off a runtime profile
  arms hot doors whose patch watcher can mount→dispose→remount at
  boot — a mid-flap `/v1/forms` read boards a card that retracts
  under the sweep (the moss 404, CI seat 2026-10-12). The wall reads
  the catalog twice and refuses to drive until two reads NAME THE
  SAME cards and families; a catalog that never stabilizes fails
  loud with the flapping rows named. Never a silent trim.
- **THE DRILL'S CLOSE SEAT** is the zoom bar's ✕ Close button
  (`aria-label="Collapse card"`). A backdrop-corner click can land
  inside the scroll container (target ≠ currentTarget — no close),
  and a force-clicked covered tile is hit-test luck. A drill left
  up makes later tile clicks land on the overlay: the drill never
  retargets and every assertion reads the WRONG card's face.
- **TILES BY CARD ID, NOT POSITION**: stage tiles share `tileInner`
  with the +Add cell (filter `:not([aria-label="Add a card"])`),
  and `data-status` is absent on drafts. The tile's own text carries
  the card id — filter by it, or drive the bench's newest tile.
- **UNPROVISIONED MODEL FILES ARE NOT PAGE ERRORS**: a custom
  studio probes its family's provision doors on open (motion →
  `/v1/models/kimodo/provisions/*.npz`) and a lane without that
  model answers 502 — the DECLARED state. The ledger drops exactly
  the provisions-door 502 pattern; every other ≥400 stays loud.

## The law pins (cards-variations.spec.ts)

The operator's three named breaks held at the BROWSER plane: the
image-edit cap face (2511 admits exactly 3, 2.1 admits 16, read off
the form-spec the page itself fetched), the ONE lane-warn strip
(each required law voiced exactly once — the double-red cure), and
krea-2's variant envelopes served on the wire the browser reads
(turbo 4–8/1–2, raw 30–60/2–6, projection AND verbatim envelope),
plus the variant-axis reseed on every model switch (the stale
variant cure) and the model-switch refetch receipt.

## The open studio follows the agent (studio-agent-writes.spec.ts, 2026-11-12)

The operator's live report — "when the AI used one of these
specialized mods, IT WOULD NOT UPDATE THE TIMELINE VISUALS" — burned
at two seams this spec pins: the open zoom drill kept its
click-captured stage object (a streamed bench frame updated the
tiles, never the drill), and the drill's form layer seeds with every
held key at open, so a plain held-over-user merge pinned the
open-time snapshot (an agent's calls rewrite or a pre-existing mod
bag's arm/change/disarm never reached the studio; only freshly-added
keys flowed — the masking that hid the bug for a day). No mint
needed: the spec seeds its own stage through `bench/add-stage`, then
drives `bench/patch` exactly as the agent does — arm extend at 379f
(two solver windows), change the bag in place, disarm with null,
rewrite `calls` to four splits (four `[data-prompt-clip]` clips),
arm replace — five arms on ONE open zoom, because a reload or reopen
between steps would pass while the bug stood. The stage carries its
own durable fingerprint (a seed key + marker texts), and cleanup
removes every stage the wall ever left, so a failed run never
poisons the next ride. Registry row
`cards-open-studio-follows-agent`; the unit tier pins the params
seam's pure helper (`tests/stage-drill-live-params.spec.ts`).

## THE AI OPT-IN (the mint is a real model turn)

`tour.ts`'s `openAConversation` — the mint every browser-plane spec
rides — types a composer message and sends it: that is
`/api/session/prompt` to the lane's REAL model. One model turn per
mint, tokens burned, a keyed live lane required. These specs are
ACTUAL-AI-CALL tests, opt-in only (operator order 2026-10-17):

- Every minting spec self-skips unless `MELITE_E2E_AI=1` is set.
- The mint spine itself refuses loud (never silently) if a caller
  reaches it without the opt-in.
- Default runs (`pnpm run test:web:browser`, the seeded-bench specs
  like `chip-contrast`) stay free of mints — they never open a
  conversation. Note the seeded-bench claim above predates the mint
  specs: seeding-by-script holds for the read-only specs; the minting
  specs create their own conversations, which is exactly the AI call.

```sh
MELITE_E2E_AI=1 E2E_STUDIO_URL='…' pnpm --filter @melite-plugin/dsh-card-view exec playwright test
```

## Run

```sh
pnpm run test:e2e:studio            # boots, seeds, runs, tears down
# or against a standing host:
E2E_STUDIO_URL='http://127.0.0.1:3907/?token=<TOKEN>' \
  pnpm --filter @melite-plugin/dsh-card-view exec playwright test
```

Self-skips without `E2E_STUDIO_URL` (the repo's keyless-gate law);
minting specs additionally self-skip without `MELITE_E2E_AI=1` (see
THE AI OPT-IN above).
The spec is read-only against the bench — the stage is seeded once
by the script, never by the spec itself.
