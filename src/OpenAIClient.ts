import { Chat, ChatType } from '@prisma/client'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources'
import { OpenAIStream } from './OpenAIStream'
import { config } from './ConfigUtils'

export class OpenAIClient {
  private static readonly instance = new OpenAIClient()

  public static readonly getInstance = () => OpenAIClient.instance

  private constructor() {}

  private readonly client = new OpenAI({
    apiKey: config.get('OPENAI_API_KEY')
  })

  private readonly OPENAI_DEFAULT_MODEL = config.get('OPENAI_DEFAULT_MODEL')

  public async startCompletion(chats: Chat[]) {
    const messages = this.convertChatsToMessages(chats)
    const rawStream = await this.client.chat.completions.create({
      model: this.OPENAI_DEFAULT_MODEL,
      store: false,
      messages: messages as ChatCompletionMessageParam[],
      stream: true
    })

    return new OpenAIStream(rawStream).createBufferedCompletionStream()
  }

  private readonly convertChatsToMessages = (chats: Chat[]) =>
    chats.map((chat) => ({
      role: this.convertChatTypeToMessageRole(chat.type),
      content: chat.message
    }))

  private readonly convertChatTypeToMessageRole = (chatType: ChatType) =>
    ({
      [ChatType.ASSISTANT]: 'assistant',
      [ChatType.USER]: 'user'
    })[chatType]
}
