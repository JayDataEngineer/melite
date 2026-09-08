# W3 VERIFICATION — @melite-plugin/dsh-card-view

> NOTE (2026-09-03): the `/melite-tools/catalog` route referenced below
> was a ray-era fossil with zero callers and is retired; that verification
> step is historical. The tool surface itself is alive (bundle row
> `infer-tools`) and proven by the SDK smoke turns.

Raw commands + verbatim outputs for every claim. All boots are isolated
(`DSH_HOME=/tmp/melite-dsh-home`); the live GUI (:3080) was never touched.

## 0. What was completed this pass

The previous agent left the host half (`src/index.ts`, `src/invariant.ts`,
`tsconfig.json`, `tsdown.config.ts`). This pass added:

- `src/client/index.ts` — client plugin entry: `inject = ['slots']`, globalThis
  apply guard, one keyed registration into the `tool.call.toolview` seat
  (slot name + shape taken from the INSTALLED CLI bundle,
  `dsh-client-ui-tool/lib/client.js`: `ctx.slots.inject("tool.call.toolview",
  () => ctx.slots.register({ name: "tool.call.toolview", key: <tool name> },
  Row))`, keyed to `flow_start`).
- `src/client/FlowStartCard.tsx` — the card: parses the frozen tool block
  (argsRaw → model/prompt; settled content → run_id), polls
  `/melite-proxy/v1/flows/status/{run_id}` every 2.5 s until a terminal run
  status (server-js `TERMINAL_RUN_STATUSES`), renders status line, step
  progress, and artifact links rewritten same-origin through the host proxy.
- `src/client/apply-guard.ts` — globalThis claim (task-board pattern).
- `src/client/types.ts`, `src/client/card.module.css`, `src/client/css-modules.d.ts`.
- `package.json` fixes (see §5), `test-overlay.yml` (§2), stretch overlay
  `test-overlay-chat.yml` (§6).

## 1. Build — lib/index.js + lib/invariant.js + lib/client.js emit

Command (workspace root, per the toolchain rule):

    cd $MELITE_REPO/dsh && pnpm --filter @melite-plugin/dsh-card-view run build

Verbatim output (tail):

    ℹ [@melite-plugin/dsh-card-view] [ESM] lib/index.js      2.15 kB │ gzip: 1.05 kB
    ℹ [@melite-plugin/dsh-card-view] [ESM] lib/invariant.js  0.24 kB │ gzip: 0.19 kB
    ℹ [@melite-plugin/dsh-card-view] [ESM] 2 files, total: 2.40 kB
    ✔ [@melite-plugin/dsh-card-view] Build complete in 14ms
    ℹ [@melite-plugin/dsh-card-view/client] [CJS] lib/client.js      12.13 kB │ gzip: 4.21 kB
    ℹ [@melite-plugin/dsh-card-view/client] [CJS] lib/client.js.map  16.49 kB │ gzip: 5.99 kB

Typecheck (own sources clean):

    $ cd melite-card-view && pnpm exec tsc --noEmit   # exit 0, no output

### Build-runner deviation (documented, not silent)

The prescribed `pnpm exec tsdown -c tsdown.config.ts` FAILS on this machine:

    ERROR  Error: Failed to import module "unrun". Please ensure it is installed.

Root cause: node v22.15.0 has no native ESM TS-strip support, tsdown 0.22.14's
auto config loader therefore wants the OPTIONAL peer `unrun` (lockfile:
`peerDependenciesMeta.unrun.optional: true`), which is not installed.
`--config-loader native` also fails (`ERR_UNKNOWN_FILE_EXTENSION ".ts"`).
Fix: run the same tsdown CLI under bun 1.3.14 (`isBun → "native"` loader; bun
executes the TS config natively). `package.json` build script is now
`bun node_modules/tsdown/dist/run.mjs -c tsdown.config.ts`. tsdown.config.ts
itself needed NO change — `'../shared/tsdown.client.ts'` is the correct depth
for this package (melite-gallery uses `../../` because it sits one level deeper).

## 2. Isolated boot on :3083 + bundle + boot graph

    $ DSH_HOME=/tmp/melite-dsh-home dsh --profile web \
        --patch $MELITE_REPO/dsh/melite-card-view/test-overlay.yml --port 3083

    dsh web: http://127.0.0.1:3083

One-time profile link (makes the package-name client row resolvable):

    $ DSH_HOME=/tmp/melite-dsh-home dsh plugin --profile web add link:$MELITE_REPO/dsh/melite-card-view
    dsh: warning: @melite-plugin/dsh-card-view declares no dsh.bundle — installed as a plain dependency, not a profile layer (...)
    $ ls -la /tmp/melite-dsh-home/profiles/web/node_modules/@melite-plugin/
    lrwxrwxrwx ... dsh-card-view -> ../../../../../..$MELITE_REPO/dsh/melite-card-view

### 2a. __DSH_BOOT__ contains our entry — PASS

    $ curl -s http://127.0.0.1:3083/health | grep -o '"id":"@melite-plugin/dsh-card-view"[^}]*}'
    {"id":"@melite-plugin/dsh-card-view","url":"/packages/@melite-plugin/dsh-card-view/client.js?rev=6106d12b1ecb","rev":"6106d12b1ecb","inject":["@deepseek-ai/dsh-client-runtime","@deepseek-ai/dsh-client-connection"]}

### 2b. Bundle served, first bytes are the loader factory — PASS

    $ curl -s -o /tmp/cv-client.js -w "HTTP %{http_code} bytes=%{size_download}\n" \
        http://127.0.0.1:3083/packages/@melite-plugin/dsh-card-view/client.js
    HTTP 200 bytes=12133
    $ head -c 100 /tmp/cv-client.js
    window.__ModuleLoader__.load({
    	id: "@melite-plugin/dsh-card-view",
    	factory: (require) => {
    		var modu

## 3. Host proxy route — happy path + FAILURE path

### 3a. Real run id (picked from the live gateway) — PASS (verbatim pass-through)

    $ curl -s localhost:33081/v1/flows/runs | python3 -c "import json,sys;print(json.load(sys.stdin)['runs'][0]['run_id'])"
    pmt34om0b40qvjh
    $ curl -s -w "\nHTTP %{http_code}\n" "http://127.0.0.1:3083/melite-proxy/v1/flows/status/pmt34om0b40qvjh" | head -c 700
    {"run_id":"pmt34om0b40qvjh","flow":"YAML","yaml_filename":"(inline)","status":"failed","stages":[{"id":"generate_image_0","name":"generate_image","index":0,"family_id":"generate_image","service":"z-image","file":"","type":"json","status":"error","size":0,"url":null,...
    HTTP 200

### 3b. FAILURE PATH — fake run id surfaces the gateway's real 404 — PASS

    $ curl -s -w "\nHTTP %{http_code}\n" "http://127.0.0.1:3083/melite-proxy/v1/flows/status/w3-fake-run-id-000"
    {"error":"Run not found","run_id":"w3-fake-run-id-000"}
    HTTP 404

The proxy invents nothing: status and body are the gateway's own. (The
two-row overlay's client row mounts with `clientRowOnly: true`; the boot
succeeded and `/melite-proxy` answers, which is only possible if the second
route registration was suppressed — a duplicate prefix registration throws
`webserver: duplicate prefix route` and would have failed the fiber.)

## 4. Browser smoke — the real shell loads and runs the factory

Playwright (chromium, ~/.cache/ms-playwright/chromium-1234/...)
against http://127.0.0.1:3083/ — modal dismissed, 9 s dwell, console +
pageerror listeners:

    {"bundleFetched": true, "consoleErrors": []}

The GUI fetched `/packages/@melite-plugin/dsh-card-view/client.js` and produced
zero console/page errors — the closure factory executed, the slot wait +
registration did not throw.

## 5. Package.json corrections (were blocking the client half)

- `exports["."] `​` was ./lib/index.mjs; the shared preset (ESM + "type":
  "module", fixedExtension: false) emits **lib/index.js** — same as the
  proven sibling melite-gallery. Fixed to ./lib/index.js; overlay host row
  points at the absolute lib/index.js path accordingly.
- Added `exports["./package.json"]: "./package.json"`. WITHOUT it the
  client-modules scanner's require.resolve('@melite-plugin/dsh-card-view/package.json')
  throws ERR_PACKAGE_PATH_NOT_EXPORTED, the package is silently skipped, and
  the bundle 404s. First boot proved the failure (__DSH_BOOT__ MISSING +
  HTTP 404 on the bundle); after the one-line fix everything passed (§2a/2b).
- Host half: added the missing type-only @deepseek-ai/dsh-host-webserver
  import (tsc had TS2339: Property 'webServer' does not exist on type
  'Context'); tsconfig include aligned with melite-gallery (drop
  tsdown.config.ts — the preset's tsdown type import does not resolve under
  this package's layout and the proven sibling excludes it too).

## 6. STRETCH — real chat turn renders the card

Instance: same rows + the melite-tools host row (melite-tools/lib/index.mjs,
gatewayUrl http://localhost:33081), port 3087. The REAL registry readback:

    $ curl -s http://127.0.0.1:3087/melite-tools/catalog | head -c 400
    {
      "plugin": "melite-tools",
      "gatewayUrl": "http://localhost:33081",
      "registered": 4,
      "expected": 4,
      "tools": [
        {
          "name": "flow_start",

Playwright drove a real GUI chat turn ("Call the flow_start tool right
now to start a z-image generation run with the prompt 'a tiny blue
circle'..."). The deepseek-proxied model made the tool call, the gateway
started run `pmt362ce0t9nka4`, and the keyed card rendered
(`[data-dsh-part="melite-flow-card"]` visible). Verbatim card innerText:

    "RAY\nz-image\nfailed\na tiny blue circle\nrun pmt362ce0t9nka4\n0/1 steps\ngenerate_image[txt2img]: ComfyUI workflow failed: ComfyUI POST /prompt → 400: {\"error\": {\"type\": \"prompt_outputs_failed_validation\", ...

Every card element is real data: badge, model from the call args, live state
chip, prompt line, run_id, step progress, and the gateway's verbatim error
line (the run itself failed because this ComfyUI has no z-image checkpoint
loaded — 'z_image_turbo_bf16.safetensors' not in [] — an environment fact;
the card surfaced it verbatim, which is its contract). Screenshots:
card-render-evidence.png (element) and page-render-evidence.png (page)
in this directory.

## Result matrix

| Check | Result |
|---|---|
| lib/index.js + lib/invariant.js + lib/client.js emit | PASS |
| tsc --noEmit on own sources | PASS |
| __DSH_BOOT__ entry on :3083 | PASS |
| /packages/@melite-plugin/dsh-card-view/client.js → 200 + factory bytes | PASS |
| /melite-proxy status of real run_id → 200 verbatim | PASS |
| /melite-proxy status of fake id → 404 verbatim gateway error | PASS |
| Browser smoke: bundle fetched, 0 console errors | PASS |
| Stretch: real chat turn renders the keyed card | PASS |
