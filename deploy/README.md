# 部署脚本

## 部署目标

- `pc-web` - PC前端
- `mobile-web` - 移动端前端
- `backend` - 后端服务

## 服务器配置

- 服务器: 110.42.111.221
- 部署目录: /www/wwwroot/biz-cancellation

## 使用方式

### 部署所有目标

```bash
node ./deploy/deploy.mjs --target all
```

### 部署指定目标

```bash
# 只部署 PC 前端
node ./deploy/deploy.mjs --target pc-web

# 部署 PC 前端 + 后端
node ./deploy/deploy.mjs --target pc-web,backend

# 部署移动端
node ./deploy/deploy.mjs --target mobile-web
```

### 跳过构建（使用已有产物）

```bash
node ./deploy/deploy.mjs --target pc-web --skip-build
```

### 远端命令执行

```bash
node ./deploy/remote-exec.mjs --command="pm2 list"
node ./deploy/remote-exec.mjs --command="ls -la /www/wwwroot/biz-cancellation"
```

## 部署后检查

### 后端检查

```bash
node ./deploy/remote-exec.mjs --command="pm2 list"
node ./deploy/remote-exec.mjs --command="curl -s http://localhost:40361/api/health"
```

### 前端检查

访问 http://110.42.111.221/pc-web 和 http://110.42.111.221/mobile-web