import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message as MessageType } from '../../types/message'
import { Button } from '../ui/Button'
import styles from './Message.module.css'

type MessageVariant = 'user' | 'assistant'

interface MessageProps {
  message: MessageType
  variant?: MessageVariant
}

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)

export function Message({ message, variant }: MessageProps) {
  const resolvedVariant: MessageVariant = variant ?? message.role
  const isUser = resolvedVariant === 'user'
  const [isCopied, setIsCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    if (isUser) {
      return
    }

    try {
      await navigator.clipboard.writeText(message.content)
      setIsCopied(true)

      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current)
      }

      copiedTimerRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimerRef.current = null
      }, 2000)
    } catch {
      // Ignore clipboard errors in unsupported environments.
    }
  }

  return (
    <article className={styles.row} data-role={resolvedVariant}>
      {!isUser ? <div className={styles.avatar}>🤖</div> : null}

      <div className={styles.bubble}>
        <div className={styles.meta}>
          <strong>{isUser ? 'Вы' : 'Ассистент'}</strong>
          <span>{new Date(message.timestamp).toLocaleTimeString('ru-RU')}</span>
        </div>

        <div className={styles.markdown}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code(props) {
                const { className, children } = props
                const languageMatch = /language-([\w-]+)/.exec(className ?? '')
                const language = languageMatch?.[1]?.toLowerCase() ?? null
                const rawCode = String(children).replace(/\n$/, '')

                if (!className) {
                  return <code className={styles.inlineCode}>{children}</code>
                }

                const highlighted = language && hljs.getLanguage(language)
                  ? hljs.highlight(rawCode, { language, ignoreIllegals: true }).value
                  : escapeHtml(rawCode)

                return (
                  <code
                    className={`hljs ${className} ${styles.blockCode}`}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {!isUser ? (
          <Button
            variant={isCopied ? 'secondary' : 'ghost'}
            size="sm"
            icon={isCopied ? <Check size={14} /> : <Copy size={14} />}
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {isCopied ? 'Скопировано' : 'Копировать'}
          </Button>
        ) : null}
      </div>
    </article>
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
