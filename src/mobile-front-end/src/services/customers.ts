import api from './api'
import { ref } from 'vue'

export interface Customer {
  id: string
  companyName: string
  legalRepresentativeName?: string
  legalRepresentativePhone?: string
  registrationTime?: string
  status: string
  contactResult?: string
  contactTime?: string
  createdAt: string
  updatedAt: string
}

const myCustomers = ref<Customer[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export const fetchMyCustomers = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await api.get('/deregistration-businesses/customers')
    myCustomers.value = response.data.data
    loading.value = false
    return myCustomers.value
  } catch (err) {
    console.error('Failed to fetch customers:', err)
    error.value = '获取客户列表失败'
    loading.value = false
    throw err
  }
}

export const updateCustomerStatus = async (id: string, contactResult: string) => {
  const response = await api.post(`/deregistration-businesses/${id}/contact`, {
    contactResult,
  })
  return response.data.data
}

export {
  myCustomers,
  loading,
  error,
}
