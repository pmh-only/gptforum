import { Chats } from './Chats'
import { Participants } from './Participants'
import { Message } from 'discord.js'
import { NotPermittedError } from './Errors'

export class ChatsGuard {
  public constructor(
    private readonly chats: Chats,
    private readonly participants: Participants
  ) {}

  public async addUserMessage(message: Message) {
    if (!(await this.participants.has(message.author))) {
      throw new NotPermittedError('User not permitted to add chat')
    }

    return await this.chats.addUserMessage(message)
  }

  public async addAssistantMessage(message: string) {
    return await this.chats.addAssistantMessage(message)
  }

  public async getAll() {
    return await this.chats.getAll()
  }
}
