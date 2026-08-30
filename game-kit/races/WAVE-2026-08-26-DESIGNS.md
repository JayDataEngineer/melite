# Humanoid wave designs — 2026-08-26 queue drain

Five humanoids from the asset-request queue (operator-ordered). All ride the
gamekit-race-forge recipe: base_human_textured.glb reuse + spec morphs +
TRELLIS attachments (cat_ears.yaml pattern) + gates + pivot/FBX + deliver
into data/delivery/unity/humanoids/<name>/ + registry stamp via request
complete. SERIAL — one at a time, after the props wave drains.

Style family law: every villager attachment concept shares suffix
"low-poly flat-shaded desert villager gear, muted ochre and bone tones,
soft dusk light" and seed base 720..739 (race-forge: family 700+).
Keeper armor attachments share suffix
"low-poly flat-shaded desert survivor armor, ochre leather and sun-bleached bone,
soft dusk light" and seed base 740..749.

## 1. keeper_leather_armor (P1)
- Morphs: none (armor does not change the body — keeper silhouette is law).
- Attachments:
  a) leather_torso_wrap — "layered hide and fiber torso wrap with satchel
     strap, closed at the chest with bone pin" -> socket mixamorig:Spine1.
     Concept seed 740.
- Gate eyes: reads as ONE subject "torso wrap"; must NOT read as full outfit
  or jacket with legs.
- Delivery: keeper_leather_armor/ (GLB+FBX, clips inherited from base).
  Game wiring: keeper.json "model" swap is OPERATOR's call at ingest time.

## 2. keeper_bone_plate (P2)
- Morphs: none.
- Attachments:
  a) bone_plate_mantle — "sun-bleached bone plate mantle with shoulder
     pauldrons lashed with cord" -> socket mixamorig:Spine2. Seed 742.
- Heavier read than leather tier: chunkier silhouette, plate gaps visible.

## 3. villager_trader (P1)
- Morphs: h_scale widen 1.03 about Spine1 (merchant heft, tweenable key
  "trader_heft").
- Attachments:
  a) trader_shade_hat — "wide-brim woven shade hat with neck cord" ->
     socket mixamorig:Head. Seed 720.
  b) trader_pouch_strap — "crossbody strap with three small pouches" ->
     socket mixamorig:Spine2. Seed 721.

## 4. villager_farmer (P2)
- Morphs: h_scale widen 1.04 ("farmer_frame").
- Attachments:
  a) farmer_shade_wrap — "wrapped straw shade headcloth" -> Head. Seed 723.
  b) farmer_hoe — "short-handled hand hoe, worn wood, lashed to sit flat on
     a back" -> Spine2. Seed 724.

## 5. villager_elder (P2)
- Morphs: bone_push forward hunch about Spine2 ("elder_hunch"),
  h_scale narrow 0.95 ("elder_gaunt").
- Attachments:
  a) elder_bead_strands — "long strands of small bone beads, looped at the
     neck" -> Neck. Seed 726.
  b) elder_staff — "gnarled walking staff, shoulder height" -> RightHand.
     Seed 727.

## Execution order (serial)
keeper_leather_armor -> villager_trader -> keeper_bone_plate ->
villager_farmer -> villager_elder (P1s first, then P2s).

## Honest limits
- Socket law = rigid single-bone binding: limb guards/shin plates are
  excluded by design (they would float on a walking rig).
- U-027 loop clips: inherited from base (morphs ride shape keys; sockets
  parent new meshes — tracks untouched). Verify in gates.
- No humanoid regen of the base: base_human_textured is the SSOT body.
