<template>
  <div class="home-container">
    <!-- Header -->
    <header class="header" v-if="showHeader">
      <div class="header-content-full">
        <div class="header-left">
          <h1 class="title">注销代办管理</h1>
          <el-menu
            :default-active="activeMenu"
            class="header-menu"
            mode="horizontal"
            @select="handleMenuSelect"
          >
            <el-menu-item index="home">首页</el-menu-item>
            <el-menu-item index="docs">Cursor 接入文档</el-menu-item>
          </el-menu>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateDeregistrationBusiness = true">
            <el-icon><Plus /></el-icon>
            新建注销业务
          </el-button>
          <el-button @click="handleLogout" type="text"> 退出登录 </el-button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- Home View -->
        <div v-if="currentView === 'home'" class="tasks-section">
          <div class="section-header" v-if="showHeader">
            <h2>任务列表</h2>
            <div class="stats">
              <el-tag type="success">{{ pendingEntryBusinesses?.length || 0 }} 个待录入</el-tag>
              <el-tag type="warning">{{ completedBusinesses?.length || 0 }} 个已完成</el-tag>
              <el-tag type="info">{{ paidBusinesses?.length || 0 }} 个已付款</el-tag>
              <el-tag type="primary">{{ allDeregistrationBusinesses?.length || 0 }} 个注销业务</el-tag>
              <el-tag v-if="needsProcessingBusinesses.length > 0" type="danger">
                {{ needsProcessingBusinesses.length }} 个待处理
              </el-tag>
              <el-tag type="danger">{{ totalLogsOverride }} 个日志</el-tag>
            </div>
          </div>

          <!-- Tabs for business status -->
          <el-tabs v-model="activeBusinessTab" @tab-click="handleTabClick">
            <el-tab-pane label="进行中业务" name="active">
              <el-table
                :data="activeBusinesses.slice((currentPage - 1) * pageSize, currentPage * pageSize)"
                style="width: 100%"
              >
                <el-table-column prop="companyName" label="企业名称" width="250" />
                <el-table-column prop="registrationNumber" label="设立编号" width="150" />
                <el-table-column prop="feeAmount" label="费用金额" width="120">
                  <template #default="scope">
                    <span v-if="scope.row.feeAmount">¥{{ scope.row.feeAmount }}</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="isPaid" label="付款状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.isPaid ? 'success' : 'warning'" size="small">
                      {{ scope.row.isPaid ? '已付款' : '未付款' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="业务状态" width="120">
                  <template #default="scope">
                    <el-tag :type="getBusinessStatusType(scope.row)" size="small">
                      {{ getBusinessStatusText(scope.row) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="needsProcessing" label="处理状态" width="100" align="center">
                  <template #default="scope">
                    <el-tag v-if="scope.row.needsProcessing" type="danger" size="small">
                      待处理
                    </el-tag>
                    <span v-else style="color: #909399;">无需处理</span>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="创建时间" width="180">
                  <template #default="scope">
                    {{ formatDate(scope.row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column prop="updatedAt" label="更新时间" width="180">
                  <template #default="scope">
                    {{ formatDate(scope.row.updatedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="280">
                  <template #default="scope">
                    <el-button size="small" type="primary" @click="editBusiness(scope.row)">
                      编辑
                    </el-button>
                    <el-button 
                      v-if="scope.row.needsProcessing" 
                      size="small" 
                      type="success" 
                      @click="handleMarkAsProcessed(scope.row)"
                    >
                      已处理
                    </el-button>
                    <el-button size="small" type="danger" @click="handleDeleteBusiness(scope.row)">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[50, 100, 200]"
                  :total="activeBusinesses.length"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane label="已完结业务" name="finished">
              <el-table
                :data="finishedBusinesses.slice((currentPage - 1) * pageSize, currentPage * pageSize)"
                style="width: 100%"
              >
                <el-table-column prop="companyName" label="企业名称" width="250" />
                <el-table-column prop="registrationNumber" label="设立编号" width="150" />
                <el-table-column prop="feeAmount" label="费用金额" width="120">
                  <template #default="scope">
                    <span v-if="scope.row.feeAmount">¥{{ scope.row.feeAmount }}</span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="isPaid" label="付款状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.isPaid ? 'success' : 'warning'" size="small">
                      {{ scope.row.isPaid ? '已付款' : '未付款' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="业务状态" width="120">
                  <template #default="scope">
                    <el-tag :type="getBusinessStatusType(scope.row)" size="small">
                      {{ getBusinessStatusText(scope.row) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="创建时间" width="180">
                  <template #default="scope">
                    {{ formatDate(scope.row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column prop="updatedAt" label="完成时间" width="180">
                  <template #default="scope">
                    {{ formatDate(scope.row.updatedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="scope">
                    <el-button size="small" @click="viewBusinessLogs(scope.row)">
                      查看日志
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[50, 100, 200]"
                  :total="finishedBusinesses.length"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- Docs View -->
        <div v-if="currentView === 'docs'" class="docs-section">
          <div class="docs-content">
            <h2>Cursor 接入文档</h2>

            <!-- Business Selector -->
            <div class="business-selector-section">
              <h4>注销业务选择器</h4>
              <p>选择一个注销业务来查看对应的API调用示例：</p>
              <div class="business-selector">
                <el-select
                  v-model="selectedBusinessId"
                  placeholder="请选择注销业务"
                  style="width: 300px"
                  @change="onBusinessSelected"
                >
                  <el-option
                    v-for="business in allDeregistrationBusinesses"
                    :key="business.id"
                    :label="business.companyName"
                    :value="business.id"
                  />
                </el-select>
              </div>
            </div>

            <!-- Cursor Hooks Documentation -->
            <CursorHooksDocs :selected-project-id="selectedBusinessId" />
          </div>
        </div>
      </div>
    </main>

    <!-- Create Deregistration Business Dialog -->
    <el-dialog
      v-model="showCreateDeregistrationBusiness"
      title="新建注销业务"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="businessFormRef" :model="businessForm" :rules="businessRules" label-width="100px">
        <el-form-item label="企业名称" prop="companyName">
          <el-input v-model="businessForm.companyName" placeholder="请输入企业名称" />
        </el-form-item>

        <el-form-item label="设立编号">
          <el-input
            v-model="businessForm.registrationNumber"
            placeholder="可选：设立编号"
          />
        </el-form-item>

        <el-form-item label="费用金额">
          <el-input-number
            v-model="businessForm.feeAmount"
            :min="0"
            :precision="2"
            placeholder="可选：费用金额"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="是否已付款">
          <el-radio-group v-model="businessForm.isPaid">
            <el-radio :value="false">未付款</el-radio>
            <el-radio :value="true">已付款</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="businessForm.status" placeholder="请选择状态">
            <el-option label="待录入" value="pending_entry" />
            <el-option label="已提交" value="submitted" />
            <el-option label="待签字" value="pending_signature" />
            <el-option label="初审驳回" value="first_review_rejected" />
            <el-option label="已初审" value="first_reviewed" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已完成" value="completed" />
            <el-option label="已终止" value="terminated" />
            <el-option label="已完结" value="finished" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="businessForm.description"
            type="textarea"
            placeholder="业务描述（可选）"
            :rows="3"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDeregistrationBusiness = false">取消</el-button>
        <el-button type="primary" :loading="(loading as any).value" @click="handleCreateDeregistrationBusiness">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- Edit Deregistration Business Dialog -->
    <el-dialog
      v-model="showEditDeregistrationBusiness"
      title="编辑注销业务"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editBusinessFormRef"
        :model="editBusinessForm"
        :rules="businessRules"
        label-width="100px"
      >
        <el-form-item label="企业名称" prop="companyName">
          <el-input v-model="editBusinessForm.companyName" placeholder="请输入企业名称" />
        </el-form-item>

        <el-form-item label="设立编号">
          <el-input
            v-model="editBusinessForm.registrationNumber"
            placeholder="可选：设立编号"
          />
        </el-form-item>

        <el-form-item label="费用金额">
          <el-input-number
            v-model="editBusinessForm.feeAmount"
            :min="0"
            :precision="2"
            placeholder="可选：费用金额"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="是否已付款">
          <el-radio-group v-model="editBusinessForm.isPaid">
            <el-radio :value="false">未付款</el-radio>
            <el-radio :value="true">已付款</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="editBusinessForm.status" placeholder="请选择状态">
            <el-option label="待录入" value="pending_entry" />
            <el-option label="已提交" value="submitted" />
            <el-option label="待签字" value="pending_signature" />
            <el-option label="初审驳回" value="first_review_rejected" />
            <el-option label="已初审" value="first_reviewed" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已完成" value="completed" />
            <el-option label="已终止" value="terminated" />
            <el-option label="已完结" value="finished" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述">
              <el-input
            v-model="editBusinessForm.description"
            type="textarea"
            placeholder="业务描述（可选）"
            :rows="3"
              />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEditDeregistrationBusiness = false">取消</el-button>
        <el-button type="primary" :loading="(loading as any).value" @click="handleEditDeregistrationBusiness">
          更新
        </el-button>
      </template>
    </el-dialog>


    <!-- Floating Toggle Button -->
    <div class="floating-toggle">
      <el-button
        type="primary"
        circle
        :icon="showHeader ? 'Hide' : 'View'"
        @click="showHeader = !showHeader"
        size="large"
      >
        <template #icon>
          <el-icon>
            <ArrowUp v-if="showHeader" />
            <ArrowDown v-else />
          </el-icon>
        </template>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Plus,
  ArrowDown,
  ArrowUp,
  Rank,
  Loading,
  Check,
  Close,
  Warning,
  Document,
  Setting,
} from '@element-plus/icons-vue'
import { logout } from '@/services/auth'
import CursorHooksDocs from '@/components/CursorHooksDocs.vue'
import {
  deregistrationBusinesses,
  currentDeregistrationBusiness,
  allDeregistrationBusinesses,
  pendingEntryBusinesses,
  completedBusinesses,
  paidBusinesses,
  needsProcessingBusinesses,
  fetchDeregistrationBusinesses,
  createDeregistrationBusiness,
  updateDeregistrationBusiness,
  deleteDeregistrationBusiness,
  fetchDeregistrationBusinessDetails,
  markAsProcessed,
} from '@/services/projects'
import {
  deregistrationLogs,
  loading,
  createDeregistrationLog,
  fetchDeregistrationLogsByBusiness,
  deleteDeregistrationLog,
  updateDeregistrationLog,
  clearDeregistrationLogs,
} from '@/services/logs'
import type { DeregistrationLog } from '@/services/projects'
import type { DeregistrationBusiness } from '@/services/projects'

const router = useRouter()
// Auth is now handled directly through imported functions
// 使用直接导入的响应式变量和函数
// 计算每个注销业务的日志数量
const getLogCount = (businessId: string): number => {
  return deregistrationBusinesses.value.find(b => b.id === businessId)?._count?.deregistrationLogs || 0
}

// 使用直接导入的函数和变量

// Reactive data
const showCreateDeregistrationBusiness = ref(false)
const showEditDeregistrationBusiness = ref(false)
const showHeader = ref(true) // 控制头部显示状态
const activeMenu = ref('home') // 当前激活的菜单项
const currentView = ref('home') // 当前显示的视图：'home' 或 'docs'
const selectedBusinessId = ref('') // 文档中选择的业务ID
const activeBusinessTab = ref('active') // 当前激活的业务标签页
const currentPage = ref(1) // 当前页码
const pageSize = ref(100) // 每页显示数量

// Task statuses
const taskStatuses = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'delete', label: '删除任务', danger: true },
]

// Business actions
const businessActions = [
  { value: 'edit', label: '编辑业务' },
  { value: 'delete', label: '删除业务', danger: true },
]

// Business form
const businessFormRef = ref()
const businessForm = reactive({
  companyName: '',
  registrationNumber: '',
  feeAmount: undefined as number | undefined,
  isPaid: false,
  status: 'pending_entry' as 'pending_entry' | 'submitted' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated' | 'finished',
  description: '',
})

// Edit business form
const editBusinessFormRef = ref()
const editBusinessForm = reactive({
  id: '',
  companyName: '',
  registrationNumber: '',
  feeAmount: undefined as number | undefined,
  isPaid: false,
  status: 'pending_entry' as 'pending_entry' | 'submitted' | 'pending_signature' | 'first_review_rejected' | 'first_reviewed' | 'rejected' | 'completed' | 'terminated' | 'finished',
  description: '',
})

const businessRules = {
  companyName: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
}

// Computed
// 按创建时间倒序排序业务
const sortedDeregistrationBusinesses = computed(() =>
  [...allDeregistrationBusinesses.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ),
)

// 使用从services导入的业务统计计算属性

// 业务相关的计算属性
const activeBusinesses = computed(() =>
  deregistrationBusinesses.value.filter(business => {
    // 已完结业务：finished、terminated、rejected 状态，或已付款且 completed 状态
    const isFinished = business.status === 'finished' ||
                      business.status === 'terminated' ||
                      business.status === 'rejected' ||
                      (business.status === 'completed' && business.isPaid)

    // 不在已完结列表中的都是进行中业务
    return !isFinished
  })
)

const finishedBusinesses = computed(() =>
  deregistrationBusinesses.value.filter(business =>
    business.status === 'finished' ||
    business.status === 'terminated' ||
    business.status === 'rejected' ||
    (business.status === 'completed' && business.isPaid)
  )
)

// 计算总日志数量
const totalLogsOverride = computed(() => {
  return deregistrationBusinesses.value.reduce((sum, business) => {
    return sum + (business._count?.deregistrationLogs || 0)
  }, 0)
})

// 业务名称映射
const businessNameMap = computed(() => {
  const map: Record<string, string> = {}
  allDeregistrationBusinesses.value.forEach((business: DeregistrationBusiness) => {
    map[business.id] = business.companyName
  })
  return map
})

// 使用直接导入的currentDeregistrationBusiness变量

// 业务选择处理函数
const onBusinessSelected = (businessId: string) => {
  selectedBusinessId.value = businessId
  // 可以在这里添加其他逻辑，比如更新API示例等
}

// 标签页切换处理
const handleTabClick = (tab: any) => {
  currentPage.value = 1 // 切换标签页时重置到第一页
  activeBusinessTab.value = tab.props.name
}

// 分页相关方法
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

// 获取业务名称
const getBusinessNameById = (businessId: string) => {
  return businessNameMap.value[businessId] || '未知业务'
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 查看业务日志
const viewBusinessLogs = (business: DeregistrationBusiness) => {
  // TODO: 实现查看业务日志的功能
  ElMessage.info(`查看 ${business.companyName} 的业务日志`)
}

// 业务行样式
const getBusinessRowClass = (row: any) => {
  return row.status === 'finished' ? 'finished-business-row' : ''
}

// 业务相关函数已移除，因为不再使用任务系统

// Methods
// 业务展开相关函数已移除

// 任务相关函数已移除

// Get status text for display
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
  }
  return statusMap[status] || status
}

// 任务状态样式函数已移除

const getAIStatusType = (status?: string) => {
  switch (status) {
    case 'running':
      return 'primary'
    case 'success':
      return 'success'
    case 'failed':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const getBusinessStatusType = (business: DeregistrationBusiness) => {
  switch (business.status) {
    case 'finished':
      return 'success'
    case 'completed':
      return 'primary'
    case 'rejected':
    case 'first_review_rejected':
      return 'danger'
    case 'pending_entry':
    case 'pending_signature':
      return 'warning'
    case 'submitted':
    case 'first_reviewed':
      return 'primary'
    case 'terminated':
      return 'info'
    default:
      return 'info'
  }
}

const getBusinessStatusText = (business: DeregistrationBusiness) => {
  const statusMap: Record<string, string> = {
    pending_entry: '待录入',
    submitted: '已提交',
    pending_signature: '待签字',
    first_review_rejected: '初审驳回',
    first_reviewed: '已初审',
    rejected: '已驳回',
    completed: '已完成',
    terminated: '已终止',
    finished: '已完结',
  }
  return statusMap[business.status] || business.status
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Business management methods
const editBusiness = (business: DeregistrationBusiness) => {
  // 设置编辑表单数据
  editBusinessForm.id = business.id
  editBusinessForm.companyName = business.companyName
  editBusinessForm.registrationNumber = business.registrationNumber || ''
  editBusinessForm.feeAmount = business.feeAmount
  editBusinessForm.isPaid = business.isPaid
  editBusinessForm.status = business.status
  editBusinessForm.description = business.description || ''

  showEditDeregistrationBusiness.value = true
}

const handleDeleteBusiness = async (business: DeregistrationBusiness) => {
  try {
    await deleteDeregistrationBusiness(business.id)
    ElMessage.success('注销业务已删除')

    // 如果删除的是当前注销业务，清空注销日志列表
    if (currentDeregistrationBusiness.value?.id === business.id) {
      clearDeregistrationLogs()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete deregistration business:', error)
      ElMessage.error('删除注销业务失败')
    }
  }
}

const handleBusinessAction = async (business: DeregistrationBusiness, action: string) => {
  switch (action) {
    case 'edit':
      editBusiness(business)
      break
    case 'delete':
      await handleDeleteBusiness(business)
      break
  }
}

const handleEditDeregistrationBusiness = async () => {
  try {
    await editBusinessFormRef.value?.validate()
    const { id, ...updateData } = editBusinessForm
    await updateDeregistrationBusiness(id, updateData)
    ElMessage.success('注销业务更新成功')
    showEditDeregistrationBusiness.value = false
  } catch (error) {
    console.error('Failed to update deregistration business:', error)
  }
}

const handleMarkAsProcessed = async (business: DeregistrationBusiness) => {
  try {
    await markAsProcessed(business.id)
    ElMessage.success(`已标记 "${business.companyName}" 为已处理`)
  } catch (error) {
    console.error('Failed to mark as processed:', error)
    ElMessage.error('标记失败，请重试')
  }
}

const handleCreateDeregistrationBusiness = async () => {
  try {
    await businessFormRef.value?.validate()

    await createDeregistrationBusiness(businessForm)

    ElMessage.success('注销业务创建成功')
    showCreateDeregistrationBusiness.value = false

    // Reset form
    businessForm.companyName = ''
    businessForm.registrationNumber = ''
    businessForm.feeAmount = undefined
    businessForm.isPaid = false
    businessForm.status = 'pending_entry'
    businessForm.description = ''
  } catch (error) {
    console.error('Failed to create deregistration business:', error)
  }
}

// 复制功能已移除

// VueDraggable functionality
interface TaskOrderEvent {
  moved?: {
    element: Record<string, unknown>
    newIndex: number
    oldIndex: number
  }
}

// 任务排序功能已移除

const handleMenuSelect = (key: string) => {
  console.log('handleMenuSelect', key)
  activeMenu.value = key
  currentView.value = key
}

const handleLogout = () => {
  logout()
  router.push('/login')
}

// Lifecycle
onMounted(async () => {
  try {
    await fetchDeregistrationBusinesses()
  } catch (error) {
    console.error('Failed to load deregistration businesses:', error)
  }
})

// 初始化业务的任务列表
// 任务初始化功能已移除

// 任务相关的监听器已移除
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.floating-toggle {
  position: fixed;
  bottom: 80px; /* 底部导航上方 */
  right: 20px;
  z-index: 1000;
}

.floating-toggle .el-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: none;
}

.floating-toggle .el-button:hover {
  transform: scale(1.1);
  transition: transform 0.2s;
}

.header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.header-content-full {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem 2rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.header-menu {
  background: transparent;
  border-bottom: none;
}

.header-menu .el-menu-item {
  border-bottom: none;
}

.header-menu .el-menu-item:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.header-menu .el-menu-item.is-active {
  color: #409eff;
  border-bottom: 2px solid #409eff;
}

.title {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.main-content {
  margin: 0 auto;
  padding: 2rem;
}

.content-wrapper {
  display: grid;
  gap: 2rem;
}

.tasks-section {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  padding: 0 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #303133;
}

.stats {
  display: flex;
  gap: 0.5rem;
}

.deregistration-business-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  width: 100%;
}

.deregistration-business-card {
  cursor: pointer;
  transition: all 0.2s;
}

.deregistration-business-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.current-business {
  border: 2px solid #409eff;
}

.business-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.business-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.business-title-section h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.business-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #909399;
  white-space: nowrap;
}

.business-actions {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start; /* Align to top like other elements */
  padding-top: 2px; /* Small adjustment to visually center */
}

.quick-task-input {
  margin: 0.75rem 0;
}

.quick-task-input :deep(.el-input) {
  border-radius: 6px;
}

.quick-task-input :deep(.el-input__inner) {
  border-radius: 6px;
  font-size: 0.875rem;
  resize: none; /* Disable manual resize */
}

.quick-task-input :deep(.el-input__inner:focus) {
  border-color: #409eff;
}

.quick-task-input :deep(.el-input__suffix) {
  cursor: pointer;
  color: #409eff;
  transition: color 0.2s;
}

.quick-task-input :deep(.el-input__suffix:hover) {
  color: #66b1ff;
}

.task-input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0;
}

.task-input-row .quick-task-input {
  flex: 1;
  margin: 0;
}

.expand-button {
  font-size: 0.875rem;
  color: #409eff;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.expand-button:hover {
  background-color: #ecf5ff;
}

.task-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.cursor-key {
  font-family: monospace;
}

.ai-status {
  margin-top: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.business-tasks {
  margin: 1rem 0;
}

.tasks-divider {
  border-top: 1px dashed #e4e7ed;
  margin-bottom: 0.5rem;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 0.5rem;
  cursor: grab;
  color: #909399;
  transition: color 0.2s;
}

.drag-handle:hover {
  color: #409eff;
}

.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.task-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.task-status-text {
  font-size: 0.75rem;
  color: #909399;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  background-color: #f5f7fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: background-color 0.2s;
}

.task-status-text:hover {
  background-color: #e4e7ed;
}

.task-action {
  display: flex;
  align-items: center;
}

/* VueDraggable styles */
.sortable-ghost {
  opacity: 0.4;
  background-color: rgba(64, 158, 255, 0.1) !important;
}

.sortable-chosen {
  opacity: 1;
}

.sortable-drag {
  transform: rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.task-item:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.task-item.task-pending {
  background-color: #fafafa;
  color: #909399;
}

.task-item.task-active {
  background-color: #f0f9ff;
  color: #1890ff;
}

.task-item.task-completed {
  background-color: #f6ffed;
  color: #52c41a;
}

.task-title {
  flex: 1;
  word-break: break-word;
  white-space: normal;
  cursor: pointer;
  transition: color 0.2s;
  line-height: 1.5;
}

.task-title:hover {
  color: #409eff;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ai-loading .el-icon.is-loading {
  animation: ai-loading-spin 1s linear infinite;
}

@keyframes ai-loading-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.task-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #666;
  cursor: pointer;
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.task-status:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.task-status-dropdown :deep(.el-dropdown-menu__item.is-active) {
  color: #409eff;
  font-weight: 600;
}

.task-status-dropdown :deep(.el-dropdown-menu__item.delete-item) {
  color: #f56c6c;
}

.task-status-dropdown :deep(.el-dropdown-menu__item.delete-item:hover) {
  background-color: #fef0f0;
  color: #f56c6c;
}

.business-actions-dropdown :deep(.el-dropdown-menu__item.delete-item) {
  color: #f56c6c;
}

.business-actions-dropdown :deep(.el-dropdown-menu__item.delete-item:hover) {
  background-color: #fef0f0;
  color: #f56c6c;
}

/* Ensure dropdown button is vertically centered */
.project-actions-dropdown :deep(.el-button) {
  margin-top: 0;
  margin-bottom: 0;
  line-height: 1;
  height: auto;
}

.task-priority {
  font-size: 0.75rem;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-weight: 600;
}

.more-tasks {
  text-align: center;
  color: #409eff;
  font-size: 0.75rem;
  padding: 0.25rem;
  margin-top: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.more-tasks:hover {
  background-color: #ecf5ff;
}

.collapse-tasks {
  text-align: center;
  color: #909399;
  font-size: 0.75rem;
  padding: 0.25rem;
  margin-top: 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.collapse-tasks:hover {
  background-color: #f5f7fa;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}

.task-stats {
  display: flex;
  gap: 0.5rem;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ai-command,
.ai-duration {
  margin-bottom: 0.25rem;
}

.tasks-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.task-column {
  display: flex;
  flex-direction: column;
}

.column-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: #303133;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e4e7ed;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.task-card {
  transition: all 0.2s;
}

.task-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-active {
  border-left: 4px solid #409eff;
}

.task-completed {
  opacity: 0.7;
}

.task-content {
  margin-bottom: 0.75rem;
}

.task-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  color: #303133;
}

.task-meta {
  display: flex;
  gap: 0.5rem;
}

.task-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Override Element Plus card body padding */
:deep(.el-card__body) {
  padding: 15px;
}

@media (max-width: 1024px) {
  .deregistration-business-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }

  .tasks-container {
    grid-template-columns: 1fr;
  }

  .deregistration-business-grid {
    grid-template-columns: 1fr;
  }
}

/* Docs View Styles */
.docs-section {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  padding: 2rem 1rem;
}

.docs-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.docs-content h2 {
  color: #303133;
  margin-bottom: 2rem;
  border-bottom: 2px solid #409eff;
  padding-bottom: 0.5rem;
}

.docs-article {
  line-height: 1.6;
  color: #606266;
}

.docs-article h3 {
  color: #303133;
  margin: 2rem 0 1rem 0;
}

.docs-article h4 {
  color: #303133;
  margin: 1.5rem 0 0.5rem 0;
}

.docs-article p {
  margin-bottom: 1rem;
}

.docs-article ul,
.docs-article ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

.docs-article li {
  margin-bottom: 0.5rem;
}

.docs-article strong {
  color: #303133;
}

/* 业务选择器样式 */
.business-selector-section {
  margin: 2rem 0;
  padding: 1.5rem;
  background-color: #fff3cd;
  border-radius: 8px;
  border: 1px solid #ffeaa7;
  border-left: 4px solid #f39c12;
}

.business-selector {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.project-selector .el-select {
  margin-right: 1rem;
}

/* 表格样式 */
/* 任务相关样式已移除 */

/* 分页样式 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 标签页样式 */
:deep(.el-tabs__header) {
  margin: 0 0 20px 0;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

/* 端口分配相关样式 */
.allocated-ports-display {
  max-height: 200px;
  overflow-y: auto;
}

.port-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.port-number {
  font-family: monospace;
  font-weight: bold;
  color: #409eff;
  min-width: 60px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
