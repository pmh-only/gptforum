import { PrismaClient } from '@prisma/client'
import { logger } from './Logger'

export const prisma = new PrismaClient()

if (process.env.DATABASE_URL === undefined) {
  logger.error('DATABASE_URL NOT PROVIDED')
  process.exit(-1)
}
