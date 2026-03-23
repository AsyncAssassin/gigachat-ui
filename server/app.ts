import cors from 'cors'
import express from 'express'
import type { ServerEnv } from './config/env'
import { loadEnv } from './config/env'
import { OAuthTokenProvider } from './gigachat/auth'
import { GigaChatClient } from './gigachat/client'
import { createGigaChatRouter } from './gigachat/routes'
import { AppError, toErrorEnvelope } from './lib/errors'
import { createLogger, type Logger } from './lib/logger'
import type { FetchLike } from './types'

interface CreateAppOptions {
  env?: ServerEnv
  fetcher?: FetchLike
  logger?: Logger
}

export function createApp(options: CreateAppOptions = {}) {
  const env = options.env ?? loadEnv()
  const logger = options.logger ?? createLogger()
  const fetcher = options.fetcher ?? fetch

  const tokenProvider = new OAuthTokenProvider({
    env,
    fetcher,
    logger,
  })

  const client = new GigaChatClient({
    env,
    fetcher,
    tokenProvider,
    logger,
  })

  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' })
  })

  app.use('/api', createGigaChatRouter({ client, logger }))

  app.use((_request, response) => {
    response.status(404).json(
      toErrorEnvelope(new AppError(404, 'NOT_FOUND', 'Requested endpoint was not found')),
    )
  })

  return app
}
