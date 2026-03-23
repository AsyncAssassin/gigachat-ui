/** @vitest-environment node */
import request from 'supertest'
import { createApp } from '../app'
import type { Logger } from '../lib/logger'
import { createFetchMock, createTestEnv, jsonResponse, textResponse } from './helpers'

function createLoggerSpy() {
  const logs: string[] = []

  const logger: Logger = {
    info: vi.fn((message: string, data?: unknown) => {
      logs.push(`${message} ${JSON.stringify(data ?? null)}`)
    }),
    warn: vi.fn((message: string, data?: unknown) => {
      logs.push(`${message} ${JSON.stringify(data ?? null)}`)
    }),
    error: vi.fn((message: string, data?: unknown) => {
      logs.push(`${message} ${JSON.stringify(data ?? null)}`)
    }),
  }

  return { logger, logs }
}

describe('server routes', () => {
  it('GET /api/models returns upstream payload', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      jsonResponse({ data: [{ id: 'GigaChat' }] }),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app).get('/api/models')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: [{ id: 'GigaChat' }] })
  })

  it('GET /api/models maps upstream 401 to local error envelope', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('Unauthorized upstream', 401),
      jsonResponse({ access_token: 'token-2', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('Unauthorized upstream', 401),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app).get('/api/models')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      error: {
        code: 'UPSTREAM_UNAUTHORIZED',
        message: 'Unauthorized upstream',
        status: 401,
      },
    })
  })

  it('GET /api/models maps upstream 500 to local 502 envelope', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('Upstream crash', 500),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app).get('/api/models')

    expect(response.status).toBe(502)
    expect(response.body).toEqual({
      error: {
        code: 'UPSTREAM_SERVER_ERROR',
        message: 'Upstream crash',
        status: 502,
      },
    })
  })

  it('POST /api/chat/completions validates payload', async () => {
    const fetcher = createFetchMock([])
    const app = createApp({ env: createTestEnv(), fetcher })

    const response = await request(app)
      .post('/api/chat/completions')
      .send({ model: 'GigaChat', messages: [] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUEST')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('POST /api/chat/completions rejects stream=true in PR-2', async () => {
    const fetcher = createFetchMock([])
    const app = createApp({ env: createTestEnv(), fetcher })

    const response = await request(app)
      .post('/api/chat/completions')
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'STREAM_NOT_SUPPORTED_IN_PR2',
        message: 'Streaming is not supported in PR-2. Use stream=false.',
        status: 400,
      },
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('POST /api/chat/completions refreshes token once after upstream 401', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('Unauthorized upstream', 401),
      jsonResponse({ access_token: 'token-2', expires_at: Date.now() + 60_000 * 10 }),
      jsonResponse({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello from upstream',
            },
          },
        ],
      }),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app)
      .post('/api/chat/completions')
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
      })

    expect(response.status).toBe(200)
    expect(response.body.choices[0].message.content).toBe('Hello from upstream')
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('POST /api/chat/completions maps upstream 429', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('Too many requests', 429),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app)
      .post('/api/chat/completions')
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
      })

    expect(response.status).toBe(429)
    expect(response.body).toEqual({
      error: {
        code: 'UPSTREAM_RATE_LIMIT',
        message: 'Too many requests',
        status: 429,
      },
    })
  })

  it('logger output does not leak auth key or bearer token', async () => {
    const { logger, logs } = createLoggerSpy()
    const fetcher = createFetchMock([
      textResponse('auth failed', 401),
    ])

    const authKey = 'leaky-auth-key'
    const app = createApp({
      env: createTestEnv({ gigachatAuthKey: authKey }),
      fetcher,
      logger,
    })

    await request(app).get('/api/models')

    const combinedLogs = logs.join(' ')
    expect(combinedLogs).not.toContain(authKey)
    expect(combinedLogs).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/)
  })
})
