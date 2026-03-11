import { MessagesSquare } from 'lucide-react'
import styles from './EmptyState.module.css'

export function EmptyState() {
  return (
    <div className={styles.state}>
      <MessagesSquare size={34} />
      <h3>Начните новый диалог</h3>
      <p>Выберите чат слева или создайте новый.</p>
    </div>
  )
}
