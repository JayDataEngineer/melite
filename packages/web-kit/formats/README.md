---
description: Pure browser-side media codecs and math — NPZ, skins, poses, masks, image metadata — fetch-free by law.
kind: package-library
---

# formats

`@melite/formats` holds the browser-side media codecs and math the studios share: motion files, character skins, pose codecs, mask prep, image metadata. Pure transforms by law — no render loops, no server coupling; `three` types appear only where geometry demands.

## Contract

The package root re-exports the leaves; each is also a declared subpath. The manifest also declares the standard `./package.json` re-export.

- Motion — `./npz` (the minimal NPZ reader), `./motionNpz` (the motion card's client-side engine), `./motionEnvelope` (audio-reactive amplitude), `./motionConstraints` (the constraint snapshot core), and `./keyframeExtract` (anchor-frame picks).
- Skins and rig — `./somaSkin` (neutral SOMA-77 linear-blend skinning), `./glbSkin` (a SOMAX-rigged GLB onto the same substrate), `./poserSkin` (the shared bind-mesh), `./handPose` (SOMA-77 finger presets), and `./glbLoad` (the one DRACO-configured GLTFLoader).
- Pose — `./poseCodec` (byte codecs and bone topology), `./poseTransforms` (COCO-18 transforms), `./openPoseCanvas` (the stick-figure renderer), `./textToPose` (the poser client), `./bodyPresets` (labeled archetype presets), and `./downloads` (artifact export triggers).
- Media plumbing — `./pngMeta` and `./pngMetaInfo` (PNG tEXt chunk embed and read), `./b64`, `./extractVideoFrame`, `./captionSplitter`, `./promptTags`, `./renderSnapshot` (the one-frame scene-to-JPEG snapshotter), `./psdExport` (the layered PSD writer), `./maskPrep`, `./cardMutations` (the declarative card-mutation gate), `./readFile` (the one slot-attach read), and `./uploadToEstate` (the one browser-file to estate-path rail).

## Model Experience

### Request context and condition

#### What the model sees

The codecs contribute nothing. `./textToPose` submits a caller's prompt segments to the poser backend for downstream pose generation; `./uploadToEstate` moves bytes the user chose.

#### Token effect

Conditional — only the text-to-pose path sends prompts for downstream generation; the codecs and the upload rail cost nothing.

#### KV Cache effect

Independent — the poser calls are one-shot jobs, not conversation turns.

## Known Limitations and Deferred Work

- **Minimal format coverage by design** — the NPZ reader and the PSD writer cover the estate's own subset (8-bit RGB layers); broader format support lands only when a surface needs it.
- **No `./invariant` companion** — the codecs are deterministic pure functions over their inputs; there is no cross-package runtime relationship to assert.
