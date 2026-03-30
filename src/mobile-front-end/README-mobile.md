# 移动端Vue3项目

基于Vue3 + Vant + TypeScript的注销代办管理

## 技术栈

- **Vue 3** - 渐进式JavaScript框架
- **Vant** - 轻量级移动端Vue组件库
- **TypeScript** - 类型安全的JavaScript超集
- **Vue Router** - 官方路由管理器
- **Pinia** - 新的Vue状态管理库
- **Vite** - 下一代前端构建工具
- **PostCSS** - CSS处理工具
- **postcss-px-to-viewport** - 移动端适配方案

## 项目特性

### 🎨 UI组件
- 使用Vant组件库，提供丰富的移动端组件
- 内置70+高质量组件，包括按钮、表单、弹窗等
- 支持主题定制和国际化

### 📱 移动端适配
- 自动px转vw单位，实现响应式设计
- 基于375px设计稿宽度适配
- 支持媒体查询和多种设备

### 🔧 开发体验
- TypeScript支持，提供类型检查
- ESLint代码规范检查
- 热重载开发服务器
- 组件自动导入

## 项目结构

```
mobile-front-end/
├── src/
│   ├── components/     # 公共组件
│   ├── views/         # 页面组件
│   │   ├── HomeView.vue      # 首页
│   │   ├── LoginView.vue     # 登录页
│   │   └── AboutView.vue     # 关于页
│   ├── router/        # 路由配置
│   ├── stores/        # 状态管理
│   ├── assets/        # 静态资源
│   └── main.ts        # 入口文件
├── public/            # 公共资源
├── index.html         # HTML模板
├── vite.config.ts     # Vite配置
├── tsconfig.json      # TypeScript配置
└── package.json       # 项目依赖
```

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 代码检查
```bash
npm run lint
```

## 移动端适配配置

项目使用了`postcss-px-to-viewport`插件来实现移动端适配：

- **设计稿宽度**: 375px
- **转换单位**: px → vw
- **精度**: 6位小数
- **忽略文件**: node_modules目录

## Vant组件使用

项目已全局注册Vant组件库，你可以直接在模板中使用：

```vue
<template>
  <van-button type="primary">按钮</van-button>
  <van-nav-bar title="标题" />
  <van-tabbar v-model="active">
    <van-tabbar-item icon="home-o">首页</van-tabbar-item>
  </van-tabbar>
</template>
```

## 开发指南

### 添加新页面
1. 在`src/views/`目录下创建Vue组件
2. 在`src/router/index.ts`中添加路由配置
3. 使用`<router-link>`或编程式导航跳转

### 状态管理
使用Pinia进行状态管理：

```typescript
// stores/counter.ts
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)

  const increment = () => {
    count.value++
  }

  return { count, increment }
})
```

### 移动端调试
- 使用浏览器开发者工具的设备模拟器
- 推荐使用Chrome的移动端调试模式
- 真机调试时注意网络环境

## 构建配置

### 环境变量
- `.env` - 所有环境共用
- `.env.development` - 开发环境
- `.env.production` - 生产环境

### 自定义配置
修改`vite.config.ts`来自定义构建配置，包括：
- 代理设置
- 构建输出
- CSS预处理器
- 插件配置

## 注意事项

1. **单位使用**: 直接使用px单位，构建时会自动转换为vw
2. **组件命名**: 使用PascalCase命名组件
3. **状态管理**: 优先使用组合式API和Pinia
4. **性能优化**: 合理使用懒加载和代码分割

## 浏览器支持

- iOS Safari 10+
- Android Chrome 60+
- 支持现代移动浏览器

---

🚀 享受Vue3移动端开发的乐趣！
