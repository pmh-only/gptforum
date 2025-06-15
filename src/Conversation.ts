import { Channel, ForumThreadChannel, Message, User } from 'discord.js'
import { prisma } from './Database'
import { NotFoundError } from './Errors'
import { ChatType, Conversation as ConversationEntity } from '@prisma/client'
import { Chat } from './Chat'

export class Conversation implements ConversationEntity {
  public constructor(
    entity: ConversationEntity,
    public readonly isStarter = false
  ) {
    this.channelId = entity.channelId
    this.createdAt = entity.createdAt
    this.ownerId = entity.ownerId
    this.id = entity.id
    this.model = entity.model
    this.isEditMode = entity.isEditMode
  }

  public isEditMode: boolean
  public readonly channelId: string
  public readonly createdAt: Date
  public readonly ownerId: string
  public readonly id: number
  public readonly model: string

  // ---

  public static async fetchFromChannel(channel: Channel) {
    const conversation = await prisma.conversation.findUnique({
      where: {
        channelId: channel.id
      }
    })

    if (conversation === null) {
      throw new NotFoundError('Conversation not found')
    }

    return new Conversation(conversation)
  }

  public static async createFromChannel(
    channel: Channel,
    owner: User,
    model: string
  ) {
    const conversation = await prisma.conversation.create({
      data: {
        channelId: channel.id,
        ownerId: owner.id,
        model
      }
    })

    return new Conversation(conversation, true)
  }

  public async addDiscordMesssage(message: Message) {
    const channel = message.channel as ForumThreadChannel

    await prisma.chat.create({
      data: {
        content: (this.isStarter ? channel.name : '') + message.content,
        type: ChatType.USER,
        conversationId: this.id
      }
    })
  }

  public async isUserPermitted(user: User) {
    return user.id === this.ownerId
  }

  public async addOpenAIResponse(content: string) {
    await prisma.chat.create({
      data: {
        content,
        type: ChatType.ASSISTANT,
        conversationId: this.id
      }
    })
  }

  public async getAllChats() {
    const chats = await prisma.chat.findMany({
      where: {
        conversationId: this.id
      }
    })

    return chats.map((v) => new Chat(v))
  }

  public async toggleEditorMode() {
    this.isEditMode = !this.isEditMode

    await prisma.conversation.update({
      data: {
        isEditMode: this.isEditMode
      },
      where: {
        id: this.id
      }
    })
  }
}
