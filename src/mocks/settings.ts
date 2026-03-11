import type { Option } from '../types/common'
import type { ChatSettings, ModelId } from '../types/settings'

export const modelOptions: Option<ModelId>[] = [
  { label: 'GigaChat', value: 'gigachat' },
  { label: 'GigaChat-Plus', value: 'gigachat-plus' },
  { label: 'GigaChat-Pro', value: 'gigachat-pro' },
  { label: 'GigaChat-Max', value: 'gigachat-max' },
]

export const defaultSettings: ChatSettings = {
  model: 'gigachat',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  systemPrompt: 'Ты полезный ассистент по frontend-разработке.',
  theme: 'light',
}
