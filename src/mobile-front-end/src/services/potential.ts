import api from './api'
import { ref } from 'vue'

export interface PotentialCustomer {
  id: string
  companyName: string
  legalRepresentativeName?: string
  legalRepresentativePhone?: string
  registrationTime?: string
}

const potentialCustomers = ref<PotentialCustomer[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export const fetchPotentialCustomers = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/deregistration-businesses/potential')
    potentialCustomers.value = response.data.data || []
    loading.value = false
    return potentialCustomers.value
  } catch (err) {
    console.error('Failed to fetch potential customers:', err)
    error.value = '获取潜在客户失败'
    loading.value = false
    throw err
  }
}

export const resetPotentialCustomers = () => {
  potentialCustomers.value = []
}

export const submitContactResult = async (
  id: string,
  contactResult: string,
  contactRemark?: string
) => {
  try {
    const response = await api.post(`/deregistration-businesses/${id}/contact`, {
      contactResult,
      contactRemark,
    })
    return response.data.data
  } catch (err) {
    console.error('Failed to submit contact result:', err)
    throw err
  }
}

export {
  potentialCustomers,
  loading,
  error,
}
