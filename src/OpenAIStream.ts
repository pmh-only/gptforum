import { Stream } from 'openai/streaming'
import { ResponseStreamEvent } from 'openai/resources/responses/responses'
import { logger } from './Logger'

export interface OpenAIStreamData {
  message: string
  isGenerating: boolean
  metadata?: {
    model: string
    isWebSearchEnabled: boolean
    inputToken: number
    inputCachedToken: number
    reasoningToken: number
    outputToken: number
    totalToken: number
  }
}

export class OpenAIStream {
  constructor(private readonly rawStream: Stream<ResponseStreamEvent>) {}

  private readonly BUFFER_SECOND =
    parseInt(process.env.BUFFER_SECOND ?? '2') || 2

  private static DISCORD_REASONING_EMOJI_PLACEHOLDER =
    process.env.DISCORD_REASONING_EMOJI_PLACEHOLDER ??
    logger.warn(
      'Reasoning animated emoji not provided. ' +
        'you can download thinking gif from internet and provide emoji id like DISCORD_REASONING_EMOJI_PLACEHOLDER=<a:loading:1381148556462653490>'
    ) ??
    ':bulb:'

  public async *createBufferedCompletionStream(): AsyncGenerator<OpenAIStreamData> {
    const buffer: string[] = []
    const output: OpenAIStreamData = {
      message: '',
      isGenerating: true
    }

    let bufferFlushedAt = Date.now()

    for await (const chunk of this.rawStream) {
      if (chunk.type === 'response.output_text.delta') buffer.push(chunk.delta)
      if (chunk.type === 'response.reasoning_summary_text.done')
        buffer.push(
          `> ${OpenAIStream.DISCORD_REASONING_EMOJI_PLACEHOLDER} **생각**: ` +
            `${chunk.text.split('\n').join('\n> ')}\n\n`
        )

      if (chunk.type === 'response.completed') {
        output.metadata = {
          model: chunk.response.model,
          isWebSearchEnabled:
            chunk.response.tools.find((v) => v.type.includes('web_search')) !==
            undefined,
          inputToken:
            (chunk.response.usage?.input_tokens ?? 0) -
            (chunk.response.usage?.input_tokens_details.cached_tokens ?? 0),
          inputCachedToken:
            chunk.response.usage?.input_tokens_details.cached_tokens ?? 0,
          reasoningToken:
            chunk.response.usage?.output_tokens_details.reasoning_tokens ?? 0,
          outputToken:
            (chunk.response.usage?.output_tokens ?? 0) -
            (chunk.response.usage?.output_tokens_details.reasoning_tokens ?? 0),
          totalToken: chunk.response.usage?.total_tokens ?? 0
        }
      }

      if (Date.now() - bufferFlushedAt > this.BUFFER_SECOND * 1000) {
        bufferFlushedAt = Date.now()
        output.message = buffer.join('')

        yield output
      }
    }

    output.message = buffer.join('')
    output.isGenerating = false

    logger.info('Response stream finished')

    yield output
  }
}
