import {
  ActionRowBuilder,
  ComponentType,
  ForumThreadChannel,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js'
import crypto from 'node:crypto'
import { logger } from './Logger'
import { MODELS } from './Models'

export class ModelSelection {
  constructor(private readonly channel: ForumThreadChannel) {}

  public async handle() {
    logger.info('Start model selection.')

    const customId = crypto.randomUUID()
    const select = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('여기를 눌러 모델 선택...')
      .addOptions(
        ...Object.entries(MODELS).map(([key, value]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(value.label)
            .setDescription(value.description)
            .setValue(key)
            .setEmoji(value.emoji)
        )
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

    logger.info('Model selection handler finished.')

    await interaction.update({})
    await message.delete()
    return interaction.values[0]
  }
}
