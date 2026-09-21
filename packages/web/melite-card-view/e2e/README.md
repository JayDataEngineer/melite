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

(The first-run API-key onboarding dialog is CLIENT state — it
returns for every fresh browser context even on a configured host —
so the spec itself dismisses it via tour.ts's `dismissOnboarding`.)

## Run

```sh
pnpm run test:e2e:studio            # boots, seeds, runs, tears down
# or against a standing host:
E2E_STUDIO_URL='http://127.0.0.1:3907/?token=<TOKEN>' \
  pnpm --filter @melite-plugin/dsh-card-view exec playwright test
```

Self-skips without `E2E_STUDIO_URL` (the repo's keyless-gate law).
The spec is read-only against the bench — the stage is seeded once
by the script, never by the spec itself.
