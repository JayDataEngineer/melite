# User LoRAs — adding your own, from the operator's seat

The studio already renders a LoRA picker for every model that **boards** the
pack (`z-image`, `krea-2`, `h3`, `qwen-img-edit-2511`) — card-base's
modifier section, a strength dial, drag-reorder (apply order = array order).
The picker is filled from the family's own rows. **This is the door for rows
that are yours.**

Two standing laws, kept intact on purpose:

- **No loras remote.** The operator's own words, pinned in
  `melite-tools/src/discovery.ts:12`: *"THERE SHOULD NOT BE A LORAS REMOTE /
  IT'S ALL BUILT IN"*. Nothing here fetches. A row's `source_url` is
  documentary, and `installUserLora` copies a file you already have.
- **Never hand-spell a name.** The studio leaf refuses a typed LoRA name
  (`card-base/src/mods.tsx:241`). Your LoRA becomes a *row* instead — so the
  picker, the bag, and compose all work unchanged, and no blind string can
  reach the engine.

## The flow

**1 — put the file where the engine looks for LoRAs.** The engine's combo is
ComfyUI core's `folder_paths` list; the only refresh primitive in this repo is
a full engine reboot (`POST /manager/reboot`, the `comfy_manage restart` tool).
To copy a file you already have into that directory:

```sh
node --experimental-strip-types -e "
  import('@melite/comfyui-cordis/user-loras').then(async (m) => {
    const info = await (await fetch('http://127.0.0.1:8188/object_info/LoraLoaderModelOnly')).json()
    console.log('engine loras:', m.loraNamesFromObjectInfo(info).length)
    console.log(m.installUserLora('/abs/path/to/my_lora.safetensors',
      '/mnt/data/models/image-gen/comfyui/loras'))
  })
"
```

**2 — reboot the engine** so core re-enumerates (`comfy_manage restart`).

**3 — add the row.** Create `data/loras/user-loras.json` (override the path
with `MELITE_USER_LORAS`):

```json
[
  {
    "id": "my_style",
    "filename": "my_style.safetensors",
    "families": ["z-image"],
    "label": "My Style",
    "category": "style",
    "default_strength": 0.85
  }
]
```

`filename` must be the **exact name the engine lists** (subdirs included —
`h3/one.safetensors`). `families` must name models that board the `loras`
pack; a row naming a family that boards no `loras` flavor is **served to no
one** — it appears in no picker, and compose refuses its id for every family
(pick from `lora_list`'s `engine_loras`-adjacent families; nothing refuses
the row itself, so spell the family ids exactly as the picker shows them). A
bare array of rows or `{"rows": [...]}` both serve; a malformed file reports
its per-row problems and never takes the good rows down.

**4 — nothing else.** Since 2026-10-15 the rows file is composed by the
engine's own mod plane (`comfyui-cordis/src/mods/userLorasFlavor.ts`) — rows
serve on the **next form-spec request**, no rebuild, no bundle, no patch
file. The drop-in (`user-loras.plugin.ts`) remains for pointing at a
*second* file on a process that does not compose the engine plane:

```yaml
- id: user-loras
  file: /abs/path/to/packages/web/melte-estate/hot/user-loras.plugin.ts
```

**5 — verify.** `lora_list` (the manage door, or `comfy_manage lora_list` on
the agent lane) answers with the rows it read, their problems, and the
engine's own accepted names.

## The last step: prove the row against the engine

A row whose `filename` is absent from the engine's own list refuses at
`/prompt` — a 400 *after* the run is composed. Check before you spend:

```sh
node --experimental-strip-types -e "
  import('@melite/comfyui-cordis/user-loras').then(async (m) => {
    const info = await (await fetch('http://127.0.0.1:8188/object_info/LoraLoaderModelOnly')).json()
    const rows = m.readUserLoraRows('./data/loras/user-loras.json').rows
    console.log(rows.length, 'row(s);', 'problems:', m.unboardedRows(rows, m.loraNamesFromObjectInfo(info)))
  })
"
```

Empty problems list = every row is a name the engine will accept.

## What is delivered, and what is not

- **Delivered** (`packages/engines/comfyui-cordis/src/userLoras.ts` +
  `src/mods/userLorasFlavor.ts` composed in the mod plane): validation, the
  engine-combo fact, the file copy, the runtime-flavor registration at
  composition time, and the picker's own rendering — with **no client
  change**. The manage doors (`lora_list` / `lora_install`, sidebar and the
  `comfy_manage` agent lane) read the same file.
- **Not delivered, and honestly so**: a first-class *UI* door (an "add LoRA"
  button in the studio that writes the rows file and reboots the engine).
  That is a product decision about where the button lives; the row-file path
  above works today and is the same registration the family files use.
