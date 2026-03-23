export interface Logger {
  info: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, data?: unknown) => void
}

const BEARER_TOKEN_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi
const BASIC_TOKEN_REGEX = /Basic\s+[A-Za-z0-9+/=]+/gi
const AUTH_KEY_ASSIGNMENT_REGEX = /(GIGACHAT_AUTH_KEY\s*[:=]\s*)[^\s"']+/gi

export function sanitizeLogData(input: unknown): unknown {
  if (typeof input === 'string') {
    return input
      .replace(BEARER_TOKEN_REGEX, 'Bearer ***')
      .replace(BASIC_TOKEN_REGEX, 'Basic ***')
      .replace(AUTH_KEY_ASSIGNMENT_REGEX, '$1***')
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeLogData(item))
  }

  if (input && typeof input === 'object') {
    const output: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(input)) {
      if (/authorization|token|auth_key|credential|secret/i.test(key)) {
        output[key] = '***'
      } else {
        output[key] = sanitizeLogData(value)
      }
    }

    return output
  }

  return input
}

export function createLogger(): Logger {
  return {
    info: (message, data) => {
      if (data === undefined) {
        console.info(message)
        return
      }

      console.info(message, sanitizeLogData(data))
    },
    warn: (message, data) => {
      if (data === undefined) {
        console.warn(message)
        return
      }

      console.warn(message, sanitizeLogData(data))
    },
    error: (message, data) => {
      if (data === undefined) {
        console.error(message)
        return
      }

      console.error(message, sanitizeLogData(data))
    },
  }
}
