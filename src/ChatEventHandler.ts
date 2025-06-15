import {
  ChannelType,
  ForumThreadChannel,
  Message,
  PublicThreadChannel
} from 'discord.js'
import { Conversation } from './Conversation'
import { NotFoundError } from './Errors'
import { OpenAIClient } from './OpenAIClient'
import { OpenAIStreamData } from './OpenAIStream'
import { Chat } from './Chat'
import { ModelSelection } from './ModelSelection'
import { logger } from './Logger'
import { Model, MODELS } from './Models'
import { TierQuotaManager } from './TierQuotaManager'

export class ChatEventHandler {
  private static DISCORD_CHANNEL =
    process.env.DISCORD_CHANNEL ??
    logger.error('DISCORD_CHANNEL NOT PROVIDED') ??
    process.exit(-1)

  private static DISCORD_LOADING_EMOJI_PLACEHOLDER =
    process.env.DISCORD_LOADING_EMOJI_PLACEHOLDER ??
    logger.warn(
      'Loading animated emoji not provided. ' +
        'you can download loading gif from internet and provide emoji id like DISCORD_LOADING_EMOJI_PLACEHOLDER=<a:loading:1381148556462653490>'
    ) ??
    '<a:loading:1381148556462653490>'

  public static async handleMessageCreate(message: Message) {
    if (message.channel.type !== ChannelType.PublicThread) return
    if (message.channel.parentId !== ChatEventHandler.DISCORD_CHANNEL) return
    if (message.author.bot) return
    if (message.channel.flags.has('Pinned')) return
    if (message.content.startsWith('#')) return

    logger.info('condition met. create new handler instance.')

    const conversation = await this.fetchConversation(message)

    new ChatEventHandler(
      message,
      conversation,
      await conversation.getIsStarter()
    ).handle()
  }

  private static async fetchConversation(message: Message) {
    const fetchedConversation = await Conversation.fetchFromChannel(
      message.channel
    ).catch((err: Error) => err)

    if (fetchedConversation instanceof NotFoundError) {
      const model = await new ModelSelection(
        message.channel as ForumThreadChannel
      ).handle()

      return await Conversation.createFromChannel(
        message.channel,
        message.author,
        model
      )
    }

    return fetchedConversation as Conversation
  }

  // ---

  private constructor(
    private readonly message: Message,
    private readonly conversation: Conversation,
    private readonly isStarter: boolean
  ) {
    this.channel = this.message.channel as ForumThreadChannel
  }

  private readonly DISCORD_MESSAGE_LENGTH_MAX = 2000

  private readonly openai = OpenAIClient.getInstance()

  private readonly channel: ForumThreadChannel

  private readonly alreadySentMessages: Message[] = []

  private readonly tierQuota = TierQuotaManager.getInstance()

  private async handle() {
    const isAuthorPermitted = this.conversation.isUserPermitted(
      this.message.author
    )
    if (!isAuthorPermitted) {
      logger.warn('Permit violation detected. ignore message.')
      return
    }

    const isCommandProvided = this.message.content.startsWith('/')
    if (isCommandProvided) {
      const isContinue = await this.handleCommand()
      if (!isContinue) return
    }

    if (!isCommandProvided)
      await this.conversation.addDiscordMesssage(this.message)

    if (this.conversation.isEditMode) return

    await this.initializeResponseMessage()

    const chats = await this.conversation.getAllChats()
    if (this.isStarter) void this.applyConversationSummary(chats)

    const model = MODELS[this.conversation.model]
    if (model === undefined) {
      await this.respondMessage(
        `> 모델 \`${this.conversation.model}\`는 지원 종료되었습니다. 새로운 대화를 시작해 주세요`
      )
      return
    }

    const completionStream = await this.openai.startCompletion(model, chats)
    const response = await this.iterateOverCompletionStream(
      model,
      completionStream
    )

    await this.conversation.addOpenAIResponse(response.message)
    await this.tierQuota.addQuotaUsage(
      model.freeTier,
      response.metadata?.totalToken ?? 0
    )
  }

  private async handleCommand(): Promise<boolean> {
    if (this.message.content.startsWith('/editor')) {
      await this.conversation.toggleEditorMode()
      if (this.conversation.isEditMode)
        await this.respondMessage(
          '> 에디터 모드를 시작합니다. `/editor`로 종료할 수 있습니다'
        )
    }

    if (this.message.content.startsWith('/model')) {
      const model = await new ModelSelection(this.channel).handle()
      await this.conversation.setModel(model)
      await this.respondMessage(
        `> 현재 대화의 모델을 \`${model}\`로 변경하였습니다`
      )
      return false
    }

    return true
  }

  private async applyConversationSummary(chats: Chat[]) {
    const tagChoices = this.channel.parent?.availableTags.map(
      (v) => `${v.name}:${v.id}`
    )

    const summary = await this.openai.startGeneratingSummary(chats, tagChoices)
    const channel = this.message.channel as PublicThreadChannel<true>

    if (summary === undefined) return

    await channel.edit({
      name: `${channel.name} - ${summary.title}`.slice(0, 100),
      appliedTags: summary.tags?.map((v) => v.split(':')[1])
    })
  }

  private async initializeResponseMessage() {
    this.alreadySentMessages[0] = await this.message.reply({
      content: `> ${ChatEventHandler.DISCORD_LOADING_EMOJI_PLACEHOLDER} 생각중...`,
      allowedMentions: {
        repliedUser: false
      }
    })
  }

  private async iterateOverCompletionStream(
    model: Model,
    stream: AsyncGenerator<OpenAIStreamData>
  ) {
    let response: OpenAIStreamData | undefined

    for await (const streamData of stream) {
      response = streamData

      const cost = {
        input:
          (streamData.metadata?.inputToken ?? 0 * model.cost.input) / 1_000_000,
        cachedInput:
          (streamData.metadata?.inputCachedToken ??
            0 * model.cost.cached_input) / 1_000_000,
        reasoning:
          (streamData.metadata?.reasoningToken ?? 0 * model.cost.output) /
          1_000_000,
        output:
          (streamData.metadata?.outputToken ?? 0 * model.cost.output) /
          1_000_000
      }

      const totalCost = Object.values(cost).reduce(
        (prev, curr) => prev + curr,
        0
      )

      await this.respondMessage(
        `${streamData.message}${streamData.isGenerating ? '⬤' : ''}` +
          (streamData.metadata !== undefined
            ? '\n\n' +
              `> **${streamData.metadata.model}** ${streamData.metadata.isWebSearchEnabled ? '(:globe_with_meridians: 검색 활성화됨)' : ''}\n` +
              `> 입력: ${streamData.metadata.inputToken} 토큰 (${cost.input.toFixed(4)}$)\n` +
              `> 캐시: ${streamData.metadata.inputCachedToken} 토큰 (${cost.cachedInput.toFixed(4)}$)\n` +
              (streamData.metadata.reasoningToken > 0
                ? `> 생각: ${streamData.metadata.reasoningToken} 토큰 (${cost.reasoning.toFixed(4)}$)\n`
                : '') +
              `> 출력: ${streamData.metadata.outputToken} 토큰 (${cost.output.toFixed(4)}$)\n` +
              `> 총합: ${streamData.metadata.totalToken} 토큰 (${totalCost.toFixed(4)}$)` +
              (this.isStarter
                ? '\n\n' +
                  '> **Commands** \n' +
                  '> `/model`: 모델 변경\n' +
                  '> `/editor`: 에디터 모드 토글 (메시지를 모아두었다가 한번에 요청)\n'
                : '')
            : '')
      )
    }

    return response as OpenAIStreamData
  }

  private sliceStringByDiscordLimit(str: string): string[] {
    const originalSlices = str.split('\n')
    const resultSlices: string[] = []

    let intermediateSlice = ''

    for (const slice of originalSlices) {
      const futureSlice = intermediateSlice + '\n' + slice
      const isCodeBlockNotFinished =
        intermediateSlice.split('```').length % 2 === 0
      const maximumFeatureLenght =
        this.DISCORD_MESSAGE_LENGTH_MAX - (isCodeBlockNotFinished ? 3 : 0)

      if (futureSlice.length <= maximumFeatureLenght) {
        intermediateSlice = futureSlice
        continue
      }

      intermediateSlice += isCodeBlockNotFinished ? '```' : ''

      resultSlices.push(intermediateSlice)
      intermediateSlice = (isCodeBlockNotFinished ? '```' : '') + slice
    }

    resultSlices.push(intermediateSlice)

    return resultSlices
  }

  private async respondMessage(response: string) {
    const slicedCompletion = this.sliceStringByDiscordLimit(response)

    for (const [sliceIdx, slice] of slicedCompletion.entries()) {
      const isCodeBlockNotFinished = slice.split('```').length % 2 === 0

      await this.upsertResponseMessage(
        sliceIdx,
        slice + (isCodeBlockNotFinished ? '```' : '')
      )
    }
  }

  private async upsertResponseMessage(idx: number, content: string) {
    const alreadySentMessage = this.alreadySentMessages[idx]

    if (alreadySentMessage === undefined) {
      const sentMessage = await this.channel.send(content)
      this.alreadySentMessages.push(sentMessage)

      return
    }

    if (content !== alreadySentMessage.content) {
      await alreadySentMessage.edit({
        content: content,
        allowedMentions: {
          repliedUser: false
        }
      })
    }
  }
}
