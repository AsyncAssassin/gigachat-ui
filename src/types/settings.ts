import type { ThemeMode } from './common'

export type ModelId =
  | 'gigachat'
  | 'gigachat-plus'
  | 'gigachat-pro'
  | 'gigachat-max'

export interface ChatSettings {
  model: ModelId
  temperature: number
  topP: number
  maxTokens: number
  systemPrompt: string
  theme: ThemeMode
}
