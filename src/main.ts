import './ConfigUtils'
import './DiscordClient'
import './ChatEventHandler'
import { logger } from './Logger'
;['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.info(`${signal} received. exit.`)
    process.exit(0)
  })
})
