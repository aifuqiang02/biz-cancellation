import { PrismaClient } from '@prisma/client'
import { portConfig } from '../config/ports.js'

export interface AllocatedPort {
  port: number
  remark: string
  allocatedAt: Date
}

/**
 * 端口分配错误类
 */
export class PortAllocationError extends Error {
  constructor(
    message: string,
    public code: string,
    public availablePorts?: number
  ) {
    super(message)
    this.name = 'PortAllocationError'
  }
}

/**
 * 端口分配器服务
 */
export class PortAllocator {
  constructor(private prisma: PrismaClient) {}

  /**
   * 为注销业务分配指定数量的端口
   * @param deregistrationBusinessId 注销业务ID
   * @param count 要分配的端口数量
   * @returns 分配的端口数组
   */
  async allocatePorts(deregistrationBusinessId: string, count: number): Promise<AllocatedPort[]> {
    // 验证参数
    if (count <= 0) {
      throw new PortAllocationError('端口数量必须大于0', 'INVALID_COUNT')
    }

    if (count > portConfig.maxPerProject) {
      throw new PortAllocationError(
        `单个项目最多只能分配${portConfig.maxPerProject}个端口`,
        'EXCEED_MAX_PER_PROJECT'
      )
    }

    // 检查注销业务是否已经分配过端口
    const existingBusiness = await this.prisma.deregistrationBusiness.findUnique({
      where: { id: deregistrationBusinessId },
      select: { portAllocations: true, companyName: true }
    })

    if (!existingBusiness) {
      throw new PortAllocationError('注销业务不存在', 'BUSINESS_NOT_FOUND')
    }

    if (existingBusiness.portAllocations && existingBusiness.portAllocations.length > 0) {
      throw new PortAllocationError(
        `注销业务"${existingBusiness.companyName}"已经分配过端口，无法重复分配`,
        'PORTS_ALREADY_ALLOCATED'
      )
    }

    // 使用重试机制处理并发冲突
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= portConfig.maxRetries; attempt++) {
      try {
        return await this.performAllocation(deregistrationBusinessId, count)
      } catch (error) {
        lastError = error as Error

        // 如果是唯一约束冲突且还有重试次数，继续重试
        if (error instanceof Error &&
            error.message.includes('Unique constraint failed') &&
            attempt < portConfig.maxRetries) {
          console.warn(`端口分配冲突，第${attempt + 1}次重试`)
          await this.delay(portConfig.retryDelayMs)
          continue
        }

        // 其他错误直接抛出
        throw error
      }
    }

    throw lastError || new PortAllocationError('端口分配失败', 'ALLOCATION_FAILED')
  }

  /**
   * 执行端口分配（在事务中）
   */
  private async performAllocation(deregistrationBusinessId: string, count: number): Promise<AllocatedPort[]> {
    return await this.prisma.$transaction(async (tx) => {
      const now = new Date()

      // 1. 查询已分配的端口
      const usedPorts = await tx.portAllocation.findMany({
        where: {
          port: {
            gte: portConfig.minPort,
            lte: portConfig.maxPort
          }
        },
        select: { port: true }
      })

      // 2. 创建已分配端口的集合用于快速查找
      const usedPortSet = new Set(usedPorts.map(p => p.port))

      // 3. 找到指定数量的可用端口
      const availablePorts: number[] = []
      for (let port = portConfig.minPort; port <= portConfig.maxPort && availablePorts.length < count; port++) {
        if (!usedPortSet.has(port)) {
          availablePorts.push(port)
        }
      }

      // 4. 检查是否有足够的可用端口
      if (availablePorts.length < count) {
        throw new PortAllocationError(
          `可用端口不足，需要${count}个，当前仅剩余${availablePorts.length}个端口`,
          'INSUFFICIENT_PORTS',
          availablePorts.length
        )
      }

      // 5. 批量创建端口分配记录
      const portAllocations = availablePorts.map(port => ({
        port,
        deregistrationBusinessId,
        allocatedAt: now
      }))

      await tx.portAllocation.createMany({
        data: portAllocations
      })

      // 6. 构建返回结果
      const allocatedPorts: AllocatedPort[] = availablePorts.map(port => ({
        port,
        remark: '',
        allocatedAt: now
      }))

      // 7. 更新注销业务的端口信息
      // 注意：DeregistrationBusiness模型中没有ports字段，所以这里不需要更新

      return allocatedPorts
    })
  }

  /**
   * 获取项目已分配的端口
   */
  async getAllocatedPorts(deregistrationBusinessId: string): Promise<AllocatedPort[] | null> {
    const business = await this.prisma.deregistrationBusiness.findUnique({
      where: { id: deregistrationBusinessId },
      include: {
        portAllocations: {
          orderBy: { allocatedAt: 'asc' }
        }
      }
    })

    if (!business) return null

    return business.portAllocations.map(allocation => ({
      port: allocation.port,
      remark: '',
      allocatedAt: allocation.allocatedAt
    }))
  }

  /**
   * 更新端口备注
   */
  async updatePortRemarks(deregistrationBusinessId: string, updatedPorts: AllocatedPort[]): Promise<void> {
    // 验证端口是否属于该项目
    const currentPorts = await this.getAllocatedPorts(deregistrationBusinessId)
    if (!currentPorts) {
      throw new PortAllocationError('项目未分配端口', 'NO_PORTS_ALLOCATED')
    }

    // 验证更新数据：确保端口属于该项目
    const currentPortMap = new Map(currentPorts.map(p => [p.port, p]))

    for (const updatedPort of updatedPorts) {
      const currentPort = currentPortMap.get(updatedPort.port)
      if (!currentPort) {
        throw new PortAllocationError(
          `端口${updatedPort.port}不属于该项目`,
          'INVALID_PORT_UPDATE'
        )
      }

      // 检查端口号是否被修改
      if (updatedPort.port !== currentPort.port) {
        throw new PortAllocationError(
          '不能修改端口号',
          'INVALID_PORT_MODIFICATION'
        )
      }
    }

    // 更新项目端口信息，只保留端口号、备注和原始分配时间
    const portsToUpdate = updatedPorts.map(updatedPort => {
      const currentPort = currentPortMap.get(updatedPort.port)!
      return {
        port: currentPort.port,
        remark: updatedPort.remark, // 只更新备注
        allocatedAt: currentPort.allocatedAt // 保持原始分配时间
      }
    })

    // 注意：DeregistrationBusiness模型中没有ports字段
    // 如果需要存储端口备注，可以考虑在PortAllocation模型中添加remark字段
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
