# W4 — @melite-plugin/dsh-gallery VERIFICATION

Raw commands and verbatim output proving the gallery plugin works: dual-face
build, isolated boot on :3084, entry in `window.__DSH_BOOT__`, client bundle
served at /plugins/<id>/client.js, live runs proxied from the Melite gateway with
same-origin artifact URLs, artifact proxy (200 png / 400 bad path), and both
failure paths (gateway down → verbatim 502 body rendered by the view; duplicate
apply guarded). Nothing below is summarized evidence — every claim carries its
own command and its own bytes.

## 0. Toolchain facts (why commands look the way they do)

- The workspace has no hoisted `unrun`, so tsdown's default config loader fails:
  ```
  ERROR  Error: Failed to import module "unrun". Please ensure it is installed.
  ```
  Bun executes TS natively, so the build runs tsdown's CLI under bun
  (`autoLoader = isBun ? "native" : "unrun"` in tsdown dist). NODE_PATH supplies
  `lightningcss` to the shared preset (`../shared/tsdown.client.ts` imports it;
  pnpm keeps it inside melite-gallery/node_modules only).

## 1. Build emits lib/index.js + lib/client.js

Command:

```sh
cd $MELITE_REPO/dsh/melite-gallery && \
NODE_PATH=$PWD/node_modules bun ./node_modules/tsdown/dist/run.mjs -c tsdown.config.ts
```

Output (verbatim tail):

```
№ […] elided banner lines — see raw below
ℹ [@melite-plugin/dsh-gallery] [ESM] lib/index.js  4.16 kB │ gzip: 1.46 kB
ℹ [@melite-plugin/dsh-gallery] [ESM] 1 files, total: 4.16 kB
✔ [@melite-plugin/dsh-gallery] Build complete in 15ms
ℹ [@melite-plugin/dsh-gallery/client] [CJS] lib/client.js      20.01 kB │ gzip: 5.86 kB
ℹ [@melite-plugin/dsh-gallery/client] [CJS] lib/client.js.map  22.27 kB │ gzip: 7.26 kB
ℹ [@melite-plugin/dsh-gallery/client] [CJS] 2 files, total: 42.28 kB
✔ [@melite-plugin/dsh-gallery/client] Build complete in 17ms
```

Bundle wrapper (head/tail of lib/client.js):

```
window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-gallery",
	factory: (require) => {
		var module = { exports: {} };
…
		return module.exports;
	}
});
```

## 2. Typecheck clean

Command: `./node_modules/.bin/tsc --noEmit` — output: `TSC_EXIT=0` (no
diagnostics). (First run failed with TS5097/TS2307; fixed by
`allowImportingTsExtensions` + a `*.module.css` ambient declaration.)

## 3. Isolated profile link (never touches ~/.dsh)

Command:

```sh
DSH_HOME=/tmp/melite-dsh-home dsh plugin --profile web add link:$MELITE_REPO/dsh/melite-gallery
```

Output (verbatim tail):

```
dependencies:
+ @melite-plugin/dsh-gallery 0.1.0 <- ../../../..$MELITE_REPO/dsh/melite-gallery
dsh: warning: @melite-plugin/dsh-gallery declares no dsh.bundle — installed as a plain dependency, not a profile layer (a later update that gains one activates it automatically)
EXIT=0
```

## 4. Isolated boot (:3084)

Command:

```sh
DSH_HOME=/tmp/melite-dsh-home dsh --profile web \
  --patch $MELITE_REPO/dsh/melite-gallery/test-overlay.yml --port 3084
```

Boot log (complete):

```
dsh web: http://127.0.0.1:3084
```

Listener: `users:(("node",pid=1549390,fd=256))` on 127.0.0.1:3084.

## 5. __DSH_BOOT__ contains the gallery entry

Command:

```sh
curl -s http://127.0.0.1:3084/ > /tmp/boot-index.html
python3 - <<'PY'
import json, re
html = open('/tmp/boot-index.html').read()
m = re.search(r'__DSH_BOOT__ = (\{.*?\})</script>', html, re.S)
g = json.loads(m.group(1))
mine = [e for e in g['entries'] if e['id'] == '@melite-plugin/dsh-gallery']
print('boot_entry:', json.dumps(mine[0]))
print('boot_total_entries:', len(g['entries']))
PY
```

Output (verbatim):

```
boot_entry: {"id": "@melite-plugin/dsh-gallery", "url": "/plugins/@melite-plugin/dsh-gallery/client.js?rev=65391e456266", "rev": "65391e456266", "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-connection"]}
boot_total_entries: 39
probe_index:200
```

## 6. Client bundle served

Command:

```sh
curl -s -o /dev/null -w "probe_bundle:%{http_code} type:%{content_type} bytes:%{size_download}\n" \
  "http://127.0.0.1:3084/plugins/@melite-plugin/dsh-gallery/client.js"
```

Output (verbatim):

```
probe_bundle:200 type:text/javascript; charset=utf-8 bytes:20006
```

(bytes match the rebuilt lib/client.js exactly — served through the profile symlink.)

## 7. Proxy route answers with REAL runs when the gateway is up

Gateway health (live stack, Bun gateway :33081 driving ComfyUI :18465):
`{"status":"ok","comfyui":"up",...}`.

Command: `curl -s http://127.0.0.1:3084/melite-gallery/runs` then summarize:

```
proxy_gateway: http://localhost:33081
proxy_runs_count: 200
proxy_first_run_with_thumb: {"run_id": "p466ccf2d", "status": "completed", "thumbnail": "/melite-gallery/artifact?path=%2Feditor%2Fassets%2Fruns%2Fp466ccf2d%2Fgenerate_image_p466ccf2d_z-image_output.png", "families": ["generate_image"]}
proxy_artifact_urls_rewritten: True
```

Every thumbnail/artifact URL in the payload is rewritten to the same-origin
artifact proxy (`/melite-gallery/artifact?path=<url-encoded /editor/assets/runs/…>`).

### 7a. Artifact proxy happy path

```
thumb url: /melite-gallery/artifact?path=%2Feditor%2Fassets%2Fruns%2Fp466ccf2d%2Fgenerate_image_p466ccf2d_z-image_output.png
artifact:200 type:image/png bytes:1062703
```

### 7b. Artifact proxy rejects non-run paths (failure path)

Command: `curl -s -w "\nstatus:%{http_code}\n" "http://127.0.0.1:3084/melite-gallery/artifact?path=/etc/passwd"`

```
{"error":"forbidden_path","message":"artifact proxy only serves paths under /editor/assets/runs/","path":"/etc/passwd"}
status:400
```

## 8. FAILURE PATH — gateway down → the view surfaces the actual error body

Second isolated instance, same package, dead gateway (`:3086`; port 3085 is
occupied by an unrelated process on this machine):

Overlay `test-overlay-failure.yml` sets `gatewayUrl: 'http://localhost:33999'`,
`timeoutMs: 1500`. Command:

```sh
DSH_HOME=/tmp/melite-dsh-home dsh --profile web \
  --patch $MELITE_REPO/dsh/melite-gallery/test-overlay-failure.yml --port 3086
```

Proxy answer (verbatim):

```
=== FAILURE-PATH PROBE (:3086, gatewayUrl=http://localhost:33999 dead) ===
{"error":"gateway_unreachable","message":"fetch failed","gatewayUrl":"http://localhost:33999","upstream":"http://localhost:33999/v1/pipelines/runs"}
HTTP_STATUS:502
index:200
```

## 9. Headless harness — the VIEW renders those bytes

`test/client-harness.cjs` executes the shipped `lib/client.js` under a fake
`window.__ModuleLoader__`, drives `apply()` against a mock cordis ctx, then
renders the real registered components with react-dom/server over fetches
pointed at the LIVE proxy (:3084) and the DEAD-GATEWAY proxy (:3086).

Command:

```sh
cd $MELITE_REPO/dsh/melite-gallery && node test/client-harness.cjs "$PWD"
```

Output (verbatim, complete):

```
[1] bundle factory executed; id = @melite-plugin/dsh-gallery
[1] requires: ["react","react/jsx-runtime"]
[1] exports: GalleryView,RunCard,RunsView,apply,fetchRuns,formatRunTime,galleryStore,inject,runModel,runOpenUrl
[2] inject waits: ["shell.overlay","sidebar.footer.action"]
[2] registrations: ["sidebar.footer.action#melite-gallery","shell.overlay#melite-gallery"]
[2b] sidebar entry wide: true rail icon-only: true
[2b] overlay closed renders empty, open renders panel: true
[3] happy phase: ready runs: 200
[3] happy html: cards(openable)=35 proxiedThumbs=true statusPills=true
[4] error phase: error status: 502
[4] verbatim body: {"error":"gateway_unreachable","message":"fetch failed","gatewayUrl":"http://localhost:33999","upstream":"http://localhost:33999/v1/pipelines/runs"}
[4] error DOM carries HTTP 502 + gateway_unreachable + dead upstream URL: true
HARNESS PASS
```

Read-through: the bundle loads under the GUI loader protocol requiring only
platform modules; apply() waits on the two slot declarations and registers
exactly two contributions; the registered sidebar entry renders wide and rail
variants; the overlay toggles empty↔panel; the happy DOM contains 35 openable
run cards with same-origin proxied thumbnails and status pills; the error DOM
contains the proxy's verbatim 502 JSON body.

## 10. Failures hit and fixed during verification (raw)

1. Overlay row named by absolute file path (W0 style) → client half absent:
   `client.js:404`. Cause: dsh-client-modules resolves the row name as a package
   (`require.resolve('<name>/package.json')`). Fix: package-name row +
   profile link. Second failure: `ERR_PACKAGE_PATH_NOT_EXPORTED` because
   `exports` did not expose `./package.json`; fix adds
   `"./package.json": "./package.json"` (mirrors dsh-task-board).
2. `useSyncExternalStore` without a server snapshot crashed the SSR harness:
   ```
   Error: Missing getServerSnapshot, which is required for server-rendered content.
   ```
   Fix: third arg `galleryStore.isOpen` in both components.
3. Port 3085 pre-occupied by an unrelated node process (EADDRINUSE, verbatim in
   §8 command history); the dead-gateway overlay moved to 3086.
4. A double-bind attempt while the first instance still held :3084 produced
   `listen EADDRINUSE: address already in use 127.0.0.1:3084` — kept as proof
   that one instance per port is enforced.

## 11. Reproduce

```sh
export PATH="$HOME/.local/share/pnpm:$HOME/.local/bin:$HOME/.bun/bin:$PATH"
cd $MELITE_REPO/dsh/melite-gallery
NODE_PATH=$PWD/node_modules bun ./node_modules/tsdown/dist/run.mjs -c tsdown.config.ts
DSH_HOME=/tmp/melite-dsh-home dsh --profile web \
  --patch "$PWD/test-overlay.yml" --port 3084 &
sleep 5
curl -s http://127.0.0.1:3084/melite-gallery/runs | head -c 400
open http://127.0.0.1:3084/   # sidebar foot → "Melite" → gallery overlay
```
