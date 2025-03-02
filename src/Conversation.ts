import { Channel, User } from 'discord.js'
import { prisma } from './Database'
import { NotFoundError } from './Errors'
import { Participants } from './Participants'
import { Chats } from './Chats'
import { ChatsGuard } from './ChatsGuard'
import { ParticipantsGuard } from './ParticipantsGuard'

export class Conversation {
  public constructor(
    private readonly conversationId: number,
    private readonly isStarter = false
  ) {}

  private readonly _participants = new Participants(this.conversationId)

  private readonly _chats = new Chats(this.conversationId, this.isStarter)

  public readonly participants = new ParticipantsGuard(this._participants)

  public readonly chats = new ChatsGuard(this._chats, this._participants)

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

    return new Conversation(conversation.id)
  }

  public static async createFromChannel(channel: Channel, actor: User) {
    const { id } = await prisma.conversation.create({
      data: {
        channelId: channel.id
      }
    })

    const conversation = new Conversation(id, true)

    await conversation._participants.add(actor, true)
    return conversation
  }
}
