import dotenv from 'dotenv'
import { ConfigIllegalError } from './Errors'

class ConfigUtils {
  private readonly REQUIRED_ENVIRONMENT_VARIABLES = [
    'DISCORD_TOKEN',
    'DISCORD_CHANNEL',
    'OPENAI_API_KEY',
    'DATABASE_URL'
  ]

  private readonly DEFAULT_ENVIRONMENT_VARIABLES: Record<
    string,
    number | string
  > = {
    BUFFER_SECOND: 1
  }

  constructor() {
    dotenv.config()

    this.checkRequiredEnvironmentVariables()
    this.placeDefaultEnvironmentVariables()
  }

  private checkRequiredEnvironmentVariables() {
    for (const variableName of this.REQUIRED_ENVIRONMENT_VARIABLES)
      this.checkRequiredEnvironmentVariable(variableName)
  }

  private checkRequiredEnvironmentVariable(variableName: string) {
    if (typeof process.env[variableName] !== 'string')
      throw new ConfigIllegalError(
        `Environment variable "${variableName}" is missing.`
      )
  }

  private placeDefaultEnvironmentVariables() {
    for (const [variableName, defaultValue] of Object.entries(
      this.DEFAULT_ENVIRONMENT_VARIABLES
    ))
      this.placeDefaultEnvironmentVariable(variableName, defaultValue)
  }

  private placeDefaultEnvironmentVariable<T extends number | string>(
    variableName: string,
    defaultValue: T
  ) {
    const providedValue = process.env[variableName]

    if (
      typeof defaultValue === 'string' &&
      providedValue !== undefined &&
      providedValue.length > 0
    )
      return

    if (
      typeof defaultValue === 'number' &&
      providedValue !== undefined &&
      Number.isInteger(parseFloat(providedValue))
    )
      return

    console.log(
      `Warning: Environment variable "${variableName}" is missing. ` +
        `Using "${defaultValue}" as a default value`
    )

    process.env[variableName] = defaultValue.toString()
  }

  public get(variableName: string): string {
    this.checkRequiredEnvironmentVariable(variableName)

    return process.env[variableName] as string
  }

  public getInt(variableName: string): number {
    this.checkRequiredEnvironmentVariable(variableName)

    return parseInt(process.env[variableName] as string, 10)
  }
}

export const config = new ConfigUtils()
