import './ConfigUtils'
import './DiscordClient'
import './ChatEventHandler'
;['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`INFO: ${signal} received. exit.`)
    process.exit(0)
  })
})
