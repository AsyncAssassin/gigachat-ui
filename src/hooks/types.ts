import type { ChangeEvent, FormEvent } from 'react'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt?: Date
}

export interface UseChatOptions {
  api?: string
  initialMessages?: Message[]
  onFinish?: (message: Message) => void
  onError?: (error: Error) => void
  fetcher?: typeof fetch
}

export interface UseChatResult {
  messages: Message[]
  input: string
  handleInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  isLoading: boolean
  error: Error | null
  stop: () => void
  reload: () => Promise<void>
  setMessages: (messages: Message[]) => void
}

export interface StreamMetadata {
  startTime: number | null
  endTime: number | null
  responseTime: string
  chunkCount: number
}

export interface EventSourceLike {
  close: () => void
  onmessage: ((event: MessageEvent<string>) => void) | null
  onerror: ((event: Event) => void) | null
}

export interface UseStreamingResponseOptions {
  url: string
  enabled?: boolean
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  onChunk?: (chunk: string) => void
  onComplete?: (fullText: string) => void
  onError?: (error: Error) => void
  parseChunk?: (rawChunk: Uint8Array) => string
  transport?: 'fetch' | 'sse'
  retryCount?: number
  retryDelayMs?: number
  retryMultiplier?: number
  throttleMs?: number
  fetcher?: typeof fetch
  eventSourceFactory?: (url: string) => EventSourceLike
}

export interface UseStreamingResponseResult {
  data: string
  isStreaming: boolean
  error: Error | null
  streamedChunks: string[]
  metadata: StreamMetadata
  startStream: () => Promise<void>
  abort: () => void
  reset: () => void
}
