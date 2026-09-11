interface ImportMetaEnv { readonly [key: string]: string | boolean | undefined }
interface ImportMeta { readonly env: ImportMetaEnv }
interface ImportMetaGlobResult { [path: string]: () => Promise<unknown> }
interface ImportMeta {
  readonly env: ImportMetaEnv
  glob(pattern: string): ImportMetaGlobResult
  glob<T>(pattern: string): { [path: string]: () => Promise<T> }
  // Array form (vite/client-types parity): positive + "!" exclusions —
  // the SHELL-UNIVERSE SEAM in cardStudios.ts evicts fiber tenants here.
  glob(patterns: string[]): ImportMetaGlobResult
  glob<T>(patterns: string[]): { [path: string]: () => Promise<T> }
}
