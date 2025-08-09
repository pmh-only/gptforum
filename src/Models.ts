import { ReasoningEffort } from 'openai/resources/shared'

export enum ModelFreeTier {
  NOT_APPLIED = 'NOT_APPLIED',
  NORMAL_QUOTA = 'NORMAL_QUOTA',
  MINI_QUOTA = 'MINI_QUOTA'
}

export interface Model {
  id: string
  label: string
  description: string
  emoji: string
  tools: string[]
  toolRequired?: boolean
  reasoningEffort?: ReasoningEffort
  verbosity?: 'low' | 'medium' | 'high'
  system?: string
  cost: {
    input: number // in dollar
    cached_input: number
    output: number
  }
  freeTier: ModelFreeTier
}

export const MODELS: Record<string, Model> = {
  'gpt-5-high': {
    id: 'gpt-5',
    label: 'GPT-5 (high)',
    description: '생각하는데 더 많은 시간을 투자하여 전문적인 주제에 적합',
    emoji: '🔬',
    tools: ['web_search_preview'],
    cost: {
      input: 1.25,
      cached_input: 0.125,
      output: 10
    },
    reasoningEffort: 'high',
    verbosity: 'high',
    freeTier: ModelFreeTier.NORMAL_QUOTA
  },
  'gpt-5-medium': {
    id: 'gpt-5',
    label: 'GPT-5 (medium)',
    description: '적당한 시간을 투자하여 복잡한 문제를 해결하는데 적합',
    emoji: '🤔',
    tools: ['web_search_preview'],
    cost: {
      input: 1.25,
      cached_input: 0.125,
      output: 10
    },
    reasoningEffort: 'medium',
    verbosity: 'high',
    freeTier: ModelFreeTier.NORMAL_QUOTA
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    description: '조금의 시간을 투자하여 간단한 문제를 해결하는데 적합',
    emoji: '🔍',
    tools: ['web_search_preview'],
    cost: {
      input: 0.25,
      cached_input: 0.025,
      output: 2
    },
    reasoningEffort: 'low',
    verbosity: 'high',
    freeTier: ModelFreeTier.MINI_QUOTA
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    label: 'GPT-5 nano',
    description: '[검색x] 답변 생성이 매우 빨라 단순한 자동완성 등에 적합',
    tools: [],
    emoji: '⚡',
    cost: {
      input: 0.05,
      cached_input: 0.005,
      output: 0.4
    },
    reasoningEffort: 'minimal',
    verbosity: 'high',
    freeTier: ModelFreeTier.MINI_QUOTA
  }
}

export const ModelTierCredit: Record<ModelFreeTier, number | undefined> = {
  [ModelFreeTier.NORMAL_QUOTA]: 1_000_000,
  [ModelFreeTier.MINI_QUOTA]: 10_000_000,
  [ModelFreeTier.NOT_APPLIED]: undefined
}

export const ModelTierLabel: Record<ModelFreeTier, string> = {
  [ModelFreeTier.NORMAL_QUOTA]: '일반 모델',
  [ModelFreeTier.MINI_QUOTA]: '소형 모델',
  [ModelFreeTier.NOT_APPLIED]: ''
}
