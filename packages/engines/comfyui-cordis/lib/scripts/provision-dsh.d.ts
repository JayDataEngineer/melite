export declare const DSH_PROVISIONER: string;
export declare const DSH_PROVISIONER_NAME = "@melite/harness-provisioner";
export declare const DSH_HARNESS_HOME: string;
export declare const DSH_PROFILE = "estate";
export declare const DSH_PROFILE_BUNDLES: readonly string[];
export declare function resolveDshLaunch(): string[];
export declare function materializeProfile(home: string): string;
export declare function cmdDsh(): void;
