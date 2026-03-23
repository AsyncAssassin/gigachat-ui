import type { Option } from '../types/common'
import type { ChatSettings, ModelId } from '../types/settings'

export const modelOptions: Option<ModelId>[] = [
  { label: 'GigaChat', value: 'GigaChat' },
  { label: 'GigaChat-Plus', value: 'GigaChat-Plus' },
  { label: 'GigaChat-Pro', value: 'GigaChat-Pro' },
  { label: 'GigaChat-Max', value: 'GigaChat-Max' },
]

export const defaultSettings: ChatSettings = {
  model: 'GigaChat',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  repetitionPenalty: 1,
  systemPrompt: 'Ты полезный ассистент по frontend-разработке.',
  theme: 'light',
}
