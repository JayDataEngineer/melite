import type { Context } from '@deepseek-ai/cordis';
export { parseValidateRigOutput, validateRigReport, ValidateRigOutputError } from './validateRigReport.js';
export type { ValidateRigJson, ValidateRigOutput, ValidateRigViolation } from './validateRigReport.js';
export declare const inject: string[];
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare function apply(ctx: Context): void;
//# sourceMappingURL=card.d.ts.map
