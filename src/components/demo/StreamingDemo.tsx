import { useMemo, useState } from 'react'
import { RefreshCcw, Play, Square } from 'lucide-react'
import { useStreamingResponse } from '../../hooks'
import { buildMockAssistantReply, createMockEventSourceFactory, mockChatFetch } from '../../mocks/mockChatApi'
import { Button } from '../ui/Button'
import styles from './StreamingDemo.module.css'

export function StreamingDemo() {
  const [prompt, setPrompt] = useState('Show a short streamed summary about React hooks.')
  const [transport, setTransport] = useState<'fetch' | 'sse'>('fetch')

  const requestBody = useMemo(
    () => ({
      messages: [
        {
          id: 'demo-user',
          role: 'user' as const,
          content: prompt,
        },
      ],
    }),
    [prompt],
  )

  const eventSourceFactory = useMemo(
    () => createMockEventSourceFactory(buildMockAssistantReply(prompt)),
    [prompt],
  )

  const { data, isStreaming, error, metadata, streamedChunks, startStream, abort, reset } =
    useStreamingResponse({
      url: '/api/streaming',
      enabled: false,
      method: 'POST',
      body: requestBody,
      transport,
      fetcher: mockChatFetch,
      eventSourceFactory,
      retryCount: 1,
      retryDelayMs: 120,
      throttleMs: 40,
    })

  return (
    <section className={styles.demoCard}>
      <div className={styles.header}>
        <h3>Streaming Hook Demo</h3>
        <p>Independent check for webinar task #2.</p>
      </div>

      <label className={styles.label} htmlFor="streaming-prompt">
        Prompt
      </label>
      <textarea
        id="streaming-prompt"
        className={styles.textarea}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />

      <div className={styles.transportRow}>
        <label>
          <input
            type="radio"
            name="transport"
            checked={transport === 'fetch'}
            onChange={() => setTransport('fetch')}
          />
          Fetch stream
        </label>
        <label>
          <input
            type="radio"
            name="transport"
            checked={transport === 'sse'}
            onChange={() => setTransport('sse')}
          />
          SSE stream
        </label>
      </div>

      <div className={styles.actions}>
        <Button icon={<Play size={14} />} onClick={() => startStream()} disabled={isStreaming}>
          Start stream
        </Button>
        <Button
          variant="secondary"
          icon={<Square size={14} />}
          onClick={abort}
          disabled={!isStreaming}
        >
          Stop
        </Button>
        <Button variant="ghost" icon={<RefreshCcw size={14} />} onClick={reset}>
          Reset
        </Button>
      </div>

      <div className={styles.meta}>
        <span>Status: {isStreaming ? 'streaming' : 'idle'}</span>
        <span>Chunks: {metadata.chunkCount}</span>
        <span>Time: {metadata.responseTime || '-'}</span>
      </div>

      {error ? <div className={styles.error}>{error.message}</div> : null}

      <pre className={styles.output}>{data || 'No data yet'}</pre>
      <p className={styles.chunks}>Received chunks: {streamedChunks.length}</p>
    </section>
  )
}
