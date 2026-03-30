<script setup lang="ts">
import { ref } from "vue";
import { showToast, showLoadingToast } from "vant";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// 表单数据
const form = ref({
  username: "",
  email: "",
  password: "",
});

const router = useRouter();
const authStore = useAuthStore();

// 注册方法
const handleRegister = async () => {
  if (!form.value.username || !form.value.email || !form.value.password) {
    showToast("请填写完整信息");
    return;
  }

  if (form.value.password.length < 6) {
    showToast("密码长度不能少于6位");
    return;
  }

  showLoadingToast({
    message: "注册中...",
    forbidClick: true,
  });

  try {
    const result = await authStore.register(form.value);
    if (result.code == 200) {
      showToast({
        message: "注册成功",
        icon: "success",
      });
      router.push("/home");
    } else {
      showToast(result.msg || "注册失败");
    }
  } catch (error) {
    console.error("Register error:", error);
    showToast("注册失败，请稍后重试");
  }
};
</script>

<template>
  <div class="register-container">
    <!-- 顶部标题 -->
    <div class="register-header">
      <h1 class="title">注册账户</h1>
      <p class="subtitle">创建您的项目管理账户</p>
    </div>

    <!-- 注册表单 -->
    <van-form @submit="handleRegister" class="register-form">
      <van-field
        v-model="form.username"
        label="用户名"
        placeholder="请输入用户名"
        :rules="[{ required: true, message: '请输入用户名' }]"
        left-icon="contact"
        clearable
      />

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
        placeholder="请输入密码（至少6位）"
        type="password"
        :rules="[{ required: true, message: '请输入密码' }]"
        left-icon="lock"
        clearable
      />

      <!-- 注册按钮 -->
      <div class="register-button">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          size="large"
          :loading="authStore.loading"
        >
          注册
        </van-button>
      </div>
    </van-form>

    <!-- 底部链接 -->
    <div class="register-footer">
      <van-divider>已有账户？</van-divider>
      <van-button type="primary" plain block to="/login" size="large"> 立即登录 </van-button>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.register-header {
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
  opacity: 0.9;
}

.register-form {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
}

.register-button {
  margin-top: 24px;
}

.register-footer {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  padding: 20px;
}
</style>
