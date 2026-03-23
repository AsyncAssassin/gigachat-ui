export interface ErrorEnvelope {
  error: {
    code: string
    message: string
    status: number
  }
}

export class AppError extends Error {
  public readonly status: number
  public readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}

export function toErrorEnvelope(error: unknown): ErrorEnvelope {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
      },
    }
  }

  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      status: 500,
    },
  }
}

export function getHttpStatus(error: unknown): number {
  if (error instanceof AppError) {
    return error.status
  }

  return 500
}
