export enum OpenAIStreamDataItemType {
  REASONING = 'REASONING'
}

export const OpenAIStreamDataItemTypeLabel: Record<OpenAIStreamDataItemType, string> = {
  [OpenAIStreamDataItemType.REASONING]: '생각'
}

export interface OpenAIStreamData {
  items: OpenAIStreamDataItem[]
  output: string
  refusal: string
  isGenerating: boolean
  metadata?: OpenAIStreamDataMetadata
}

export type OpenAIStreamDataItem = OpenAIStreamDataItemReasoning

export interface OpenAIStreamDataItemReasoning {
  type: OpenAIStreamDataItemType.REASONING
  text: string
  isGenerating: boolean
}

export interface OpenAIStreamDataMetadata {
  model: string
  isWebSearchEnabled: boolean
  inputToken: number
  inputCachedToken: number
  reasoningToken: number
  outputToken: number
  totalToken: number
}
