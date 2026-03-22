import { act, renderHook, waitFor } from '@testing-library/react'
import type { ChangeEvent, FormEvent } from 'react'
import { useChat } from '../useChat'
import { createSSEResponse } from '../../test/streamMocks'

function createInputEvent(value: string): ChangeEvent<HTMLTextAreaElement> {
  return {
    target: {
      value,
    },
  } as ChangeEvent<HTMLTextAreaElement>
}

function createSubmitEvent(): FormEvent<HTMLFormElement> {
  return {
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>
}

describe('useChat', () => {
  it('handles input changes and streams assistant response', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      createSSEResponse(['Hi', ' there'], {
        signal: init?.signal,
      }),
    )

    const { result } = renderHook(() =>
      useChat({
        fetcher,
      }),
    )

    act(() => {
      result.current.handleInputChange(createInputEvent('Explain hooks'))
    })

    expect(result.current.input).toBe('Explain hooks')

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent())
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.input).toBe('')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]?.role).toBe('user')
    expect(result.current.messages[0]?.content).toBe('Explain hooks')
    expect(result.current.messages[1]?.role).toBe('assistant')
    expect(result.current.messages[1]?.content).toBe('Hi there')
  })

  it('reloads the last user request without duplicating the user message', async () => {
    const fetcher = vi
      .fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >()
      .mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) =>
        createSSEResponse(['First answer'], {
          signal: init?.signal,
        }),
      )
      .mockImplementationOnce(async (_input: RequestInfo | URL, init?: RequestInit) =>
        createSSEResponse(['Second answer'], {
          signal: init?.signal,
        }),
      )

    const { result } = renderHook(() =>
      useChat({
        fetcher,
      }),
    )

    act(() => {
      result.current.handleInputChange(createInputEvent('repeat me'))
    })

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent())
    })

    await act(async () => {
      await result.current.reload()
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]?.role).toBe('user')
    expect(result.current.messages[0]?.content).toBe('repeat me')
    expect(result.current.messages[1]?.role).toBe('assistant')
    expect(result.current.messages[1]?.content).toBe('Second answer')
  })

  it('stops an in-progress response with abort', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      createSSEResponse(['A', 'B', 'C', 'D', 'E'], {
        delayMs: 20,
        signal: init?.signal,
      }),
    )

    const { result } = renderHook(() =>
      useChat({
        fetcher,
      }),
    )

    act(() => {
      result.current.handleInputChange(createInputEvent('long request'))
    })

    await act(async () => {
      void result.current.handleSubmit(createSubmitEvent())
      await new Promise((resolve) => {
        setTimeout(resolve, 35)
      })
      result.current.stop()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.messages[0]?.content).toBe('long request')
    expect(result.current.messages[1]?.role).toBe('assistant')
    expect((result.current.messages[1]?.content ?? '').length).toBeLessThan(5)
  })

  it('calls onError when the request fails', async () => {
    const onError = vi.fn()
    const fetcher = vi.fn(async () => new Response('fail', { status: 500 }))

    const { result } = renderHook(() =>
      useChat({
        fetcher,
        onError,
      }),
    )

    act(() => {
      result.current.handleInputChange(createInputEvent('trigger error'))
    })

    await act(async () => {
      await result.current.handleSubmit(createSubmitEvent())
    })

    expect(result.current.error).not.toBeNull()
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
