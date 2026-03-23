import { AppError } from '../lib/errors'
import type { Logger } from '../lib/logger'
import type { FetchLike } from '../types'
import type { ServerEnv } from '../config/env'
import { OAuthTokenProvider } from './auth'

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant'
  content: string
  attachments?: string[]
}

export interface CompletionPayload {
  model: string
  messages: ChatMessagePayload[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  repetition_penalty?: number
  stream?: boolean
}

export interface UploadFilePayload {
  bytes: Uint8Array
  mimeType: string
  fileName: string
}

export class GigaChatClient {
  private readonly env: ServerEnv
  private readonly fetcher: FetchLike
  private readonly tokenProvider: OAuthTokenProvider
  private readonly logger: Logger

  constructor(options: {
    env: ServerEnv
    tokenProvider: OAuthTokenProvider
    logger: Logger
    fetcher?: FetchLike
  }) {
    this.env = options.env
    this.tokenProvider = options.tokenProvider
    this.fetcher = options.fetcher ?? fetch
    this.logger = options.logger
  }

  public async getModels(): Promise<unknown> {
    const response = await this.request('/models', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    return parseJson(response, 'Failed to parse models response from GigaChat')
  }

  public async createCompletion(payload: CompletionPayload): Promise<unknown> {
    const response = await this.request('/chat/completions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    return parseJson(response, 'Failed to parse completion response from GigaChat')
  }

  public async uploadFile(payload: UploadFilePayload): Promise<{ id: string }> {
    const formData = new FormData()
    const blob = new Blob([payload.bytes], { type: payload.mimeType })
    formData.append('file', blob, payload.fileName)
    formData.append('purpose', 'general')

    const response = await this.request('/files', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    })

    const result = await parseJson(response, 'Failed to parse file upload response from GigaChat')
    if (!result || typeof result !== 'object') {
      throw new AppError(502, 'UPSTREAM_INVALID_JSON', 'Invalid file upload response from GigaChat')
    }

    const fileId = (result as { id?: unknown }).id
    if (typeof fileId !== 'string' || fileId.length === 0) {
      throw new AppError(502, 'UPSTREAM_INVALID_JSON', 'GigaChat upload response does not contain file id')
    }

    return { id: fileId }
  }

  public async createCompletionStream(
    payload: CompletionPayload,
    signal?: AbortSignal,
  ): Promise<Response> {
    const response = await this.request(
      '/chat/completions',
      {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      signal,
    )

    const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/event-stream')) {
      const text = await safeReadText(response)
      throw new AppError(
        502,
        'UPSTREAM_STREAM_UNAVAILABLE',
        text || 'GigaChat did not return an event stream',
      )
    }

    if (!response.body) {
      throw new AppError(
        502,
        'UPSTREAM_STREAM_UNAVAILABLE',
        'GigaChat stream response body is empty',
      )
    }

    return response
  }

  private async request(path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    const firstToken = await this.tokenProvider.getAccessToken()
    const firstResponse = await this.fetchAuthorized(path, init, firstToken, signal)

    if (firstResponse.status !== 401) {
      if (!firstResponse.ok) {
        throw await mapUpstreamError(firstResponse)
      }

      return firstResponse
    }

    this.logger.warn('GigaChat request returned 401, refreshing token and retrying once')
    this.tokenProvider.invalidate()

    const refreshedToken = await this.tokenProvider.getAccessToken(true)
    const retryResponse = await this.fetchAuthorized(path, init, refreshedToken, signal)

    if (!retryResponse.ok) {
      throw await mapUpstreamError(retryResponse)
    }

    return retryResponse
  }

  private async fetchAuthorized(
    path: string,
    init: RequestInit,
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)

    return this.fetcher(`${this.env.gigachatApiUrl}${path}`, {
      ...init,
      headers,
      signal,
    })
  }
}

async function parseJson(response: Response, errorMessage: string): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new AppError(502, 'UPSTREAM_INVALID_JSON', errorMessage)
  }
}

async function mapUpstreamError(response: Response): Promise<AppError> {
  const payloadText = await safeReadText(response)

  if (response.status === 401 || response.status === 403) {
    return new AppError(401, 'UPSTREAM_UNAUTHORIZED', payloadText || 'GigaChat authorization failed')
  }

  if (response.status === 429) {
    return new AppError(429, 'UPSTREAM_RATE_LIMIT', payloadText || 'GigaChat rate limit reached')
  }

  if (response.status >= 500) {
    return new AppError(502, 'UPSTREAM_SERVER_ERROR', payloadText || 'GigaChat upstream server error')
  }

  return new AppError(400, 'UPSTREAM_BAD_REQUEST', payloadText || 'GigaChat rejected the request')
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) {
      return ''
    }

    try {
      const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } }
      return parsed.error?.message ?? parsed.message ?? text
    } catch {
      return text
    }
  } catch {
    return ''
  }
}
