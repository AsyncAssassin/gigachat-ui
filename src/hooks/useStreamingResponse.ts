import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  EventSourceLike,
  StreamMetadata,
  UseStreamingResponseOptions,
  UseStreamingResponseResult,
} from './types'

// Non-production experimental hook kept for webinar/demo compatibility.
// Production chat flow uses useChatSession.
const INITIAL_METADATA: StreamMetadata = {
  startTime: null,
  endTime: null,
  responseTime: '',
  chunkCount: 0,
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Unknown streaming error')
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function toBodyInit(body: unknown): BodyInit | undefined {
  if (body == null) {
    return undefined
  }

  if (typeof body === 'string') {
    return body
  }

  if (
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ReadableStream ||
    body instanceof ArrayBuffer
  ) {
    return body
  }

  return JSON.stringify(body)
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort)
  })
}

function defaultEventSourceFactory(url: string): EventSourceLike {
  return new EventSource(url)
}

export const useStreamingResponse = (
  options: UseStreamingResponseOptions,
): UseStreamingResponseResult => {
  const {
    url,
    enabled = false,
    method = 'POST',
    body,
    headers,
    onChunk,
    onComplete,
    onError,
    parseChunk,
    transport = 'fetch',
    retryCount = 0,
    retryDelayMs = 300,
    retryMultiplier = 2,
    throttleMs = 0,
    fetcher = fetch,
    eventSourceFactory = defaultEventSourceFactory,
  } = options

  const [data, setData] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [streamedChunks, setStreamedChunks] = useState<string[]>([])
  const [metadata, setMetadata] = useState<StreamMetadata>(INITIAL_METADATA)

  const abortControllerRef = useRef<AbortController | null>(null)
  const eventSourceRef = useRef<EventSourceLike | null>(null)
  const decoderRef = useRef(new TextDecoder())
  const pendingDataRef = useRef<string | null>(null)
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushThrottledData = useCallback(() => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = null
    }

    if (pendingDataRef.current != null) {
      setData(pendingDataRef.current)
      pendingDataRef.current = null
    }
  }, [])

  const setDataWithThrottle = useCallback(
    (nextValue: string) => {
      if (throttleMs <= 0) {
        setData(nextValue)
        return
      }

      pendingDataRef.current = nextValue

      if (throttleTimerRef.current) {
        return
      }

      throttleTimerRef.current = setTimeout(() => {
        if (pendingDataRef.current != null) {
          setData(pendingDataRef.current)
          pendingDataRef.current = null
        }

        throttleTimerRef.current = null
      }, throttleMs)
    },
    [throttleMs],
  )

  const closeActiveConnections = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }, [])

  const processStream = useCallback(
    async (streamBody: ReadableStream<Uint8Array>, startTime: number) => {
      const reader = streamBody.getReader()
      let accumulatedText = ''
      let chunkIndex = 0

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          if (!value) {
            continue
          }

          const chunkText = parseChunk
            ? parseChunk(value)
            : decoderRef.current.decode(value, { stream: true })

          if (!chunkText) {
            continue
          }

          accumulatedText += chunkText
          chunkIndex += 1

          setStreamedChunks((prev) => [...prev, chunkText])
          setMetadata((prev) => ({ ...prev, chunkCount: chunkIndex }))
          setDataWithThrottle(accumulatedText)
          onChunk?.(chunkText)
        }
      } finally {
        reader.releaseLock()
      }

      flushThrottledData()

      const endTime = Date.now()
      setData(accumulatedText)
      setMetadata((prev) => ({
        ...prev,
        endTime,
        responseTime: `${endTime - startTime}ms`,
        chunkCount: chunkIndex,
      }))
      onComplete?.(accumulatedText)
    },
    [flushThrottledData, onChunk, onComplete, parseChunk, setDataWithThrottle],
  )

  const startFetchStream = useCallback(async () => {
    closeActiveConnections()
    flushThrottledData()

    setIsStreaming(true)
    setError(null)
    setData('')
    setStreamedChunks([])

    const startTime = Date.now()
    setMetadata({
      startTime,
      endTime: null,
      responseTime: '',
      chunkCount: 0,
    })

    const controller = new AbortController()
    abortControllerRef.current = controller

    const requestHeaders = new Headers(headers)
    const requestBody = toBodyInit(body)
    const needsJsonHeader =
      requestBody != null &&
      typeof requestBody === 'string' &&
      !requestHeaders.has('Content-Type')

    if (needsJsonHeader) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    const maxRetries = Math.max(0, retryCount)
    const safeRetryDelay = Math.max(0, retryDelayMs)
    const safeRetryMultiplier = retryMultiplier > 0 ? retryMultiplier : 1

    try {
      let attempt = 0

      while (attempt <= maxRetries) {
        try {
          const response = await fetcher(url, {
            method,
            body: requestBody,
            headers: requestHeaders,
            signal: controller.signal,
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          if (!response.body) {
            throw new Error('No response body available')
          }

          await processStream(response.body as ReadableStream<Uint8Array>, startTime)
          return
        } catch (streamError) {
          if (isAbortError(streamError)) {
            return
          }

          if (attempt >= maxRetries) {
            throw streamError
          }

          const nextDelay = safeRetryDelay * safeRetryMultiplier ** attempt
          attempt += 1
          await delay(nextDelay, controller.signal)
        }
      }
    } catch (nextError) {
      if (isAbortError(nextError)) {
        return
      }

      const normalizedError = toError(nextError)
      setError(normalizedError)
      onError?.(normalizedError)
    } finally {
      abortControllerRef.current = null
      flushThrottledData()
      setIsStreaming(false)
    }
  }, [
    body,
    closeActiveConnections,
    fetcher,
    flushThrottledData,
    headers,
    method,
    onError,
    processStream,
    retryCount,
    retryDelayMs,
    retryMultiplier,
    url,
  ])

  const startSSEStream = useCallback(async () => {
    closeActiveConnections()
    flushThrottledData()

    setIsStreaming(true)
    setError(null)
    setData('')
    setStreamedChunks([])

    const startTime = Date.now()
    setMetadata({
      startTime,
      endTime: null,
      responseTime: '',
      chunkCount: 0,
    })

    let accumulatedText = ''
    let chunkIndex = 0

    const finalizeSSE = () => {
      flushThrottledData()

      const endTime = Date.now()
      setData(accumulatedText)
      setMetadata((prev) => ({
        ...prev,
        endTime,
        responseTime: `${endTime - startTime}ms`,
        chunkCount: chunkIndex,
      }))
      setIsStreaming(false)
      onComplete?.(accumulatedText)
    }

    try {
      const source = eventSourceFactory(url)
      eventSourceRef.current = source

      source.onmessage = (event) => {
        const rawChunk = event.data

        if (rawChunk === '[DONE]') {
          source.close()
          eventSourceRef.current = null
          finalizeSSE()
          return
        }

        let chunkText = rawChunk

        try {
          const parsed = JSON.parse(rawChunk) as {
            choices?: Array<{ delta?: { content?: string } }>
            content?: string
          }

          chunkText = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? rawChunk
        } catch {
          chunkText = rawChunk
        }

        if (!chunkText) {
          return
        }

        accumulatedText += chunkText
        chunkIndex += 1

        setStreamedChunks((prev) => [...prev, chunkText])
        setMetadata((prev) => ({ ...prev, chunkCount: chunkIndex }))
        setDataWithThrottle(accumulatedText)
        onChunk?.(chunkText)
      }

      source.onerror = () => {
        source.close()
        eventSourceRef.current = null
        flushThrottledData()
        setIsStreaming(false)

        const nextError = new Error('SSE connection error')
        setError(nextError)
        onError?.(nextError)
      }
    } catch (streamError) {
      const normalizedError = toError(streamError)
      setError(normalizedError)
      onError?.(normalizedError)
      setIsStreaming(false)
    }
  }, [
    closeActiveConnections,
    eventSourceFactory,
    flushThrottledData,
    onChunk,
    onComplete,
    onError,
    setDataWithThrottle,
    url,
  ])

  const startStream = useCallback(async () => {
    if (transport === 'sse') {
      await startSSEStream()
      return
    }

    await startFetchStream()
  }, [startFetchStream, startSSEStream, transport])

  const abort = useCallback(() => {
    closeActiveConnections()
    flushThrottledData()
    setIsStreaming(false)
  }, [closeActiveConnections, flushThrottledData])

  const reset = useCallback(() => {
    closeActiveConnections()
    flushThrottledData()

    setData('')
    setStreamedChunks([])
    setError(null)
    setMetadata(INITIAL_METADATA)
    setIsStreaming(false)
  }, [closeActiveConnections, flushThrottledData])

  useEffect(() => {
    if (enabled) {
      startStream().catch((streamError) => {
        const normalizedError = toError(streamError)
        setError(normalizedError)
        onError?.(normalizedError)
      })
    }

    return () => {
      closeActiveConnections()
      flushThrottledData()
    }
  }, [closeActiveConnections, enabled, flushThrottledData, onError, startStream, url])

  return {
    data,
    isStreaming,
    error,
    streamedChunks,
    metadata,
    abort,
    reset,
    startStream,
  }
}
