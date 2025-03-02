import { User } from 'discord.js'
import { prisma } from './Database'
import { NotFoundError } from './Errors'

export class Participants {
  public constructor(private readonly conversationId: number) {}

  public async add(user: User, isAdmin: boolean) {
    await prisma.participant.create({
      data: {
        userId: user.id,
        isAdmin,
        conversationId: this.conversationId
      }
    })
  }

  public async setToAdmin(user: User) {
    if (!this.has(user)) {
      return await this.add(user, true)
    }

    await prisma.participant.updateMany({
      data: {
        isAdmin: true
      },
      where: {
        userId: user.id,
        conversationId: this.conversationId
      }
    })
  }

  public async remove(user: User) {
    if (!this.has(user)) {
      throw new NotFoundError('Participant not found')
    }

    await prisma.participant.deleteMany({
      where: {
        userId: user.id,
        conversationId: this.conversationId
      }
    })
  }

  public async has(user: User) {
    return (await this.getParticipantByUserId(user.id)) !== null
  }

  public async isAdmin(user: User) {
    const participant = await this.getParticipantByUserId(user.id)

    if (participant === null) {
      throw new NotFoundError('Participant not found')
    }

    return participant?.isAdmin
  }

  // ---

  private async getParticipantByUserId(userId: string) {
    return await prisma.participant.findFirst({
      where: {
        conversationId: this.conversationId,
        userId
      }
    })
  }
}
