import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { Message, UseChatOptions, UseChatResult } from './types'

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Unknown chat error')
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof Error) {
    return error.name === 'AbortError' || /abort/i.test(error.message)
  }

  return false
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function extractChunkContent(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload !== 'object' || payload == null) {
    return ''
  }

  const source = payload as {
    choices?: Array<{ delta?: { content?: string } }>
    delta?: { content?: string }
    content?: string
    message?: { content?: string }
  }

  return (
    source.choices?.[0]?.delta?.content ??
    source.delta?.content ??
    source.message?.content ??
    source.content ??
    ''
  )
}

export const useChat = (options: UseChatOptions = {}): UseChatResult => {
  const {
    api = '/api/chat',
    initialMessages = [],
    onFinish,
    onError,
    fetcher = fetch,
  } = options

  const [messages, setMessagesState] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const messagesRef = useRef<Message[]>(initialMessages)
  const lastRequestMessagesRef = useRef<Message[] | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const decoderRef = useRef(new TextDecoder())
  const sseBufferRef = useRef('')

  const setMessages = useCallback((nextMessages: Message[]) => {
    messagesRef.current = nextMessages
    setMessagesState(nextMessages)
  }, [])

  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessagesState((prev) => {
      const next = updater(prev)
      messagesRef.current = next
      return next
    })
  }, [])

  const appendAssistantChunk = useCallback(
    (assistantId: string, chunkText: string) => {
      if (!chunkText) {
        return
      }

      updateMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: message.content + chunkText,
              }
            : message,
        ),
      )
    },
    [updateMessages],
  )

  const consumeSSEChunk = useCallback(
    (assistantId: string, chunkText: string) => {
      const lines = `${sseBufferRef.current}${chunkText}`.split('\n')
      sseBufferRef.current = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()

        if (!line.startsWith('data:')) {
          continue
        }

        const payload = line.slice(5).trim()

        if (!payload || payload === '[DONE]') {
          continue
        }

        try {
          const parsed = JSON.parse(payload)
          const deltaContent = extractChunkContent(parsed)
          appendAssistantChunk(assistantId, deltaContent)
        } catch {
          appendAssistantChunk(assistantId, payload)
        }
      }
    },
    [appendAssistantChunk],
  )

  const requestAssistant = useCallback(
    async (requestMessages: Message[]) => {
      const controller = new AbortController()
      abortControllerRef.current = controller

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      }

      setMessages([...requestMessages, assistantMessage])
      lastRequestMessagesRef.current = requestMessages
      sseBufferRef.current = ''
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetcher(api, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: requestMessages,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body available')
        }

        const isSSE = response.headers.get('Content-Type')?.includes('text/event-stream') ?? false
        const reader = response.body.getReader()

        try {
          while (true) {
            const { value, done } = await reader.read()

            if (done) {
              break
            }

            if (!value) {
              continue
            }

            const chunkText = decoderRef.current.decode(value, { stream: true })

            if (isSSE) {
              consumeSSEChunk(assistantMessage.id, chunkText)
            } else {
              appendAssistantChunk(assistantMessage.id, chunkText)
            }
          }
        } finally {
          reader.releaseLock()
        }

        if (isSSE && sseBufferRef.current.trim()) {
          consumeSSEChunk(assistantMessage.id, `${sseBufferRef.current}\n`)
          sseBufferRef.current = ''
        }

        const finishedMessage = messagesRef.current.find((message) => message.id === assistantMessage.id)
        if (finishedMessage) {
          onFinish?.(finishedMessage)
        }
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return
        }

        const normalizedError = toError(requestError)
        setError(normalizedError)
        onError?.(normalizedError)
      } finally {
        abortControllerRef.current = null
        setIsLoading(false)
      }
    },
    [api, appendAssistantChunk, consumeSSEChunk, fetcher, onError, onFinish, setMessages],
  )

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const nextInput = input.trim()
      if (!nextInput || isLoading) {
        return
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: nextInput,
        createdAt: new Date(),
      }

      const requestMessages = [...messagesRef.current, userMessage]
      setInput('')
      await requestAssistant(requestMessages)
    },
    [input, isLoading, requestAssistant],
  )

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsLoading(false)
  }, [])

  const reload = useCallback(async () => {
    if (isLoading) {
      return
    }

    const currentMessages = messagesRef.current
    const fallbackMessages = lastRequestMessagesRef.current
    let lastUserIndex = -1

    for (let index = currentMessages.length - 1; index >= 0; index -= 1) {
      if (currentMessages[index]?.role === 'user') {
        lastUserIndex = index
        break
      }
    }

    if (lastUserIndex < 0 && fallbackMessages) {
      await requestAssistant(fallbackMessages)
      return
    }

    if (lastUserIndex < 0) {
      return
    }

    const replayMessages = currentMessages.slice(0, lastUserIndex + 1)
    await requestAssistant(replayMessages)
  }, [isLoading, requestAssistant])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    setMessages,
  }
}
