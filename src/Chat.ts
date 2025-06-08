import { Chat as ChatEntity, ChatType } from '@prisma/client'
import { ResponseInputItem } from 'openai/resources/responses/responses'

export class Chat implements ChatEntity {
  public constructor(entity: ChatEntity) {
    this.id = entity.id
    this.type = entity.type
    this.content = entity.content
    this.createdAt = entity.createdAt
    this.conversationId = entity.conversationId
  }

  public readonly id: number
  public readonly type: ChatType
  public readonly content: string
  public readonly createdAt: Date
  public readonly conversationId: number

  // ---

  public readonly convertToOpenAIResponse = () =>
    ({
      role: this.convertChatTypeToResponseRole(),
      content: this.content
    }) as ResponseInputItem

  private readonly convertChatTypeToResponseRole = () =>
    ({
      [ChatType.ASSISTANT]: 'assistant',
      [ChatType.USER]: 'user'
    })[this.type]
}
