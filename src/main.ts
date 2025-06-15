import { logger } from './Logger'
import './DiscordClient'

logger.info('gptforum started.')
;['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    logger.info(`${signal} received. exit.`)
    process.exit(0)
  })
})
