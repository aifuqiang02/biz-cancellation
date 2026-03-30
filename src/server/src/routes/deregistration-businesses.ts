import express from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { jwtConfig } from '../config/database.js'
import { ResponseUtil } from '../lib/response.js'

const router = express.Router()

// Common include for deregistration business queries
const deregistrationBusinessInclude = {
  _count: {
    select: {
      deregistrationLogs: true,
    },
  },
}

// Middleware to verify JWT
const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json(ResponseUtil.noToken())
  }

  if (!jwtConfig.secret) {
    console.error('JWT_SECRET not configured')
    return res.status(500).json(ResponseUtil.internalError())
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as any
    if (!decoded.userId) {
      return res.status(401).json(ResponseUtil.invalidToken())
    }
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json(ResponseUtil.invalidToken())
  }
}

// Get all deregistration businesses for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const deregistrationBusinesses = await prisma.deregistrationBusiness.findMany({
      where: { userId: req.userId },
      include: deregistrationBusinessInclude,
      orderBy: { updatedAt: 'desc' },
    })

    res.json(ResponseUtil.success(deregistrationBusinesses))
  } catch (error) {
    console.error('Get deregistration businesses error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Create deregistration business
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { companyName, registrationNumber, feeAmount, isPaid, description, status } = req.body

    if (!companyName) {
      return res.status(400).json(ResponseUtil.badRequest('企业名称是必需的'))
    }

    const deregistrationBusiness = await prisma.deregistrationBusiness.create({
      data: {
        companyName,
        registrationNumber,
        feeAmount,
        isPaid: isPaid || false,
        description,
        status: status || 'pending_entry', // 默认为待录入
        userId: req.userId,
      },
      include: deregistrationBusinessInclude,
    })

    res.status(201).json(ResponseUtil.success(deregistrationBusiness, '注销业务创建成功'))
  } catch (error) {
    console.error('Create deregistration business error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// 获取我的客户列表
// GET /api/businesses/customers
router.get('/customers', authenticateToken, async (req, res) => {
  try {
    console.log('[Customers] userId:', req.userId)
    
    const customers = await prisma.deregistrationBusiness.findMany({
      where: {
        userId: req.userId,
      },
      include: deregistrationBusinessInclude,
      orderBy: { updatedAt: 'desc' },
    })

    console.log('[Customers] 返回数量:', customers.length)
    res.json(ResponseUtil.success(customers))
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// 获取潜在客户列表（拓新）
// GET /api/businesses/potential
// 查询条件：userId为空（未关联客户经理）+ registrationTime <= 30天前
router.get('/potential', authenticateToken, async (req, res) => {
  try {
    // 计算30天前的时间
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    console.log('[Potential] 30天前时间:', thirtyDaysAgo.toISOString())
    console.log('[Potential] userId:', req.userId)

    // 先查询所有未关联客户经理的数据
    const totalCount = await prisma.deregistrationBusiness.count({
      where: {
        userId: null,
        legalRepresentativePhone: {
          gt: '',
        },
      },
    })
    console.log('[Potential] 未关联客户经理且有手机号的总数:', totalCount)

    const potentialBusinesses = await prisma.deregistrationBusiness.findMany({
      where: {
        userId: null, // 未关联客户经理
        registrationTime: {
          lte: thirtyDaysAgo, // 注册时间 <= 30天前
        },
        legalRepresentativePhone: {
          gt: '',
        },
      },
      select: {
        id: true,
        companyName: true,
        legalRepresentativeName: true,
        legalRepresentativePhone: true,
        registrationTime: true,
      },
      orderBy: {
        registrationTime: 'desc', // 倒序，最新的先处理
      },
      take: 1, // 只返回一条
    })

    console.log('[Potential] 返回的客户ID:', potentialBusinesses[0]?.id)
    console.log('[Potential] 返回的客户名称:', potentialBusinesses[0]?.companyName)

    console.log('[Potential] 符合条件的潜在客户数:', potentialBusinesses.length)

    res.json(ResponseUtil.success(potentialBusinesses))
  } catch (error) {
    console.error('Get potential businesses error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Debug: query by company name
router.get('/debug/by-name/:name', async (req, res) => {
  try {
    const { name } = req.params
    const result = await prisma.$queryRaw`
      SELECT id, "companyName", "userId", "contactResult", "contactTime" 
      FROM "deregistration_businesses" 
      WHERE "companyName" LIKE ${'%' + name + '%'}
      LIMIT 5
    `
    res.json(ResponseUtil.success(result))
  } catch (error) {
    console.error('Query error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Get single deregistration business by id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string } as { id: string }
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('注销业务ID是必需的'))
    }

    const business = await prisma.deregistrationBusiness.findUnique({
      where: { id },
    })

    if (!business) {
      return res.status(404).json(ResponseUtil.notFound('注销业务不存在'))
    }

    res.json(ResponseUtil.success(business))
  } catch (error) {
    console.error('Get deregistration business error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Update deregistration business
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('注销业务ID是必需的'))
    }

    // Check if deregistration business belongs to user
    const existingDeregistrationBusiness = await prisma.deregistrationBusiness.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (!existingDeregistrationBusiness) {
      return res.status(404).json(ResponseUtil.notFound('注销业务不存在'))
    }

    const deregistrationBusiness = await prisma.deregistrationBusiness.update({
      where: { id },
      data: req.body,
      include: deregistrationBusinessInclude,
    })

    res.json(ResponseUtil.success(deregistrationBusiness, '注销业务更新成功'))
  } catch (error) {
    console.error('Update deregistration business error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Mark business as processed (reset needsProcessing to false)
router.post('/:id/mark-processed', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('注销业务ID是必需的'))
    }

    // Check if deregistration business belongs to user
    const existingDeregistrationBusiness = await prisma.deregistrationBusiness.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    })

    if (!existingDeregistrationBusiness) {
      return res.status(404).json(ResponseUtil.notFound('注销业务不存在'))
    }

    const deregistrationBusiness = await prisma.deregistrationBusiness.update({
      where: { id },
      data: { needsProcessing: false },
      include: deregistrationBusinessInclude,
    })

    res.json(ResponseUtil.success(deregistrationBusiness, '已标记为已处理'))
  } catch (error) {
    console.error('Mark processed error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// 提交联系结果
// POST /api/businesses/:id/contact
router.post('/:id/contact', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    const { contactResult, contactRemark } = req.body

    console.log('[Contact] 收到提交请求, id:', id)
    console.log('[Contact] contactResult:', contactResult)
    console.log('[Contact] userId:', req.userId)

    if (!id) {
      return res.status(400).json(ResponseUtil.badRequest('注销业务ID是必需的'))
    }

    if (!contactResult) {
      return res.status(400).json(ResponseUtil.badRequest('联系结果是必需的'))
    }

    // 验证联系结果值
    const validResults = ['waiting_wechat', 'added_wechat', 'no_contact']
    if (!validResults.includes(contactResult)) {
      return res.status(400).json(ResponseUtil.badRequest('无效的联系结果'))
    }

    // 更新业务：设置客户经理、联系结果、联系时间、备注
    const updatedBusiness = await prisma.deregistrationBusiness.update({
      where: { id },
      data: {
        userId: req.userId, // 关联当前用户为客户经理
        contactResult,
        contactTime: new Date(),
        contactRemark,
      },
      include: deregistrationBusinessInclude,
    })

    console.log('[Contact] 更新成功, userId:', updatedBusiness.userId)

    // 记录日志
    await prisma.deregistrationLog.create({
      data: {
        deregistrationBusinessId: id,
        action: '联系结果提交',
        newValue: contactResult,
        remark: contactRemark || '',
        operator: req.userId,
      },
    })

    res.json(ResponseUtil.success(updatedBusiness, '联系结果提交成功'))
  } catch (error) {
    console.error('Submit contact result error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Sync status from rsync data (陕西省市场监管局数据同步)
// This endpoint is called by the automation program (service-to-service), no auth required
interface RsyncDataItem {
  name: string
  status: Record<string, string>
  time?: string
  review_status?: string
  page?: number
  collected_at?: string
}

router.post('/sync-status', async (req, res) => {
  try {
    const { data }: { data: RsyncDataItem[] } = req.body

    console.log('[SYNC] ========== 开始同步状态 ==========')
    console.log('[SYNC] 收到数据条数:', data?.length || 0)
    console.log('[SYNC] 请求体预览:', JSON.stringify(data?.slice(0, 2) || [], null, 2))

    if (!Array.isArray(data) || data.length === 0) {
      console.log('[SYNC] 数据为空，返回错误')
      return res.status(400).json(ResponseUtil.badRequest('数据数组是必需的'))
    }

    // Get all businesses from all users
    console.log('[SYNC] 正在查询数据库中的所有企业...')
    const businesses = await prisma.deregistrationBusiness.findMany()
    console.log('[SYNC] 数据库中的企业数量:', businesses.length)
    console.log('[SYNC] 企业列表:', businesses.map(b => b.companyName))

    const updatedBusinesses: string[] = []
    const matchedBusinesses: string[] = []

    // Process each rsync data item
    console.log('[SYNC] 开始处理每条数据...')
    for (let i = 0; i < data.length; i++) {
      const item = data[i] as RsyncDataItem
      if (!item.name) {
        console.log(`[SYNC] [${i+1}/${data.length}] 跳过：name 为空`)
        continue
      }

      // Find matching business by name (collected name contains companyName)
      const matchedBusiness = businesses.find(business =>
        item.name!.includes(business.companyName)
      )

      console.log(`[SYNC] [${i+1}/${data.length}] 企业名称: ${item.name!.substring(0, 30)}...`)
      console.log(`[SYNC] [${i+1}/${data.length}] review_status: ${item.review_status}`)

      if (matchedBusiness) {
        matchedBusinesses.push(matchedBusiness.companyName)
        console.log(`[SYNC] [${i+1}/${data.length}] ✓ 匹配到数据库企业: ${matchedBusiness.companyName}`)
        console.log(`[SYNC] [${i+1}/${data.length}]   当前状态: ${matchedBusiness.status}`)

        // Determine the new status from rsync data
        // The status object contains different departments' statuses
        // We'll map the overall status based on the review_status or the main status
        let newStatus = matchedBusiness.status

        if (item.review_status) {
          // Map review_status to database status
          const statusMapping: Record<string, string> = {
            '已初审': 'first_reviewed',
            '初审通过': 'first_reviewed',
            '初审驳回': 'first_review_rejected',
            '待初审': 'pending_entry',
            '已提交': 'submitted',
            '已完成': 'completed',
            '已核准': 'completed',
            '已驳回': 'rejected',
            '已终止': 'terminated',
          }

          const mappedStatus = statusMapping[item.review_status]
          if (mappedStatus) {
            newStatus = mappedStatus
            console.log(`[SYNC] [${i+1}/${data.length}]   映射后的状态: ${mappedStatus}`)
          }
        }

        // If status has changed, update the business and set needsProcessing to true
        if (newStatus !== matchedBusiness.status) {
          console.log(`[SYNC] [${i+1}/${data.length}] ✗ 状态有变化! ${matchedBusiness.status} → ${newStatus}`)
          await prisma.deregistrationBusiness.update({
            where: { id: matchedBusiness.id },
            data: {
              status: newStatus,
              needsProcessing: true,
            },
          })
          updatedBusinesses.push(matchedBusiness.companyName)
        } else {
          console.log(`[SYNC] [${i+1}/${data.length}]   状态无变化`)
        }
      } else {
        console.log(`[SYNC] [${i+1}/${data.length}] ✗ 未匹配到数据库企业`)
      }
    }

    console.log('[SYNC] ========== 同步完成 ==========')
    console.log('[SYNC] 处理总数:', data.length)
    console.log('[SYNC] 匹配数量:', matchedBusinesses.length)
    console.log('[SYNC] 更新数量:', updatedBusinesses.length)
    console.log('[SYNC] 更新的企业:', updatedBusinesses)

    res.json(ResponseUtil.success({
      totalProcessed: data.length,
      totalMatched: matchedBusinesses.length,
      updatedCount: updatedBusinesses.length,
      updatedBusinesses,
      matchedBusinesses,
    }, '状态同步完成'))
  } catch (error) {
    console.error('[SYNC] ========== 同步出错 ==========', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

// Get businesses that need processing
router.get('/needs-processing', authenticateToken, async (req, res) => {
  try {
    const businesses = await prisma.deregistrationBusiness.findMany({
      where: {
        userId: req.userId,
        needsProcessing: true,
      },
      include: deregistrationBusinessInclude,
      orderBy: { updatedAt: 'desc' },
    })

    res.json(ResponseUtil.success(businesses))
  } catch (error) {
    console.error('Get needs processing businesses error:', error)
    res.status(500).json(ResponseUtil.internalError())
  }
})

export { authenticateToken }
export default router
