import type { MessageRole } from '../types/message'
import type { ImageAttachmentInput } from '../types/attachment'

type CompletionMessageRole = MessageRole | 'system'
export interface CompletionMessage {
  role: CompletionMessageRole
  content: string
}

export interface CompletionRequest {
  model: string
  messages: CompletionMessage[]
  temperature: number
  top_p: number
  max_tokens: number
  repetition_penalty: number
  stream: boolean
  attachments?: ImageAttachmentInput[]
}

export interface StreamCompletionResult {
  hasChunks: boolean
  content: string
}

interface StreamCompletionOptions {
  signal?: AbortSignal
  onDelta?: (chunk: string) => void
  onDone?: () => void
}

interface ErrorResponsePayload {
  error?: {
    message?: string
  }
}

export async function fetchGigaChatModels(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/models', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Failed to load models'))
  }

  const payload = (await response.json()) as {
    data?: Array<{ id?: string }>
    models?: Array<{ id?: string }>
  }

  const source = payload.data ?? payload.models ?? []
  const models = source.map((item) => item.id).filter((value): value is string => Boolean(value))

  return models
}

export async function createGigaChatCompletion(
  request: CompletionRequest,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Completion request failed'))
  }

  return response.json()
}

export async function streamGigaChatCompletion(
  request: CompletionRequest,
  options: StreamCompletionOptions = {},
): Promise<StreamCompletionResult> {
  const { signal, onDelta, onDone } = options

  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Streaming request failed'))
  }

  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
  if (!contentType.includes('text/event-stream')) {
    throw new Error('Streaming is unavailable for this response')
  }

  if (!response.body) {
    throw new Error('Streaming response body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let hasChunks = false
  let content = ''
  let isDone = false

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (!value || value.length === 0) {
        continue
      }

      buffer += decoder.decode(value, { stream: true }).replaceAll('\r\n', '\n')
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        const parsedEvent = parseSSEEvent(event)

        if (!parsedEvent) {
          continue
        }

        if (parsedEvent.done) {
          isDone = true
          break
        }

        if (!parsedEvent.delta) {
          continue
        }

        hasChunks = true
        content += parsedEvent.delta
        onDelta?.(parsedEvent.delta)
      }

      if (isDone) {
        break
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!isDone && buffer.trim()) {
    const parsedTail = parseSSEEvent(buffer)
    if (parsedTail?.delta) {
      hasChunks = true
      content += parsedTail.delta
      onDelta?.(parsedTail.delta)
    }
  }

  onDone?.()
  return { hasChunks, content }
}

export function extractAssistantTextFromCompletion(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const source = payload as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  return source.choices?.[0]?.message?.content ?? ''
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as ErrorResponsePayload
    return payload.error?.message ?? fallback
  } catch {
    return fallback
  }
}

function parseSSEEvent(event: string): { done: boolean; delta: string } | null {
  const lines = event
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return null
  }

  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())

  if (dataLines.length === 0) {
    return null
  }

  const payload = dataLines.join('\n').trim()
  if (!payload) {
    return null
  }

  if (payload === '[DONE]') {
    return { done: true, delta: '' }
  }

  return {
    done: false,
    delta: extractStreamDelta(payload),
  }
}

function extractStreamDelta(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { content?: string | null }
        message?: { content?: string | null }
      }>
      delta?: { content?: string | null }
      message?: { content?: string | null }
      content?: string | null
    }

    return (
      parsed.choices?.[0]?.delta?.content ??
      parsed.choices?.[0]?.message?.content ??
      parsed.delta?.content ??
      parsed.message?.content ??
      parsed.content ??
      ''
    )
  } catch {
    return payload
  }
}
