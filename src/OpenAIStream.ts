import { Stream } from 'openai/streaming'
import { ResponseStreamEvent } from 'openai/resources/responses/responses'
import { logger } from './Logger'
import { OpenAIStreamData, OpenAIStreamDataItemType } from './OpenAIStreamData'

export class OpenAIStream {
  constructor(private readonly rawStream: Stream<ResponseStreamEvent>) {}

  public async *createBufferedCompletionStream(): AsyncGenerator<OpenAIStreamData> {
    const output: OpenAIStreamData = {
      items: [],
      output: '',
      refusal: '',
      isGenerating: true
    }

    for await (const chunk of this.rawStream) {
      if (chunk.type === 'response.output_text.delta')
        output.output += chunk.delta

      if (chunk.type === 'response.output_text.done')
        output.output = chunk.text

      if (chunk.type === 'response.refusal.delta')
        output.refusal += chunk.delta

      if (chunk.type === 'response.refusal.done')
        output.refusal = chunk.refusal

      if (chunk.type === 'response.reasoning_summary_text.delta') {
        if (output.items[chunk.output_index] === undefined) {
          output.items[chunk.output_index] = {
            type: OpenAIStreamDataItemType.REASONING,
            text: '',
            isGenerating: true
          }
        }

        output.items[chunk.output_index].text += chunk.delta
      }

      if (chunk.type === 'response.reasoning_summary_text.done') {
        if (output.items[chunk.output_index] === undefined) {
          output.items[chunk.output_index] = {
            type: OpenAIStreamDataItemType.REASONING,
            text: '',
            isGenerating: false
          }
        }

        output.items[chunk.output_index].text = chunk.text
        output.items[chunk.output_index].isGenerating = false
      }

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

      yield output
    }

    output.isGenerating = false
    logger.info('Response stream finished')

    yield output
  }
}
