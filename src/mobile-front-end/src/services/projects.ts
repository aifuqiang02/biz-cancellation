import api from './api'
import { ref, computed } from 'vue'

export interface DeregistrationBusiness {
  id: string
  companyName: string
  registrationNumber?: string
  feeAmount?: number
  isPaid: boolean
  status: 'pending_entry' | 'entered' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated' | 'finished'
  description?: string
  createdAt: string
  updatedAt: string
  _count?: {
    tasks: number
  }
}

export interface CreateDeregistrationBusinessData {
  companyName: string
  registrationNumber?: string
  feeAmount?: number
  isPaid?: boolean
  description?: string
  status?: 'pending_entry' | 'entered' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated'
}

export interface UpdateDeregistrationBusinessData {
  companyName?: string
  registrationNumber?: string
  feeAmount?: number
  isPaid?: boolean
  description?: string
  status?: 'pending_entry' | 'entered' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated'
}

// State management
const deregistrationBusinesses = ref<DeregistrationBusiness[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const allDeregistrationBusinesses = computed(() => deregistrationBusinesses.value)

// Actions
const setLoading = (value: boolean) => {
  loading.value = value
}

const setError = (message: string | null) => {
  error.value = message
}

export const deregistrationBusinessService = {
  // API methods
  async getDeregistrationBusinesses(): Promise<DeregistrationBusiness[]> {
    const response = await api.get('/projects')
    return response.data.data
  },

  async createDeregistrationBusiness(data: CreateDeregistrationBusinessData): Promise<DeregistrationBusiness> {
    const response = await api.post('/projects', data)
    return response.data.data
  },

  async updateDeregistrationBusiness(id: string, data: UpdateDeregistrationBusinessData): Promise<DeregistrationBusiness> {
    const response = await api.put(`/projects/${id}`, data)
    return response.data.data
  },

  async deleteDeregistrationBusiness(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },

  // Business logic methods
  async fetchDeregistrationBusinesses() {
    setLoading(true)
    setError(null)
    try {
      const data = await this.getDeregistrationBusinesses()
      console.log('Fetched deregistration businesses from backend:', data)
      deregistrationBusinesses.value = data
      setLoading(false)
      return data
    } catch (err) {
      console.error('Failed to fetch deregistration businesses:', err)
      setError('获取注销业务列表失败')
      setLoading(false)
      throw err
    }
  },

  async createDeregistrationBusinessWithState(data: CreateDeregistrationBusinessData) {
    setLoading(true)
    setError(null)
    try {
      const newDeregistrationBusiness = await this.createDeregistrationBusiness(data)
      deregistrationBusinesses.value.unshift(newDeregistrationBusiness)
      setLoading(false)
      return newDeregistrationBusiness
    } catch (err) {
      console.error('Failed to create deregistration business:', err)
      setError('创建注销业务失败')
      setLoading(false)
      throw err
    }
  },

  async updateDeregistrationBusinessWithState(id: string, data: UpdateDeregistrationBusinessData) {
    setLoading(true)
    setError(null)
    try {
      const updatedDeregistrationBusiness = await this.updateDeregistrationBusiness(id, data)

      // Update in deregistration businesses list
      const index = deregistrationBusinesses.value.findIndex((b) => b.id === id)
      if (index !== -1) {
        deregistrationBusinesses.value[index] = { ...deregistrationBusinesses.value[index], ...updatedDeregistrationBusiness }
      }

      setLoading(false)
      return updatedDeregistrationBusiness
    } catch (err) {
      console.error('Failed to update deregistration business:', err)
      setError('更新注销业务失败')
      setLoading(false)
      throw err
    }
  },

  async deleteDeregistrationBusinessWithState(id: string) {
    setLoading(true)
    setError(null)
    try {
      await this.deleteDeregistrationBusiness(id)
      deregistrationBusinesses.value = deregistrationBusinesses.value.filter((b) => b.id !== id)
      setLoading(false)
    } catch (err) {
      console.error('Failed to delete deregistration business:', err)
      setError('删除注销业务失败')
      setLoading(false)
      throw err
    }
  },
}

// Create aliases for easier importing
const fetchDeregistrationBusinesses = deregistrationBusinessService.fetchDeregistrationBusinesses.bind(deregistrationBusinessService)
const createDeregistrationBusiness = deregistrationBusinessService.createDeregistrationBusinessWithState.bind(deregistrationBusinessService)
const updateDeregistrationBusiness = deregistrationBusinessService.updateDeregistrationBusinessWithState.bind(deregistrationBusinessService)
const deleteDeregistrationBusiness = deregistrationBusinessService.deleteDeregistrationBusinessWithState.bind(deregistrationBusinessService)

// Export everything
export {
  // State
  deregistrationBusinesses,
  loading,
  error,

  // Getters
  allDeregistrationBusinesses,

  // Actions
  fetchDeregistrationBusinesses,
  createDeregistrationBusiness,
  updateDeregistrationBusiness,
  deleteDeregistrationBusiness,
}
