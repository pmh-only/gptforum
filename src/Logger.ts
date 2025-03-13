import chalk from 'chalk'

export class Logger {
  private static instance = new Logger()

  public static getInstance = () => this.instance

  private constructor() {}

  private readonly loggerInitTime = Date.now()

  // ---

  public readonly info = (...data: unknown[]) =>
    this.log(chalk.bgCyan(' info '), ...data)

  public readonly warn = (...data: unknown[]) =>
    this.log(chalk.bgYellow(' warn '), ...data)

  public readonly error = (...data: unknown[]) =>
    this.log(chalk.bgRed(' error '), ...data)

  private log(type: string, ...data: unknown[]) {
    const date = new Date().toISOString()
    const duration = ((Date.now() - this.loggerInitTime) / 1000)
      .toFixed(3)
      .padStart(8, '0')

    const callee =
      new Error().stack?.split('\n')?.[3]?.trim()?.split(' ')?.[1] ?? 'unknown'

    console.log(
      `${chalk.gray(`[${date} (${duration})]`)} ${type} ${callee} -`,
      ...data
    )
  }
}

export const logger = Logger.getInstance()
