import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { jwtConfig, databaseConfig } from '../config/database.js'
import { ResponseUtil } from '../lib/response.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json(ResponseUtil.emailExists())
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username },
    })

    if (existingUsername) {
      return res.status(400).json(ResponseUtil.usernameExists())
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user with hashed password
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    })

    res.status(201).json(ResponseUtil.success(user, '注册成功'))
  } catch (error) {
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(200).json(ResponseUtil.invalidCredentials())
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return res.status(200).json(ResponseUtil.invalidCredentials())
    }

    // Generate JWT
    if (!jwtConfig.secret) {
      throw new Error('JWT_SECRET is not configured')
    }
    // @ts-ignore - TypeScript has issues with jsonwebtoken overloads
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expire || '7d' }
    )

    res.json(
      ResponseUtil.success(
        {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
          },
        },
        '登录成功'
      )
    )
  } catch (error) {
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json(ResponseUtil.noToken())
    }

    if (!jwtConfig.secret) {
      return res.status(500).json(ResponseUtil.internalError('服务器配置错误1'))
    }
    const decoded = jwt.verify(token, jwtConfig.secret) as any
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    })

    if (!user) {
      return res.status(404).json(ResponseUtil.userNotFound())
    }

    res.json(ResponseUtil.success(user))
  } catch (error) {
    console.error('Get me error:', error)
    res.status(401).json(ResponseUtil.invalidToken())
  }
})

export default router
