import api from './api'
import { ref, computed } from 'vue'

// 统一的API响应格式
export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface User {
  id: string
  email: string
  username: string
}

// 修改为匹配新的统一响应格式
export interface AuthResponse {
  token: string
  user: User
}

// State management
const token = ref<string | null>(localStorage.getItem('token'))
const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const isAuthenticated = computed(() => !!token.value)

// Actions
const setToken = (newToken: string | null) => {
  token.value = newToken
  if (newToken) {
    localStorage.setItem('token', newToken)
  } else {
    localStorage.removeItem('token')
  }
}

const setUser = (newUser: User | null) => {
  user.value = newUser
}

const setLoading = (value: boolean) => {
  loading.value = value
}

const setError = (message: string | null) => {
  error.value = message
}

export const authService = {
  // API methods
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get('/auth/me')
    return response.data
  },

  // Business logic methods with state management
  async loginWithState(data: LoginData) {
    setLoading(true)
    setError(null)

    const response = await this.login(data)
    if (response.code == 200) {
      setToken(response.data.token)
      setUser(response.data.user)
    } else {
      setError(response.msg)
    }
    setLoading(false)
    return response
  },

  async registerWithState(data: RegisterData) {
    setLoading(true)
    setError(null)

    const response = await this.register(data)
    if (response.code == 200) {
      setToken(response.data.token)
      setUser(response.data.user)
      setLoading(false)
      return response
    } else {
      setError(response.msg)
      setLoading(false)
      throw new Error(response.msg)
    }
  },

  logout() {
    setToken(null)
    setUser(null)
    setError(null)
  },

  async checkAuth() {
    if (!token.value) return false

    setLoading(true)
    const response = await this.getCurrentUser()
    if (response.code == 200) {
      setUser(response.data)
      setLoading(false)
      return true
    } else {
      this.logout()
      setLoading(false)
      return false
    }
  },
}

// Create aliases for easier importing
const login = authService.loginWithState.bind(authService)
const register = authService.registerWithState.bind(authService)
const logout = authService.logout.bind(authService)
const checkAuth = authService.checkAuth.bind(authService)

// Export everything
export {
  // State
  token,
  user,
  loading,
  error,

  // Getters
  isAuthenticated,

  // Actions
  login,
  register,
  logout,
  checkAuth,
}
