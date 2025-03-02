import { ForumThreadChannel, Message } from 'discord.js'
import { prisma } from './Database'
import { ChatType } from '@prisma/client'

export class Chats {
  public constructor(
    private readonly conversationId: number,
    private readonly isStarter = false
  ) {}

  public async addUserMessage(message: Message) {
    const channel = message.channel as ForumThreadChannel

    await prisma.chat.create({
      data: {
        message: (this.isStarter ? channel.name : '') + message.content,
        type: ChatType.USER,
        conversationId: this.conversationId
      }
    })
  }

  public async addAssistantMessage(message: string) {
    await prisma.chat.create({
      data: {
        message,
        type: ChatType.ASSISTANT,
        conversationId: this.conversationId
      }
    })
  }

  public async getAll() {
    return await prisma.chat.findMany({
      where: {
        conversationId: this.conversationId
      }
    })
  }
}
