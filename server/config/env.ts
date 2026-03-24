import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: 'server/.env' })

type EnvSource = Record<string, string | undefined>

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  GIGACHAT_AUTH_KEY: z.string().min(1, 'GIGACHAT_AUTH_KEY is required'),
  GIGACHAT_SCOPE: z.string().min(1, 'GIGACHAT_SCOPE is required'),
  GIGACHAT_AUTH_URL: z.string().url().default('https://ngw.devices.sberbank.ru:9443/api/v2/oauth'),
  GIGACHAT_API_URL: z.string().url().default('https://gigachat.devices.sberbank.ru/api/v1'),
  GIGACHAT_CA_CERT_PATH: z.string().min(1).optional(),
})

export type ServerEnv = {
  port: number
  gigachatAuthKey: string
  gigachatScope: string
  gigachatAuthUrl: string
  gigachatApiUrl: string
  gigachatCaCertPath?: string
}

export function loadEnv(source: EnvSource = process.env): ServerEnv {
  const parsed = envSchema.safeParse(source)

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join('; ')
    throw new Error(`Invalid server environment: ${issues}`)
  }

  return {
    port: parsed.data.PORT,
    gigachatAuthKey: parsed.data.GIGACHAT_AUTH_KEY,
    gigachatScope: parsed.data.GIGACHAT_SCOPE,
    gigachatAuthUrl: parsed.data.GIGACHAT_AUTH_URL,
    gigachatApiUrl: parsed.data.GIGACHAT_API_URL,
    gigachatCaCertPath: parsed.data.GIGACHAT_CA_CERT_PATH,
  }
}
