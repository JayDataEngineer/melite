import { describe, expect, test } from 'vitest'

import {
  IMPACT_DETECTOR_IDS,
  IMPACT_DETECTOR_PROVISIONS,
  IMPACT_DETECTORS,
  IMPACT_PACKS,
  impactArmNames,
  impactDetector,
} from '../src/impact.ts'

describe('Impact detector catalog', () => {
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
      expect(detector.provision.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(detector.provision.size_bytes).toBeGreaterThan(0)
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
