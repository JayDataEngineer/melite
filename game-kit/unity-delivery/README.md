# Unity delivery law (summary)

Full README + manifest live in data/delivery/unity/. Laws enforced there:

1. **DOTween compatibility** (operator order 2026-08-25): every asset pivoted
   at base-center (Blender-evaluated - accessor arithmetic lies for skinned
   meshes), plain-transform drivable, baked clips optional, ZERO Kimodo /
   motion-NPZ dependency. Starter drivers: Scripts/CreatureTweenDriver.cs,
   Scripts/PropTweenDriver.cs.
2. **Dual format**: GLB (glTFast 1:1) + FBX (container blender, add_leaf_bones
   False, bake_space_transform True). Pipelines stay GLB-native; FBX exists
   only at the delivery step.
3. **Honest manifest**: every row carries its agent-eyes gate verdict.
4. Delivery flow: verified asset -> copy into category folder -> asset.json ->
   MANIFEST row -> (models) FBX batch via scripts pattern in
   docs/asset-pipelines/delivery-unity.md.
