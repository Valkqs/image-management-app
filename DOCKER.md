# Docker 部署指南

本文档介绍如何使用 Docker 和 Docker Compose 部署图片管理系统。

## 📋 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd image-management-app
```

### 2. 配置环境变量

创建 `.env` 文件（可选，也可以直接使用环境变量）：

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件，修改相应的配置值
# 至少需要设置：
# - DB_PASSWORD: 数据库密码
# - JWT_SECRET: JWT 密钥（至少32个字符）
```

或者直接创建 `.env` 文件并设置以下变量：

```bash
# 数据库配置
DB_USER=app_user
DB_PASSWORD=your_secure_password_here
DB_NAME=image_db
DB_PORT=3306

# JWT 配置（至少32个字符）
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_here_at_least_32_characters

# AI 配置（可选）
MODELSCOPE_ACCESS_TOKEN=your-modelscope-access-token
MODELSCOPE_MODEL=Qwen/QVQ-72B-Preview
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1
MODELSCOPE_TIMEOUT=60s

# 代理配置（可选，如果需要）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看特定服务的日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### 4. 访问应用

- **前端**: http://localhost（通过 Nginx 代理，自动转发 API 请求到后端）
- **后端 API**: http://localhost:8080（直接访问，或通过前端代理）
- **MySQL**: localhost:3306

> **注意**: 在 Docker 环境中，前端通过 Nginx 代理所有 `/api/` 和 `/uploads/` 请求到后端，因此前端代码会自动使用相对路径，无需额外配置。

## 🔧 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 停止并删除数据卷（⚠️ 会删除数据库数据）
docker-compose down -v

# 重启服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 构建和更新

```bash
# 重新构建并启动
docker-compose up -d --build

# 只重新构建特定服务
docker-compose build backend
docker-compose build frontend

# 强制重新构建（不使用缓存）
docker-compose build --no-cache
```

### 查看状态

```bash
# 查看运行状态
docker-compose ps

# 查看资源使用情况
docker stats

# 查看服务日志
docker-compose logs [service_name]

# 实时查看日志
docker-compose logs -f [service_name]
```

### 数据库操作

```bash
# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -p

# 执行 SQL 脚本
docker-compose exec mysql mysql -u root -p${DB_PASSWORD} image_db < backend/database/schema.sql

# 备份数据库
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} image_db > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p${DB_PASSWORD} image_db < backup.sql
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 进入 MySQL 容器
docker-compose exec mysql sh
```

## 📁 数据持久化

### 数据卷

Docker Compose 会自动创建以下数据卷：

- `mysql_data`: MySQL 数据库数据
- `./backend/uploads`: 上传的图片文件（挂载到主机）

### 备份数据

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} image_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份上传的文件
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/uploads
```

### 恢复数据

```bash
# 恢复数据库
docker-compose exec -T mysql mysql -u root -p${DB_PASSWORD} image_db < backup.sql

# 恢复上传的文件
tar -xzf uploads_backup.tar.gz -C backend/
```

## 🔍 故障排查

### 查看服务状态

```bash
# 检查所有服务状态
docker-compose ps

# 检查特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql
```

### 常见问题

#### 1. 数据库连接失败

**问题**: 后端无法连接到 MySQL

**解决方案**:
```bash
# 检查 MySQL 是否正常运行
docker-compose ps mysql

# 检查 MySQL 日志
docker-compose logs mysql

# 确保环境变量正确
docker-compose exec backend env | grep DB_
```

#### 2. 端口冲突

**问题**: 端口已被占用

**解决方案**:
- 修改 `docker-compose.yml` 中的端口映射
- 或停止占用端口的服务

#### 3. 构建失败

**问题**: Docker 构建失败

**解决方案**:
```bash
# 清理构建缓存
docker-compose build --no-cache

# 检查 Dockerfile 语法
docker build -t test ./backend
```

#### 4. 权限问题

**问题**: 无法写入上传目录

**解决方案**:
```bash
# 确保目录权限正确
chmod -R 755 backend/uploads

# 或在 docker-compose.yml 中设置用户
```

## 🔐 安全建议

### 生产环境配置

1. **使用强密码**: 修改默认的数据库密码和 JWT 密钥
2. **限制网络访问**: 只暴露必要的端口
3. **使用 HTTPS**: 配置反向代理（如 Nginx）提供 HTTPS
4. **定期备份**: 设置自动备份脚本
5. **更新镜像**: 定期更新 Docker 镜像以获取安全补丁

### 环境变量安全

- 不要在代码中硬编码敏感信息
- 使用 `.env` 文件（不要提交到版本控制）
- 或使用 Docker secrets（Docker Swarm）或 Kubernetes secrets

## 📊 性能优化

### 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 数据库优化

```yaml
services:
  mysql:
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --innodb-buffer-pool-size=512M
      --max-connections=200
```

## 🔄 更新应用

### 更新代码

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 更新数据库结构

```bash
# 执行迁移脚本
docker-compose exec mysql mysql -u root -p${DB_PASSWORD} image_db < backend/database/schema.sql
```

## 📝 开发模式

### 使用 Docker Compose 进行开发

可以创建 `docker-compose.dev.yml` 用于开发：

```yaml
version: '3.8'

services:
  mysql:
    # ... 同生产配置

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    volumes:
      - ./backend:/app  # 挂载源代码用于热重载
    environment:
      # ... 环境变量
```

启动开发环境：

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## 🆘 获取帮助

如果遇到问题：

1. 查看日志: `docker-compose logs -f`
2. 检查服务状态: `docker-compose ps`
3. 查看文档: 阅读项目 README.md
4. 提交 Issue: 在项目仓库中提交问题

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [MySQL Docker 镜像](https://hub.docker.com/_/mysql)
- [Nginx Docker 镜像](https://hub.docker.com/_/nginx)

