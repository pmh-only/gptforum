import { Channel, User } from 'discord.js'
import { prisma } from './Database'
import { NotFoundError } from './Errors'
import { Chats } from './Chats'

export class Conversation {
  public constructor(
    private readonly conversationId: number,
    public readonly ownerId: string,
    public readonly isStarter = false
  ) {
    this.chats = new Chats(this.conversationId, this.ownerId, this.isStarter)
  }

  public readonly chats: Chats

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

    return new Conversation(conversation.id, conversation.ownerId)
  }

  public static async createFromChannel(channel: Channel, actor: User) {
    const { id } = await prisma.conversation.create({
      data: {
        channelId: channel.id,
        ownerId: actor.id
      }
    })

    const conversation = new Conversation(id, actor.id, true)
    return conversation
  }
}
