import { useState } from 'react'
import { LogIn } from 'lucide-react'
import type { AuthData, AuthScope } from '../../types/auth'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
import styles from './AuthForm.module.css'

interface AuthFormProps {
  onLogin: (data: AuthData) => void
}

const scopeOptions: AuthScope[] = [
  'GIGACHAT_API_PERS',
  'GIGACHAT_API_B2B',
  'GIGACHAT_API_CORP',
]

export function AuthForm({ onLogin }: AuthFormProps) {
  const [credentials, setCredentials] = useState('')
  const [scope, setScope] = useState<AuthScope>('GIGACHAT_API_PERS')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!credentials.trim()) {
      setError('Введите credentials перед входом.')
      return
    }

    setError(null)
    onLogin({ credentials, scope })
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>GigaChat UI</h1>
        <p className={styles.subtitle}>Вход для демонстрации интерфейса</p>

        <label className={styles.field}>
          <span>Credentials</span>
          <input
            type="password"
            value={credentials}
            onChange={(event) => setCredentials(event.target.value)}
            placeholder="Введите токен"
            autoComplete="off"
          />
        </label>

        <fieldset className={styles.scopeBlock}>
          <legend>Scope</legend>
          {scopeOptions.map((option) => (
            <label key={option} className={styles.radioRow}>
              <input
                type="radio"
                name="scope"
                value={option}
                checked={scope === option}
                onChange={() => setScope(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>

        <ErrorMessage message={error} />

        <Button type="submit" icon={<LogIn size={16} />}>
          Войти
        </Button>
      </form>
    </main>
  )
}
