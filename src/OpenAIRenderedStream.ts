import { logger } from "./Logger"
import { Model } from "./Models"
import { OpenAIStreamData, OpenAIStreamDataItem, OpenAIStreamDataItemReasoning, OpenAIStreamDataItemType, OpenAIStreamDataItemTypeLabel, OpenAIStreamDataMetadata } from "./OpenAIStreamData"

export class OpenAIRenderedStream {  
  private static readonly DISCORD_LOADING_EMOJI_PLACEHOLDER =
    process.env.DISCORD_LOADING_EMOJI_PLACEHOLDER ??
    logger.warn(
      'Loading animated emoji not provided. ' +
        'you can download loading gif from internet and provide emoji id like DISCORD_LOADING_EMOJI_PLACEHOLDER=<a:loading:1381148556462653490>'
    ) ??
    '<a:loading:1381148556462653490>'

  private static readonly DISCORD_REASONING_EMOJI_PLACEHOLDER =
    process.env.DISCORD_REASONING_EMOJI_PLACEHOLDER ??
    logger.warn(
      'Reasoning animated emoji not provided. ' +
        'you can download thinking gif from internet and provide emoji id like DISCORD_REASONING_EMOJI_PLACEHOLDER=<a:loading:1381148556462653490>'
    ) ??
    ':bulb:'

  private static readonly RENDERER_BUFFER_SECOND =
    parseInt(process.env.RENDERER_BUFFER_SECOND ?? '2') || 2

  constructor (
    private readonly openAIStream: AsyncGenerator<OpenAIStreamData>,
    private readonly model: Model
  ) {}

  public async *createRenderedStream(): AsyncGenerator<{ renderedText: string, lastData: OpenAIStreamData }> {
    let lastBufferFlushTime = Date.now()
    let lastRenderedText = `> ${OpenAIRenderedStream.DISCORD_LOADING_EMOJI_PLACEHOLDER}  생각 중...`
    let lastData: OpenAIStreamData = {
      items: [],
      output: '',
      refusal: '',
      isGenerating: true
    }

    yield { renderedText: lastRenderedText, lastData }

    for await (const data of this.openAIStream) {
      if (Date.now() - lastBufferFlushTime < OpenAIRenderedStream.RENDERER_BUFFER_SECOND * 1000) {
        continue
      }
      
      lastBufferFlushTime = Date.now()

      if (data.items.length === 0 && data.output === '' && data.refusal === '') {
        logger.warn('Received empty result buffer. Skipping rendering.')
        continue
      }

      const renderedText = this.streamDataToString(data)
      yield { renderedText, lastData: data }
    }

    if (lastData === undefined) {
      logger.warn('Received empty last data buffer. Skipping final rendering.')
      return
    }

    return {
      renderedText: lastRenderedText,
      lastData
    }
  }

  private streamDataToString(data: OpenAIStreamData): string {
    let renderedText = ''

    renderedText += this.itemsToString(data.items)
    renderedText += data.output

    if (data.isGenerating)
      renderedText += '⬤'

    if (data.metadata !== undefined)
      renderedText += this.metadataToString(data.metadata)

    return renderedText
  }
  
  private itemsToString(items: OpenAIStreamDataItem[]): string {
    return items
      .map((item) => {
        if (item.type === OpenAIStreamDataItemType.REASONING)
          return this.reasoningItemToString(item)

        return ''
      })
      .map((v) => v.trim().split('\n').map((v) => '> ' + v.trim()).join('\n'))
      .join('\n\n')
  }

  private reasoningItemToString(item: OpenAIStreamDataItemReasoning): string {
    return (
      `${item.isGenerating ? OpenAIRenderedStream.DISCORD_LOADING_EMOJI_PLACEHOLDER : OpenAIRenderedStream.DISCORD_REASONING_EMOJI_PLACEHOLDER} ` +
      `**${OpenAIStreamDataItemTypeLabel[item.type]} ${item.isGenerating ? '중' : '완료'}**: ` +
      `${item.text.trim().replace(/---/g, '⸻')}`
    )
  }

  private metadataToString(metadata: OpenAIStreamDataMetadata): string {
    const cost = {
      input:
        (metadata.inputToken ?? 0 * this.model.cost.input) / 1_000_000,
      cachedInput:
        (metadata.inputCachedToken ??
          0 * this.model.cost.cached_input) / 1_000_000,
      reasoning:
        (metadata.reasoningToken ?? 0 * this.model.cost.output) /
        1_000_000,
      output:
        (metadata.outputToken ?? 0 * this.model.cost.output) /
        1_000_000
    }

    const totalCost =
      Object
        .values(cost)
        .reduce((prev, curr) => prev + curr,0)

    const renderedText =
      '---\n' +
      `> **${this.model.label}** ${metadata.isWebSearchEnabled ? '(:globe_with_meridians: 검색 활성화됨)' : ''}\n` +
      `> 입력: ${metadata.inputToken.toLocaleString('en-US')} 토큰 (${cost.input.toFixed(4)}$)\n` +
      (metadata.inputCachedToken > 0
        ? `> 캐시: ${metadata.inputCachedToken.toLocaleString('en-US')} 토큰 (${cost.cachedInput.toFixed(4)}$)\n`
        : '') +
      (metadata.reasoningToken > 0
        ? `> 생각: ${metadata.reasoningToken.toLocaleString('en-US')} 토큰 (${cost.reasoning.toFixed(4)}$)\n`
        : '') +
      `> 출력: ${metadata.outputToken.toLocaleString('en-US')} 토큰 (${cost.output.toFixed(4)}$)\n` +
      `> 총합: ${metadata.totalToken.toLocaleString('en-US')} 토큰 (${totalCost.toFixed(4)}$)`

    return renderedText
  }
}
