import { Stream } from 'openai/streaming'
import { ResponseStreamEvent } from 'openai/resources/responses/responses'
import { logger } from './Logger'
import { OpenAIStreamData, OpenAIStreamDataItemCodeInterprete, OpenAIStreamDataItemReasoning, OpenAIStreamDataItemSearching, OpenAIStreamDataItemType } from './OpenAIStreamData'

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
      if (typeof process.env.VERBOSE === 'string')
        logger.verbose(JSON.stringify(chunk))

      if (chunk.type === 'response.output_text.delta')
        output.output += chunk.delta

      if (chunk.type === 'response.output_text.done')
        output.output = chunk.text

      if (chunk.type === 'response.refusal.delta')
        output.refusal += chunk.delta

      if (chunk.type === 'response.refusal.done')
        output.refusal = chunk.refusal

      if (chunk.type === 'response.output_item.added') {
        if (chunk.item.type === 'reasoning')
          output.items[chunk.output_index] = {
            type: OpenAIStreamDataItemType.REASONING,
            text: '',
            isGenerating: true
          }
        
        if (chunk.item.type === 'web_search_call')
          output.items[chunk.output_index] = {
            type: OpenAIStreamDataItemType.SEARCHING,
            query: '',
            isGenerating: true
          }
        
        if (chunk.item.type === 'code_interpreter_call')
          output.items[chunk.output_index] = {
            type: OpenAIStreamDataItemType.CODE_INTERPRETE,
            code: '',
            output: '',
            isGenerating: true
          }
      }

      if (chunk.type === 'response.output_item.done') {
        if (output.items[chunk.output_index] === undefined)
          continue

        if (chunk.item.type === 'web_search_call')
          (output.items[chunk.output_index] as OpenAIStreamDataItemSearching)
            .query = (chunk.item as any).action.query

        if (chunk.item.type === 'code_interpreter_call')
          (output.items[chunk.output_index] as OpenAIStreamDataItemCodeInterprete)
            .output = (chunk.item as any).outputs
              .filter((v: any) => v.type === 'logs')
              .map((v: any) => v.logs).join('\n> ')

        output.items[chunk.output_index].isGenerating = false
      }

      if (chunk.type === 'response.reasoning_summary_text.delta')
        (output.items[chunk.output_index] as OpenAIStreamDataItemReasoning)
          .text += chunk.delta

      if (chunk.type === 'response.reasoning_summary_text.done')
        (output.items[chunk.output_index] as OpenAIStreamDataItemReasoning)
          .text = chunk.text
  
      if (chunk.type === 'response.code_interpreter_call_code.delta')
        (output.items[chunk.output_index] as OpenAIStreamDataItemCodeInterprete)
          .code += chunk.delta

      if (chunk.type === 'response.code_interpreter_call_code.done')
        (output.items[chunk.output_index] as OpenAIStreamDataItemCodeInterprete)
          .code = chunk.code

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
