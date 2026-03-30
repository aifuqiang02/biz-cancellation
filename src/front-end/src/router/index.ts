import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated, checkAuth } from '@/services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Route guard
router.beforeEach(async (to, from, next) => {
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    // Try to check auth if not already done
    if (!isAuthenticated.value) {
      const authenticated = await checkAuth()
      if (!authenticated) {
        next('/login')
        return
      }
    }
  } else {
    // If user is authenticated and trying to access login page, redirect to home
    if (isAuthenticated.value && to.name === 'Login') {
      next('/')
      return
    }
  }

  next()
})

export default router
