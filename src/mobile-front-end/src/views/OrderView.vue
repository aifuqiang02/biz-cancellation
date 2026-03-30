<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { showToast, showLoadingToast, closeToast } from "vant";
import api from "@/services/api";

const route = useRoute();
const customerId = route.params.id as string;

interface CustomerData {
  companyName: string;
  legalRepresentativeName?: string;
  legalRepresentativePhone?: string;
}

const customer = ref<CustomerData | null>(null);

const orderInfo = ref({
  title: "注销委托代理合同",
  description: `尊敬的客户，您好！

感谢您选择我们的企业注销代理服务。为了更好地为您提供服务，请您阅读并确认以下信息：

一、服务内容
1. 企业注销全程代办
2. 工商、税务、银行等相关部门手续办理
3. 注销进度及时反馈

二、费用说明
具体费用根据企业情况而定，请联系客服确认。

三、所需材料
1. 营业执照原件
2. 法人身份证原件
3. 公司章程
4. 所有银行账户资料
5. 税务登记证

四、联系方式
电话：400-XXX-XXXX
微信：同手机号

确认后请点击下方链接完成订单提交。`,
  link: `https://example.com/order/${customerId}`,
});

const copyOrderInfo = async () => {
  const text = `${orderInfo.value.title}

${orderInfo.value.description}

订单链接：${orderInfo.value.link}`;
  
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制到剪贴板");
  } catch {
    showToast("复制失败");
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(orderInfo.value.link);
    showToast("链接已复制");
  } catch {
    showToast("复制失败");
  }
};

onMounted(async () => {
  try {
    showLoadingToast({ message: "加载中...", forbidClick: true });
    const response = await api.get(`/deregistration-businesses/${customerId}`);
    customer.value = response.data.data;
    closeToast();
  } catch {
    closeToast();
    showToast("加载失败");
  }
});
</script>

<template>
  <div class="order-container">
    <van-nav-bar title="创建订单" left-arrow @click-left="$router.back()" />

    <div class="order-content" v-if="customer">
      <van-cell-group>
        <van-cell title="企业名称" :value="customer.companyName" />
        <van-cell title="联系人" :value="customer.legalRepresentativeName || '暂无'" />
        <van-cell title="联系电话" :value="customer.legalRepresentativePhone || '暂无'" />
      </van-cell-group>

      <div class="order-text">
        <div class="text-label">订单信息</div>
        <div class="text-content">{{ orderInfo.description }}</div>
      </div>

      <div class="order-link">
        <div class="text-label">订单链接</div>
        <div class="link-content">
          <span>{{ orderInfo.link }}</span>
          <van-button size="small" type="primary" @click="copyLink">复制</van-button>
        </div>
      </div>

      <van-button type="primary" block class="copy-btn" @click="copyOrderInfo">
        一键复制全部内容
      </van-button>
    </div>

    <van-empty v-else description="加载中..." />
  </div>
</template>

<style scoped>
.order-container {
  min-height: 100vh;
  background: #f7f8fa;
}

.order-content {
  padding: 16px;
}

.order-text {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.text-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #323233;
}

.text-content {
  font-size: 14px;
  line-height: 1.8;
  color: #646566;
  white-space: pre-wrap;
}

.order-link {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.link-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.link-content span {
  font-size: 14px;
  color: #1989fa;
  flex: 1;
  word-break: break-all;
}

.copy-btn {
  margin-top: 24px;
}
</style>
