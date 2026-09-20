# Browser-plane wall (playwright) — the card studios in real Chromium

Born from the 2026-09-12 h3-timeline regression: a lane host booted
before a studio-bundle rebuild serves the generic form forever (the
browser's `window.__DSH_BOOT__` never carries the studio entry), and
no in-process wall can see it. This spec drives the real browser
plane — the only wall that catches it.

## The lane (infrastructure, never booted by the spec)

A throwaway harness home keeps the seeded bench OFF the operator's
shared bench. The profile's node_modules symlinks are RELATIVE and
depth-anchored to the repo layout, so the throwaway home must sit at
`data/runtime/` beside the real one for bundle resolution to hold:

```sh
mkdir -p data/runtime/e2e-studio-home/profiles
cp -a data/runtime/dsh-harness-home/profiles/melite-test \
      data/runtime/e2e-studio-home/profiles/e2e-studio
cp data/runtime/dsh-harness-home/settings.yaml data/runtime/e2e-studio-home/
```

THE WORKSPACE PRE-STATE (host state, seeded BEFORE boot — a host with
no workspace serves only the "Choose a workspace to start" hero, the
sessions tree stays empty, and the tour cannot open a conversation).
One schema-valid row naming THIS repo; `createdAt`/`updatedAt` are ISO
strings because the host's domain schema refuses anything else at boot:

```sh
mkdir -p data/runtime/e2e-studio-home/storages
python3 - <<'PY'
import json, uuid
row = str(uuid.uuid4()); ts = "2026-09-21T00:00:00.000Z"
json.dump({
  "unit": {"name": "workspace", "version": 2},
  "global": {"initialized": True, "workspaceIds": [row], "archivedSessionIds": []},
  "tables": {"workspaces": {row: {
    "path": "/home/user/Documents/programs/active/inference.cpp",
    "title": "inference.cpp", "sessionIds": [],
    "createdAt": ts, "updatedAt": ts}}},
}, open("data/runtime/e2e-studio-home/storages/workspace.json", "w"))
PY

DSH_HOME=data/runtime/e2e-studio-home MELITE_STATE_ROOT=/tmp/e2e-studio-runs \
  dsh --profile e2e-studio --host 127.0.0.1 --port 3907 --no-open &
```

`MELITE_STATE_ROOT` is not optional: QueueService refuses to boot
without a named runs root (the cwd-guess ban, stroke 45c), and a host
booted without it silently serves NO runs plane — `runs/list` 404s
and the tab's runs library dies with page errors the wall rejects.
Scratch root `/tmp/e2e-studio-runs` keeps the lane's runs OFF the
operator's tree too.

(The first-run API-key onboarding dialog is CLIENT state — it returns
for every fresh browser context even on a configured host — so the
spec itself dismisses it via tour.ts's `dismissOnboarding`.)

Seed the bench over the host's own /api wire (cookie from the token
redirect):

```sh
curl -sL -c /tmp/e2e-cookies.txt \
  'http://127.0.0.1:3907/?token=<TOKEN>' -o /dev/null
curl -s -b /tmp/e2e-cookies.txt -X POST http://127.0.0.1:3907/api/bench/ensure \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/ensure","payload":{"args":{"doc":{"session":"main"}}}}'
curl -s -b /tmp/e2e-cookies.txt -X POST http://127.0.0.1:3907/api/bench/add-stage \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/add-stage","payload":{"args":{"sessionKey":"main","doc":{"card":"h3-timeline","author":"user","expect_rev":0}}}}'
```

## Run

```sh
E2E_STUDIO_URL='http://127.0.0.1:3907/?token=<TOKEN>' \
  pnpm --filter @melite-plugin/dsh-card-view exec playwright test
```

Self-skips without `E2E_STUDIO_URL` (the repo's keyless-gate law).
The spec is read-only against the bench — the stage is seeded once
above, never by the spec itself.
