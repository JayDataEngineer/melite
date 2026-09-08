# W1 — melite-preset Verification (raw evidence)

Package: `@melite-plugin/dsh-preset` (`melite/dsh/melite-preset/`) — the `melite` agent preset
("Melite — Media Studio"): the builtin `standard` tool surface with the persona row
swapped to the distilled Melite media-studio persona. Every claim below carries the
raw command and its verbatim output, captured against the ISOLATED home
`/tmp/melite-dsh-home` (the live GUI on :3080 was never touched; boot port 3085).

## What this proves

1. **Discovery** — the installed preset directory is enumerated by the live
   `dsh-agent-presets` roster (`POST /api/agentPreset.list`) with its display
   metadata (`name: Melite — Media Studio`, description, `order: 5` → sorted after
   the shipped set).
2. **Content** — `POST /api/agentPreset.read` returns the composition verbatim
   (13,821 bytes), persona row included.
3. **Mount** — `POST /api/session.create` with `agentPreset: "melite"` succeeds,
   which runs the REAL mount path: all 16 rows import from the harness base, the
   root-realm audit passes, and the session joins the standing composition. No
   LLM call is needed for this.
4. **Failure paths** — (A) malformed composition → loud `broken` reason on the
   roster, no restart needed; (B) malformed `preset.yml` → documented SILENT
   degrade to the id fallback (not loud — by design); (C) shape-valid
   composition naming an absent plugin → loud `agent-preset-invalid` at
   `session.create`, with clean recovery after restore.

## Package files (deliverables)

```sh
$ ls -la $MELITE_REPO/dsh/melite-preset/
```

```
total 52
drwxrwxr-x 2 user user  4096 Aug 21 15:49 .
drwxrwxr-x 9 user user  4096 Aug 21 15:13 ..
-rw------- 1 user user 13818 Aug 21 15:49 VERIFICATION.md
-rw-rw-r-- 1 user user 15103 Aug 21 15:13 agent.cordis.yml
-rw------- 1 user user  1608 Aug 21 15:12 install.md
-rw------- 1 user user   174 Aug 21 15:02 package.json
-rw------- 1 user user   239 Aug 21 15:12 preset.yml
```

## Install into the isolated home (the one install command, exercised)

```sh
export PATH="$HOME/.local/share/pnpm:$HOME/.local/bin:$HOME/.bun/bin:$PATH"
D=/tmp/melite-dsh-home/.agent-presets/melite
mkdir -p "$D" && cp $MELITE_REPO/dsh/melite-preset/preset.yml \
   $MELITE_REPO/dsh/melite-preset/agent.cordis.yml "$D/"
diff $MELITE_REPO/dsh/melite-preset/preset.yml "$D/preset.yml" \
  && echo 'preset.yml: installed == package'
diff $MELITE_REPO/dsh/melite-preset/agent.cordis.yml "$D/agent.cordis.yml" \
  && echo 'agent.cordis.yml: installed == package'
md5sum "$D/preset.yml" "$D/agent.cordis.yml"
```

```
preset.yml: installed == package
agent.cordis.yml: installed == package
f6ed1c78c53ebb00f1a14985247bcf5c  /tmp/melite-dsh-home/.agent-presets/melite/preset.yml
d22ea6082b0e04e6dbbb08c7f4323b9e  /tmp/melite-dsh-home/.agent-presets/melite/agent.cordis.yml
```

## Pre-flight — the composition parses under the LOADER's own YAML dialect

Plain `js-yaml` load fails on the `!!js` tags the shipped rows use (`unknown tag
!<tag:yaml.org,2002:js>` — observed and expected); `dsh-agent-presets` health
checks with `entryListSchema` from `@deepseek-ai/cordis-plugin-include`, so the
pre-flight uses exactly that schema plus a replica of its `entryListProblem`
shape walk:

```sh
$ node /tmp/w1-shapecheck.mjs   # imports entryListSchema from cordis-plugin-include
```

```
LOADER-DIALECT PARSE OK | top-level rows: 16 | shape problem: none
persona preview: "You are Melite, director of a self-hosted generative-media studio — image, video, audio, 3D m"
```

## Boot (isolated home only — never the live profile)

```sh
$ DSH_HOME=/tmp/melite-dsh-home dsh --profile web --port 3085
```

Boot log (complete):

```
dsh web: http://127.0.0.1:3085
```

No `--patch` needed: every row names an official `@deepseek-ai/dsh-*` package,
and bare specifiers resolve from the harness base at mount time.

## PROBE 1 — discovery enumerates the preset (raw)

```sh
$ curl -s http://127.0.0.1:3085/api/agentPreset.list -X POST \
    -H 'content-type: application/json' \
    -d '{"type":"client-request","rpcId":"w1-probe-1","method":"agentPreset.list","payload":{}}' \
    | python3 -m json.tool
```

```json
{
    "type": "server-response",
    "rpcId": "w1-probe-1",
    "result": {
        "ok": true,
        "value": {
            "presets": [
                {
                    "id": "standard",
                    "trust": "system",
                    "isDefault": false,
                    "name": "标准模式",
                    "description": "功能完整的编码 Agent，支持文件编辑、Shell、文件与网页检索、Skills、计划、目标、子代理和工作流。"
                },
                {
                    "id": "code",
                    "trust": "system",
                    "isDefault": true,
                    "name": "PTC 模式",
                    "description": "具备标准模式的全部能力，并通过 Code Mode SDK 呈现工具，让模型用一个 TypeScript 程序组合多步操作。"
                },
                {
                    "id": "minimal",
                    "trust": "system",
                    "isDefault": false,
                    "name": "极简模式",
                    "description": "仅提供持久 bash 与 str_replace_editor 的双工具编码 Agent。"
                },
                {
                    "id": "cordis",
                    "trust": "system",
                    "isDefault": false,
                    "name": "创造模式",
                    "description": "用于创建自定义 Agent preset：具备标准模式的全部能力，并提供运行时检查、插件实验和 preset 创作指导。"
                },
                {
                    "id": "melite",
                    "trust": "user",
                    "isDefault": false,
                    "name": "Melite — Media Studio",
                    "description": "Melite，生成式媒体工作室的导演（图像 · 视频 · 音频 · 3D，ComfyUI 后端）——标准模式的全部工具面，换成 Melite 的媒体工作室人格而非编码人格。"
                }
            ],
            "authorable": true,
            "hasDocument": false
        }
    }
}
```

The `melite` row carries the exact `preset.yml` display text, `trust: "user"` (it
lives under the harness-home root), and sorts after the shipped set (`order: 5`).

## PROBE 2 — the composition is readable verbatim (raw)

```sh
$ curl -s http://127.0.0.1:3085/api/agentPreset.read -X POST \
    -H 'content-type: application/json' \
    -d '{"type":"client-request","rpcId":"w1-probe-2","method":"agentPreset.read","payload":{"agentPreset":"melite"}}' \
    | python3 -c '...print name/trust/content head, persona line, tail...'
```

```
rpcId: w1-probe-2 | ok: True
name: Melite — Media Studio | trust: user
content bytes: 13821
--- content head ---
# The `melite` agent preset: "Melite — Media Studio". The builtin `standard` tool
# surface with ONE row changed — the persona. A session on this preset is a
# Melite media-studio session: a generative-media director (image / video /
# audio / 3D mesh / motion on a ComfyUI backend) instead of the default
# coding assistant. Tool FILTERING is phase 2 (after W2 lands the Melite tool
# names); v1 deliberately ships the standard surface untouched.
#
# The persona is distilled from melite/agent/prompts/BASE_PROMPT.md (Melite's own
--- persona line ---
      You are Melite, director of a self-hosted generative-media studio — image,
--- content tail ---
  name: '@deepseek-ai/dsh-tool-web'
  config:
    fetch: false
    searchTimeoutMs: 60000
```

## PROBE 3 — a real session MOUNTS on the preset (raw)

`session.create` with `agentPreset` runs the actual `dsh-agent-presets` mount:
every row is imported and activated, and the mount audit rejects any row that
never became usable or published a service into the root realm. `ok: true`
therefore proves the whole 16-row composition is live for that session.

```sh
$ curl -s http://127.0.0.1:3085/api/session.create -X POST \
    -H 'content-type: application/json' \
    -d '{"type":"client-request","rpcId":"w1-probe-3","method":"session.create","payload":{"cwd":"/tmp/melite-dsh-home","agentPreset":"melite"}}' \
    | python3 -m json.tool
```

```json
{
    "type": "server-response",
    "rpcId": "w1-probe-3",
    "result": {
        "ok": true,
        "value": {
            "sessionId": "session-02fb0cfa-6215-4eeb-8b34-226f47a9414c",
            "agentPreset": "melite"
        }
    }
}
```

## FAILURE PATH A — malformed composition → loud `broken` roster row

Setup (no restart — discovery re-reads the roots on every list):

```sh
$ mkdir -p /tmp/melite-dsh-home/.agent-presets/broken-demo
$ printf 'name: Broken Demo\norder: 9\n' > /tmp/melite-dsh-home/.agent-presets/broken-demo/preset.yml
$ printf -- '- id: x\n  name: [unclosed, flow\n' > /tmp/melite-dsh-home/.agent-presets/broken-demo/agent.cordis.yml
```

Re-list (filtered to the three user presets; raw rows):

```
{"id": "melite", "trust": "user", "isDefault": false, "name": "Melite — Media Studio", "description": "Melite，生成式媒体工作室的导演（图像 · 视频 · 音频 · 3D，ComfyUI 后端）——标准模式的全部工具面，换成 Melite 的媒体工作室人格而非编码人格。"}
{"id": "broken-demo", "trust": "user", "isDefault": false, "name": "Broken Demo", "broken": "the composition is not valid YAML: unexpected end of the stream within a flow collection (3:1)"}
```

The broken directory is listed WITH its reason instead of being skipped — the
loud discovery-level error, visible without restarting DSH.

## FAILURE PATH B — malformed `preset.yml` → documented SILENT degrade

Setup: valid composition, unparsable metadata:

```sh
$ mkdir -p /tmp/melite-dsh-home/.agent-presets/badmeta
$ cp /tmp/melite-dsh-home/.agent-presets/melite/agent.cordis.yml /tmp/melite-dsh-home/.agent-presets/badmeta/
$ printf '{[this is : not yaml' > /tmp/melite-dsh-home/.agent-presets/badmeta/preset.yml
```

Raw row from the same re-list as FP-A:

```
{"id": "badmeta", "trust": "user", "isDefault": false}
```

No `name`, no `description`, and — importantly — NOT `broken`: per the
`dsh-agent-presets` contract, "Every read failure degrades to no metadata …
presentation is not a capability: a preset with a broken name still mounts."
The task brief guessed this would be loud; the actual mechanism (verified here)
is a silent fallback to the id. Documented as observed.

## FAILURE PATH C — shape-valid composition naming an absent plugin → loud
## mount rejection, then clean recovery

Setup: swap ONE row name (line 41, the persona row) to a package that does not
exist. The shape check passes (the row is a map with a `name`); only the real
import can catch it:

```sh
$ sed 's|name: .@deepseek-ai/dsh-persona.|name: "@deepseek-ai/dsh-does-not-exist"|' agent.cordis.yml > melite/agent.cordis.yml
$ grep -n 'dsh-does-not-exist' /tmp/melite-dsh-home/.agent-presets/melite/agent.cordis.yml
41:  name: "@deepseek-ai/dsh-does-not-exist"
```

Raw `session.create` on the broken preset:

```
{"type":"server-response","rpcId":"w1-fp-mount","result":{"ok":false,"error":{"code":"agent-preset-invalid","message":"agent-presets: preset \"melite\" failed to mount: failed to import loader entry persona (@deepseek-ai/dsh-does-not-exist): Cannot find package '@deepseek-ai/dsh-does-not-exist' imported from /tmp/melite-dsh-home/profiles/web/ (/tmp/melite-dsh-home/.agent-presets/melite/agent.cordis.yml)","details":{"agentPreset":"melite","reason":"failed to import loader entry persona (@deepseek-ai/dsh-does-not-exist): Cannot find package '@deepseek-ai/dsh-does-not-exist' imported from /tmp/melite-dsh-home/profiles/web/ (/tmp/melite-dsh-home/.agent-presets/melite/agent.cordis.yml)"}}}}
```

Restore from the package dir and retry (raw):

```
(restored == package)
{
    "type": "server-response",
    "rpcId": "w1-fp-recover",
    "result": {
        "ok": true,
        "value": {
            "sessionId": "session-17b6975b-d3b4-4935-86f1-496aa96502b3",
            "agentPreset": "melite"
        }
    }
}
```

## FINAL STATE (after removing the FP scratch dirs)

```sh
$ ls -la /tmp/melite-dsh-home/.agent-presets/ /tmp/melite-dsh-home/.agent-presets/melite/
```

```
/tmp/melite-dsh-home/.agent-presets:
total 0
drwxrwxr-x 3 user user  60 Aug 21 15:48 .
drwxrwxr-x 6 user user 180 Aug 21 15:41 ..
drwxrwxr-x 2 user user  80 Aug 21 15:14 melite

/tmp/melite-dsh-home/.agent-presets/melite/:
total 20
drwxrwxr-x 2 user user    80 Aug 21 15:14 .
drwxrwxr-x 3 user user    60 Aug 21 15:48 ..
-rw-rw-r-- 1 user user 15103 Aug 21 15:47 agent.cordis.yml
-rw------- 1 user user   239 Aug 21 15:44 preset.yml
```

Final roster (one line per preset, raw field projection):

```
standard | trust: system | name: 标准模式 | broken: -
code | trust: system | name: PTC 模式 | broken: -
minimal | trust: system | name: 极简模式 | broken: -
cordis | trust: system | name: 创造模式 | broken: -
melite | trust: user | name: Melite — Media Studio | broken: -
```

## Residual gap — CLOSED (2026-08-21, post-credential)

The original gap (persona bytes on the model wire) was closed the same day
once the isolated home gained working LLM credentials (settings.yaml proxy
copy — see `melite/dsh/README.md` boot law #6). Raw evidence:

1. Create a melite-preset session over RPC:

```sh
$ curl -s http://127.0.0.1:3085/api/session.create -X POST \
    -H 'content-type: application/json' \
    -d '{"type":"client-request","rpcId":"w1-melite-1","method":"session.create","payload":{"agentPreset":"melite"}}'
{"type":"server-response","rpcId":"w1-melite-1","result":{"ok":true,"value":{"sessionId":"session-97cae1fb-05be-43f7-ac82-81675f926f48","agentPreset":"melite"}}}
```

2. Queue a turn (note `content` at payload top level):

```sh
$ curl -s http://127.0.0.1:3085/api/session.prompt -X POST \
    -H 'content-type: application/json' \
    -d '{"type":"client-request","rpcId":"w1-t-3","method":"session.prompt","payload":{"mode":"queue","sessionId":"session-97cae1fb-…","content":[{"type":"text","text":"Answer in ONE short line: per your system persona, who are you and what do you direct?"}]}}'
{"type":"server-response","rpcId":"w1-t-3","result":{"ok":true,"value":{"accepted":true}}}
```

3. Read the session's recorded context back — `session.history` (73,423
   bytes) CONTAINS the persona bytes verbatim in the model-request context:

```
…ment server unless the user asks; if one is needed, use a managed background
job and verify its exact URL.

You are Melite, director of a self-hosted generative-media studio — image,
video, audio, 3D mesh, motion — built on a single GPU running ComfyUI. You are
powered by the stealth/ox-alpha model, and your working directory is /home/<user>/Document…
```

   (`grep -c 'generative-media studio' /tmp/w1-hist.json` → `1`)

4. Behavioral confirmation — the model's actual reply (verbatim from the
   same history):

```
I'm Melite, director of the self-hosted generative-media studio.
```

The persona is therefore proven end to end: preset file → mount → composed
model-request context → model self-identification.

## Re-run recipe

```sh
export PATH="$HOME/.local/share/pnpm:$HOME/.local/bin:$HOME/.bun/bin:$PATH"
D="${DSH_HOME:-/tmp/melite-dsh-home}/.agent-presets/melite"; mkdir -p "$D" && \
  cp $MELITE_REPO/dsh/melite-preset/{preset.yml,agent.cordis.yml} "$D/"
DSH_HOME=/tmp/melite-dsh-home dsh --profile web --port 3085 &
# then POST /api/agentPreset.list etc. as above
```
