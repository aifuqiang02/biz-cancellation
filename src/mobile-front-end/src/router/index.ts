import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/login",
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
    },
    {
      path: "/home",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: "/projects/:id/tasks",
      name: "project-tasks",
      component: () => import("../views/ProjectTasksView.vue"),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: "/register",
      name: "register",
      component: () => import("../views/RegisterView.vue"),
    },
    {
      path: "/about",
      name: "about",
      component: () => import("../views/AboutView.vue"),
    },
    {
      path: "/potential",
      name: "potential",
      component: () => import("../views/PotentialCustomersView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/order/:id",
      name: "order",
      component: () => import("../views/OrderView.vue"),
      meta: { requiresAuth: true },
      props: true,
    },
  ],
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 如果需要认证且未登录，重定向到登录页
    next("/login");
  } else if (to.path === "/login" && authStore.isAuthenticated) {
    // 如果已登录且访问登录页，重定向到首页
    next("/home");
  } else {
    next();
  }
});

export default router;
