export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class NotPermittedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotPermitted'
  }
}

export class IllegalRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IllegalRequestError'
  }
}

export class ConfigIllegalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigIllegalError'
  }
}
