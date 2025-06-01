import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { OpenAIStream } from './OpenAIStream'
import { config } from './ConfigUtils'
import { z } from 'zod'
import { Chat } from './Chat'

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
    const rawStream = await this.client.responses.create({
      model: this.OPENAI_DEFAULT_MODEL,
      store: true,
      tools: [{ type: 'web_search_preview' }],
      input: [
        {
          role: 'system',
          content: this.OPENAI_DEFAULT_PROMPT
        },
        ...chats.map((v) => v.convertToOpenAIResponse())
      ],
      stream: true
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
    const completion = await this.client.responses.create({
      model: this.OPENAI_SUMMARY_MODEL,
      store: false,
      input: [
        {
          role: 'system',
          content: this.OPENAI_SUMMARY_PROMPT
        },
        ...chats.map((v) => v.convertToOpenAIResponse())
      ],
      text: {
        format: zodTextFormat(
          z.object({
            title: z.string(),
            ...(tagChoices !== undefined && tagChoices.length > 0
              ? { tags: z.array(z.enum(tagChoices as [string, ...string[]])) }
              : {})
          }),
          'summary'
        )
      }
    })

    return JSON.parse(completion.output_text)
  }
}
