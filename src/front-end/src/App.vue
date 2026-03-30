<script setup lang="ts">
import { onMounted } from 'vue'
import { isAuthenticated } from '@/services/auth'
import { wsService } from '@/services/websocket'

onMounted(() => {
  // Initialize WebSocket connection when app starts
  console.log('App mounted')
  if (isAuthenticated.value) {
    wsService.connect()
  }
})
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
  overflow-x: hidden;
}

/* Element Plus customization */
.el-message {
  z-index: 9999;
}

.el-notification {
  z-index: 9999;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
