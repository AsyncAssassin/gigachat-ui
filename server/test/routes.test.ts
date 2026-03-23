/** @vitest-environment node */
import request from 'supertest'
import type { Response as SuperAgentResponse } from 'superagent'
import { createApp } from '../app'
import type { Logger } from '../lib/logger'
import { createFetchMock, createTestEnv, jsonResponse, sseResponse, textResponse } from './helpers'

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

function parseStreamBody(
  response: SuperAgentResponse,
  callback: (error: Error | null, body: unknown) => void,
) {
  const stream = response as unknown as NodeJS.ReadableStream & {
    setEncoding: (encoding: BufferEncoding) => void
  }

  let body = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    body += chunk
  })
  stream.on('end', () => {
    callback(null, body)
  })
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

  it('POST /api/chat/completions streams SSE response for stream=true', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app)
      .post('/api/chat/completions')
      .buffer(true)
      .parse(parseStreamBody)
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(response.body).toContain('data: {"choices":[{"delta":{"content":"Hel"}}]}')
    expect(response.body).toContain('data: [DONE]')
  })

  it('POST /api/chat/completions maps unavailable stream response to envelope', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('upstream returned non-stream payload', 200),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app)
      .post('/api/chat/completions')
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })

    expect(response.status).toBe(502)
    expect(response.body).toEqual({
      error: {
        code: 'UPSTREAM_STREAM_UNAVAILABLE',
        message: 'upstream returned non-stream payload',
        status: 502,
      },
    })
  })

  it('POST /api/chat/completions refreshes token once after upstream 401 for stream=true', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      textResponse('Unauthorized upstream', 401),
      jsonResponse({ access_token: 'token-2', expires_at: Date.now() + 60_000 * 10 }),
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    ])

    const app = createApp({ env: createTestEnv(), fetcher })
    const response = await request(app)
      .post('/api/chat/completions')
      .buffer(true)
      .parse(parseStreamBody)
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/event-stream')
    expect(response.body).toContain('data: {"choices":[{"delta":{"content":"Hello"}}]}')
    expect(fetcher).toHaveBeenCalledTimes(4)
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

  it('POST /api/chat/completions validates attachment mime type', async () => {
    const fetcher = createFetchMock([])
    const app = createApp({ env: createTestEnv(), fetcher })

    const response = await request(app)
      .post('/api/chat/completions')
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Что на изображении?' }],
        attachments: [
          {
            mimeType: 'image/gif',
            fileName: 'bad.gif',
            base64: 'Zm9v',
          },
        ],
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUEST')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('POST /api/chat/completions uploads attachment and injects file id into last user message', async () => {
    const fetcher = createFetchMock([
      jsonResponse({ access_token: 'token-1', expires_at: Date.now() + 60_000 * 10 }),
      jsonResponse({ id: 'file-123' }),
      jsonResponse({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'На изображении кот.',
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
        messages: [
          { role: 'system', content: 'Ты помощник' },
          { role: 'user', content: 'Опиши изображение' },
        ],
        attachments: [
          {
            mimeType: 'image/png',
            fileName: 'cat.png',
            base64: 'aW1hZ2UtYmluYXJ5',
          },
        ],
        stream: false,
      })

    expect(response.status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(3)

    const uploadCall = (fetcher as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[1]
    expect(uploadCall?.[0]).toBe('https://api.example.test/api/v1/files')
    const uploadBody = uploadCall?.[1].body as FormData
    expect(uploadBody).toBeInstanceOf(FormData)
    expect(uploadBody.get('purpose')).toBe('general')
    expect(uploadBody.get('file')).toBeTruthy()

    const completionCall = (fetcher as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[2]
    expect(completionCall?.[0]).toBe('https://api.example.test/api/v1/chat/completions')
    const completionBody = JSON.parse(String(completionCall?.[1].body)) as {
      attachments?: unknown
      messages: Array<{ role: string; content: string; attachments?: string[] }>
    }

    expect(completionBody.attachments).toBeUndefined()
    expect(completionBody.messages[1]?.attachments).toEqual(['file-123'])
  })

  it('logger output does not leak auth key or bearer token in streaming path', async () => {
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

    await request(app)
      .post('/api/chat/completions')
      .send({
        model: 'GigaChat',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      })

    const combinedLogs = logs.join(' ')
    expect(combinedLogs).not.toContain(authKey)
    expect(combinedLogs).not.toMatch(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/)
  })
})
