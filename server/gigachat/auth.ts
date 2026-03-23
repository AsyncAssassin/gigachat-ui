import { randomUUID } from 'node:crypto'
import { AppError } from '../lib/errors'
import type { Logger } from '../lib/logger'
import type { FetchLike } from '../types'
import type { ServerEnv } from '../config/env'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

interface OAuthResponse {
  access_token?: string
  expires_at?: number
  expires_in?: number
}

const TOKEN_REFRESH_BUFFER_MS = 60_000

export class OAuthTokenProvider {
  private readonly env: ServerEnv
  private readonly fetcher: FetchLike
  private readonly logger: Logger
  private readonly now: () => number
  private cache: TokenCache | null = null

  constructor(options: {
    env: ServerEnv
    fetcher?: FetchLike
    logger: Logger
    now?: () => number
  }) {
    this.env = options.env
    this.fetcher = options.fetcher ?? fetch
    this.logger = options.logger
    this.now = options.now ?? Date.now
  }

  public invalidate(): void {
    this.cache = null
  }

  public async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cache && this.isTokenValid(this.cache)) {
      return this.cache.accessToken
    }

    const body = new URLSearchParams({
      scope: this.env.gigachatScope,
    })

    const response = await this.fetcher(this.env.gigachatAuthUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.env.gigachatAuthKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        RqUID: randomUUID(),
      },
      body,
    })

    if (!response.ok) {
      this.logger.error('OAuth token request failed', { status: response.status })
      throw new AppError(
        response.status,
        'AUTH_UPSTREAM_ERROR',
        'Failed to authenticate with GigaChat OAuth endpoint',
      )
    }

    let payload: OAuthResponse

    try {
      payload = (await response.json()) as OAuthResponse
    } catch {
      throw new AppError(502, 'AUTH_PARSE_ERROR', 'Invalid OAuth response from GigaChat')
    }

    if (!payload.access_token) {
      throw new AppError(502, 'AUTH_TOKEN_MISSING', 'OAuth response does not contain access token')
    }

    const expiresAt = resolveExpiresAt(payload, this.now())
    this.cache = {
      accessToken: payload.access_token,
      expiresAt,
    }

    return payload.access_token
  }

  private isTokenValid(cache: TokenCache): boolean {
    return cache.expiresAt - TOKEN_REFRESH_BUFFER_MS > this.now()
  }
}

function resolveExpiresAt(payload: OAuthResponse, now: number): number {
  if (typeof payload.expires_at === 'number' && Number.isFinite(payload.expires_at)) {
    return payload.expires_at
  }

  if (typeof payload.expires_in === 'number' && Number.isFinite(payload.expires_in)) {
    return now + payload.expires_in * 1000
  }

  return now + 30 * 60 * 1000
}
