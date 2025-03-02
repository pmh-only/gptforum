import { ChatCompletionChunk } from 'openai/resources'
import { Stream } from 'openai/streaming'
import { config } from './ConfigUtils'

export class OpenAIStream {
  constructor(private readonly rawStream: Stream<ChatCompletionChunk>) {}

  private readonly BUFFER_SECOND = config.getInt('BUFFER_SECOND')

  public async *createBufferedCompletionStream() {
    const buffer: string[] = []
    let bufferFlushedAt = Date.now()

    for await (const chunk of this.createCompletionStream()) {
      buffer.push(chunk)

      if (Date.now() - bufferFlushedAt > this.BUFFER_SECOND * 1000) {
        yield buffer.join('') + '⬤'
        bufferFlushedAt = Date.now()
      }
    }

    yield buffer.join('')
  }

  private async *createCompletionStream() {
    for await (const chunk of this.rawStream) {
      const isTerminateChunk = chunk?.choices?.[0]?.finish_reason !== null

      const isContentChunk =
        typeof chunk?.choices?.[0]?.delta?.content === 'string'

      if (isContentChunk) yield chunk.choices[0].delta.content as string
      if (isTerminateChunk) break
    }
  }
}
