import api from './api'
import { ref, computed } from 'vue'
// DeregistrationTask is defined in tasks.ts and imported where needed

export interface DeregistrationBusiness {
  id: string
  companyName: string
  registrationNumber?: string
  feeAmount?: number
  isPaid: boolean
  status: 'pending_entry' | 'submitted' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated' | 'finished'
  needsProcessing: boolean
  description?: string
  createdAt: string
  updatedAt: string
  _count?: {
    deregistrationLogs: number
  }
}

export interface DeregistrationLog {
  id: string
  action: string
  oldStatus?: string
  newStatus?: string
  oldValue?: string
  newValue?: string
  remark?: string
  operator: string
  createdAt: string
  deregistrationBusinessId: string
}

export interface DeregistrationBusinessWithDetails extends DeregistrationBusiness {
  deregistrationLogs: DeregistrationLog[]
}

export interface CreateDeregistrationBusinessData {
  companyName: string
  registrationNumber?: string
  feeAmount?: number
  isPaid?: boolean
  description?: string
  status?: 'pending_entry' | 'submitted' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated' | 'finished'
}

export interface UpdateDeregistrationBusinessData {
  companyName?: string
  registrationNumber?: string
  feeAmount?: number
  isPaid?: boolean
  description?: string
  status?: 'pending_entry' | 'submitted' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated' | 'finished'
}

export interface RsyncDataItem {
  name: string
  status: Record<string, string>
  time?: string
  review_status?: string
  page?: number
  collected_at?: string
}

export interface SyncStatusResult {
  totalProcessed: number
  totalMatched: number
  updatedCount: number
  updatedBusinesses: string[]
  matchedBusinesses: string[]
}

export interface AIStatusUpdate {
  status:
    | 'idle'
    | 'active'
    | 'running'
    | 'success'
    | 'failed'
    | 'warning'
    | 'completed'
    | 'aborted'
    | 'error'
  command?: string
  result?: string
  duration?: number
}

// State management
const deregistrationBusinesses = ref<DeregistrationBusiness[]>([])
const currentDeregistrationBusiness = ref<DeregistrationBusinessWithDetails | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Computed
const allDeregistrationBusinesses = computed(() => deregistrationBusinesses.value)
const pendingEntryBusinesses = computed(() => deregistrationBusinesses.value.filter((b) => b.status === 'pending_entry'))
const completedBusinesses = computed(() => deregistrationBusinesses.value.filter((b) => b.status === 'completed'))
const paidBusinesses = computed(() => deregistrationBusinesses.value.filter((b) => b.isPaid))
const needsProcessingBusinesses = computed(() => deregistrationBusinesses.value.filter((b) => b.needsProcessing))
const totalLogs = computed(() =>
  deregistrationBusinesses.value.reduce((sum, business) => sum + (business._count?.deregistrationLogs || 0), 0),
)

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
    const response = await api.get('/deregistration-businesses')
    return response.data.data
  },

  async createDeregistrationBusiness(data: CreateDeregistrationBusinessData): Promise<DeregistrationBusiness> {
    const response = await api.post('/deregistration-businesses', data)
    return response.data.data
  },

  async updateDeregistrationBusiness(id: string, data: UpdateDeregistrationBusinessData): Promise<DeregistrationBusiness> {
    const response = await api.put(`/deregistration-businesses/${id}`, data)
    return response.data.data
  },

  async deleteDeregistrationBusiness(id: string): Promise<void> {
    await api.delete(`/deregistration-businesses/${id}`)
  },

  async getDeregistrationBusinessDetails(id: string): Promise<DeregistrationBusinessWithDetails> {
    const response = await api.get(`/deregistration-businesses/${id}/details`)
    return response.data.data
  },

  async syncStatus(data: RsyncDataItem[]): Promise<SyncStatusResult> {
    const response = await api.post('/deregistration-businesses/sync-status', { data })
    return response.data.data
  },

  async markAsProcessed(id: string): Promise<DeregistrationBusiness> {
    const response = await api.post(`/deregistration-businesses/${id}/mark-processed`)
    return response.data.data
  },

  async getBusinessesNeedingProcessing(): Promise<DeregistrationBusiness[]> {
    const response = await api.get('/deregistration-businesses/needs-processing')
    return response.data.data
  },


  // Business logic methods
  async fetchDeregistrationBusinesses() {
    setLoading(true)
    setError(null)
    const data = await this.getDeregistrationBusinesses()
    console.log('Fetched deregistration businesses from backend:', data)
    console.log('Total deregistration businesses count:', data.length)
    deregistrationBusinesses.value = data
    setLoading(false)
  },

  async createDeregistrationBusinessWithState(data: CreateDeregistrationBusinessData) {
    setLoading(true)
    setError(null)
    const newDeregistrationBusiness = await this.createDeregistrationBusiness(data)
    deregistrationBusinesses.value.unshift(newDeregistrationBusiness)
    setLoading(false)
    return newDeregistrationBusiness
  },

  async updateDeregistrationBusinessWithState(id: string, data: UpdateDeregistrationBusinessData) {
    setLoading(true)
    setError(null)
    const updatedDeregistrationBusiness = await this.updateDeregistrationBusiness(id, data)

    // Update in deregistration businesses list
    const index = deregistrationBusinesses.value.findIndex((b) => b.id === id)
    if (index !== -1) {
      deregistrationBusinesses.value[index] = { ...deregistrationBusinesses.value[index], ...updatedDeregistrationBusiness }
    }

    // Update current deregistration business if it's the same
    if (currentDeregistrationBusiness.value?.id === id) {
      currentDeregistrationBusiness.value = { ...currentDeregistrationBusiness.value, ...updatedDeregistrationBusiness }
    }

    setLoading(false)
    return updatedDeregistrationBusiness
  },

  async deleteDeregistrationBusinessWithState(id: string) {
    setLoading(true)
    setError(null)
    await this.deleteDeregistrationBusiness(id)
    deregistrationBusinesses.value = deregistrationBusinesses.value.filter((b) => b.id !== id)

    // Clear current deregistration business if it's the deleted one
    if (currentDeregistrationBusiness.value?.id === id) {
      currentDeregistrationBusiness.value = null
    }
    setLoading(false)
  },

  async fetchDeregistrationBusinessDetailsWithState(id: string) {
    setLoading(true)
    setError(null)
    const deregistrationBusiness = await this.getDeregistrationBusinessDetails(id)
    currentDeregistrationBusiness.value = deregistrationBusiness
    setLoading(false)
    return deregistrationBusiness
  },

  async syncStatusWithState(data: RsyncDataItem[]) {
    setLoading(true)
    setError(null)
    const result = await this.syncStatus(data)
    // Refresh the list to get updated needsProcessing status
    await this.fetchDeregistrationBusinesses()
    setLoading(false)
    return result
  },

  async markAsProcessedWithState(id: string) {
    setLoading(true)
    setError(null)
    const updatedDeregistrationBusiness = await this.markAsProcessed(id)

    // Update in deregistration businesses list
    const index = deregistrationBusinesses.value.findIndex((b) => b.id === id)
    if (index !== -1) {
      deregistrationBusinesses.value[index] = { ...deregistrationBusinesses.value[index], ...updatedDeregistrationBusiness }
    }

    // Update current deregistration business if it's the same
    if (currentDeregistrationBusiness.value?.id === id) {
      currentDeregistrationBusiness.value = { ...currentDeregistrationBusiness.value, ...updatedDeregistrationBusiness }
    }

    setLoading(false)
    return updatedDeregistrationBusiness
  },

}

// Create aliases for easier importing
const fetchDeregistrationBusinesses = deregistrationBusinessService.fetchDeregistrationBusinesses.bind(deregistrationBusinessService)
const createDeregistrationBusiness = deregistrationBusinessService.createDeregistrationBusinessWithState.bind(deregistrationBusinessService)
const updateDeregistrationBusiness = deregistrationBusinessService.updateDeregistrationBusinessWithState.bind(deregistrationBusinessService)
const deleteDeregistrationBusiness = deregistrationBusinessService.deleteDeregistrationBusinessWithState.bind(deregistrationBusinessService)
const fetchDeregistrationBusinessDetails = deregistrationBusinessService.fetchDeregistrationBusinessDetailsWithState.bind(deregistrationBusinessService)
const syncStatus = deregistrationBusinessService.syncStatusWithState.bind(deregistrationBusinessService)
const markAsProcessed = deregistrationBusinessService.markAsProcessedWithState.bind(deregistrationBusinessService)

// Export everything
export {
  // State
  deregistrationBusinesses,
  currentDeregistrationBusiness,
  loading,
  error,

  // Getters
  allDeregistrationBusinesses,
  pendingEntryBusinesses,
  completedBusinesses,
  paidBusinesses,
  needsProcessingBusinesses,
  totalLogs,

  // Actions
  fetchDeregistrationBusinesses,
  createDeregistrationBusiness,
  updateDeregistrationBusiness,
  deleteDeregistrationBusiness,
  fetchDeregistrationBusinessDetails,
  syncStatus,
  markAsProcessed,
}
