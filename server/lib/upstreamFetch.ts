import { readFileSync } from 'node:fs'
import { Agent } from 'undici'
import type { ServerEnv } from '../config/env'
import type { Logger } from './logger'
import type { FetchLike } from '../types'

export function createUpstreamFetch(env: ServerEnv, logger: Logger): FetchLike {
  if (!env.gigachatCaCertPath) {
    return fetch
  }

  const certPath = env.gigachatCaCertPath
  let certificatePem: string

  try {
    certificatePem = readFileSync(certPath, 'utf8')
  } catch (error) {
    throw new Error(
      `Invalid GIGACHAT_CA_CERT_PATH. Could not read certificate file: ${certPath}. ${toErrorMessage(error)}`,
    )
  }

  const dispatcher = new Agent({
    connect: {
      ca: certificatePem,
      rejectUnauthorized: true,
    },
  })

  logger.info('Custom TLS CA certificate is enabled for upstream fetch', {
    certPath,
  })

  return (input, init) => {
    const nextInit = {
      ...(init ?? {}),
      dispatcher,
    }

    return fetch(input, nextInit as unknown as RequestInit)
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown error'
}
