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
  system?: string
  cost: {
    input: number // in dollar
    cached_input: number
    output: number
  }
  freeTier: ModelFreeTier
}

export const MODELS: Record<string, Model> = {
  o3: {
    id: 'o3',
    label: 'o3 (high)',
    description: '생각하는데 더 많은 시간을 투자하여 전문적인 주제에 적합',
    emoji: '🤔',
    system: 'use [name](url) syntax for citing webpage',
    tools: ['web_search_preview'],
    cost: {
      input: 2,
      cached_input: 0.5,
      output: 8
    },
    reasoningEffort: 'high',
    freeTier: ModelFreeTier.NORMAL_QUOTA
  },
  'o4-mini': {
    id: 'o4-mini',
    label: 'o4-mini',
    description: '적당한 시간을 투자하여 복잡한 문제를 해결하는데 적합',
    emoji: '🔍',
    tools: ['web_search_preview'],
    reasoningEffort: 'medium',
    system: 'use [name](url) syntax for citing webpage',
    cost: {
      input: 1.1,
      cached_input: 0.28,
      output: 4.4
    },
    freeTier: ModelFreeTier.MINI_QUOTA
  },
  'gpt-4.1-web': {
    id: 'gpt-4.1',
    label: '⭐ GPT-4.1',
    description: '웹 검색을 최대한 활용하여 최신 주제에 적합',
    emoji: '🌐',
    tools: ['web_search_preview'],
    toolRequired: true,
    system:
      'utilize web search on every response\n' +
      'use [name](url) syntax for citing webpage',
    cost: {
      input: 2,
      cached_input: 0.5,
      output: 8
    },
    freeTier: ModelFreeTier.NORMAL_QUOTA
  },
  'gpt-4.1-nano': {
    id: 'gpt-4.1-nano',
    label: 'GPT-4.1-nano (웹 검색 x)',
    description: '답변 생성이 매우 빨라 단순한 자동완성 등에 적합',
    tools: [],
    emoji: '⚡',
    cost: {
      input: 0.1,
      cached_input: 0.03,
      output: 0.4
    },
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
