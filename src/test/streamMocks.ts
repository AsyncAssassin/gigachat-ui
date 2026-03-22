import type { EventSourceLike } from '../hooks/types'

export function createTextStreamResponse(
  chunks: string[],
  options?: {
    delayMs?: number
    contentType?: string
    signal?: AbortSignal | null
  },
): Response {
  const encoder = new TextEncoder()
  const delayMs = options?.delayMs ?? 0
  const contentType = options?.contentType ?? 'text/plain; charset=utf-8'
  const signal = options?.signal ?? undefined

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let cursor = 0
      let timer: ReturnType<typeof setTimeout> | null = null

      const onAbort = () => {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }

        signal?.removeEventListener('abort', onAbort)
        controller.error(new DOMException('Aborted', 'AbortError'))
      }

      const pushNext = () => {
        if (signal?.aborted) {
          onAbort()
          return
        }

        if (cursor >= chunks.length) {
          signal?.removeEventListener('abort', onAbort)
          controller.close()
          return
        }

        controller.enqueue(encoder.encode(chunks[cursor]))
        cursor += 1

        if (delayMs > 0) {
          timer = setTimeout(pushNext, delayMs)
        } else {
          queueMicrotask(pushNext)
        }
      }

      signal?.addEventListener('abort', onAbort)
      pushNext()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  })
}

export function createSSEResponse(
  deltas: string[],
  options?: {
    delayMs?: number
    signal?: AbortSignal | null
  },
): Response {
  const lines = deltas.map((delta) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`,
  )

  lines.push('data: [DONE]\n\n')

  return createTextStreamResponse(lines, {
    delayMs: options?.delayMs,
    signal: options?.signal,
    contentType: 'text/event-stream; charset=utf-8',
  })
}

export class MockEventSource implements EventSourceLike {
  public onmessage: ((event: MessageEvent<string>) => void) | null = null
  public onerror: ((event: Event) => void) | null = null

  private readonly chunks: string[]
  private readonly delayMs: number
  private closed = false
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(chunks: string[], delayMs = 0) {
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

export function createEventSourceFactory(chunks: string[]): (url: string) => EventSourceLike {
  return () => new MockEventSource(chunks)
}
