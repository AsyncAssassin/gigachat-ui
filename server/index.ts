import { createApp } from './app'
import { loadEnv } from './config/env'
import { createLogger } from './lib/logger'

const env = loadEnv()
const logger = createLogger()
const app = createApp({ env, logger })

app.listen(env.port, () => {
  logger.info(`Server is running on http://localhost:${env.port}`)
})
