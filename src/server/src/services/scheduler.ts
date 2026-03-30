import cron from 'node-cron'
import { syncAllPendingDays } from './syncService.js'

// 内存锁，防止重复执行
const locks = new Map<string, boolean>()

/**
 * 带锁执行函数
 */
async function runWithLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  if (locks.get(key)) {
    console.log(`[SCHEDULER] 任务 ${key} 正在执行中，跳过`)
    return null
  }

  locks.set(key, true)
  console.log(`[SCHEDULER] 任务 ${key} 开始执行`)

  try {
    const result = await fn()
    console.log(`[SCHEDULER] 任务 ${key} 执行成功`)
    return result
  } catch (error) {
    console.error(`[SCHEDULER] 任务 ${key} 执行失败:`, error)
    return null
  } finally {
    locks.set(key, false)
  }
}

/**
 * 定时任务调度器
 */
export const scheduler = {
  /**
   * 启动所有定时任务
   */
  startAll(): void {
    console.log('[SCHEDULER] 启动定时任务调度器...')

    // 每天凌晨2点执行工商数据同步
    this.startDailySync()

    // 可以在这里添加其他定时任务...

    console.log('[SCHEDULER] 所有定时任务已启动')
  },

  /**
   * 启动每日同步任务
   * 每天凌晨2点执行
   */
  startDailySync(): void {
    console.log('[SCHEDULER] 注册每日同步任务 (每天凌晨2:00)')

    cron.schedule('0 2 * * *', async () => {
      await runWithLock('dailySync', syncAllPendingDays)
    }, {
      timezone: 'Asia/Shanghai'
    })

    console.log('[SCHEDULER] 每日同步任务已注册')
  },

  /**
   * 立即执行一次同步（用于手动触发）
   */
  async runSyncNow(): Promise<void> {
    await runWithLock('manualSync', syncAllPendingDays)
  }
}
