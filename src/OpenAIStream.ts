import { ChatCompletionChunk } from 'openai/resources'
import { Stream } from 'openai/streaming'
import { config } from './ConfigUtils'

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
  constructor(private readonly rawStream: Stream<ChatCompletionChunk>) {}

  private readonly BUFFER_SECOND = config.getInt('BUFFER_SECOND')

  public async *createBufferedCompletionStream(): AsyncGenerator<OpenAIStreamData> {
    const buffer: string[] = []
    const output: OpenAIStreamData = {
      message: '',
      isGenerating: true
    }

    let bufferFlushedAt = Date.now()

    for await (const chunk of this.createCompletionStream()) {
      if (chunk.content !== undefined) buffer.push(chunk.content)
      if (chunk.usage !== undefined) {
        output.metadata = {
          inputToken: chunk.usage.prompt_tokens,
          outputToken: chunk.usage.completion_tokens,
          totalToken: chunk.usage.total_tokens
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

  private async *createCompletionStream() {
    for await (const chunk of this.rawStream) {
      yield {
        content: chunk.choices?.[0]?.delta?.content ?? undefined,
        usage: chunk.usage ?? undefined
      }
    }
  }
}
