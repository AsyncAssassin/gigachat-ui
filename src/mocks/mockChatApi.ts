import type { EventSourceLike, Message } from '../hooks/types'

interface MockChatPayload {
  messages?: Message[]
}

export function buildMockAssistantReply(prompt: string): string {
  const cleanedPrompt = prompt.trim() || 'no input'

  return [
    `Got your prompt: "${cleanedPrompt.slice(0, 120)}".`,
    'Here is a streamed answer built by the local mock API.',
    '1. It sends chunks in small pieces.',
    '2. It is suitable for useChat/useStreamingResponse demos.',
    '3. It can be stopped and reloaded safely.',
  ].join('\n')
}

function splitIntoChunks(text: string, chunkSize = 16): string[] {
  const chunks: string[] = []

  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize))
  }

  return chunks.length > 0 ? chunks : ['']
}

function createSSEReadableStream(
  chunks: string[],
  signal?: AbortSignal,
  delayMs = 30,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let cursor = 0
      let timer: ReturnType<typeof setTimeout> | null = null

      const closeStream = () => {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }

        signal?.removeEventListener('abort', onAbort)
        controller.close()
      }

      const onAbort = () => {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }

        signal?.removeEventListener('abort', onAbort)
        controller.error(new DOMException('Aborted', 'AbortError'))
      }

      const emitNext = () => {
        if (signal?.aborted) {
          onAbort()
          return
        }

        if (cursor >= chunks.length) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          closeStream()
          return
        }

        const payload = JSON.stringify({
          choices: [{ delta: { content: chunks[cursor] } }],
        })

        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        cursor += 1
        timer = setTimeout(emitNext, delayMs)
      }

      signal?.addEventListener('abort', onAbort)
      emitNext()
    },
  })
}

function toStringBody(body: BodyInit | null | undefined): string {
  if (!body) {
    return ''
  }

  if (typeof body === 'string') {
    return body
  }

  return ''
}

function parsePayload(init?: RequestInit): MockChatPayload {
  const rawBody = toStringBody(init?.body)

  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody) as MockChatPayload
  } catch {
    return {}
  }
}

function findLastUserMessage(messages: Message[]): Message | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index]
    }
  }

  return null
}

export async function mockChatFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()

  if (url !== '/api/chat' && url !== '/api/streaming') {
    return fetch(input, init)
  }

  const payload = parsePayload(init)
  const messages = payload.messages ?? []
  const lastUserMessage = findLastUserMessage(messages)
  const userPrompt = lastUserMessage?.content ?? ''

  if (userPrompt.toLowerCase().includes('/error')) {
    return new Response('Mocked server error', { status: 500 })
  }

  const answer = buildMockAssistantReply(userPrompt)
  const chunks = splitIntoChunks(answer)
  const isStreamingEndpoint = url === '/api/streaming'

  if (isStreamingEndpoint) {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let cursor = 0

        const emitNext = () => {
          if (init?.signal?.aborted) {
            controller.error(new DOMException('Aborted', 'AbortError'))
            return
          }

          if (cursor >= chunks.length) {
            controller.close()
            return
          }

          controller.enqueue(encoder.encode(chunks[cursor]))
          cursor += 1
          setTimeout(emitNext, 25)
        }

        emitNext()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  const sseStream = createSSEReadableStream(chunks, init?.signal ?? undefined)

  return new Response(sseStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
  })
}

class MockEventSource implements EventSourceLike {
  public onmessage: ((event: MessageEvent<string>) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  private readonly chunks: string[]
  private readonly delayMs: number
  private closed = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(chunks: string[], delayMs: number) {
    this.chunks = chunks
    this.delayMs = delayMs
    queueMicrotask(() => {
      this.emitChunk(0)
    })
  }

  close(): void {
    this.closed = true

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private emitChunk(index: number): void {
    if (this.closed) {
      return
    }

    if (index >= this.chunks.length) {
      this.onmessage?.({ data: '[DONE]' } as MessageEvent<string>)
      return
    }

    const payload = JSON.stringify({
      choices: [{ delta: { content: this.chunks[index] } }],
    })

    this.onmessage?.({ data: payload } as MessageEvent<string>)

    this.timer = setTimeout(() => {
      this.emitChunk(index + 1)
    }, this.delayMs)
  }
}

export function createMockEventSourceFactory(fullText: string): (url: string) => EventSourceLike {
  const chunks = splitIntoChunks(fullText)

  return () => new MockEventSource(chunks, 30)
}
