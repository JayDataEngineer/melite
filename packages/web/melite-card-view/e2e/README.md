# Browser-plane wall (playwright) — the card studios in real Chromium

Born from the 2026-09-12 h3-timeline regression: a lane host booted
before a studio-bundle rebuild serves the generic form forever (the
browser's `window.__DSH_BOOT__` never carries the studio entry), and
no in-process wall can see it. This spec drives the real browser
plane — the only wall that catches it.

## The lane (infrastructure, never booted by the spec)

A throwaway profile keeps the seeded bench OFF the operator's shared
bench (the home storages are shared by every profile — the storage
json row is redirected to a scratch root):

```sh
cp -a ~/.dsh/profiles/melite-test ~/.dsh/profiles/e2e-studio
cat > ~/.dsh/profiles/e2e-studio/cordis.patch.yml <<'YAML'
- id: storage-json
  config:
    root: /tmp/e2e-studio-storages
YAML
MELITE_STATE_ROOT=/tmp/e2e-studio-runs dsh --profile e2e-studio \
  --host 127.0.0.1 --port 3907 --no-open &
```

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
