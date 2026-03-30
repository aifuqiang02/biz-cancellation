<template>
  <div class="login-container">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="text-center">
          <h2>注销代办管理</h2>
          <p class="text-muted">登录您的账户</p>
        </div>
      </template>

      <el-form ref="loginFormRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱"
            :prefix-icon="Message"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="w-full"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="text-center">
        <p class="text-muted">
          还没有账户？
          <el-link type="primary" @click="showRegister = true">注册</el-link>
        </p>
      </div>
    </el-card>

    <!-- 注册对话框 -->
    <el-dialog v-model="showRegister" title="注册账户" width="400px" :close-on-click-modal="false">
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
        @submit.prevent="handleRegister"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱"
            :prefix-icon="Message"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            native-type="submit"
            class="w-full"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Message, Lock, User } from '@element-plus/icons-vue'
import { loading, login, register, error, isAuthenticated } from '@/services/auth'

const router = useRouter()
// Auth is now handled directly through imported functions and state

// 登录表单
const loginFormRef = ref()
const form = reactive({
  email: '635104032@qq.com',
  password: '123456',
})

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
}

// 注册相关
const showRegister = ref(false)
const registerFormRef = ref()
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
})

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度不能少于3位', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
}

// 处理登录
const handleLogin = async () => {
  await loginFormRef.value?.validate()
  const result = await login(form)
  if (result.code == 200) {
    ElMessage.success('登录成功')
    router.push('/')
  } else {
    ElMessage.error(result.msg)
  }
}

// 处理注册
const handleRegister = async () => {
  try {
    await registerFormRef.value?.validate()
    await register(registerForm)
    ElMessage.success('注册成功')
    showRegister.value = false
    router.push('/')
  } catch (err) {
    console.error('Register error:', err)
    // 显示错误信息
    const errorMessage = error.value
    if (errorMessage) {
      ElMessage.error(errorMessage)
    } else {
      ElMessage.error('注册失败，请稍后重试')
    }
  }
}

onMounted(() => {
  // 如果已经登录，重定向到首页
  if (isAuthenticated.value) {
    router.push('/')
  }
})
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #6c757d;
  margin: 0;
}

.w-full {
  width: 100%;
}
</style>
