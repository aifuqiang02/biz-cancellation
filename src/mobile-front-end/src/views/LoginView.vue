<script setup lang="ts">
import { ref } from "vue";
import { showToast, showLoadingToast } from "vant";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// 表单数据（预设登录信息）
const form = ref({
  email: "635104032@qq.com",
  password: "123456",
});

const router = useRouter();
const authStore = useAuthStore();

// 登录方法
const handleLogin = async () => {
  if (!form.value.email || !form.value.password) {
    showToast("请输入邮箱和密码");
    return;
  }

  showLoadingToast({
    message: "登录中...",
    forbidClick: true,
  });

  try {
    const result = await authStore.login(form.value);
    if (result.code == 200) {
      showToast({
        message: "登录成功",
        icon: "success",
      });
      router.push("/home");
    } else {
      showToast(result.msg || "登录失败");
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast("登录失败，请稍后重试");
  }
};
</script>

<template>
  <div class="login-container">
    <!-- 顶部标题 -->
    <div class="login-header">
      <h1 class="title">注销代办管理</h1>
      <p class="subtitle">登录您的账户</p>
    </div>

    <!-- 登录表单 -->
    <van-form @submit="handleLogin" class="login-form">
      <van-field
        v-model="form.email"
        label="邮箱"
        placeholder="请输入邮箱"
        type="email"
        :rules="[{ required: true, message: '请输入邮箱' }]"
        left-icon="envelop-o"
        clearable
      />

      <van-field
        v-model="form.password"
        label="密码"
        placeholder="请输入密码"
        type="password"
        :rules="[{ required: true, message: '请输入密码' }]"
        left-icon="lock"
        clearable
      />

      <!-- 登录按钮 -->
      <div class="login-button">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          size="large"
          :loading="authStore.loading"
        >
          登录
        </van-button>
      </div>
    </van-form>

    <!-- 底部链接 -->
    <div class="login-footer">
      <van-divider>还没有账户？</van-divider>
      <van-button type="primary" plain block to="/register" size="large"> 立即注册 </van-button>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.title {
  font-size: 28px;
  font-weight: bold;
  margin: 0 0 10px 0;
}

.subtitle {
  font-size: 16px;
  margin: 0;
}

.login-form {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  padding: 24px;
}

.login-button {
  margin-top: 24px;
}

.login-footer {
  width: 100%;
  max-width: 400px;
  margin-top: 24px;
  border-radius: 12px;
  padding: 20px;
}
</style>
