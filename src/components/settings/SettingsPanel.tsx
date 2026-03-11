import { useState } from 'react'
import { X } from 'lucide-react'
import { modelOptions } from '../../mocks/settings'
import type { ChatSettings } from '../../types/settings'
import { Button } from '../ui/Button'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import styles from './SettingsPanel.module.css'

interface SettingsPanelProps {
  settings: ChatSettings
  onClose: () => void
  onSave: (settings: ChatSettings) => void
  onReset: () => ChatSettings
}

export function SettingsPanel({
  settings,
  onClose,
  onSave,
  onReset,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<ChatSettings>(settings)

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden />

      <aside className={styles.panel}>
        <header className={styles.header}>
          <h3>Настройки</h3>
          <Button
            variant="ghost"
            iconOnly
            icon={<X size={16} />}
            aria-label="Закрыть настройки"
            onClick={onClose}
          />
        </header>

        <label className={styles.field}>
          <span>Модель</span>
          <select
            value={draft.model}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                model: event.target.value as ChatSettings['model'],
              }))
            }
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Slider
          label="Temperature"
          min={0}
          max={2}
          step={0.1}
          value={draft.temperature}
          onChange={(temperature) => setDraft((prev) => ({ ...prev, temperature }))}
        />

        <Slider
          label="Top-P"
          min={0}
          max={1}
          step={0.05}
          value={draft.topP}
          onChange={(topP) => setDraft((prev) => ({ ...prev, topP }))}
        />

        <label className={styles.field}>
          <span>Max Tokens</span>
          <input
            type="number"
            min={1}
            max={8192}
            value={draft.maxTokens}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                maxTokens: Number(event.target.value),
              }))
            }
          />
        </label>

        <label className={styles.field}>
          <span>System Prompt</span>
          <textarea
            value={draft.systemPrompt}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                systemPrompt: event.target.value,
              }))
            }
            rows={5}
          />
        </label>

        <Toggle
          label="Тёмная тема"
          checked={draft.theme === 'dark'}
          onChange={(checked) =>
            setDraft((prev) => ({ ...prev, theme: checked ? 'dark' : 'light' }))
          }
        />

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => {
              const resetSettings = onReset()
              setDraft(resetSettings)
            }}
          >
            Сбросить
          </Button>
          <Button onClick={() => onSave(draft)}>Сохранить</Button>
        </div>
      </aside>
    </>
  )
}
