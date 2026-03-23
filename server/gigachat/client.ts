import { AppError } from '../lib/errors'
import type { Logger } from '../lib/logger'
import type { FetchLike } from '../types'
import type { ServerEnv } from '../config/env'
import { OAuthTokenProvider } from './auth'

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant'
  content: string
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

  private async request(path: string, init: RequestInit): Promise<Response> {
    const firstToken = await this.tokenProvider.getAccessToken()
    const firstResponse = await this.fetchAuthorized(path, init, firstToken)

    if (firstResponse.status !== 401) {
      if (!firstResponse.ok) {
        throw await mapUpstreamError(firstResponse)
      }

      return firstResponse
    }

    this.logger.warn('GigaChat request returned 401, refreshing token and retrying once')
    this.tokenProvider.invalidate()

    const refreshedToken = await this.tokenProvider.getAccessToken(true)
    const retryResponse = await this.fetchAuthorized(path, init, refreshedToken)

    if (!retryResponse.ok) {
      throw await mapUpstreamError(retryResponse)
    }

    return retryResponse
  }

  private async fetchAuthorized(path: string, init: RequestInit, accessToken: string): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)

    return this.fetcher(`${this.env.gigachatApiUrl}${path}`, {
      ...init,
      headers,
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
