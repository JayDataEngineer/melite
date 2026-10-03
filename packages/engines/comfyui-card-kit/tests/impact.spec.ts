import { describe, expect, test } from 'vitest'

import {
  IMPACT_DETECTOR_IDS,
  IMPACT_DETECTOR_PROVISIONS,
  IMPACT_DETECTORS,
  IMPACT_PACKS,
  impactArmNames,
  impactDetector,
} from '../src/impact.ts'

// THE VERBATIM CONTENT LAW: each detector's download is a literal here
// — a substituted digest or a moved file fails this suite. A new
// detector is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, url: string, folder: string, sha256: string, size_bytes: number]
> = [
  ['person_yolov8m-seg.pt', 'https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt', 'ultralytics/segm', 'c8ab26f517173b1fe8342d336a09f443eb61cb08dcbfc78d53fff4c2547ae81e', 54827683],
  ['face_yolov8m.pt', 'https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt', 'ultralytics/bbox', '717923c19b3f4bbf5250b728f1fa6b2cb72a33aed1d236ea9caf0e21ad943e5f', 52026019],
  ['hand_yolov8s.pt', 'https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt', 'ultralytics/bbox', '70b540063fbc385736d8258970744a4afbc4cbf7932134bae3b24cdadeadec06', 22507643],
]

describe('Impact detector catalog', () => {
  test('every provision carries its pinned url, folder, digest and size', () => {
    expect(IMPACT_DETECTOR_PROVISIONS.map((provision) => [provision.name, provision.url, provision.folder, provision.sha256, provision.size_bytes])).toEqual(
      PROVISION_PINS.map(([name, url, folder, sha256, size_bytes]) => [name, url, folder, sha256, size_bytes]),
    )
  })

  test('owns the ordered person/face/hand vocabulary and provisions', () => {
    expect(IMPACT_DETECTOR_IDS).toEqual(['person', 'face', 'hand'])
    expect(IMPACT_DETECTOR_PROVISIONS.map((provision) => provision.name)).toEqual([
      'person_yolov8m-seg.pt',
      'face_yolov8m.pt',
      'hand_yolov8s.pt',
    ])
    expect(IMPACT_PACKS).toEqual(['comfyui-impact-pack', 'comfyui-impact-subpack'])
  })

  test('every row has a valid provision and matching graph path', () => {
    for (const id of IMPACT_DETECTOR_IDS) {
      const detector = IMPACT_DETECTORS[id]
      const pinned = PROVISION_PINS.find(([name]) => name === detector.provision.name)!
      expect(detector.provision.sha256).toBe(pinned[3])
      expect(detector.provision.url).toBe(pinned[1])
      expect(detector.provision.size_bytes).toBe(pinned[4])
      expect(detector.graphPath).toBe(
        `${detector.provision.folder.replace(/^ultralytics\//, '')}/${detector.provision.name}`,
      )
      expect(detector.providerNode).toBe('UltralyticsDetectorProvider')
    }
  })

  test('person is segmentation output 1; face and hand are bbox output 0', () => {
    expect(IMPACT_DETECTORS.person).toMatchObject({
      providerOutput: 1,
      detectorNode: 'SegmDetectorSEGS',
      detectorInput: 'segm_detector',
    })
    expect(IMPACT_DETECTORS.face).toMatchObject({
      providerOutput: 0,
      detectorNode: 'BboxDetectorSEGS',
      detectorInput: 'bbox_detector',
    })
    expect(IMPACT_DETECTORS.hand).toMatchObject({
      providerOutput: 0,
      detectorNode: 'BboxDetectorSEGS',
      detectorInput: 'bbox_detector',
    })
  })

  test('arm names derive from detector ids and refuse unknown words', () => {
    expect(impactArmNames(['person', 'hand', 'person', 'unknown'])).toEqual([
      'person_yolov8m-seg.pt',
      'hand_yolov8s.pt',
    ])
    expect(impactArmNames([])).toEqual([])
    expect(() => impactDetector('unknown')).toThrow(/unknown Impact detector/)
  })
})
