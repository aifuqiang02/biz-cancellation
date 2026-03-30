<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { showToast, showLoadingToast, closeToast } from "vant";
import { tasks, fetchTasksByProject, createTask, updateTask } from "@/services/tasks";
import { fetchProjects, projects } from "@/services/projects";
import type { Task } from "@/services/tasks";
import type { Project } from "@/services/projects";

// 路由和导航
const route = useRoute();

// Props
const projectId = route.params.id as string;

// 响应式数据
const newTaskTitle = ref("");
const currentProject = ref<Project | null>(null);
const activeTab = ref("active"); // 'active' 或 'completed'
const editingTask = ref<Task | null>(null);
const editTaskTitle = ref("");
const showEditDialog = ref(false);
const showAddDialog = ref(false);

// 计算属性
const projectTasks = computed(() => tasks.value.filter((task) => task.projectId === projectId));
const activeTasks = computed(() =>
  projectTasks.value.filter((task) => task.status === "pending" || task.status === "in_progress")
);
const completedTasks = computed(() =>
  projectTasks.value.filter((task) => task.status === "completed")
);

const sortedActiveTasks = computed(() => {
  return [...activeTasks.value].sort((a, b) => {
    // 首先按状态排序：进行中 > 待处理
    if (a.status !== b.status) {
      return a.status === "in_progress" ? -1 : 1;
    }
    // 然后按优先级排序
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // 最后按创建时间排序
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
});

// 获取项目信息
const getProjectInfo = () => {
  return projects.value.find((p) => p.id === projectId);
};

// 获取任务状态文本
const getTaskStatusText = (status: string) => {
  const statusMap = {
    pending: "待处理",
    in_progress: "进行中",
    completed: "已完成",
  };
  return statusMap[status as keyof typeof statusMap] || status;
};

// 获取任务状态颜色
const getTaskStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "#909399";
    case "in_progress":
      return "#1989fa";
    case "completed":
      return "#07c160";
    default:
      return "#909399";
  }
};

// 创建新任务
const handleCreateTask = async () => {
  const title = newTaskTitle.value.trim();
  if (!title) {
    showToast("请输入任务内容");
    return;
  }

  try {
    showLoadingToast({
      message: "创建中...",
      forbidClick: true,
    });

    await createTask({
      title,
      projectId,
      priority: 3, // 默认中等优先级
    });

    closeToast();
    showToast("任务创建成功");
    newTaskTitle.value = "";
    showAddDialog.value = false;
  } catch {
    closeToast();
    showToast("创建任务失败");
  }
};

// 取消新增任务
const handleCancelAdd = () => {
  showAddDialog.value = false;
  newTaskTitle.value = "";
};

// 编辑任务内容
const handleEditTask = (task: Task) => {
  editingTask.value = task;
  editTaskTitle.value = task.title;
  showEditDialog.value = true;
};

// 保存编辑后的任务
const handleSaveEdit = async () => {
  if (!editingTask.value || !editTaskTitle.value.trim()) {
    showToast("请输入任务内容");
    return;
  }

  try {
    await updateTask(editingTask.value.id, { title: editTaskTitle.value.trim() });
    showToast("任务修改成功");
    showEditDialog.value = false;
    editingTask.value = null;
    editTaskTitle.value = "";
  } catch {
    showToast("修改任务失败");
  }
};

// 取消编辑
const handleCancelEdit = () => {
  showEditDialog.value = false;
  editingTask.value = null;
  editTaskTitle.value = "";
};

// 生命周期
onMounted(async () => {
  try {
    showLoadingToast({
      message: "加载中...",
      forbidClick: true,
    });

    // 获取项目信息
    await fetchProjects();
    const projectInfo = getProjectInfo();
    currentProject.value = projectInfo || null;

    // 获取任务列表
    await fetchTasksByProject(projectId);

    closeToast();
  } catch {
    closeToast();
    showToast("加载失败");
  }
});

// 监听路由变化
watch(
  () => route.params.id,
  async (newId) => {
    if (newId && newId !== projectId) {
      try {
        await fetchTasksByProject(newId as string);
        const projectInfo = getProjectInfo();
        currentProject.value = projectInfo || null;
      } catch {
        showToast("加载任务失败");
      }
    }
  }
);
</script>

<template>
  <div class="project-tasks-container">
    <!-- 导航栏 -->
    <van-nav-bar
      :title="currentProject?.name || '项目任务'"
      left-text="返回"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 标签页 -->
    <van-tabs v-model="activeTab" sticky>
      <van-tab title="进行中" name="active">
        <!-- 新增任务按钮 -->
        <div class="add-task-section">
          <van-button type="primary" block @click="showAddDialog = true">
            <van-icon name="plus" />
            新增任务
          </van-button>
        </div>

        <!-- 任务列表 -->
        <van-cell-group v-if="sortedActiveTasks.length > 0">
          <van-cell
            v-for="task in sortedActiveTasks"
            :key="task.id"
            :title="task.title"
            :label="`优先级: ${task.priority} | ${getTaskStatusText(task.status)}`"
            clickable
            @click="handleEditTask(task)"
          >
            <template #icon>
              <van-icon
                :name="task.status === 'in_progress' ? 'pause-circle-o' : 'play-circle-o'"
                :color="getTaskStatusColor(task.status)"
              />
            </template>
            <template #right-icon>
              <van-icon name="edit" @click.stop="handleEditTask(task)" />
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 空状态 -->
        <van-empty v-else description="暂无进行中的任务" image="search" />
      </van-tab>

      <van-tab title="已完成" name="completed">
        <van-cell-group v-if="completedTasks.length > 0">
          <van-cell
            v-for="task in completedTasks"
            :key="task.id"
            :title="task.title"
            :label="`优先级: ${task.priority} | ${getTaskStatusText(task.status)}`"
            clickable
            @click="handleEditTask(task)"
          >
            <template #icon>
              <van-icon name="success" color="#07c160" />
            </template>
            <template #right-icon>
              <van-icon name="edit" @click.stop="handleEditTask(task)" />
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 空状态 -->
        <van-empty v-else description="暂无已完成的任务" image="search" />
      </van-tab>
    </van-tabs>

    <!-- 新增任务对话框 -->
    <van-dialog
      v-model:show="showAddDialog"
      title="新增任务"
      :close-on-click-overlay="false"
      show-cancel-button
      cancel-button-text="取消"
      confirm-button-text="添加"
      @confirm="handleCreateTask"
      @cancel="handleCancelAdd"
    >
      <van-field
        v-model="newTaskTitle"
        placeholder="请输入任务内容"
        type="textarea"
        :rows="3"
        :autosize="{ minHeight: 60, maxHeight: 120 }"
        @keyup.enter="handleCreateTask"
      />
    </van-dialog>

    <!-- 编辑任务对话框 -->
    <van-dialog
      v-model:show="showEditDialog"
      title="编辑任务"
      :close-on-click-overlay="false"
      show-cancel-button
      cancel-button-text="取消"
      confirm-button-text="保存"
      @confirm="handleSaveEdit"
      @cancel="handleCancelEdit"
    >
      <van-field
        v-model="editTaskTitle"
        placeholder="请输入任务内容"
        type="textarea"
        :rows="3"
        :autosize="{ minHeight: 60, maxHeight: 120 }"
        @keyup.enter="handleSaveEdit"
      />
    </van-dialog>
  </div>
</template>

<style scoped>
.project-tasks-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}

.add-task-section {
  padding: 16px;
  background-color: #fff;
  margin-bottom: 16px;
}

:deep(.van-cell) {
  padding: 12px 16px;
}

:deep(.van-cell__title) {
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

:deep(.van-cell__label) {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}

:deep(.van-tabs) {
  background-color: #fff;
}

:deep(.van-tab) {
  flex: 1;
  text-align: center;
}

/* 空状态样式 */
:deep(.van-empty) {
  padding: 40px 20px;
}
</style>
