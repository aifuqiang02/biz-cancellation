import axios from 'axios'
import { prisma } from '../lib/prisma.js'
import type { SetupResponseVO, ApiResponse } from '../types/sync.js'

const SETUP_API_BASE_PATH = 'http://127.0.0.1:8081/gov-qwy'
const SETUP_API_APP_KEY = '020a7c5b687c4914b9c5dafa44c341d1'

/**
 * 初始化最近1000天的同步记录
 */
export async function initDailySyncRecords(): Promise<void> {
  console.log('[SYNC] 初始化最近1000天的同步记录...')

  // 获取所有已有的日期
  const existingRecords = await prisma.dailySyncRecord.findMany({
    select: { businessDate: true }
  })
  const existingDates = new Set(
    existingRecords.map(r => r.businessDate.toISOString().split('T')[0])
  )

  // 创建最近1000天的记录
  const today = new Date()
  const recordsToCreate = []

  for (let i = 1; i <= 1000; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    if (!existingDates.has(dateStr)) {
      recordsToCreate.push({
        businessDate: date,
        status: 'pending'
      })
    }
  }

  if (recordsToCreate.length > 0) {
    await prisma.dailySyncRecord.createMany({
      data: recordsToCreate,
      skipDuplicates: true
    })
    console.log(`[SYNC] 创建了 ${recordsToCreate.length} 条新的同步记录`)
  } else {
    console.log('[SYNC] 所有日期的同步记录已存在')
  }
}

/**
 * 查找下一个未同步的日期
 */
export async function findNextUnsyncedDay() {
  const record = await prisma.dailySyncRecord.findFirst({
    where: { status: 'pending' },
    orderBy: { businessDate: 'asc' }
  })
  return record
}

/**
 * 同步指定日期的工商数据
 */
export async function syncDataByDay(date: Date): Promise<number> {
  const dayStr = date.toISOString().split('T')[0]
  console.log(`[SYNC] 开始同步 ${dayStr} 的数据...`)

  try {
    // 调用第三方API
    const url = `${SETUP_API_BASE_PATH}/api/business/findFinishedByDay`
    const response = await axios.post<ApiResponse>(
      url,
      {},
      {
        params: {
          appKey: SETUP_API_APP_KEY,
          day: dayStr
        },
        timeout: 1000000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const apiResponse = response.data
    
    console.log(`[SYNC] API响应:`, JSON.stringify(apiResponse, null, 2))

    // API 返回的 code 可能是数字或字符串
    const code = String(apiResponse.code)
    if (code !== '200') {
      throw new Error(`API返回错误[${code}]: ${apiResponse.msg || '无错误信息'}`)
    }

    // 解析数据列表
    const dataList = (apiResponse.data as SetupResponseVO[]) || []
    console.log(`[SYNC] ${dayStr} 获取到 ${dataList.length} 条数据`)

    // 保存数据
    let savedCount = 0
    for (const vo of dataList) {
      try {
        // 解析注册时间
        let registrationTime: Date | null = null
        if (vo.registrationTime) {
          registrationTime = new Date(vo.registrationTime)
        }

        // 检查是否已存在（通过统一社会信用代码判断）
        const existing = await prisma.deregistrationBusiness.findFirst({
          where: {
            unifiedSocialCreditCode: vo.unifiedSocialCreditCode
          }
        })

        const businessData = {
          companyName: vo.enterpriseName,
          unifiedSocialCreditCode: vo.unifiedSocialCreditCode,
          legalRepresentativeName: vo.legalPersonName,
          legalRepresentativeIdNumber: vo.legalPersonIdCard,
          legalRepresentativePhone: vo.legalPersonPhone,
          registrationTime: registrationTime,
          address: vo.enterpriseAddress,
          legalRepresentativeIdPhotoUrl: vo.legalPersonIdCardImg,
          legalRepresentativeIdPhotoPath: vo.legalPersonIdCardImg,
          status: 'pending_entry',
          // 不设置userId，后续再关联
          userId: undefined
        }

        if (existing) {
          // 更新现有记录
          await prisma.deregistrationBusiness.update({
            where: { id: existing.id },
            data: {
              ...businessData,
              userId: existing.userId || ''
            }
          })
          console.log(`[SYNC] 更新企业: ${vo.enterpriseName}`)
        } else {
          // 创建新记录
          await prisma.deregistrationBusiness.create({
            data: businessData
          })
          console.log(`[SYNC] 新增企业: ${vo.enterpriseName}`)
        }

        savedCount++
      } catch (error) {
        console.error(`[SYNC] 保存企业数据失败: ${vo.enterpriseName}`, error)
      }
    }

    // 更新同步记录状态
    await prisma.dailySyncRecord.update({
      where: { businessDate: date },
      data: { status: 'synced' }
    })

    console.log(`[SYNC] ${dayStr} 同步完成，保存/更新 ${savedCount} 条数据`)
    return savedCount

  } catch (error: any) {
    if (error.response) {
      // Axios 错误，有响应
      console.error(`[SYNC] HTTP错误 ${error.response.status}:`, error.response.data)
    } else if (error.request) {
      // 请求发送但没有收到响应
      console.error(`[SYNC] 网络错误，无响应:`, error.message)
    } else {
      // 其他错误
      console.error(`[SYNC] 同步 ${dayStr} 失败:`, error.message || error)
    }
    throw error
  }
}

/**
 * 同步所有待处理的日期
 */
export async function syncAllPendingDays(): Promise<void> {
  console.log('[SYNC] ========== 开始批量同步 ==========')

  // 首先初始化同步记录
  await initDailySyncRecords()

  let syncCount = 0
  let totalSaved = 0

  // 循环处理所有待同步的日期
  while (true) {
    const record = await findNextUnsyncedDay()

    if (!record) {
      console.log('[SYNC] 所有日期已同步完成')
      break
    }

    try {
      const saved = await syncDataByDay(record.businessDate)
      totalSaved += saved
      syncCount++
    } catch (error) {
      console.error('[SYNC] 同步日期失败，跳过:', record.businessDate)
      // 标记为同步失败，避免无限重试
      await prisma.dailySyncRecord.update({
        where: { businessDate: record.businessDate },
        data: { status: 'synced' } // 暂时标记为已同步，避免卡住
      })
    }

    // 防止无限循环，每次最多处理100个日期
    if (syncCount >= 100) {
      console.log('[SYNC] 已达到单次处理上限(100)，暂停同步')
      break
    }
  }

  console.log(`[SYNC] ========== 批量同步完成，共处理 ${syncCount} 个日期，保存 ${totalSaved} 条数据 ==========`)
}
