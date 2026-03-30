<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { showToast, showLoadingToast, closeToast } from "vant";
import { potentialCustomers, fetchPotentialCustomers, resetPotentialCustomers, submitContactResult } from "@/services/potential";
import api from "@/services/api";

const route = useRoute();
const activeMethod = ref("sms");
const showContactModal = ref(false);
const selectedResult = ref("");
const contactRemark = ref("");
const currentCustomerId = ref("");

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    showToast("复制失败");
  }
};

const copyTexts: Record<string, string> = {
  sms: "您好，我是XX公司的，您公司注册已满一个月，符合注销条件，如有需要可加微信XXXX详询",
  wechat: "您好，我是XX公司的，添加微信可免费咨询注销流程",
  call: "您好，请问是XX公司吗？这边是XX公司...",
};

const contactResults = [
  { value: "waiting_wechat", label: "已联系待加微信" },
  { value: "added_wechat", label: "已加微信" },
  { value: "no_contact", label: "未联系上" },
];

const handleCopyPhone = (phone: string) => {
  if (phone) {
    copyText(phone);
    showToast("手机号已复制");
  }
};

const handleCall = (phone: string) => {
  window.location.href = `tel:${phone}`;
};

const handleCopyText = () => {
  const text = copyTexts[activeMethod.value];
  if (text) {
    copyText(text);
    showToast("文案已复制");
  }
};

const handleContactComplete = (customerId: string) => {
  currentCustomerId.value = customerId;
  selectedResult.value = "";
  contactRemark.value = "";
  showContactModal.value = true;
};

const handleSubmitContact = async () => {
  console.log('handleSubmitContact called, currentCustomerId:', currentCustomerId.value, 'result:', selectedResult.value)
  if (!selectedResult.value) {
    showToast("请选择联系结果");
    return;
  }

  try {
    showLoadingToast({ message: "提交中...", forbidClick: true });
    console.log('calling submitContactResult API...')
    await submitContactResult(currentCustomerId.value, selectedResult.value, contactRemark.value);
    console.log('submitContactResult success')
    closeToast();
    showToast("提交成功");
    showContactModal.value = false;
    
    const idx = potentialCustomers.value.findIndex((c) => c.id === currentCustomerId.value);
    if (idx !== -1) {
      potentialCustomers.value.splice(idx, 1);
    }
    
    if (potentialCustomers.value.length === 0) {
      await fetchPotentialCustomers();
    }
  } catch (err) {
    console.error('submitContactResult error:', err)
    closeToast();
    showToast("提交失败");
  }
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return "暂无";
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getCurrentCustomerId = () => {
  if (currentCustomerId.value) return currentCustomerId.value;
  return potentialCustomers.value[0]?.id || "";
};

const loadCustomerById = async (customerId: string) => {
  try {
    const response = await api.get(`/deregistration-businesses/${customerId}`);
    const customer = response.data.data;
    if (customer) {
      potentialCustomers.value = [{
        id: customer.id,
        companyName: customer.companyName,
        legalRepresentativeName: customer.legalRepresentativeName,
        legalRepresentativePhone: customer.legalRepresentativePhone,
        registrationTime: customer.registrationTime,
      }];
    }
  } catch (err) {
    console.error("Failed to load customer:", err);
  }
};

onMounted(async () => {
  resetPotentialCustomers();
  
  const customerId = route.query.customerId as string;
  
  try {
    showLoadingToast({ message: "加载中...", forbidClick: true });
    
    if (customerId) {
      currentCustomerId.value = customerId;
      await loadCustomerById(customerId);
    } else {
      await fetchPotentialCustomers();
    }
    
    closeToast();
  } catch {
    closeToast();
    showToast("加载失败");
  }
});
</script>

<template>
  <div class="potential-container">
    <van-nav-bar title="拓新" left-arrow @click-left="$router.back()" />

    <div class="content">
      <van-cell-group v-if="potentialCustomers.length > 0">
        <van-cell
          v-for="customer in potentialCustomers"
          :key="customer.id"
          class="customer-cell"
        >
          <template #title>
            <div class="customer-info">
              <div class="name">{{ customer.legalRepresentativeName || "暂无姓名" }}</div>
              <div class="company">{{ customer.companyName }}</div>
              <div class="phone-row">
                <span class="phone" @click="handleCopyPhone(customer.legalRepresentativePhone || '')">
                  {{ customer.legalRepresentativePhone }}
                </span>
                <van-icon
                  name="phone-circle"
                  size="20"
                  class="call-icon"
                  @click="handleCall(customer.legalRepresentativePhone || '')"
                />
              </div>
              <div class="reg-time">注册时间：{{ formatDate(customer.registrationTime) }}</div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-empty v-else description="暂无潜在客户" />
    </div>

    <div v-if="potentialCustomers.length > 0" class="method-section">
      <van-tabs v-model:active="activeMethod">
        <van-tab title="发短信" name="sms" />
        <van-tab title="加微信" name="wechat" />
        <van-tab title="打电话" name="call" />
      </van-tabs>

      <div class="copy-text" @click="handleCopyText">
        <span>{{ copyTexts[activeMethod] }}</span>
        <van-icon name="copy" />
      </div>

      <van-button
        type="primary"
        block
        class="contact-btn"
        @click="handleContactComplete(getCurrentCustomerId())"
      >
        联系完成
      </van-button>
    </div>

    <van-popup v-model:show="showContactModal" round position="bottom">
      <div class="contact-modal">
        <div class="modal-title">联系结果</div>
        
        <van-radio-group v-model="selectedResult">
          <van-radio v-for="result in contactResults" :key="result.value" :name="result.value">
            {{ result.label }}
          </van-radio>
        </van-radio-group>

        <van-field
          v-model="contactRemark"
          type="textarea"
          placeholder="备注描述（可选）"
          rows="3"
          class="remark-field"
        />

        <van-button type="primary" block @click="handleSubmitContact">提交</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.potential-container {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 120px;
}

.content {
  padding: 16px;
}

.customer-cell {
  margin-bottom: 12px;
}

.customer-info .name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.customer-info .company {
  font-size: 14px;
  color: #646566;
  margin-bottom: 8px;
}

.customer-info .phone-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.customer-info .phone {
  color: #1989fa;
  cursor: pointer;
}

.customer-info .call-icon {
  margin-left: 12px;
  color: #07c160;
  cursor: pointer;
}

.customer-info .reg-time {
  font-size: 12px;
  color: #969799;
}

.method-section {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.copy-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  margin: 16px 0;
  font-size: 14px;
  cursor: pointer;
}

.contact-btn {
  margin-top: 8px;
}

.contact-modal {
  padding: 20px;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  text-align: center;
}

.van-radio {
  margin-bottom: 12px;
}

.remark-field {
  margin: 16px 0;
}
</style>
