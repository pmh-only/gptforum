import {
  ChannelType,
  Client,
  ClientOptions,
  Events,
  GatewayIntentBits
} from 'discord.js'
import { ConfigIllegalError } from './Errors'
import { ChatEventHandler } from './ChatEventHandler'
import { logger } from './Logger'
import { TierQuotaManager } from './TierQuotaManager'

export class DiscordClient extends Client {
  private static readonly CLIENT_OPTIONS: ClientOptions = {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  }

  private static instance = new DiscordClient()

  public static readonly getInstance = () => DiscordClient.instance

  private static DISCORD_TOKEN =
    process.env.DISCORD_TOKEN ??
    logger.error('DISCORD_TOKEN NOT PROVIDED') ??
    process.exit(-1)

  private static DISCORD_CHANNEL =
    process.env.DISCORD_CHANNEL ??
    logger.error('DISCORD_CHANNEL NOT PROVIDED') ??
    process.exit(-1)

  // ---

  private constructor() {
    super(DiscordClient.CLIENT_OPTIONS)

    this.on(Events.ClientReady, this.onReady.bind(this))
    this.on(
      Events.MessageCreate,
      ChatEventHandler.handleMessageCreate.bind(ChatEventHandler)
    )

    this.login(DiscordClient.DISCORD_TOKEN)
  }

  private readonly tierQuotaManager = TierQuotaManager.getInstance()

  private async onReady() {
    logger.info((this.user?.username ?? 'gptforum') + ' is now ready.')

    await this.checkConfigChannelIsValid()
    await this.tierQuotaManager.initClient(this)
  }

  private async checkConfigChannelIsValid() {
    const channel = await this.channels.fetch(DiscordClient.DISCORD_CHANNEL, {
      allowUnknownGuild: true
    })

    if (channel === null)
      throw new ConfigIllegalError('Provided channel not found.')

    if (channel.type !== ChannelType.GuildForum)
      throw new ConfigIllegalError('Provided channel is not a forum channel.')

    if (
      channel.permissionsFor(this.user!)?.has('SendMessagesInThreads') !== true
    )
      throw new ConfigIllegalError(
        'Bot user does not have permission to send messages.'
      )
  }
}
