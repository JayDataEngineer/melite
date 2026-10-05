export type ImpactDetectorId = 'person' | 'face' | 'hand';
export interface ImpactProvision {
    readonly name: string;
    readonly url: string;
    readonly folder: string;
    readonly sha256: string;
    readonly size_bytes: number;
}
export interface ImpactDetectorFacts {
    graphPath: string;
    provision: ImpactProvision;
    providerNode: 'UltralyticsDetectorProvider';
    providerOutput: 0 | 1;
    detectorNode: 'SegmDetectorSEGS' | 'BboxDetectorSEGS';
    detectorInput: 'segm_detector' | 'bbox_detector';
}
export declare const IMPACT_DETECTOR_IDS: readonly ImpactDetectorId[];
export declare const IMPACT_DETECTORS: Readonly<Record<ImpactDetectorId, ImpactDetectorFacts>>;
export declare const IMPACT_DETECTOR_PROVISIONS: readonly ImpactProvision[];
export declare const IMPACT_PACKS: readonly ["comfyui-impact-pack", "comfyui-impact-subpack"];
export declare function impactDetector(id: string): ImpactDetectorFacts;
export declare function impactArmNames(ids: readonly string[]): string[];
//# sourceMappingURL=impact.d.ts.map
