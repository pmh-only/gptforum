import { Stream } from 'openai/streaming'
import { ResponseStreamEvent } from 'openai/resources/responses/responses.mjs'
import { logger } from './Logger'

export interface OpenAIStreamData {
  message: string
  isGenerating: boolean
  metadata?: {
    model: string
    inputToken: number
    reasoningToken: number
    outputToken: number
    totalToken: number
  }
}

export class OpenAIStream {
  constructor(private readonly rawStream: Stream<ResponseStreamEvent>) {}

  private readonly BUFFER_SECOND =
    parseInt(process.env.BUFFER_SECOND ?? '2') || 2

  public async *createBufferedCompletionStream(): AsyncGenerator<OpenAIStreamData> {
    const buffer: string[] = []
    const output: OpenAIStreamData = {
      message: '',
      isGenerating: true
    }

    let bufferFlushedAt = Date.now()

    for await (const chunk of this.rawStream) {
      if (chunk.type === 'response.output_text.delta') buffer.push(chunk.delta)

      if (chunk.type === 'response.completed') {
        output.metadata = {
          model: chunk.response.model,
          inputToken: chunk.response.usage?.input_tokens ?? 0,
          reasoningToken:
            chunk.response.usage?.output_tokens_details.reasoning_tokens ?? 0,
          outputToken: chunk.response.usage?.output_tokens ?? 0,
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

    logger.info('Resopnse stream finished')

    yield output
  }
}
