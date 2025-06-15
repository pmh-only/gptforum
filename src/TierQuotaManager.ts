import { ChannelType, GuildTextBasedChannel } from 'discord.js'
import { prisma } from './Database'
import { DiscordClient } from './DiscordClient'
import { ModelFreeTier, ModelTierCredit, ModelTierLabel } from './Models'

export class TierQuotaManager {
  private static instance = new TierQuotaManager()

  private static DISCORD_QUOTA_DISPLAY_CHANNEL =
    process.env.DISCORD_QUOTA_DISPLAY_CHANNEL ?? '0'

  private static DISCORD_QUOTA_DISPLAY_INTERVAL =
    Number.parseInt(process.env.DISCORD_QUOTA_DISPLAY_INTERVAL ?? '10') || 10

  public static readonly getInstance = () => TierQuotaManager.instance

  // ---

  private constructor() {}

  private displayChannel: GuildTextBasedChannel | undefined

  public async addQuotaUsage(tier: ModelFreeTier, usage: number) {
    const date = new Date().toISOString().split('T')[0]
    const tierQuota = await prisma.tierQuota.findUnique({
      where: {
        date_tier: {
          tier,
          date
        }
      }
    })

    if (tierQuota === null) await this.createQuotaDisplay(tier)

    await prisma.tierQuota.update({
      data: {
        usage: (tierQuota?.usage ?? 0) + usage
      },
      where: {
        date_tier: {
          tier,
          date
        }
      }
    })
  }

  public async createQuotaDisplay(tier: string) {
    const date = new Date().toISOString().split('T')[0]
    const tierQuota = await prisma.tierQuota.findFirst({
      where: {
        date
      }
    })

    if (typeof tierQuota?.messageId === 'string') {
      await prisma.tierQuota.create({
        data: {
          tier,
          date,
          usage: 0,
          messageId: tierQuota.messageId
        }
      })
      return
    }

    const messageId =
      (await this.displayChannel
        ?.send(`> **\`${date}\` 무료 할당량 사용률**\n> 계산중...`)
        ?.then((v) => v.id)) ?? undefined

    await prisma.tierQuota.create({
      data: {
        tier,
        date,
        usage: 0,
        messageId
      }
    })
  }

  public async initClient(client: DiscordClient) {
    const channel = await client.channels
      .fetch(TierQuotaManager.DISCORD_QUOTA_DISPLAY_CHANNEL, {
        allowUnknownGuild: true
      })
      .catch(() => null)

    if (channel === null || channel.type !== ChannelType.GuildText)
      return undefined

    if (channel.permissionsFor(client.user!)?.has('SendMessages') !== true)
      return undefined

    this.displayChannel = channel
    this.startDisplayCycle()
  }

  // ---

  private previousDisplayCycleOutput = ''
  private isDisplayCycleEnabled = false

  private startDisplayCycle() {
    if (this.isDisplayCycleEnabled) return
    this.isDisplayCycleEnabled = true

    setInterval(
      this.onDisplayCycle.bind(this),
      TierQuotaManager.DISCORD_QUOTA_DISPLAY_INTERVAL * 1000
    )
  }

  private async onDisplayCycle() {
    const date = new Date().toISOString().split('T')[0]
    const tierQuotas = await prisma.tierQuota.findMany({
      where: {
        date
      }
    })

    const output =
      `> **\`${date}\` 무료 할당량 사용률**\n> \n` +
      (Object.entries(ModelTierCredit) as [ModelFreeTier, number][])
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => {
          const label = ModelTierLabel[key]
          const usage = tierQuotas.find((v) => v.tier === key)?.usage ?? 0
          const percent = (usage / value) * 100 || 0

          return `> **${label}**: \`${usage.toLocaleString('en-US')}/${value.toLocaleString('en-US')} (${percent.toFixed(2)}%)\` 토큰`
        })
        .join('\n') +
      '\n> \n' +
      `> 총합: ${tierQuotas
        .reduce((prev, curr) => prev + curr.usage, 0)
        .toLocaleString('en-US')} 토큰`

    if (this.previousDisplayCycleOutput === output) return
    this.previousDisplayCycleOutput = output

    const messageId = tierQuotas[0]?.messageId
    if (typeof messageId !== 'string') return

    void this.displayChannel?.messages
      .fetch(messageId)
      .then((v) => v.edit(output))
      .catch(() => {})
  }
}
