import api from './api'
import { ref, computed } from 'vue'

export interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: number // 1-5, 1 is highest
  order?: number
  createdAt: string
  updatedAt: string
  projectId: string
}

export interface CreateTaskData {
  title: string
  projectId: string
  priority?: number
}

export interface UpdateTaskData {
  title?: string
  status?: 'pending' | 'in_progress' | 'completed'
  priority?: number
  order?: number
}

// State management
const tasks = ref<Task[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Actions
const setLoading = (value: boolean) => {
  loading.value = value
}

const setError = (message: string | null) => {
  error.value = message
}

export const taskService = {
  // API methods
  async getTasksByProject(projectId: string): Promise<Task[]> {
    const response = await api.get(`/tasks/project/${projectId}`)
    return response.data.data
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    const response = await api.post('/tasks', data)
    return response.data.data
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, data)
    return response.data.data
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`)
  },

  // Business logic methods
  async fetchTasksByProject(projectId: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await this.getTasksByProject(projectId)
      // Remove existing tasks for this project and add new ones
      tasks.value = tasks.value.filter((task) => task.projectId !== projectId)
      tasks.value.push(...data)
      setLoading(false)
      return data
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
      setError('获取任务列表失败')
      setLoading(false)
      throw err
    }
  },

  async createTaskWithState(data: CreateTaskData) {
    setLoading(true)
    setError(null)
    try {
      const newTask = await this.createTask(data)
      tasks.value.unshift(newTask)
      setLoading(false)
      return newTask
    } catch (err) {
      console.error('Failed to create task:', err)
      setError('创建任务失败')
      setLoading(false)
      throw err
    }
  },

  async updateTaskWithState(id: string, data: UpdateTaskData) {
    setLoading(true)
    setError(null)
    try {
      const updatedTask = await this.updateTask(id, data)

      // Update in tasks list
      const index = tasks.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      setLoading(false)
      return updatedTask
    } catch (err) {
      console.error('Failed to update task:', err)
      setError('更新任务失败')
      setLoading(false)
      throw err
    }
  },

  async deleteTaskWithState(id: string) {
    setLoading(true)
    setError(null)
    try {
      await this.deleteTask(id)
      tasks.value = tasks.value.filter((t) => t.id !== id)
      setLoading(false)
    } catch (err) {
      console.error('Failed to delete task:', err)
      setError('删除任务失败')
      setLoading(false)
      throw err
    }
  },

  // Utility methods
  clearTasks() {
    tasks.value = []
  },
}

// Computed properties for filtering
const pendingTasks = computed(() => tasks.value.filter((t) => t.status === 'pending'))
const inProgressTasks = computed(() => tasks.value.filter((t) => t.status === 'in_progress'))
const completedTasks = computed(() => tasks.value.filter((t) => t.status === 'completed'))

// Sort tasks by priority and order
const sortedTasks = computed(() => {
  return [...tasks.value].sort((a, b) => {
    // First by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority
    }
    // Then by order
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    // Finally by creation date
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
})

// Create aliases for easier importing
const fetchTasksByProject = taskService.fetchTasksByProject.bind(taskService)
const createTask = taskService.createTaskWithState.bind(taskService)
const updateTask = taskService.updateTaskWithState.bind(taskService)
const deleteTask = taskService.deleteTaskWithState.bind(taskService)
const clearTasks = taskService.clearTasks.bind(taskService)

// Export everything
export {
  // State
  tasks,
  loading,
  error,

  // Computed
  pendingTasks,
  inProgressTasks,
  completedTasks,
  sortedTasks,

  // Business logic methods
  fetchTasksByProject,
  createTask,
  updateTask,
  deleteTask,
  clearTasks,
}
