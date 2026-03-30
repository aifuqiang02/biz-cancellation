# 工商注销平台 (biz-cancellation)

企业工商注销一站式服务平台。

## 访问地址

| 环境 | 地址 |
|------|------|
| PC前端 | https://www.tx07.cn/biz-cancellation/ |
| 移动端 | https://m.tx07.cn/biz-cancellation/ |
| 后端API | https://api.tx07.cn/biz-cancellation/api/ |

## 技术栈

- **PC前端**：Vue 3 + Vite + TypeScript + Element Plus
- **移动端**：Vue 3 + Vite + TypeScript + Vant
- **后端**：Node.js + Express + Prisma + PostgreSQL
- **数据库**：PostgreSQL (business_deregistration)

## 项目结构

```
biz-cancellation/
├── src/
│   ├── front-end/        # PC前端
│   ├── mobile-front-end/  # 移动端H5
│   └── server/           # 后端服务
├── deploy/               # 部署脚本
├── docs/                 # 项目文档
├── designs/              # 设计稿
└── README.md
```

## 部署

### 部署脚本

```bash
# 部署所有目标
node ./deploy/deploy.mjs --target all

# 部署指定目标
node ./deploy/deploy.mjs --target pc-web          # PC前端
node ./deploy/deploy.mjs --target mobile-web      # 移动端
node ./deploy/deploy.mjs --target backend        # 后端
node ./deploy/deploy.mjs --target pc-web,backend # 组合部署

# 远端命令执行
node ./deploy/remote-exec.mjs --command="pm2 list"
```

### 服务器信息

- **服务器**：110.42.111.221
- **部署目录**：/www/wwwroot/biz-cancellation
- **后端端口**：40361
- **PM2进程名**：biz-cancellation

### 环境变量

前端环境配置在对应目录的 `.env.development` 和 `.env.production` 文件中。

后端 `.env` 文件在服务器上（被 `preserveEntries` 保留）。

## 端口规划

| 端口 | 服务 | 说明 |
|------|------|------|
| 40361 | backend | 后端API服务 |

## 数据库

- **数据库名**：business_deregistration
- **迁移状态**：已执行（2个migration）
- **数据量**：~83,000条注销业务记录

## Nginx 配置

详见服务器 `/www/server/panel/vhost/nginx/tx07.conf`

## 代码仓库

https://github.com/aifuqiang02/biz-cancellation
