export type ImpactDetectorId = 'person' | 'face' | 'hand'

export interface ImpactProvision {
  readonly name: string
  readonly url: string
  readonly folder: string
  readonly sha256: string
  readonly size_bytes: number
}

export interface ImpactDetectorFacts {
  graphPath: string
  provision: ImpactProvision
  providerNode: 'UltralyticsDetectorProvider'
  providerOutput: 0 | 1
  detectorNode: 'SegmDetectorSEGS' | 'BboxDetectorSEGS'
  detectorInput: 'segm_detector' | 'bbox_detector'
}

export const IMPACT_DETECTOR_IDS: readonly ImpactDetectorId[] = ['person', 'face', 'hand']

export const IMPACT_DETECTORS: Readonly<Record<ImpactDetectorId, ImpactDetectorFacts>> = Object.freeze({
  person: Object.freeze({
    graphPath: 'segm/person_yolov8m-seg.pt',
    provision: Object.freeze({
      name: 'person_yolov8m-seg.pt',
      url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt',
      folder: 'ultralytics/segm',
      sha256: 'c8ab26f517173b1fe8342d336a09f443eb61cb08dcbfc78d53fff4c2547ae81e',
      size_bytes: 54827683,
    }),
    providerNode: 'UltralyticsDetectorProvider',
    providerOutput: 1,
    detectorNode: 'SegmDetectorSEGS',
    detectorInput: 'segm_detector',
  }),
  face: Object.freeze({
    graphPath: 'bbox/face_yolov8m.pt',
    provision: Object.freeze({
      name: 'face_yolov8m.pt',
      url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt',
      folder: 'ultralytics/bbox',
      sha256: '717923c19b3f4bbf5250b728f1fa6b2cb72a33aed1d236ea9caf0e21ad943e5f',
      size_bytes: 52026019,
    }),
    providerNode: 'UltralyticsDetectorProvider',
    providerOutput: 0,
    detectorNode: 'BboxDetectorSEGS',
    detectorInput: 'bbox_detector',
  }),
  hand: Object.freeze({
    graphPath: 'bbox/hand_yolov8s.pt',
    provision: Object.freeze({
      name: 'hand_yolov8s.pt',
      url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt',
      folder: 'ultralytics/bbox',
      sha256: '70b540063fbc385736d8258970744a4afbc4cbf7932134bae3b24cdadeadec06',
      size_bytes: 22507643,
    }),
    providerNode: 'UltralyticsDetectorProvider',
    providerOutput: 0,
    detectorNode: 'BboxDetectorSEGS',
    detectorInput: 'bbox_detector',
  }),
})

export const IMPACT_DETECTOR_PROVISIONS: readonly ImpactProvision[] = Object.freeze(
  IMPACT_DETECTOR_IDS.map((id) => IMPACT_DETECTORS[id].provision),
)

export const IMPACT_PACKS = Object.freeze([
  'comfyui-impact-pack',
  'comfyui-impact-subpack',
] as const)

export function impactDetector(id: string): ImpactDetectorFacts {
  const detector = IMPACT_DETECTORS[id as ImpactDetectorId]
  if (detector === undefined) {
    throw new Error(`unknown Impact detector '${id}' — expected ${IMPACT_DETECTOR_IDS.join(', ')}`)
  }
  return detector
}

export function impactArmNames(ids: readonly string[]): string[] {
  return [...new Set(ids
    .filter((id): id is ImpactDetectorId => IMPACT_DETECTOR_IDS.includes(id as ImpactDetectorId))
    .map((id) => IMPACT_DETECTORS[id].provision.name))]
}
