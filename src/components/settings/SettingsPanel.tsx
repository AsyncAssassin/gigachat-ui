import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { fetchGigaChatModels } from '../../api/gigachat'
import { modelOptions } from '../../mocks/settings'
import type { ChatSettings } from '../../types/settings'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
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
  const [models, setModels] = useState(modelOptions)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadModels = async () => {
      try {
        const loadedModels = await fetchGigaChatModels(controller.signal)
        if (loadedModels.length === 0) {
          setModels(modelOptions)
          return
        }

        setModels(
          loadedModels.map((modelName) => ({
            value: modelName,
            label: modelName,
          })),
        )
        setLoadError(null)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setModels(modelOptions)
        setLoadError('Не удалось загрузить модели, использован fallback список.')
      }
    }

    void loadModels()

    return () => {
      controller.abort()
    }
  }, [])

  const availableModelOptions = useMemo(() => {
    const hasCurrentModel = models.some((option) => option.value === draft.model)
    if (hasCurrentModel) {
      return models
    }

    return [
      { value: draft.model, label: `${draft.model} (текущее)` },
      ...models,
    ]
  }, [models, draft.model])

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
            {availableModelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <ErrorMessage message={loadError} />

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

        <Slider
          label="Repetition Penalty"
          min={0}
          max={10}
          step={0.1}
          value={draft.repetitionPenalty}
          onChange={(repetitionPenalty) =>
            setDraft((prev) => ({
              ...prev,
              repetitionPenalty,
            }))
          }
        />

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
