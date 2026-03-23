/** @vitest-environment node */
import { sanitizeLogData } from '../lib/logger'

describe('sanitizeLogData', () => {
  it('redacts auth-related values', () => {
    const payload = {
      authorization: 'Bearer abc123',
      nested: {
        token: 'secret-token',
      },
      plainText: 'Authorization: Basic dGVzdDp0ZXN0',
      envStyle: 'GIGACHAT_AUTH_KEY=top-secret',
    }

    const result = sanitizeLogData(payload) as Record<string, unknown>

    expect(result.authorization).toBe('***')
    expect((result.nested as Record<string, unknown>).token).toBe('***')
    expect(result.plainText).toBe('Authorization: Basic ***')
    expect(result.envStyle).toBe('GIGACHAT_AUTH_KEY=***')
  })
})
