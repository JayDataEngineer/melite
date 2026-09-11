interface ImportMetaEnv { readonly [key: string]: string | boolean | undefined }
interface ImportMeta { readonly env: ImportMetaEnv }
interface ImportMetaGlobResult { [path: string]: () => Promise<unknown> }
interface ImportMeta {
  readonly env: ImportMetaEnv
  glob(pattern: string): ImportMetaGlobResult
  glob<T>(pattern: string): { [path: string]: () => Promise<T> }
  // Array form (mirrors src/old/vite-env.d.ts — the main program excludes
  // src/old, so it needs its own copy for files it reaches transitively).
  glob(patterns: string[]): ImportMetaGlobResult
  glob<T>(patterns: string[]): { [path: string]: () => Promise<T> }
}
