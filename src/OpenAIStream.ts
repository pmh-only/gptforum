import { Stream } from 'openai/streaming'
import { config } from './ConfigUtils'
import { ResponseStreamEvent } from 'openai/resources/responses/responses.mjs'

export interface OpenAIStreamData {
  message: string
  isGenerating: boolean
  metadata?: {
    inputToken: number
    outputToken: number
    totalToken: number
  }
}

export class OpenAIStream {
  constructor(private readonly rawStream: Stream<ResponseStreamEvent>) {}

  private readonly BUFFER_SECOND = config.getInt('BUFFER_SECOND')

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
          inputToken: chunk.response.usage?.input_tokens ?? 0,
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

    yield output
  }
}
