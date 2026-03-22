import { act, renderHook, waitFor } from '@testing-library/react'
import { useStreamingResponse } from '../useStreamingResponse'
import { createEventSourceFactory, createTextStreamResponse } from '../../test/streamMocks'

describe('useStreamingResponse', () => {
  it('streams fetch responses and accumulates data', async () => {
    const onComplete = vi.fn()

    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      createTextStreamResponse(['Hel', 'lo'], {
        signal: init?.signal,
      }),
    )

    const { result } = renderHook(() =>
      useStreamingResponse({
        url: '/api/streaming',
        fetcher,
        onComplete,
      }),
    )

    await act(async () => {
      await result.current.startStream()
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.data).toBe('Hello')
    expect(result.current.streamedChunks).toEqual(['Hel', 'lo'])
    expect(result.current.metadata.chunkCount).toBe(2)
    expect(result.current.isStreaming).toBe(false)
    expect(onComplete).toHaveBeenCalledWith('Hello')
    expect(result.current.error).toBeNull()
  })

  it('retries failed requests with exponential backoff', async () => {
    const fetcher = vi
      .fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >()
      .mockImplementationOnce(async () => new Response('fail', { status: 500 }))
      .mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) =>
        createTextStreamResponse(['Recovered'], {
          signal: init?.signal,
        }),
      )

    const { result } = renderHook(() =>
      useStreamingResponse({
        url: '/api/streaming',
        fetcher,
        retryCount: 1,
        retryDelayMs: 1,
      }),
    )

    await act(async () => {
      await result.current.startStream()
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('Recovered')
  })

  it('aborts an active fetch stream', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      createTextStreamResponse(['A', 'B', 'C', 'D', 'E'], {
        delayMs: 15,
        signal: init?.signal,
      }),
    )

    const { result } = renderHook(() =>
      useStreamingResponse({
        url: '/api/streaming',
        fetcher,
      }),
    )

    await act(async () => {
      void result.current.startStream()
      await new Promise((resolve) => {
        setTimeout(resolve, 40)
      })
      result.current.abort()
    })

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false)
    })

    expect(result.current.data.length).toBeLessThanOrEqual(3)
  })

  it('supports SSE transport', async () => {
    const onComplete = vi.fn()
    const eventSourceFactory = createEventSourceFactory(['hello ', 'from ', 'sse'])

    const { result } = renderHook(() =>
      useStreamingResponse({
        url: '/api/sse',
        transport: 'sse',
        eventSourceFactory,
        onComplete,
      }),
    )

    await act(async () => {
      await result.current.startStream()
    })

    await waitFor(() => {
      expect(result.current.data).toBe('hello from sse')
    })

    expect(result.current.metadata.chunkCount).toBe(3)
    expect(onComplete).toHaveBeenCalledWith('hello from sse')
    expect(result.current.error).toBeNull()
  })
})
