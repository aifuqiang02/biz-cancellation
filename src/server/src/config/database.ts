import { config } from 'dotenv'

// Load environment variables
config()

export const databaseConfig = {
  url: process.env.DATABASE_URL,
}

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
  expire: process.env.JWT_EXPIRE || '24h',
}

export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV,
  corsOrigin: process.env.CORS_ORIGIN,
}
