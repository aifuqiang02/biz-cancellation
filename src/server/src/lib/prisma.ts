import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { config } from 'dotenv'

// Load environment variables
config()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

console.log('DATABASE_URL1', process.env.DATABASE_URL)
console.log('NODE_ENV', process.env.NODE_ENV)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    adapter: new PrismaPg(
      new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      })
    ),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
