import api from './api'
import { ref, computed } from 'vue'
import type { DeregistrationLog } from './projects'

export interface CreateDeregistrationLogData {
  deregistrationBusinessId: string
  action: string
  oldStatus?: string
  newStatus?: string
  oldValue?: string
  newValue?: string
  remark?: string
  operator?: string
}

export interface UpdateDeregistrationLogData {
  action?: string
  oldStatus?: string
  newStatus?: string
  oldValue?: string
  newValue?: string
  remark?: string
  operator?: string
}

export interface DeregistrationLogWithPagination {
  logs: DeregistrationLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// State management
const deregistrationLogs = ref<DeregistrationLog[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Actions
const setLoading = (value: boolean) => {
  loading.value = value
}

const setError = (message: string | null) => {
  error.value = message
}

export const deregistrationLogService = {
  // API methods
  async getDeregistrationLogsByBusiness(
    businessId: string,
    page = 1,
    limit = 20
  ): Promise<DeregistrationLogWithPagination> {
    const response = await api.get(`/deregistration-logs/business/${businessId}`, {
      params: { page, limit }
    })
    return response.data.data
  },

  async createDeregistrationLog(data: CreateDeregistrationLogData): Promise<DeregistrationLog> {
    const response = await api.post('/deregistration-logs', data)
    return response.data.data
  },

  async updateDeregistrationLog(id: string, data: UpdateDeregistrationLogData): Promise<DeregistrationLog> {
    const response = await api.put(`/deregistration-logs/${id}`, data)
    return response.data.data
  },

  async deleteDeregistrationLog(id: string): Promise<void> {
    await api.delete(`/deregistration-logs/${id}`)
  },

  // Business logic methods
  async fetchDeregistrationLogsByBusiness(businessId: string, page = 1, limit = 20) {
    setLoading(true)
    setError(null)
    try {
      const data = await this.getDeregistrationLogsByBusiness(businessId, page, limit)
      // For now, replace all logs with new data (can be improved with pagination caching)
      deregistrationLogs.value = data.logs
      setLoading(false)
      return data
    } catch (err) {
      console.error('Failed to fetch deregistration logs by business:', err)
      setError('获取注销业务日志失败')
      setLoading(false)
      throw err
    }
  },

  async createDeregistrationLogWithState(data: CreateDeregistrationLogData) {
    setLoading(true)
    setError(null)
    try {
      const newLog = await this.createDeregistrationLog(data)
      deregistrationLogs.value.unshift(newLog) // Add to beginning since sorted by date desc
      setLoading(false)
      return newLog
    } catch (err) {
      console.error('Failed to create deregistration log:', err)
      setError('创建注销业务日志失败')
      setLoading(false)
      throw err
    }
  },

  async updateDeregistrationLogWithState(id: string, data: UpdateDeregistrationLogData) {
    setLoading(true)
    setError(null)
    try {
      const updatedLog = await this.updateDeregistrationLog(id, data)

      // Update in logs list
      const index = deregistrationLogs.value.findIndex((log) => log.id === id)
      if (index !== -1) {
        deregistrationLogs.value[index] = updatedLog
      }

      setLoading(false)
      return updatedLog
    } catch (err) {
      console.error('Failed to update deregistration log:', err)
      setError('更新注销业务日志失败')
      setLoading(false)
      throw err
    }
  },

  async deleteDeregistrationLogWithState(id: string) {
    setLoading(true)
    setError(null)
    try {
      await this.deleteDeregistrationLog(id)
      deregistrationLogs.value = deregistrationLogs.value.filter((log) => log.id !== id)
      setLoading(false)
    } catch (err) {
      console.error('Failed to delete deregistration log:', err)
      setError('删除注销业务日志失败')
      setLoading(false)
      throw err
    }
  },

  // Utility methods
  clearDeregistrationLogs() {
    deregistrationLogs.value = []
  },
}

// Sort deregistration logs by creation date (newest first)
const sortedDeregistrationLogs = computed(() =>
  [...deregistrationLogs.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)

// Create aliases for easier importing
const fetchDeregistrationLogsByBusiness = deregistrationLogService.fetchDeregistrationLogsByBusiness.bind(deregistrationLogService)
const createDeregistrationLog = deregistrationLogService.createDeregistrationLogWithState.bind(deregistrationLogService)
const updateDeregistrationLog = deregistrationLogService.updateDeregistrationLogWithState.bind(deregistrationLogService)
const deleteDeregistrationLog = deregistrationLogService.deleteDeregistrationLogWithState.bind(deregistrationLogService)
const clearDeregistrationLogs = deregistrationLogService.clearDeregistrationLogs.bind(deregistrationLogService)

// Export everything
export {
  // State
  deregistrationLogs,
  loading,
  error,

  // Computed
  sortedDeregistrationLogs,

  // Business logic methods
  fetchDeregistrationLogsByBusiness,
  createDeregistrationLog,
  updateDeregistrationLog,
  deleteDeregistrationLog,
  clearDeregistrationLogs,
}
