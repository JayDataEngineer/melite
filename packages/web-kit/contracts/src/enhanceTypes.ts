/** An LLM enhancement provider (library enhance panel). */
export interface EnhanceModel {
  id: string
  name: string
  baseUrl: string // e.g. "https://api.openai.com/v1"
  apiKey: string // Only used temporarily, not persisted
  model: string // e.g. "gpt-4o-mini"
  keyId?: string // Backend key ID for secure storage
}
