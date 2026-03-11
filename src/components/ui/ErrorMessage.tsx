import { AlertTriangle } from 'lucide-react'
import styles from './ErrorMessage.module.css'

interface ErrorMessageProps {
  message: string | null
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null

  return (
    <div className={styles.error} role="alert">
      <AlertTriangle size={16} />
      <span>{message}</span>
    </div>
  )
}
