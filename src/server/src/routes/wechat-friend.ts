import express from 'express'
import { ResponseUtil } from '../lib/response.js'
import { prisma } from '../lib/prisma.js'
import { queryRegistrationStatus } from '../services/businessStatusChecker.js'

const router = express.Router()

/**
 * 获取一个待添加微信好友的用户
 * GET /api/wechat-friend/pending
 * 
 * 查询条件：
 * 1. status = "pending_entry"（待录入状态）
 * 2. businessStartHandlingTime <= 当前时间 - 1 个月
 * 3. friendRequestStatus IS NULL 或 'pending'
 * 4. legalRepresentativePhone IS NOT NULL
 * 5. 按 businessStartHandlingTime DESC（倒序，最新的优先）
 * 6. 企业注册状态不为"注销"
 */
router.get('/pending', async (req, res) => {
  console.log('[HTTP] 收到获取待添加好友用户请求')

  try {
    // 计算一个月前的时间
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // 循环查询直到找到有效用户或没有用户
    let user = null
    let checkedCount = 0
    const maxChecks = 10 // 最多检查10个用户，防止无限循环

    while (checkedCount < maxChecks) {
        // 查询符合条件的用户
      const candidate = await prisma.deregistrationBusiness.findFirst({
        where: {
          status: 'pending_entry',
          registrationTime: {
            lte: oneMonthAgo
          },
          legalRepresentativePhone: {
            not: null,
            not: ''
          },
          OR: [
            { friendRequestStatus: null },
            { friendRequestStatus: 'pending' }
          ]
        },
        orderBy: {
          registrationTime: 'desc'  // 倒序，最新的先处理
        },
        select: {
          id: true,
          companyName: true,
          legalRepresentativeName: true,
          legalRepresentativePhone: true,
          registrationTime: true,
          unifiedSocialCreditCode: true,
          registrationStatus: true
        }
      })

      if (!candidate) {
        console.log('[HTTP] 没有待添加的用户')
        res.json(ResponseUtil.success(null, '没有待添加的用户'))
        return
      }

      checkedCount++
      console.log(`[HTTP] 检查用户 ${checkedCount}: ${candidate.companyName}`)

      // 如果没有统一社会信用代码，直接返回该用户
      if (!candidate.unifiedSocialCreditCode) {
        console.log(`[HTTP] 用户无统一社会信用代码，直接返回: ${candidate.companyName}`)
        user = candidate
        break
      }

      // 查询工商数据库状态
      const regStatus = await queryRegistrationStatus(candidate.unifiedSocialCreditCode)
      console.log(`[HTTP] 用户 ${candidate.companyName} 的工商状态: ${regStatus}`)

      if (regStatus === '注销') {
        // 已注销，更新状态并继续查找下一个
        await prisma.deregistrationBusiness.update({
          where: { id: candidate.id },
          data: {
            registrationStatus: '注销',
            registrationStatusCheckedAt: new Date(),
            registrationStatusSource: 'xixian_scjd_sjgs'
          }
        })
        console.log(`[HTTP] 用户 ${candidate.companyName} 已注销，跳过`)
        continue  // 继续查找下一个
      }

      // 开业或其他状态，更新状态并返回该用户
      await prisma.deregistrationBusiness.update({
        where: { id: candidate.id },
        data: {
          registrationStatus: regStatus || '开业',
          registrationStatusCheckedAt: new Date(),
          registrationStatusSource: 'xixian_scjd_sjgs'
        }
      })

      user = candidate
      break
    }

    if (user) {
      console.log(`[HTTP] 找到待添加用户: ${user.companyName}, 手机号: ${user.legalRepresentativePhone}`)
      res.json(ResponseUtil.success(user, '获取待添加用户成功'))
    } else {
      console.log('[HTTP] 检查多个用户后，没有符合条件的待添加用户')
      res.json(ResponseUtil.success(null, '没有待添加的用户'))
    }
  } catch (error) {
    console.error('[HTTP] 获取待添加用户失败:', error)
    res.status(500).json(ResponseUtil.internalError('获取待添加用户失败'))
  }
})

/**
 * 标记用户加好友状态
 * POST /api/wechat-friend/status
 *
 * body: {
 *   id: string,           // 用户ID
 *   status: string,       // 'invited'(已发送邀请), 'added'(已通过), 'failed'(失败), 'not_found'(用户不存在)
 *   message?: string      // 附加消息内容（可选）
 * }
 */
router.post('/status', async (req, res) => {
  console.log('[HTTP] 收到更新好友状态请求')

  try {
    const { id, status, message } = req.body

    if (!id || !status) {
      res.status(400).json(ResponseUtil.badRequest('缺少必要参数: id 或 status'))
      return
    }

    // 验证状态值
    const validStatuses = ['invited', 'added', 'failed', 'not_found']
    if (!validStatuses.includes(status)) {
      res.status(400).json(ResponseUtil.badRequest('无效的 status 值'))
      return
    }

    // 构建更新数据
    const updateData: any = {
      friendRequestStatus: status
    }

    // 根据状态设置时间字段
    if (status === 'invited') {
      updateData.friendRequestTime = new Date()
      if (message) {
        updateData.friendRequestMessage = message
      }
    } else if (status === 'added') {
      updateData.friendAddedTime = new Date()
    } else if (status === 'not_found') {
      // 用户不存在，记录失败原因
      if (message) {
        updateData.friendRequestMessage = message
      }
    }

    // 更新数据库
    const updated = await prisma.deregistrationBusiness.update({
      where: { id },
      data: updateData
    })

    console.log(`[HTTP] 用户 ${updated.companyName} 状态更新为: ${status}`)
    res.json(ResponseUtil.success({
      id: updated.id,
      status: updated.friendRequestStatus,
      message: '状态更新成功'
    }, '状态更新成功'))
  } catch (error) {
    console.error('[HTTP] 更新好友状态失败:', error)
    res.status(500).json(ResponseUtil.internalError('更新好友状态失败'))
  }
})

/**
 * 获取加好友统计信息
 * GET /api/wechat-friend/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.deregistrationBusiness.groupBy({
      by: ['friendRequestStatus'],
      _count: {
        friendRequestStatus: true
      }
    })

    const result = {
      pending: 0,
      invited: 0,
      added: 0,
      failed: 0,
      total: 0
    }

    stats.forEach((stat: any) => {
      const status = stat.friendRequestStatus || 'pending'
      result[status as keyof typeof result] = stat._count.friendRequestStatus
      result.total += stat._count.friendRequestStatus
    })

    res.json(ResponseUtil.success(result, '获取统计信息成功'))
  } catch (error) {
    console.error('[HTTP] 获取统计信息失败:', error)
    res.status(500).json(ResponseUtil.internalError('获取统计信息失败'))
  }
})

export default router