import type { MessageRole } from '../types/message'

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
