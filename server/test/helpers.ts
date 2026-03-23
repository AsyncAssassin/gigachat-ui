import type { ServerEnv } from '../config/env'

export function createTestEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    port: 8787,
    gigachatAuthKey: 'test-auth-key-base64',
    gigachatScope: 'GIGACHAT_API_PERS',
    gigachatAuthUrl: 'https://auth.example.test/oauth',
    gigachatApiUrl: 'https://api.example.test/api/v1',
    ...overrides,
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export function createFetchMock(sequence: Array<Response | (() => Response)>): typeof fetch {
  let index = 0

  return vi.fn(async () => {
    const item = sequence[index]

    if (!item) {
      throw new Error(`No mocked response for fetch call #${index + 1}`)
    }

    index += 1
    return typeof item === 'function' ? item() : item
  }) as unknown as typeof fetch
}
