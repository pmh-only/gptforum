import {
  ActionRowBuilder,
  ComponentType,
  ForumThreadChannel,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import crypto from 'node:crypto'

export class ModelSelection {
  constructor(private readonly channel: ForumThreadChannel) {}

  public async handle() {
    const customId = crypto.randomUUID()
    const select = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('여기를 눌러 모델 선택...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('o3')
          .setDescription(
            '생각하는데 더 많은 시간을 투자하여 전문적이거나 여러 각도의 고민이 필요한 주제에 적합합니다'
          )
          .setValue('o3')
          .setEmoji('🤔'),
        new StringSelectMenuOptionBuilder()
          .setLabel('o4-mini')
          .setDescription(
            '적당한 시간을 투자하여 복잡한 문제를 해결하는데 적합합니다'
          )
          .setValue('o4-mini')
          .setEmoji('🔍'),
        new StringSelectMenuOptionBuilder()
          .setLabel('GPT-4.1')
          .setDescription('답변 생성이 빠르고 어떤 주제에도 적합합니다')
          .setValue('gpt-4.1')
          .setEmoji('💡'),
        new StringSelectMenuOptionBuilder()
          .setLabel('GPT-4.1-nano')
          .setDescription(
            '답변 생성이 매우 빨라 단순한 자동완성 등에 적합합니다'
          )
          .setValue('gpt-4.1-nano')
          .setEmoji('⚡'),
        new StringSelectMenuOptionBuilder()
          .setLabel('chatgpt-4o-latest')
          .setDescription(
            '무료로 제공되는 모델입니다. 보통 생각하는 GPT의 말투를 가지고 있습니다'
          )
          .setValue('chatgpt-4o-latest')
          .setEmoji('🤪')
      )

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      select
    )

    const message = await this.channel.send({
      content: '> 답변을 생성할 OpenAI 모델을 선택하세요',
      components: [row]
    })

    const interaction = await this.channel.awaitMessageComponent({
      filter: (i) => i.customId === customId,
      componentType: ComponentType.StringSelect
    })

    await interaction.update({})
    await message.delete()
    return interaction.values[0]
  }
}
