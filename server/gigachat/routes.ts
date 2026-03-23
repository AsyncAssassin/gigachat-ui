import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { AppError, getHttpStatus, toErrorEnvelope } from '../lib/errors'
import type { Logger } from '../lib/logger'
import type { CompletionPayload, GigaChatClient } from './client'

const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1),
})

const attachmentSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/tiff', 'image/bmp']),
  base64: z.string().min(1),
  fileName: z.string().trim().min(1).max(255),
})

const completionPayloadSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().min(1).max(8192).optional(),
  repetition_penalty: z.number().min(0).max(10).optional(),
  stream: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).max(1).optional().default([]),
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

    try {
      const upstreamPayload = await buildUpstreamCompletionPayload(client, parseResult.data)

      if (parseResult.data.stream) {
        await proxyStream({
          client,
          logger,
          payload: upstreamPayload,
          request,
          response,
        })
        return
      }

      const payload = await client.createCompletion(upstreamPayload)
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

async function proxyStream(options: {
  client: GigaChatClient
  logger: Logger
  payload: CompletionPayload
  request: Request
  response: Response
}) {
  const { client, logger, payload, request, response } = options
  const upstreamController = new AbortController()

  const handleRequestAborted = () => {
    upstreamController.abort()
  }

  const handleResponseClose = () => {
    if (!response.writableEnded) {
      upstreamController.abort()
    }
  }

  request.on('aborted', handleRequestAborted)
  response.on('close', handleResponseClose)

  try {
    const upstream = await client.createCompletionStream(payload, upstreamController.signal)
    const upstreamBody = upstream.body

    if (!upstreamBody) {
      throw new AppError(
        502,
        'UPSTREAM_STREAM_UNAVAILABLE',
        'GigaChat stream response body is empty',
      )
    }

    response.status(200)
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache')
    response.setHeader('Connection', 'keep-alive')
    response.setHeader('X-Accel-Buffering', 'no')
    response.flushHeaders?.()

    const reader = upstreamBody.getReader()

    try {
      while (true) {
        if (upstreamController.signal.aborted || response.writableEnded) {
          break
        }

        const { done, value } = await reader.read()

        if (done) {
          break
        }

        if (!value || value.length === 0) {
          continue
        }

        response.write(Buffer.from(value))
      }
    } finally {
      reader.releaseLock()
    }

    if (!response.writableEnded) {
      response.end()
    }
  } catch (error) {
    if (upstreamController.signal.aborted) {
      if (!response.writableEnded) {
        response.end()
      }

      return
    }

    logger.error('POST /api/chat/completions stream failed', {
      status: getHttpStatus(error),
      code: getErrorCode(error),
    })

    if (response.headersSent) {
      if (!response.writableEnded) {
        response.end()
      }

      return
    }

    response.status(getHttpStatus(error)).json(toErrorEnvelope(error))
  } finally {
    request.off('aborted', handleRequestAborted)
    response.off('close', handleResponseClose)
  }
}

async function buildUpstreamCompletionPayload(
  client: GigaChatClient,
  payload: z.infer<typeof completionPayloadSchema>,
): Promise<CompletionPayload> {
  const { attachments, ...rest } = payload

  if (!attachments || attachments.length === 0) {
    return rest
  }

  const lastUserMessageIndex = findLastUserMessageIndex(rest.messages)
  if (lastUserMessageIndex < 0) {
    throw new AppError(
      400,
      'INVALID_REQUEST',
      'Image attachments can be used only when request contains a user message',
    )
  }

  const uploadedFileIds: string[] = []
  for (const attachment of attachments) {
    const bytes = decodeBase64(attachment.base64)
    const uploadResult = await client.uploadFile({
      bytes,
      mimeType: attachment.mimeType,
      fileName: attachment.fileName,
    })
    uploadedFileIds.push(uploadResult.id)
  }

  return {
    ...rest,
    messages: rest.messages.map((message, index) =>
      index === lastUserMessageIndex
        ? {
            ...message,
            attachments: uploadedFileIds,
          }
        : message,
    ),
  }
}

function findLastUserMessageIndex(messages: Array<{ role: string }>): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return index
    }
  }

  return -1
}

function decodeBase64(value: string): Uint8Array {
  try {
    const normalized = value.trim()
    const bytes = Buffer.from(normalized, 'base64')
    if (bytes.length === 0) {
      throw new Error('empty')
    }

    return Uint8Array.from(bytes)
  } catch {
    throw new AppError(400, 'INVALID_REQUEST', 'Attachment base64 content is invalid')
  }
}
