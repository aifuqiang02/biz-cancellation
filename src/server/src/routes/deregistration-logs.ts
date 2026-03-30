import { Router } from 'express'
import { authenticateToken } from './deregistration-businesses.js'
import { prisma } from '../lib/prisma.js'
import { ResponseUtil } from '../lib/response.js'

const router = Router()

// Get all deregistration logs for a business
router.get('/business/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params as { businessId: string }
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' })
    }
    const { page = 1, limit = 20 } = req.query

    // Verify business ownership
    const business = await prisma.deregistrationBusiness.findFirst({
      where: {
        id: businessId,
        userId: req.userId,
      },
    })

    if (!business) {
      return res.status(404).json(ResponseUtil.notFound('注销业务不存在'))
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [logs, total] = await Promise.all([
      prisma.deregistrationLog.findMany({
        where: {
          deregistrationBusinessId: businessId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.deregistrationLog.count({
        where: {
          deregistrationBusinessId: businessId,
        },
      }),
    ])

    res.json(
      ResponseUtil.success({
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      })
    )
  } catch (error) {
    console.error('Get deregistration logs error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Create a deregistration log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { deregistrationBusinessId, action, oldStatus, newStatus, oldValue, newValue, remark, operator } = req.body

    if (!deregistrationBusinessId || !action) {
      return res.status(400).json(ResponseUtil.badRequest('业务ID和操作类型是必需的'))
    }

    // Verify business ownership
    const business = await prisma.deregistrationBusiness.findFirst({
      where: {
        id: deregistrationBusinessId,
        userId: req.userId,
      },
    })

    if (!business) {
      return res.status(404).json(ResponseUtil.notFound('注销业务不存在'))
    }

    const log = await prisma.deregistrationLog.create({
      data: {
        deregistrationBusinessId,
        action,
        oldStatus,
        newStatus,
        oldValue,
        newValue,
        remark,
        operator: operator || '系统',
      },
    })

    res.status(201).json(ResponseUtil.success(log, '注销业务日志创建成功'))
  } catch (error) {
    console.error('Create deregistration log error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Get a specific deregistration log
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) {
      return res.status(400).json({ error: 'Log ID is required' })
    }

    const log = await prisma.deregistrationLog.findFirst({
      where: {
        id,
        deregistrationBusiness: {
          userId: req.userId,
        },
      },
    })

    if (!log) {
      return res.status(404).json(ResponseUtil.notFound('注销业务日志不存在'))
    }

    res.json(ResponseUtil.success(log))
  } catch (error) {
    console.error('Get deregistration log error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Update a deregistration log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) {
      return res.status(400).json({ error: 'Log ID is required' })
    }
    const { action, oldStatus, newStatus, oldValue, newValue, remark, operator } = req.body

    // Verify log ownership through business
    const existingLog = await prisma.deregistrationLog.findFirst({
      where: {
        id,
        deregistrationBusiness: {
          userId: req.userId,
        },
      },
    })

    if (!existingLog) {
      return res.status(404).json(ResponseUtil.notFound('注销业务日志不存在'))
    }

    const updatedLog = await prisma.deregistrationLog.update({
      where: { id },
      data: {
        action,
        oldStatus,
        newStatus,
        oldValue,
        newValue,
        remark,
        operator,
      },
    })

    res.json(ResponseUtil.success(updatedLog, '注销业务日志更新成功'))
  } catch (error) {
    console.error('Update deregistration log error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Delete a deregistration log
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) {
      return res.status(400).json({ error: 'Log ID is required' })
    }

    // Verify log ownership through business
    const existingLog = await prisma.deregistrationLog.findFirst({
      where: {
        id,
        deregistrationBusiness: {
          userId: req.userId,
        },
      },
    })

    if (!existingLog) {
      return res.status(404).json(ResponseUtil.notFound('注销业务日志不存在'))
    }

    await prisma.deregistrationLog.delete({
      where: { id },
    })

    res.json(ResponseUtil.success(null, '注销业务日志删除成功'))
  } catch (error) {
    console.error('Delete deregistration log error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

export default router
