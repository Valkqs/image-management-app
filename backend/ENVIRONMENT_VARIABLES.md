# 环境变量配置指南

## 📋 必需的环境变量

### 数据库配置
```powershell
# MySQL数据库用户
$env:DB_USER="root"

# MySQL数据库密码
$env:DB_PASSWORD="your_mysql_password"

# MySQL数据库主机
$env:DB_HOST="127.0.0.1"

# MySQL数据库端口
$env:DB_PORT="3306"

# MySQL数据库名称
$env:DB_NAME="image_db"
```

### JWT配置
```powershell
# JWT签名密钥（至少32个字符）
$env:JWT_SECRET="your_very_long_and_secure_jwt_secret_key_here"
```

## 🔐 JWT密钥生成

### 方法1: 使用密钥生成器
```bash
go run generate_jwt_secret.go
```

### 方法2: 手动生成
```powershell
# 生成随机字符串（32个字符）
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
Write-Host "JWT_SECRET=$secret"
```

### 方法3: 使用在线工具
访问 https://generate-secret.vercel.app/32 生成32字符的随机密钥

## ⚙️ 配置步骤

### 1. 设置所有环境变量
```powershell
# 数据库配置
$env:DB_USER="root"
$env:DB_PASSWORD="your_actual_password"
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_NAME="image_db"

# JWT配置
$env:JWT_SECRET="your_generated_jwt_secret"
```

### 2. 验证配置
```bash
go run cmd/main/main.go
```

### 3. 永久设置（可选）
如果需要永久设置环境变量，可以添加到Windows系统环境变量中：
1. 右键"此电脑" → 属性 → 高级系统设置
2. 环境变量 → 系统变量 → 新建
3. 添加每个变量名和值

## 🔍 配置检查

### 检查当前环境变量
```powershell
Get-ChildItem Env: | Where-Object {$_.Name -like "DB_*" -or $_.Name -eq "JWT_SECRET"}
```

### 测试应用程序
```bash
# 测试数据库连接
go run cmd/main/main.go

# 检查日志输出，确保没有警告信息
```

## ⚠️ 安全注意事项

### JWT密钥安全
- ✅ 使用至少32个字符的强密钥
- ✅ 定期更换JWT密钥
- ✅ 不要在代码中硬编码密钥
- ✅ 生产环境使用环境变量
- ❌ 不要使用默认密钥
- ❌ 不要将密钥提交到版本控制

### 数据库安全
- ✅ 使用强密码
- ✅ 限制数据库用户权限
- ✅ 定期备份数据库
- ✅ 使用SSL连接（生产环境）

## 🚨 常见问题

### 问题1: "JWT_SECRET must be at least 32 characters long"
**解决方案**: 确保JWT_SECRET环境变量至少32个字符

### 问题2: "⚠️ Warning: Using default JWT secret"
**解决方案**: 设置JWT_SECRET环境变量

### 问题3: 环境变量不生效
**解决方案**: 
1. 确保在同一个PowerShell会话中设置和运行
2. 重启PowerShell
3. 检查变量名拼写

## 📝 完整配置示例

```powershell
# 完整的配置脚本
Write-Host "设置环境变量..." -ForegroundColor Green

# 数据库配置
$env:DB_USER="root"
$env:DB_PASSWORD="MySecurePassword123!"
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_NAME="image_db"

# JWT配置
$env:JWT_SECRET="MyVeryLongAndSecureJWTSecretKey12345678901234567890"

Write-Host "环境变量设置完成!" -ForegroundColor Green
Write-Host "启动应用程序..." -ForegroundColor Yellow
go run cmd/main/main.go
```

## 🔄 开发vs生产环境

### 开发环境
- 可以使用较简单的密码
- 使用默认的JWT密钥（但建议设置）
- 本地数据库连接

### 生产环境
- 必须使用强密码
- 必须设置JWT_SECRET环境变量
- 使用环境变量或配置文件管理敏感信息
- 考虑使用密钥管理服务
