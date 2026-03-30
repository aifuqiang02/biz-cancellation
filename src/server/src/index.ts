import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { execSync } from 'child_process'
import { prisma } from './lib/prisma.js'
import { serverConfig, databaseConfig } from './config/database.js'

// Import routes
import authRoutes from './routes/auth.js'
import deregistrationBusinessRoutes from './routes/deregistration-businesses.js'
import deregistrationLogRoutes from './routes/deregistration-logs.js'
import syncRoutes from './routes/sync.js'
import wechatFriendRoutes from './routes/wechat-friend.js'
import { ResponseUtil } from './lib/response.js'
import { setWebSocketServer } from './lib/websocket.js'
import { scheduler } from './services/scheduler.js'

// Database connection test
async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error(
      'Database connection failed:',
      error instanceof Error ? error.message : String(error)
    )
    return false
  }
}

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Set WebSocket server for global access
setWebSocketServer(io)

// Middleware
app.use(helmet())
app.use(express.json({ limit: '10mb', strict: false }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
  })
)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/deregistration-businesses', deregistrationBusinessRoutes)
app.use('/api/deregistration-logs', deregistrationLogRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/wechat-friend', wechatFriendRoutes)

// Basic health check
app.get('/api/health', (req, res) => {
  res.json(
    ResponseUtil.success({
      status: 'OK',
      timestamp: new Date().toISOString(),
    })
  )
})

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    const isConnected = await testDatabaseConnection()
    if (isConnected) {
      res.json(
        ResponseUtil.success({
          status: 'OK',
          database: 'connected',
          timestamp: new Date().toISOString(),
        })
      )
    } else {
      res.status(503).json(ResponseUtil.internalError('数据库连接失败'))
    }
  } catch (error) {
    res.status(503).json(ResponseUtil.internalError('数据库健康检查失败'))
  }
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.error('[WebSocket Server] Client connected:', socket.id)
  console.log(
    '[WebSocket Server] Client handshake origin:',
    socket.handshake.headers.origin
  )
  console.log(
    '[WebSocket Server] Client user agent:',
    socket.handshake.headers['user-agent']
  )
  console.log(
    '[WebSocket Server] Total connected clients:',
    io.sockets.sockets.size
  )

  socket.on('disconnect', (reason) => {
    console.log(
      '[WebSocket Server] Client disconnected:',
      socket.id,
      'Reason:',
      reason
    )
    console.log(
      '[WebSocket Server] Remaining connected clients:',
      io.sockets.sockets.size - 1
    )
  })

  // AI status updates
  socket.on('ai-status-update', (data) => {
    console.log(
      '[WebSocket Server] Received ai-status-update from client:',
      socket.id,
      'Data:',
      data
    )
    // Broadcast to all connected clients
    socket.broadcast.emit('ai-status-updated', data)
    console.log(
      '[WebSocket Server] Broadcasted ai-status-updated to all clients'
    )
    console.log(
      '[WebSocket Server] Connected sockets count:',
      io.sockets.sockets.size
    )
  })

  // Periodic connection status logging
  const statusInterval = setInterval(() => {
    console.log(
      '[WebSocket Server] Connected sockets count:',
      io.sockets.sockets.size
    )
  }, 30000) // Log every 30 seconds

  socket.on('disconnect', () => {
    clearInterval(statusInterval)
  })
})

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Server error:', err.message)
    res.status(500).json(ResponseUtil.internalError('服务器内部错误'))
  }
)

// Graceful shutdown
let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`Shutting down gracefully (${signal})`)

  try {
    server.close(async () => {
      try {
        await prisma.$disconnect()
        io.close(() => {
          process.exit(0)
        })
      } catch (dbError) {
        console.error(
          'Database disconnect error:',
          dbError instanceof Error ? dbError.message : String(dbError)
        )
        process.exit(1)
      }
    })

    setTimeout(() => {
      console.error('Force shutdown after timeout')
      process.exit(1)
    }, 10000)
  } catch (error) {
    console.error(
      'Shutdown error:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Try to start server with retry logic
function startServer(retryCount = 0) {
  server.listen(serverConfig.port, '0.0.0.0', async () => {
    console.log(`Server running on port ${serverConfig.port}`)
    console.log(`Environment: ${serverConfig.nodeEnv}`)

    // Test database connection on startup
    const dbConnected = await testDatabaseConnection()
    if (!dbConnected) {
      console.warn('Database connection failed on startup')
    }

    // Start scheduled tasks
    scheduler.startAll()
  })
}

startServer()
