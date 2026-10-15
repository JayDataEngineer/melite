import type { BenchReport } from '@melite/contracts';
export type ValidateRigJson = null | boolean | number | string | ValidateRigJson[] | {
    [key: string]: ValidateRigJson;
};
export type ValidateRigViolation = readonly [
    severity: 'CRITICAL' | 'WARNING',
    message: string
];
export interface ValidateRigOutput {
    readonly passed: boolean;
    readonly violations: readonly ValidateRigViolation[];
    readonly stats: Readonly<Record<string, ValidateRigJson>>;
}
export declare class ValidateRigOutputError extends Error {
    readonly path: string;
    constructor(path: string, detail: string);
}
export declare function parseValidateRigOutput(value: unknown): ValidateRigOutput;
export declare function validateRigReport(value: unknown): BenchReport;
//# sourceMappingURL=validateRigReport.d.ts.map