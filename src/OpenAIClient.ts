import { Chat, ChatType } from '@prisma/client'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources'
import { zodResponseFormat } from 'openai/helpers/zod'
import { OpenAIStream } from './OpenAIStream'
import { config } from './ConfigUtils'
import { z } from 'zod'

export class OpenAIClient {
  private static readonly instance = new OpenAIClient()

  public static readonly getInstance = () => OpenAIClient.instance

  private constructor() {}

  private readonly client = new OpenAI({
    apiKey: config.get('OPENAI_API_KEY')
  })

  private readonly OPENAI_DEFAULT_MODEL = config.get('OPENAI_DEFAULT_MODEL')

  private readonly OPENAI_SUMMARY_MODEL = config.get('OPENAI_SUMMARY_MODEL')

  private readonly OPENAI_DEFAULT_PROMPT = config.get('OPENAI_DEFAULT_PROMPT')

  private readonly OPENAI_SUMMARY_PROMPT = config.get('OPENAI_SUMMARY_PROMPT')

  public async startCompletion(chats: Chat[]) {
    const messages = this.convertChatsToMessages(chats)

    const rawStream = await this.client.chat.completions.create({
      model: this.OPENAI_DEFAULT_MODEL,
      store: false,
      messages: [
        {
          role: 'system',
          content: this.OPENAI_DEFAULT_PROMPT
        },
        ...messages
      ],
      stream: true,
      stream_options: {
        include_usage: true
      }
    })

    return new OpenAIStream(rawStream).createBufferedCompletionStream()
  }

  public async startGeneratingSummary(
    chats: Chat[],
    tagChoices?: string[]
  ): Promise<
    | {
        title: string
        tags?: string[]
      }
    | undefined
  > {
    const messages = this.convertChatsToMessages(chats)

    const completion = await this.client.chat.completions.create({
      model: this.OPENAI_SUMMARY_MODEL,
      store: false,
      messages: [
        {
          role: 'system',
          content: this.OPENAI_SUMMARY_PROMPT
        },
        ...messages
      ],
      response_format: zodResponseFormat(
        z.object({
          title: z.string(),
          ...(tagChoices !== undefined && tagChoices.length > 0
            ? { tags: z.array(z.enum(tagChoices as [string, ...string[]])) }
            : {})
        }),
        'summary'
      )
    })

    return JSON.parse(completion.choices[0].message.content ?? 'undefined')
  }

  private readonly convertChatsToMessages = (chats: Chat[]) =>
    chats.map((chat) => ({
      role: this.convertChatTypeToMessageRole(chat.type),
      content: chat.message
    })) as ChatCompletionMessageParam[]

  private readonly convertChatTypeToMessageRole = (chatType: ChatType) =>
    ({
      [ChatType.ASSISTANT]: 'assistant',
      [ChatType.USER]: 'user'
    })[chatType]
}
