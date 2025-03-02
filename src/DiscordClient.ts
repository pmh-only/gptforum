import {
  ChannelType,
  Client,
  ClientOptions,
  Events,
  GatewayIntentBits
} from 'discord.js'
import { config } from './ConfigUtils'
import { ConfigIllegalError } from './Errors'
import { ChatEventHandler } from './ChatEventHandler'

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

  // ---

  private constructor() {
    super(DiscordClient.CLIENT_OPTIONS)

    this.on(Events.ClientReady, this.onReady.bind(this))
    this.on(Events.MessageCreate, ChatEventHandler.handleMessageCreate)
    this.login(config.get('DISCORD_TOKEN'))
  }

  private async onReady() {
    console.log((this.user?.username ?? 'gptforum') + ' is now ready.')
    await this.checkConfigChannelIsValid()
  }

  private async checkConfigChannelIsValid() {
    const channel = await this.channels.fetch(config.get('DISCORD_CHANNEL'), {
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
