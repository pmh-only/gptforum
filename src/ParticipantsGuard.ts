import { User } from 'discord.js'
import { Participants } from './Participants'
import { IllegalRequestError, NotPermittedError } from './Errors'

export class ParticipantsGuard {
  public constructor(private readonly participants: Participants) {}

  public async add(user: User, isAdmin: boolean, actor: User) {
    const isActorAdmin = await this.participants
      .isAdmin(actor)
      .catch(() => false)

    if (!isActorAdmin) {
      throw new NotPermittedError(
        'Actor is not permitted to add new participants'
      )
    }

    return await this.participants.add(user, isAdmin)
  }

  public async setToAdmin(user: User, actor: User) {
    const isActorAdmin = await this.participants
      .isAdmin(actor)
      .catch(() => false)

    if (!isActorAdmin) {
      throw new NotPermittedError(
        'Actor is not permitted to add new participants'
      )
    }

    return await this.participants.setToAdmin(user)
  }

  public async remove(user: User, actor: User) {
    const isActorAdmin = await this.participants
      .isAdmin(actor)
      .catch(() => false)

    if (!isActorAdmin) {
      throw new NotPermittedError(
        'Actor is not permitted to add new participants'
      )
    }

    if (!(await this.participants.isAdmin(user))) {
      throw new IllegalRequestError('Admin user cannot be removed')
    }

    return await this.participants.remove(user)
  }

  public async has(user: User) {
    return await this.participants.has(user)
  }

  public async isAdmin(user: User) {
    return await this.participants.isAdmin(user)
  }
}
