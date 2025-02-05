import { Client, ClientOptions, Events, GatewayIntentBits } from 'discord.js'

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

    this.registEvents()
    this.login(process.env.DISCORD_TOKEN)
  }

  private registEvents() {
    this.on(Events.ClientReady, this.onReady.bind(this))
  }

  private readonly onReady = () =>
    console.log((this.user?.username ?? 'gptforum') + ' is now ready.')
}
