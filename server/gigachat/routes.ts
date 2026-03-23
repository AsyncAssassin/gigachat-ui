import { Router } from 'express'
import { z } from 'zod'
import { AppError, getHttpStatus, toErrorEnvelope } from '../lib/errors'
import type { Logger } from '../lib/logger'
import type { GigaChatClient } from './client'

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
})

const completionPayloadSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(8192).optional(),
  repetition_penalty: z.number().min(0).max(10).optional(),
  stream: z.boolean().optional().default(false),
})

export function createGigaChatRouter(options: { client: GigaChatClient; logger: Logger }) {
  const router = Router()
  const { client, logger } = options

  router.get('/models', async (_request, response) => {
    try {
      const payload = await client.getModels()
      response.status(200).json(payload)
    } catch (error) {
      logger.error('GET /api/models failed', { status: getHttpStatus(error), code: getErrorCode(error) })
      response.status(getHttpStatus(error)).json(toErrorEnvelope(error))
    }
  })

  router.post('/chat/completions', async (request, response) => {
    const parseResult = completionPayloadSchema.safeParse(request.body)

    if (!parseResult.success) {
      const message = parseResult.error.issues.map((issue) => issue.message).join('; ')
      response.status(400).json(toErrorEnvelope(new AppError(400, 'INVALID_REQUEST', message)))
      return
    }

    if (parseResult.data.stream) {
      response.status(400).json(
        toErrorEnvelope(
          new AppError(
            400,
            'STREAM_NOT_SUPPORTED_IN_PR2',
            'Streaming is not supported in PR-2. Use stream=false.',
          ),
        ),
      )
      return
    }

    try {
      const payload = await client.createCompletion(parseResult.data)
      response.status(200).json(payload)
    } catch (error) {
      logger.error('POST /api/chat/completions failed', {
        status: getHttpStatus(error),
        code: getErrorCode(error),
      })
      response.status(getHttpStatus(error)).json(toErrorEnvelope(error))
    }
  })

  return router
}

function getErrorCode(error: unknown): string {
  if (error instanceof AppError) {
    return error.code
  }

  return 'INTERNAL_ERROR'
}
