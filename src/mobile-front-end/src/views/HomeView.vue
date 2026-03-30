<script setup lang="ts">
import { ref, onMounted } from "vue";
import { showToast, showLoadingToast, closeToast } from "vant";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchMyCustomers, myCustomers, type Customer, updateCustomerStatus } from "@/services/customers";

const activeTabBar = ref(0);
const router = useRouter();
const authStore = useAuthStore();

const showActionSheet = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const showStatusModal = ref(false);
const newStatus = ref("");

const statusOptions = [
  { value: "waiting_wechat", label: "已联系待加微信" },
  { value: "added_wechat", label: "已加微信" },
  { value: "no_contact", label: "未联系上" },
];

const handleLogout = () => {
  authStore.logout();
  showToast("已退出登录");
  router.push("/login");
};

const onTabBarChange = (index: number) => {
  activeTabBar.value = index;
  
  if (index === 1) {
    router.push("/potential");
  }
};

const handleCustomerClick = (business: Customer) => {
  selectedCustomer.value = business;
  showActionSheet.value = true;
};

const handleContactAgain = () => {
  showActionSheet.value = false;
  router.push(`/potential?customerId=${selectedCustomer.value?.id}`);
};

const handleUpdateStatus = () => {
  showActionSheet.value = false;
  newStatus.value = selectedCustomer.value?.contactResult || "";
  showStatusModal.value = true;
};

const handleCreateOrder = () => {
  showActionSheet.value = false;
  router.push(`/order/${selectedCustomer.value?.id}`);
};

const handleStatusSubmit = async () => {
  if (!selectedCustomer.value || !newStatus.value) return;
  
  try {
    showLoadingToast({ message: "更新中...", forbidClick: true });
    await updateCustomerStatus(selectedCustomer.value.id, newStatus.value);
    closeToast();
    showToast("更新成功");
    showStatusModal.value = false;
    await fetchMyCustomers();
  } catch {
    closeToast();
    showToast("更新失败");
  }
};

const getContactResultLabel = (result?: string) => {
  const map: Record<string, string> = {
    waiting_wechat: '已联系待加微信',
    added_wechat: '已加微信',
    no_contact: '未联系上',
  };
  return map[result || ''] || '未联系';
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '暂无';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

onMounted(async () => {
  if (activeTabBar.value === 0) {
    try {
      showLoadingToast({
        message: "加载客户中...",
        forbidClick: true,
      });
      await fetchMyCustomers();
      closeToast();
    } catch {
      closeToast();
      showToast("加载客户失败");
    }
  }
});
</script>

<template>
  <div class="home-container">
    <van-nav-bar title="客户管理" right-text="退出" @click-right="handleLogout" />

    <div class="tab-content">
      <div v-if="activeTabBar === 0" class="tab-pane">
        <van-cell-group v-if="myCustomers.length > 0">
          <van-cell
            v-for="business in myCustomers"
            :key="business.id"
            :title="business.companyName"
            clickable
            @click="handleCustomerClick(business)"
          >
            <template #icon>
              <van-icon name="user-o" />
            </template>
            <template #label>
              <div class="customer-label">
                <div>姓名：{{ business.legalRepresentativeName || '暂无' }}</div>
                <div>手机：{{ business.legalRepresentativePhone || '暂无' }}</div>
                <div>状态：{{ getContactResultLabel(business.contactResult) }}</div>
                <div>最后联系：{{ formatDateTime(business.contactTime) }}</div>
              </div>
            </template>
            <template #right-icon>
              <van-icon name="arrow" />
            </template>
          </van-cell>
        </van-cell-group>

        <van-empty v-else description="暂无客户" />
      </div>

      <div v-else-if="activeTabBar === 3" class="tab-pane">
        <van-cell-group>
          <van-cell title="账号设置" is-link @click="showToast('账号设置')" />
          <van-cell title="通知设置" is-link @click="showToast('通知设置')" />
          <van-cell title="隐私设置" is-link @click="showToast('隐私设置')" />
          <van-cell title="关于我们" is-link @click="showToast('关于我们')" />
          <van-cell title="版本信息" label="v1.0.0" />
        </van-cell-group>
      </div>
    </div>

    <van-tabbar v-model="activeTabBar" @change="onTabBarChange">
      <van-tabbar-item icon="user-o">客户</van-tabbar-item>
      <van-tabbar-item icon="plus">拓新</van-tabbar-item>
      <van-tabbar-item icon="book-o">学习</van-tabbar-item>
      <van-tabbar-item icon="setting-o">我的</van-tabbar-item>
    </van-tabbar>

    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="[
        { name: '再次联系', action: handleContactAgain },
        { name: '修改状态', action: handleUpdateStatus },
        { name: '创建订单', action: handleCreateOrder }
      ]"
      cancel-text="取消"
      @select="(item: any) => item.action()"
    />

    <van-popup v-model:show="showStatusModal" round position="bottom">
      <div class="status-modal">
        <div class="modal-title">修改状态</div>
        <van-radio-group v-model="newStatus">
          <van-radio v-for="opt in statusOptions" :key="opt.value" :name="opt.value">
            {{ opt.label }}
          </van-radio>
        </van-radio-group>
        <van-button type="primary" block @click="handleStatusSubmit">提交</van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.home-container {
  padding-bottom: 50px;
}

.tab-content {
  padding: 16px;
}

.tab-pane {
  min-height: 300px;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #969799;
}

.placeholder-content p {
  margin-top: 16px;
  font-size: 14px;
}

:deep(.van-tabbar-item) {
  font-size: 12px;
}

.customer-label {
  font-size: 12px;
  line-height: 1.6;
  color: #646566;
}

.status-modal {
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
</style>
