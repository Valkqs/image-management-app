# 数据库脚本使用说明

## 文件说明

- `schema.sql`: 数据库建库建表脚本，包含所有表结构、索引和外键约束

## 数据库信息

- **数据库名称**: `image_db` (可在 schema.sql 中修改)
- **字符集**: `utf8mb4`
- **排序规则**: `utf8mb4_unicode_ci`
- **存储引擎**: `InnoDB`

## 表结构

### 1. users (用户表)
- 存储用户基本信息
- 字段：id, username, email, password, created_at, updated_at, deleted_at
- 唯一约束：username, email

### 2. images (图片表)
- 存储图片信息和 EXIF 数据
- 字段：id, filename, file_path, thumbnail_path, user_id, camera_make, camera_model, resolution, taken_at, latitude, longitude, created_at, updated_at, deleted_at
- 外键：user_id -> users.id

### 3. tags (标签表)
- 存储标签信息
- 字段：id, name, source, created_at, updated_at, deleted_at
- 唯一约束：name
- source 字段：'user' (用户标签) 或 'ai' (AI 生成标签)

### 4. image_tags (图片标签关联表)
- 图片和标签的多对多关系表
- 字段：image_id, tag_id
- 联合主键：(image_id, tag_id)
- 外键：image_id -> images.id, tag_id -> tags.id

## 使用方法

### 方法一：命令行执行

```bash
# 使用 MySQL 命令行客户端
mysql -u root -p < backend/database/schema.sql

# 或者指定数据库
mysql -u root -p -e "source backend/database/schema.sql"
```

### 方法二：MySQL Workbench

1. 打开 MySQL Workbench
2. 连接到 MySQL 服务器
3. 打开 `schema.sql` 文件
4. 执行脚本（点击执行按钮或按 Ctrl+Shift+Enter）

### 方法三：phpMyAdmin

1. 登录 phpMyAdmin
2. 选择 "SQL" 标签
3. 复制 `schema.sql` 的内容
4. 粘贴到 SQL 编辑框
5. 点击执行

### 方法四：在 MySQL 客户端中执行

```sql
-- 连接到 MySQL
mysql -u root -p

-- 在 MySQL 命令行中执行
source /path/to/backend/database/schema.sql;
```

## 注意事项

1. **权限要求**: 执行脚本需要 CREATE DATABASE 和 CREATE TABLE 权限
2. **数据库已存在**: 如果数据库已存在，脚本会使用 `CREATE DATABASE IF NOT EXISTS` 避免错误
3. **表已存在**: 如果表已存在，脚本会使用 `CREATE TABLE IF NOT EXISTS` 避免错误
4. **数据备份**: 在生产环境执行前，请先备份现有数据
5. **字符集**: 确保 MySQL 服务器支持 utf8mb4 字符集（MySQL 5.5.3+）

## 验证安装

执行脚本后，可以通过以下 SQL 验证：

```sql
-- 查看数据库
SHOW DATABASES LIKE 'image_db';

-- 使用数据库
USE image_db;

-- 查看所有表
SHOW TABLES;

-- 查看表结构
DESCRIBE users;
DESCRIBE images;
DESCRIBE tags;
DESCRIBE image_tags;

-- 查看索引
SHOW INDEX FROM users;
SHOW INDEX FROM images;
SHOW INDEX FROM tags;
SHOW INDEX FROM image_tags;
```

## 与 GORM AutoMigrate 的关系

项目中的 `backend/internal/database/database.go` 使用 GORM 的 `AutoMigrate` 功能自动创建表结构。这个 SQL 脚本的作用是：

1. **独立部署**: 可以在不运行 Go 应用的情况下创建数据库结构
2. **文档作用**: 清晰展示数据库结构，便于理解和维护
3. **版本控制**: 将数据库结构纳入版本控制
4. **生产环境**: 在生产环境中，通常使用 SQL 脚本而不是 AutoMigrate

## 修改数据库名称

如果需要使用不同的数据库名称，请修改 `schema.sql` 文件开头的：

```sql
CREATE DATABASE IF NOT EXISTS `your_database_name` ...
USE `your_database_name`;
```

同时，需要更新应用的环境变量 `DB_NAME` 为新的数据库名称。

