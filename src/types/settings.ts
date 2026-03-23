import type { ThemeMode } from './common'

export type ModelId = string

export interface ChatSettings {
  model: ModelId
  temperature: number
  topP: number
  maxTokens: number
  repetitionPenalty: number
  systemPrompt: string
  theme: ThemeMode
}
