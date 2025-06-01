import {
  ChannelType,
  ForumThreadChannel,
  Message,
  PublicThreadChannel
} from 'discord.js'
import { config } from './ConfigUtils'
import { Conversation } from './Conversation'
import { NotFoundError } from './Errors'
import { OpenAIClient } from './OpenAIClient'
import { OpenAIStreamData } from './OpenAIStream'
import { Chat } from './Chat'
import { ModelSelection } from './ModelSelectiont'

export class ChatEventHandler {
  private static readonly DISCORD_CHANNEL = config.get('DISCORD_CHANNEL')

  public static async handleMessageCreate(message: Message) {
    if (message.channel.type !== ChannelType.PublicThread) return
    if (message.channel.parentId !== ChatEventHandler.DISCORD_CHANNEL) return
    if (message.author.bot) return
    if (message.channel.flags.has('Pinned')) return
    if (message.content.match(/^[#/]/)) return

    new ChatEventHandler(message).handle()
  }

  // ---

  private constructor(private readonly message: Message) {
    this.channel = this.message.channel as ForumThreadChannel
  }

  private readonly DISCORD_MESSAGE_LENGTH_MAX = 2000

  private readonly openai = OpenAIClient.getInstance()

  private readonly channel: ForumThreadChannel

  private readonly alreadySentMessages: Message[] = []

  private async handle() {
    const conversation = await this.fetchConversation()
    const isPermissionDenied = await conversation
      .addDiscordMesssage(this.message)
      .then(() => false)
      .catch(() => true)

    if (isPermissionDenied) return

    await this.initializeResponseMessage()

    const chats = await conversation.getAllChats()
    if (conversation.isStarter) void this.applyConversationSummary(chats)

    const completionStream = await this.openai.startCompletion(
      conversation.model,
      chats
    )

    const response = await this.iterateOverCompletionStream(completionStream)

    await conversation.addOpenAIResponse(response)
  }

  private async fetchConversation() {
    const fetchedConversation = await Conversation.fetchFromChannel(
      this.channel
    ).catch((err: Error) => err)

    if (fetchedConversation instanceof NotFoundError) {
      const model = await new ModelSelection(this.channel).handle()

      return await Conversation.createFromChannel(
        this.message.channel,
        this.message.author,
        model
      )
    }

    return fetchedConversation as Conversation
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
      content: '> <a:loading:1349419254092529805> 생각중...',
      allowedMentions: {
        repliedUser: false
      }
    })
  }

  private async iterateOverCompletionStream(
    stream: AsyncGenerator<OpenAIStreamData>
  ) {
    let response = ''

    for await (const streamData of stream) {
      response =
        `${streamData.message}${streamData.isGenerating ? '⬤' : ''}` +
        (streamData.metadata !== undefined
          ? '\n' +
            `> **${streamData.metadata.model}**\n` +
            `> 입력: ${streamData.metadata.inputToken} 토큰\n` +
            (streamData.metadata.reasoningToken > 0
              ? `> 생각: ${streamData.metadata.reasoningToken} 토큰\n`
              : '') +
            `> 출력: ${streamData.metadata.outputToken - (streamData.metadata.reasoningToken ?? 0)} 토큰\n` +
            `> 총합: ${streamData.metadata.totalToken} 토큰\n`
          : '')

      await this.respondMessage(response)
    }

    return response
  }

  private sliceStringByDiscordLimit(str: string): string[] {
    const originalSlices = str.split('\n')
    const resultSlices: string[] = []

    let intermediateSlice = ''
    for (const slice of originalSlices) {
      const futureSlice = (intermediateSlice + '\n' + slice).trim()

      if (futureSlice.length <= this.DISCORD_MESSAGE_LENGTH_MAX) {
        intermediateSlice = futureSlice
        continue
      }

      resultSlices.push(intermediateSlice)
      intermediateSlice = slice
    }

    resultSlices.push(intermediateSlice)

    return resultSlices
  }

  private async respondMessage(response: string) {
    const slicedCompletion = this.sliceStringByDiscordLimit(response)

    for (const [sliceIdx, slice] of slicedCompletion.entries())
      await this.upsertResponseMessage(sliceIdx, slice)
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
