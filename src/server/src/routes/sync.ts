import express from 'express'
import { ResponseUtil } from '../lib/response.js'
import { scheduler } from '../services/scheduler.js'

const router = express.Router()

/**
 * 手动触发同步
 * GET /api/sync/trigger
 */
router.get('/trigger', async (req, res) => {
  console.log('[HTTP] 收到手动同步请求')
  
  try {
    // 使用调度器的立即执行方法
    scheduler.runSyncNow()
    
    res.json(ResponseUtil.success({
      message: '同步任务已启动，正在后台执行'
    }, '同步任务已启动'))
  } catch (error) {
    console.error('[HTTP] 手动同步请求失败:', error)
    res.status(500).json(ResponseUtil.internalError('同步任务启动失败'))
  }
})

/**
 * 获取同步状态
 * GET /api/sync/status
 */
router.get('/status', async (req, res) => {
  try {
    const { prisma } = await import('../lib/prisma.js')
    
    const totalRecords = await prisma.dailySyncRecord.count()
    const pendingRecords = await prisma.dailySyncRecord.count({
      where: { status: 'pending' }
    })
    const syncedRecords = await prisma.dailySyncRecord.count({
      where: { status: 'synced' }
    })
    
    const businessCount = await prisma.deregistrationBusiness.count()
    
    res.json(ResponseUtil.success({
      syncRecords: {
        total: totalRecords,
        pending: pendingRecords,
        synced: syncedRecords
      },
      businessCount: businessCount
    }, '获取同步状态成功'))
  } catch (error) {
    console.error('[HTTP] 获取同步状态失败:', error)
    res.status(500).json(ResponseUtil.internalError('获取同步状态失败'))
  }
})

export default router
