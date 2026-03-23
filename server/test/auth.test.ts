/** @vitest-environment node */
import { OAuthTokenProvider } from '../gigachat/auth'
import { createLogger } from '../lib/logger'
import { createFetchMock, createTestEnv, jsonResponse } from './helpers'

describe('OAuthTokenProvider', () => {
  it('reuses cached token while it is valid', async () => {
    const now = 1_700_000_000_000
    const fetcher = createFetchMock([
      jsonResponse({
        access_token: 'token-1',
        expires_at: now + 10 * 60 * 1000,
      }),
    ])

    const provider = new OAuthTokenProvider({
      env: createTestEnv(),
      fetcher,
      logger: createLogger(),
      now: () => now,
    })

    const firstToken = await provider.getAccessToken()
    const secondToken = await provider.getAccessToken()

    expect(firstToken).toBe('token-1')
    expect(secondToken).toBe('token-1')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refreshes token when cached value is near expiration', async () => {
    let now = 1_700_000_000_000
    const fetcher = createFetchMock([
      jsonResponse({
        access_token: 'token-1',
        expires_at: now + 59_000,
      }),
      jsonResponse({
        access_token: 'token-2',
        expires_at: now + 10 * 60 * 1000,
      }),
    ])

    const provider = new OAuthTokenProvider({
      env: createTestEnv(),
      fetcher,
      logger: createLogger(),
      now: () => now,
    })

    const firstToken = await provider.getAccessToken()
    now += 100
    const secondToken = await provider.getAccessToken()

    expect(firstToken).toBe('token-1')
    expect(secondToken).toBe('token-2')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
