/**
 * cards-gpu.e2e.ts — THE WEIGHT SUITE (2026-10-31, the operator's
 * order: "flesh out the weight suite, so we can gpu test on all
 * cards, and get real results to verify").
 *
 * recipes-gpu.e2e.ts receipts the RECIPE LAW's migrated rows; THIS
 * suite receipts the complementary plane: EVERY CARD runs on live
 * silicon. One row per uncovered card/lane — the cheapest lawful
 * payload (floors, defaults, tiny geometries), composed through the
 * same {model:} door the run press rides, asserted on the composed
 * workflow's node classes + the harvested artifact's real bytes.
 *
 * Engine-gated + weights-gated throughout (the shared harness owns
 * both gates): no ComfyUI = self-skip, missing lane weights =
 * self-skip. A skip is not a cost signal. Heavy rows (full-length
 * music, HD film) carry long budgets and run only where the weights
 * sit. Two live findings are pinned in-row: the tts base lane
 * REFUSES prompt-only (clone reference required), and the moss-sfx
 * lane caps one inference at 30s (the 300s ambience_bed pill owes a
 * chunking lane or a capped recipe).
 *
 * Run the whole suite:  pnpm run test:e2e -- tests/e2e/cards-gpu.e2e.ts
 * One genre only:       pnpm run test:e2e -- tests/e2e/cards-gpu.e2e.ts -t 'audio'
 */
import '../helpers/boot-models.ts'
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ENGINE_FREE, ENGINE_HOST, ENGINE_PORT } from './engine-gate.ts'
import {
  type World,
  byClass,
  firstBytes,
  nodesWith,
  runCard,
  stageAnchorPng,
  synthRefWav,
  uploadAnchorPng,
  weightsPresent,
  withWorld,
} from './gpu-harness.ts'

const PROMPT_CUBE = 'a small red cube on a white field'

describe.skipIf(!ENGINE_FREE)('cards-gpu: image-gen (the uncovered families)', () => {
  it.skipIf(!weightsPresent('flux-klein'))('flux-klein default: the distilled lane composes and RUNS', async () => {
    await withWorld('cards-gpu-flux', async (w) => {
      const s = await runCard(w, {
        model: 'flux-klein', prompt: PROMPT_CUBE, width: 512, height: 512,
      }, 'flux-klein default')
      assert.equal(byClass(s, 'EmptyFlux2LatentImage').length, 1, 'the flux latent seats the card geometry')
      assert.equal(byClass(s, 'SamplerCustomAdvanced').length, 1, 'the flux lane samples custom (never a plain KSampler)')
      assert.ok(byClass(s, 'SaveImage').length >= 1, 'the image saves')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the flux artifact is a real PNG')
    })
  }, 240_000)

  it.skipIf(!weightsPresent('anima'))('anima default: the parametric lane composes and RUNS', async () => {
    await withWorld('cards-gpu-anima', async (w) => {
      const s = await runCard(w, {
        model: 'anima', prompt: PROMPT_CUBE, width: 512, height: 512,
      }, 'anima default')
      assert.equal(byClass(s, 'UNETLoader').length, 1, 'the anima lane loads its own UNET')
      assert.ok(byClass(s, 'KSampler').length >= 1, 'the anima lane samples')
      assert.ok(byClass(s, 'SaveImage').length >= 1, 'the image saves')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the anima artifact is a real PNG')
    })
  }, 240_000)
})

describe.skipIf(!ENGINE_FREE)('cards-gpu: image-edit (the 2511 lane)', () => {
  // THE SOFT-RETIRE POSTURE, LIVE (2026-11-08 survivor arc: the 2.1
  // lane won — both 2511 variants carry hide_from_dropdown; the unit
  // wall cards-lane-law.spec pins the prepareCardParams throw, this
  // row pins it through the REAL compose door). The lane's live
  // coverage rides the surviving family: recipes-gpu's
  // 'qwen-img-edit-21 edit' rows. A retired address must refuse
  // LOUD forever, never queue a run — the old row pressed the
  // retired coordinate and could only red.
  it('qwen-img-edit-2511: the soft-retired address refuses LOUD at the compose door (never queues)', async () => {
    await withWorld('cards-gpu-2511-retired', async (w) => {
      const anchor = await uploadAnchorPng('2511 retired')
      await assert.rejects(
        () => w.svc.start(
          { draft_id: 'd1', test: false, model: 'qwen-img-edit-2511', prompt: 'make the cube blue', image1: anchor } as never,
          new AbortController().signal,
        ),
        /is not offered \(the variant route is hidden from the dropdown\)/,
        'the retired address refuses with the hidden-route voice',
      )
    })
  }, 60_000)
})

describe.skipIf(!ENGINE_FREE)('cards-gpu: tagger, upscale, mask, input-prep (the tool lanes)', () => {
  // THE INTENT-MARKER GATES (audit 2026-10-31): wd14 declares no
  // lane_inputs (weightless lane — the checkpoint rides the variant
  // rail), so weightsPresent is trivially true and the engine's own
  // weight gate refuses loud on a lean box. The gate stays as the
  // documented pattern seat, never a liveness proof.
  it.skipIf(!weightsPresent('wd14'))('wd14 default: the tagger lane composes and RUNS', async () => {
    await withWorld('cards-gpu-wd14', async (w) => {
      const anchor = await uploadAnchorPng('wd14 default')
      const s = await runCard(w, {
        model: 'wd14', input_image: anchor,
      }, 'wd14 default')
      assert.equal(byClass(s, 'WD14Tagger|pysssss').length, 1, 'the tagger inverts')
      assert.equal(byClass(s, 'SaveText').length, 1, 'the tags save as text')
      assert.ok(s.stageUrl.endsWith('.txt'), 'the artifact is a text file: ' + s.stageUrl)
      assert.ok(firstBytes(s).length > 0, 'the tag file carries real bytes')
    })
  }, 300_000)

  it.skipIf(!weightsPresent('joytag'))('joytag default: the second tagger lane composes and RUNS', async () => {
    await withWorld('cards-gpu-joytag', async (w) => {
      const anchor = await uploadAnchorPng('joytag default')
      const s = await runCard(w, {
        model: 'joytag', input_image: anchor,
      }, 'joytag default')
      assert.equal(byClass(s, 'CXH_JoyTag').length, 1, 'the tagger inverts')
      assert.equal(byClass(s, 'SaveText').length, 1, 'the tags save as text')
      assert.ok(s.stageUrl.endsWith('.txt'), 'the artifact is a text file: ' + s.stageUrl)
      assert.ok(firstBytes(s).length > 0, 'the tag file carries real bytes')
    })
  }, 300_000)

  // THE INTENT-MARKER GATE (audit 2026-10-31): florence2 declares
  // no lane_inputs — the loader node self-downloads; the gate is
  // the pattern seat, the engine judges the weights.
  it.skipIf(!weightsPresent('florence2'))('florence2 default: the caption lane composes and RUNS', async () => {
    await withWorld('cards-gpu-florence2', async (w) => {
      const anchor = await uploadAnchorPng('florence2 default')
      const s = await runCard(w, {
        model: 'florence2', input_image: anchor,
      }, 'florence2 default')
      assert.equal(byClass(s, 'DownloadAndLoadFlorence2Model').length, 1, 'the vision model loads')
      assert.equal(byClass(s, 'Florence2Run').length, 1, 'the caption runs')
      assert.equal(byClass(s, 'SaveText').length, 1, 'the caption saves as text')
      assert.ok(s.stageUrl.endsWith('.txt'), 'the artifact is a text file: ' + s.stageUrl)
      assert.ok(firstBytes(s).length > 0, 'the caption file carries real bytes')
    })
  }, 600_000)

  it.skipIf(!weightsPresent('joycaption'))('joycaption default: the heavy caption lane composes and RUNS', async () => {
    await withWorld('cards-gpu-joycaption', async (w) => {
      const anchor = await uploadAnchorPng('joycaption default')
      const s = await runCard(w, {
        model: 'joycaption', input_image: anchor,
      }, 'joycaption default')
      assert.equal(byClass(s, 'JJC_DownloadAndLoadJoyCaptionModel').length, 1, 'the caption model loads')
      assert.equal(byClass(s, 'JJC_JoyCaption').length, 1, 'the caption runs')
      assert.equal(byClass(s, 'SaveText').length, 1, 'the caption saves as text')
      assert.ok(s.stageUrl.endsWith('.txt'), 'the artifact is a text file: ' + s.stageUrl)
      assert.ok(firstBytes(s).length > 0, 'the caption file carries real bytes')
    })
  }, 600_000)

  it.skipIf(!weightsPresent('seedvr2-ema'))('seedvr2 preview-256: the pill payload composes and RUNS', async () => {
    await withWorld('cards-gpu-seedvr2', async (w) => {
      // THE ESTATE-FILE LAW: this card's input_image admission
      // refuses bare engine-side names — the anchor rides staged.
      const s = await runCard(w, {
        model: 'seedvr2-ema', input_image: stageAnchorPng('cards-gpu-seedvr2'), resolution: 256,
      }, 'seedvr2 preview-256')
      assert.equal(byClass(s, 'SeedVR2LoadDiTModel').length, 1, 'the DiT loads')
      assert.equal(byClass(s, 'SeedVR2LoadVAEModel').length, 1, 'the VAE loads')
      assert.equal(byClass(s, 'SeedVR2VideoUpscaler').length, 1, 'the upscaler runs at the pill resolution')
      assert.ok(byClass(s, 'SaveImage').length >= 1, 'the upscale saves')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the upscale artifact is a real PNG')
    })
  }, 600_000)

  // THE INTENT-MARKER GATE (audit 2026-10-31): mask-select
  // declares provisions, not lane_inputs — the probe is trivially
  // true; absent weights refuse loud at the engine arm instead.
  it.skipIf(!weightsPresent('mask-select'))('mask sam3-text: the detector lane composes and RUNS', async () => {
    await withWorld('cards-gpu-mask', async (w) => {
      const anchor = await uploadAnchorPng('mask sam3')
      const s = await runCard(w, {
        model: 'mask', input_image: anchor, sam3: [{ prompt: 'person' }],
      }, 'mask sam3')
      assert.equal(byClass(s, 'CheckpointLoaderSimple').length, 1, 'the detector checkpoint loads')
      assert.equal(byClass(s, 'SAM3_Detect').length, 1, 'the SAM3 detector runs')
      assert.ok(byClass(s, 'MaskToImage').length >= 1, 'the mask renders')
      assert.ok(byClass(s, 'SaveImage').length >= 1, 'the mask saves')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the mask artifact is a real PNG')
    })
  }, 600_000)

  it.skipIf(!weightsPresent('input'))('input-prep passthrough: the stage lane composes and RUNS', async () => {
    await withWorld('cards-gpu-input', async (w) => {
      const anchor = await uploadAnchorPng('input passthrough')
      const s = await runCard(w, {
        model: 'input', source: anchor,
      }, 'input passthrough')
      assert.equal(byClass(s, 'LoadImage').length, 1, 'the source loads')
      assert.ok(byClass(s, 'SaveImage').length >= 1, 'the staged copy saves')
      assert.equal(byClass(s, 'ImageCrop').length, 0, 'no crop on a passthrough')
      assert.equal(byClass(s, 'ImageScale').length, 0, 'no scale on a passthrough')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the staged artifact is a real PNG')
    })
  }, 120_000)
})

describe.skipIf(!ENGINE_FREE)('cards-gpu: mesh (anny, the trellis lift, rig)', () => {
  it.skipIf(!weightsPresent('anny'))('anny default: the parametric bake composes and RUNS', async () => {
    await withWorld('cards-gpu-anny', async (w) => {
      const s = await runCard(w, {
        model: 'anny', resolution: 256, samples: 1,
      }, 'anny default')
      assert.ok(byClass(s, 'AnnyParamsToGlb').length >= 1, 'the parametric bake runs')
      assert.ok(byClass(s, 'RayRenderGLBViews').length >= 1, 'the turnaround renders')
      assert.equal(byClass(s, 'SaveImage').length, 8, 'the eight turnaround views save')
      assert.equal(firstBytes(s).readUInt32BE(0), 0x89504e47, 'the turnaround artifact is a real PNG')
    })
  }, 300_000)

  it.skipIf(!weightsPresent('trellis2-native'))('trellis2-native fast: the preview-tier pill payload lifts and RUNS', async () => {
    await withWorld('cards-gpu-trellis', async (w) => {
      const anchor = await uploadAnchorPng('trellis fast')
      const s = await runCard(w, {
        model: 'trellis2-native', variant: '1024', input_image: anchor, seed: 7,
        steps: 4, shape_steps: 4, tex1_steps: 4, tex2_steps: 4,
        remesh_resolution: 128, decimate_faces: 10000,
        atlas_size: '2048', ao_size: '512', normal_size: '1024',
      }, 'trellis fast')
      const remesh = byClass(s, 'RemeshMesh')
      assert.equal(remesh.length, 1, 'the remesh tail runs')
      assert.equal(remesh[0]![1].inputs?.resolution, 128, 'the fast pill stamps remesh 128')
      const decimate = byClass(s, 'DecimateMesh')
      assert.equal(decimate.length, 1, 'the decimate tail runs')
      assert.equal(decimate[0]![1].inputs?.target_face_count, 10000, 'the fast pill stamps 10k faces')
      assert.ok(byClass(s, 'Save3DAdvanced').length >= 1, 'the mesh saves')
      assert.ok(firstBytes(s).length > 1024, 'the mesh artifact carries real bytes')
    })
  }, 600_000)

  it.skipIf(!weightsPresent('pixal3d'))('pixal3d fast: the cheap lift tier composes and RUNS', async () => {
    await withWorld('cards-gpu-pixal-fast', async (w) => {
      const anchor = await uploadAnchorPng('pixal fast')
      const s = await runCard(w, {
        model: 'pixal3d', variant: '1024', input_image: anchor, seed: 7,
        steps: 4, shape_steps: 4, tex1_steps: 4, tex2_steps: 4,
        remesh_resolution: 128, decimate_faces: 10000,
        atlas_size: '2048', ao_size: '512', normal_size: '1024',
      }, 'pixal fast')
      const remesh = byClass(s, 'RemeshMesh')
      assert.equal(remesh.length, 1, 'the remesh tail runs')
      assert.equal(remesh[0]![1].inputs?.resolution, 128, 'the fast pill stamps remesh 128')
      const decimate = byClass(s, 'DecimateMesh')
      assert.equal(decimate.length, 1, 'the decimate tail runs')
      assert.equal(decimate[0]![1].inputs?.target_face_count, 10000, 'the fast pill stamps 10k faces')
      assert.ok(byClass(s, 'Save3DAdvanced').length >= 1, 'the mesh saves')
      assert.ok(firstBytes(s).length > 1024, 'the mesh artifact carries real bytes')
    })
  }, 600_000)

  const RIG_FIXTURE = join(process.cwd(), 'tests', 'fixtures', 'anny_estimator_body.glb')
  it.skipIf(!existsSync(RIG_FIXTURE))('rig auto: the weightless lane composes and RUNS', async () => {
    await withWorld('cards-gpu-rig-auto', async (w) => {
      const s = await runCard(w, {
        model: 'rig', mesh_glb: RIG_FIXTURE,
      }, 'rig auto')
      // THE AUTO SAVER (the card's own flowOutputBindings): the auto
      // lane's output IS KimodoExportFBX.0 — SaveRiggedModel serves
      // the copy/species lanes only.
      assert.equal(byClass(s, 'KimodoExportFBX').length, 1, 'the auto lane rigs')
      assert.ok(firstBytes(s).length > 1024, 'the rigged artifact carries real bytes')
    })
  }, 300_000)

  // THE RIGGED DONOR (live receipt: the copy/transfer lanes read
  // JOINTS_0 — an unrigged parametric body KeyErrors. The auto
  // lane's own output is the SOMA-rigged donor; each row mints its
  // own so rows stay independent).
  async function autoRiggedGlb(w: World, tag: string): Promise<string> {
    const s = await runCard(w, { model: 'rig', mesh_glb: RIG_FIXTURE }, tag)
    return join(s.runDir, s.stageUrl)
  }

  it.skipIf(!existsSync(RIG_FIXTURE) || !weightsPresent('transfer-rig'))('rig copy: the transfer lane composes and RUNS', async () => {
    await withWorld('cards-gpu-rig-copy', async (w) => {
      const donor = await autoRiggedGlb(w, 'rig copy donor')
      const s = await runCard(w, {
        model: 'rig', mesh_glb: RIG_FIXTURE, mode: 'copy', donor_glb: donor,
      }, 'rig copy')
      assert.ok(byClass(s, 'KimodoTransferWeights').length >= 1, 'the copy lane transfers')
      assert.ok(byClass(s, 'SaveRiggedModel').length >= 1, 'the rigged mesh saves')
      assert.ok(firstBytes(s).length > 1024, 'the rigged artifact carries real bytes')
    })
  }, 300_000)

  it.skipIf(!existsSync(RIG_FIXTURE) || !weightsPresent('transfer-rig'))('img-to-mesh transfer lane: the rig hop composes and RUNS', async () => {
    await withWorld('cards-gpu-transfer', async (w) => {
      const rigged = await autoRiggedGlb(w, 'transfer donor')
      const s = await runCard(w, {
        model: 'transfer-rig', rigged_glb: rigged, target_glb: RIG_FIXTURE,
      }, 'transfer lane')
      assert.ok(byClass(s, 'KimodoTransferWeights').length >= 1, 'the transfer hop runs')
      assert.ok(byClass(s, 'SaveRiggedModel').length >= 1, 'the transferred mesh saves')
      assert.ok(firstBytes(s).length > 1024, 'the transferred artifact carries real bytes')
    })
  }, 300_000)
})

describe.skipIf(!ENGINE_FREE)('cards-gpu: audio (tts lanes, music lengths, the sfx bed)', () => {
  it.skipIf(!weightsPresent('qwen3-tts'))('tts expressive-read: the pill payload composes and RUNS', async () => {
    await withWorld('cards-gpu-tts-expr', async (w) => {
      const s = await runCard(w, {
        model: 'qwen3-tts-voicedesign', text: 'The express lane runs hot.', temperature: 2,
      }, 'tts expressive-read')
      const tts = byClass(s, 'AudiocoreTTS')
      assert.ok(tts.length >= 1, 'the TTS lane speaks')
      assert.equal(tts[0]![1].inputs?.temperature, 2, 'the expressive-read pill stamps temperature 2')
      assert.ok(byClass(s, 'SaveAudio').length >= 1, 'the line saves')
      assert.ok(firstBytes(s).length > 512, 'the audio artifact carries real bytes')
    })
  }, 300_000)

  it.skipIf(!weightsPresent('qwen3-tts'))('tts customvoice instruct: the 1.7B lane takes direction and RUNS', async () => {
    await withWorld('cards-gpu-tts-instruct', async (w) => {
      const s = await runCard(w, {
        model: 'qwen3-tts-voicedesign', text: 'A warm hello.', style_instruction: 'cheerful',
      }, 'tts instruct')
      const tts = byClass(s, 'AudiocoreTTS')
      assert.ok(tts.length >= 1, 'the TTS lane speaks')
      assert.equal(tts[0]![1].inputs?.instruct, 'cheerful', 'the direction rides the instruct input')
      assert.ok(byClass(s, 'SaveAudio').length >= 1, 'the line saves')
      assert.ok(firstBytes(s).length > 512, 'the audio artifact carries real bytes')
    })
  }, 300_000)

  it.skipIf(!weightsPresent('qwen3-tts'))('tts base clone: the reference lane composes and RUNS', async () => {
    await withWorld('cards-gpu-tts-base', async (w) => {
      // THE BASE LAW (live receipt, 2026-10-31): the native node
      // REFUSES prompt-only base ("requires voice clone reference
      // audio") — the card composes mode 'tts' but the lane never
      // speaks it. The row stages a 3s synthesized reference, the
      // smallest lawful clone pair.
      const ref = synthRefWav('cards-gpu-tts-base')
      const s = await runCard(w, {
        model: 'qwen3-tts-base', text: 'A cloned line from the reference voice.',
        ref_audio: ref, ref_text: 'a reference line for the clone',
      }, 'tts base')
      const tts = byClass(s, 'AudiocoreTTS')
      assert.ok(tts.length >= 1, 'the TTS lane speaks')
      assert.equal(tts[0]![1].inputs?.mode, 'clone', 'the reference pair rides the clone lane')
      assert.ok(byClass(s, 'SaveAudio').length >= 1, 'the line saves')
      assert.ok(firstBytes(s).length > 512, 'the audio artifact carries real bytes')
    })
  }, 300_000)

  it.skipIf(!weightsPresent('qwen3-tts'))('tts voicedesign export: the designer lane exports and RUNS', async () => {
    await withWorld('cards-gpu-tts-design', async (w) => {
      const s = await runCard(w, {
        model: 'qwen3-tts-voicedesign-design', text: 'A short sample line.',
        voice_name: 'E2EProbe', design_prompt: 'a warm middle-aged radio host, unhurried',
      }, 'tts voicedesign')
      const studio = byClass(s, 'AudiocoreVoiceStudio')
      assert.ok(studio.length >= 1, 'the voice studio runs')
      assert.equal(studio[0]![1].inputs?.mode, 'export_lite', 'the designer exports')
      assert.equal(studio[0]![1].inputs?.name, 'E2EProbe', 'the export carries its name')
      assert.ok(byClass(s, 'MeliteQVoiceCopy').length >= 1, 'the voice stages')
      assert.ok(byClass(s, 'SaveAudio').length >= 1, 'the sample saves')
      assert.ok(firstBytes(s).length > 512, 'the audio artifact carries real bytes')
    })
  }, 480_000)

  it.skipIf(!weightsPresent('music3'))('music3 full-length: the duration pill composes and RUNS', async () => {
    await withWorld('cards-gpu-music-full', async (w) => {
      const s = await runCard(w, {
        model: 'music3', prompt: 'funk, pop, soul, guitar, 105 BPM', duration: 360,
      }, 'music full-length')
      const latent = byClass(s, 'EmptyMiniMaxMusic3LatentAudio')
      assert.equal(latent.length, 1, 'the music latent seats the pill duration')
      assert.equal(latent[0]![1].inputs?.seconds, 360, 'the full-length pill stamps 360 seconds')
      const enc = byClass(s, 'MiniMaxMusic3TextEncode')
      assert.equal(enc.length, 1, 'the caption encodes')
      assert.equal(enc[0]![1].inputs?.max_duration, 360, 'the encoder rides the same duration')
      assert.ok(firstBytes(s).length > 1024, 'the song artifact carries real bytes')
    })
  }, 1_200_000)

  it.skipIf(!weightsPresent('yue2'))('yue2 short-sting: the second music lane composes and RUNS', async () => {
    await withWorld('cards-gpu-yue2', async (w) => {
      const s = await runCard(w, {
        model: 'yue2', prompt: 'warm female vocal, indie pop, 96 BPM', lyrics: '', duration: 5, mode: 'full',
      }, 'yue2 short-sting')
      assert.equal(byClass(s, 'CheckpointLoaderSimple').length, 1, 'the YuE2 checkpoint loads')
      assert.equal(byClass(s, 'YuE2GenerateABC').length, 1, 'the ABC planner runs')
      const gen = byClass(s, 'YuE2GenerateMusic')
      assert.equal(gen.length, 1, 'the generator runs')
      assert.equal(gen[0]![1].inputs?.max_duration, 5, 'the short-sting pill stamps 5 seconds')
      assert.equal(byClass(s, 'EmptyYuE2LatentAudio').length, 1, 'the latent seats the plan')
      assert.ok(byClass(s, 'SaveAudioAdvanced').length >= 1, 'the sting saves')
      assert.ok(firstBytes(s).length > 1024, 'the audio artifact carries real bytes')
    })
  }, 600_000)

  // THE 300s GAP (live receipt, 2026-10-31): the ambience_bed pill
  // (duration 300) REFUSES on silicon — the native node caps one
  // inference at max_inference_seconds=30. The recipe promises what
  // the lane cannot render; the row receipts the lane's ceiling and
  // the DECL↔lane gap is ledgered (the full bed owes a chunking
  // lane or a capped recipe).
  it.skipIf(!weightsPresent('moss-sfx'))('moss-sfx ambience: the lane ceiling composes and RUNS', async () => {
    await withWorld('cards-gpu-sfx-bed', async (w) => {
      const s = await runCard(w, {
        model: 'moss-sfx', prompt: 'low cavern hum with dripping water', duration: 30,
      }, 'sfx ambience')
      const tts = byClass(s, 'AudiocoreTTS')
      assert.ok(tts.length >= 1, 'the SFX lane renders')
      assert.equal(tts[0]![1].inputs?.duration_seconds, 30, 'the lane ceiling rides')
      assert.ok(byClass(s, 'SaveAudio').length >= 1, 'the bed saves')
      assert.ok(firstBytes(s).length > 1024, 'the audio artifact carries real bytes')
    })
  }, 600_000)
})

describe.skipIf(!ENGINE_FREE)('cards-gpu: film and motion (the remaining h3 + kimodo recipes)', () => {
  it.skipIf(!weightsPresent('h3-timeline'))('h3 lightx2v dareties PICK: the catalog adapter composes and RUNS (the recipe row retired 2026-11-02; the lora stays pick-only)', async () => {
    await withWorld('cards-gpu-h3-dare', async (w) => {
      // THE CALLS SPELLING (anchor-guide.spec.ts, the one-truth
      // laws 2026-10-26/27): the t4r lane derives from a CALL-level
      // guide — a card-level `image` no longer implies the lane
      // (the established recipes-gpu h3 rows predate the law and
      // rot red on any engine now).
      const anchor = stageAnchorPng('cards-gpu-h3-dare')
      const s = await runCard(w, {
        model: 'h3', width: 768, height: 448, loras: [{ id: 'h3_lightx2v_dareties' }],
        calls: [{ text: 'a red cube slides slowly across a white table', start_frame: 0, end_frame: 90, image: anchor }],
      }, 'h3 dareties pick')
      // THE STACK RECEIPT (the established turbo pattern): the id
      // resolves to the catalog filename at compose — the workflow
      // carries `minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600…
      // at the catalog strength 0.8 (mods/loras.ts — the one owner).
      const ltx = nodesWith(s, /LTX_lora_loader/)
      assert.ok(ltx.length >= 1, 'the light stack loads')
      const stack = JSON.parse(String((ltx[0]![1] as { inputs: Record<string, unknown> }).inputs['stack_data'])) as Array<{ lora?: string, str?: number, on?: boolean }>
      const drow = stack.find((r) => r['on'] === true && String(r['lora'] ?? '').includes('dareties_v4_step600_comfy_fro'))
      assert.ok(drow !== undefined, 'the stack carries the resolved dareties adapter ON')
      assert.equal(drow!['str'], 0.8, 'the strength is the catalog-declared 0.8')
      assert.ok(firstBytes(s).length > 1024, 'the film artifact carries real bytes')
    })
  }, 600_000)

  it.skipIf(!weightsPresent('h3-timeline'))('h3 draft_02mp: the tier pill composes and RUNS', async () => {
    await withWorld('cards-gpu-h3-draft', async (w) => {
      const anchor = stageAnchorPng('cards-gpu-h3-draft')
      const s = await runCard(w, {
        model: 'h3', width: 768, height: 448, steps: 8,
        calls: [{ text: 'a red cube slides slowly across a white table', start_frame: 0, end_frame: 90, image: anchor }],
      }, 'h3 draft_02mp')
      assert.ok(nodesWith(s, /minimax_h3_fl2v_turbo_8step_v1\.0/).length >= 1, 'the absent-bag turbo default rides')
      const sched = byClass(s, 'BasicScheduler')
      assert.ok(sched.length >= 1, 'the scheduler runs')
      assert.equal(sched[0]![1].inputs?.steps, 8, 'the tier pill stamps 8 steps')
      assert.ok(firstBytes(s).length > 1024, 'the film artifact carries real bytes')
    })
  }, 600_000)

  it.skipIf(!weightsPresent('h3-timeline'))('h3 final_hd: the HD tier composes and RUNS', async () => {
    await withWorld('cards-gpu-h3-hd', async (w) => {
      const anchor = stageAnchorPng('cards-gpu-h3-hd')
      const s = await runCard(w, {
        model: 'h3', width: 1344, height: 768, steps: 30,
        calls: [{ text: 'a red cube slides slowly across a white table', start_frame: 0, end_frame: 90, image: anchor }],
      }, 'h3 final_hd')
      assert.ok(nodesWith(s, /minimax_h3_fl2v_turbo_8step_v1\.0/).length >= 1, 'the absent-bag turbo default rides')
      const sched = byClass(s, 'BasicScheduler')
      assert.ok(sched.length >= 1, 'the scheduler runs')
      assert.equal(sched[0]![1].inputs?.steps, 30, 'the tier pill stamps 30 steps')
      assert.ok(firstBytes(s).length > 1024, 'the film artifact carries real bytes')
    })
  }, 900_000)

  it.skipIf(!weightsPresent('h3-timeline'))('h3 THE HOP-[6] BAKE WITNESS: the stated refmod dials ride the REAL run — the engine\'s own history record carries mode/pool/identity/save verbatim (study §7 item 1, the f closer)', async () => {
    await withWorld('cards-gpu-h3-bake', async (w) => {
      const anchor = stageAnchorPng('cards-gpu-h3-bake')
      const s = await runCard(w, {
        model: 'h3', width: 768, height: 448, steps: 8,
        // THE STATED BAKE AT NON-DEFAULT POLES: every dial moved off
        // its declared default (mode Full Reference, pool 32, identity
        // 1000, save false) — engine defaults could never satisfy
        // these assertions; only the declared-param wire can.
        refmod_mode: 'Full Reference',
        refmod_pool: 32,
        refmod_identity: 1000,
        refmod_save: false,
        // THE REFMOD IMAGE (the (f) burn's own subject): the mod seat
        // takes the anchor as a run-level ref_mods entry — the media
        // the extract bakes, not the t4r guide lane.
        ref_mods: [anchor],
        calls: [{ text: 'a red cube slides slowly across a white table', start_frame: 0, end_frame: 90 }],
      }, 'h3 bake witness')
      // THE APPLY BIND (compose arm re-proven on silicon): the baked
      // mod passes through MiniMaxH3RefModApply into the guider.
      assert.ok(byClass(s, 'MiniMaxH3RefModApply').length >= 1, 'the refmod apply node binds')
      // THE ENGINE'S OWN RECORD: the sidecar stage row stamps the
      // engine-minted prompt_id (P1); the engine's /history/<id> is
      // the EXECUTED graph — what the engine accepted, not what we
      // claim we sent. The extract's inputs there are the witness.
      const flow = JSON.parse(readFileSync(join(s.runDir, '_flow.json'), 'utf8')) as {
        graph_receipt?: { prompt_id?: string }
      }
      const promptId = flow.graph_receipt?.prompt_id ?? ''
      assert.ok(promptId !== '', 'the settled sidecar stamps the engine prompt_id')
      interface HistEntry {
        prompt?: [unknown, unknown, Record<string, { class_type?: string, inputs?: Record<string, unknown> }>]
        outputs?: Record<string, unknown>
      }
      const res = await fetch(`http://${ENGINE_HOST}:${ENGINE_PORT}/history/${promptId}`)
      assert.ok(res.ok, 'the engine history answers for the run: ' + String(res.status))
      const body = (await res.json()) as Record<string, HistEntry>
      const entry = body[promptId]
      assert.ok(entry, 'the engine history carries the prompt entry')
      const executed = entry.prompt?.[2] ?? {}
      const extract = Object.entries(executed).filter(([, r]) => r.class_type === 'MiniMaxH3RefModExtract')
      assert.ok(extract.length >= 1, 'the executed graph bakes the refmod mod')
      const inputs = extract[0]![1].inputs ?? {}
      assert.equal(inputs['mode'], 'Full Reference', 'the engine accepted the stated mode')
      assert.equal(inputs['pool_h'], 32, 'the engine accepted the stated pool_h')
      assert.equal(inputs['pool_w'], 32, 'the engine accepted the stated pool_w')
      assert.equal(inputs['identity'], 1000, 'the engine accepted the stated identity (refinement steps)')
      assert.equal(inputs['save'], false, 'the engine accepted the stated save pole')
      assert.ok(Object.keys(entry.outputs ?? {}).length >= 1, 'the engine produced outputs for the run')
      assert.ok(firstBytes(s).length > 1024, 'the film artifact carries real bytes')
    })
  }, 900_000)

  it.skipIf(!weightsPresent('kimodo'))('motion draft: the steps pill composes and RUNS', async () => {
    await withWorld('cards-gpu-kimodo-draft', async (w) => {
      const s = await runCard(w, {
        model: 'kimodo', prompt: 'a person walks forward slowly',
        diffusion_steps: 10, seed: 4242, duration_sec: 2,
      }, 'motion draft')
      const pose = byClass(s, 'KimodoTextToPose')
      assert.equal(pose.length, 1, 'the pose diffusion runs')
      assert.equal(pose[0]![1].inputs?.diffusion_steps, 10, 'the draft pill stamps 10 steps')
      assert.ok(byClass(s, 'KimodoLoader').length >= 1, 'the motion weights load')
      assert.ok(firstBytes(s).length > 256, 'the motion artifact carries real bytes')
    })
  }, 480_000)

  it.skipIf(!weightsPresent('kimodo'))('motion polished: the ceiling pill composes and RUNS', async () => {
    await withWorld('cards-gpu-kimodo-polish', async (w) => {
      const s = await runCard(w, {
        model: 'kimodo', prompt: 'a person walks forward slowly',
        diffusion_steps: 200, seed: 4242, duration_sec: 2,
      }, 'motion polished')
      const pose = byClass(s, 'KimodoTextToPose')
      assert.equal(pose.length, 1, 'the pose diffusion runs')
      assert.equal(pose[0]![1].inputs?.diffusion_steps, 200, 'the polished pill stamps 200 steps')
      assert.ok(byClass(s, 'KimodoLoader').length >= 1, 'the motion weights load')
      assert.ok(firstBytes(s).length > 256, 'the motion artifact carries real bytes')
    })
  }, 480_000)
})
