#!/usr/bin/env python3
"""gen_lanes.py — emit per-prop pipeline YAMLs from a spec table.

One lane per prop: z-image concept (shared style suffix + per-set seed
family) -> trellis_native (dump_post=enable) -> trellis_native_replay
(QEM faces_target to budget) -> render_glb_views turntable. This is the
committed generator behind both the V1 loot set (seeds 7xxx, 5k budget)
and the P1.5 construction set (seeds 8xxx, 8k budget) — no more ad-hoc
/tmp scripts.

Usage: gen_lanes.py [--set loot|build] [outdir]
"""
import argparse
from pathlib import Path

LOOT = [
    ("blue_flower", 7001, "single bioluminescent desert bloom plant, violet glowing tips on a bone-pale stem, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("stick", 7002, "single dry pale branch, forked, cracked bark grain, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("fiber", 7003, "coiled bundle of grey-green plant fiber strands tied in the middle, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("wood", 7004, "single split drought-dead log segment, pale cracked wood, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("bone", 7005, "single sun-bleached knuckle bone joint, weathered porous surface, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("trail_ration", 7006, "wrapped waxed-cloth ration packet bound with twine, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("hide_wrap", 7007, "clearly recognizable coiled roll of thick leather straps, tight cylindrical spiral roll with hanging tie cord ends, strong cylindrical silhouette, isolated game prop, centered, plain white background, stylized realistic game asset"),
]
BUILD = [
    ("workbench", 8001, "sturdy survivor crafting workbench, thick plank top on crossed bone-wood legs, scattered tools, stone-weighted vice, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("campfire_unlit", 8002, "unlit campfire ring of sun-bleached stones with stacked dry driftwood teepee and grey ash bed, no flame, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("campfire_lit", 8003, "blazing campfire ring of sun-bleached stones, stacked driftwood teepee with bright orange-violet flame and glowing embers, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("trough", 8004, "carved stone-and-wood water trough, low rectangular basin with bracing straps, shallow water surface, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("ward_stone", 8005, "arcane ward stone, leaning standing slab carved with glowing violet sigils, bone-white stone with ochre dust, small offering stones at base, isolated game prop, centered, plain white background, stylized realistic game asset"),
]
ROCKS = [
    ("rock_small", 8201, "single knee-high weathered desert boulder, rounded wind-carved form, bone-white stone with ochre dust veins, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("rock_large", 8202, "single massive chest-high desert boulder, bold rounded wind-carved silhouette, bone-white stone with ochre dust patches, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("rock_slab", 8203, "single leaning flat sandstone slab, tilted broken edge, sun-bleached bone-white surface with ochre strata lines, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("rock_cluster", 8204, "tight cluster of three nested desert boulders, one large two small, bold single-silhouette grouping, bone-white stone with ochre dust, isolated game prop, centered, plain white background, stylized realistic game asset"),
]
VILLAGE = [
    ("hut_large", 771210, "flat-roofed adobe desert dwelling, thick earthen walls, bone-white wooden door frame, small violet cloth awning over the door, single solid building, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("hut_small", 771211, "small round adobe storage hut, low doorway, rolled leather hide leaning against the wall, thick earthen walls, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("well_head", 771212, "desert stone-ring water well with single wooden support beam and hanging rope bucket, bone-white stones with ochre mortar, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("market_stall", 771213, "open desert market stall, four wooden poles holding a bruise-violet cloth awning, two wooden crates beneath, isolated game prop, centered, plain white background, stylized realistic game asset"),
    ("drying_rack", 771214, "tall wooden drying rack, A-frame legs, cross bars with hanging hide straps and woven loom cloth, isolated game prop, centered, plain white background, stylized realistic game asset"),
]

TEMPLATE = """# generated by game-kit/props-3d/gen_lanes.py --set {setname}
output_dir: ./data/test-output/pipelines/pipeline_props_{vers}_{name}

shared:
  comfy_url: http://127.0.0.1:18465

steps:
  - family: generate_image
    phase: concept
    title: "Concept - {title}"
    consumes: [comfy_url]
    outputs: [asset_image]
    params:
      model: z-image
      seed: {concept_seed}
      output_artifact: asset_image
      prompt: >-
        {prompt}
      negative_prompt: >-
        text, watermark, busy background, drop shadow, scene, multiple
        objects, cropped

  - family: trellis_native
    phase: mesh
    title: "Mesh - {title}"
    consumes: [comfy_url]
    inputs: [asset_image]
    outputs: [asset_glb]
    params:
      model: trellis_native
      seed: {mesh_seed}
      image_artifact: asset_image
      resolution: "512"
      atlas_px: 1024
      dump_post: enable
      output_artifact: asset_glb

  - family: trellis_native_replay
    phase: budget
    title: "Budget - {title}"
    consumes: [comfy_url]
    inputs: [asset_glb]
    outputs: [prop_glb]
    params:
      model: trellis_native_replay
      faces_target: {faces}
      atlas: 1024
      glb_artifact: asset_glb
      dump_artifact: asset_glb_dump
      output_artifact: prop_glb

  - family: render_glb_views
    phase: review
    title: "Views - {title}"
    consumes: [comfy_url]
    inputs: [prop_glb]
    outputs: [views]
    params:
      model: render_glb_views
      glb_artifact: prop_glb
      output_artifact: views
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", choices=["loot", "build", "rocks", "village"], default="build")
    ap.add_argument("--outdir", default=None)
    ap.add_argument("--mesh-seed", type=int, default=22)
    ap.add_argument("--version", default="v1")
    ap.add_argument("--faces", type=int, default=None)
    a = ap.parse_args()

    DEFAULT_FACES = {"loot": 5000, "build": 8000, "rocks": 5000, "village": 8000}
    table = {"loot": LOOT, "build": BUILD, "rocks": ROCKS, "village": VILLAGE}[a.set]
    faces = a.faces if a.faces is not None else DEFAULT_FACES[a.set]
    outdir = Path(a.outdir) if a.outdir else Path(__file__).parent
    for name, seed, prompt in table:
        yaml = TEMPLATE.format(
            setname=a.set, vers=a.version, name=name, title=name.replace("_", " "),
            concept_seed=seed, mesh_seed=a.mesh_seed, prompt=prompt, faces=faces,
        )
        (outdir / f"{a.set}_{name}.yaml").write_text(yaml)
        print(f"wrote {outdir / f'{a.set}_{name}.yaml'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
