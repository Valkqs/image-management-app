# 数据库环境变量配置脚本
# 使用方法: .\setup_env.ps1

Write-Host "=== 图像管理系统环境变量配置 ===" -ForegroundColor Green
Write-Host ""

# 检查MySQL是否运行
Write-Host "正在检查MySQL服务状态..." -ForegroundColor Yellow
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService) {
    Write-Host "MySQL服务状态: $($mysqlService.Status)" -ForegroundColor Green
} else {
    Write-Host "未找到MySQL服务，请确保MySQL已安装并运行" -ForegroundColor Red
}

Write-Host ""
Write-Host "请输入您的MySQL数据库配置信息:" -ForegroundColor Cyan

# 获取用户输入
$dbUser = Read-Host "数据库用户名 (默认: root)"
if ([string]::IsNullOrEmpty($dbUser)) { $dbUser = "root" }

$dbPassword = Read-Host "数据库密码" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

$dbHost = Read-Host "数据库主机 (默认: 127.0.0.1)"
if ([string]::IsNullOrEmpty($dbHost)) { $dbHost = "127.0.0.1" }

$dbPort = Read-Host "数据库端口 (默认: 3306)"
if ([string]::IsNullOrEmpty($dbPort)) { $dbPort = "3306" }

$dbName = Read-Host "数据库名称 (默认: image_db)"
if ([string]::IsNullOrEmpty($dbName)) { $dbName = "image_db" }

# 生成JWT密钥
Write-Host ""
Write-Host "正在生成JWT密钥..." -ForegroundColor Yellow
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# 设置环境变量
Write-Host ""
Write-Host "正在设置环境变量..." -ForegroundColor Yellow

$env:DB_USER = $dbUser
$env:DB_PASSWORD = $dbPasswordPlain
$env:DB_HOST = $dbHost
$env:DB_PORT = $dbPort
$env:DB_NAME = $dbName
$env:JWT_SECRET = $jwtSecret

Write-Host ""
Write-Host "=== 环境变量设置完成 ===" -ForegroundColor Green
Write-Host "DB_USER: $env:DB_USER" -ForegroundColor Cyan
Write-Host "DB_HOST: $env:DB_HOST" -ForegroundColor Cyan
Write-Host "DB_PORT: $env:DB_PORT" -ForegroundColor Cyan
Write-Host "DB_NAME: $env:DB_NAME" -ForegroundColor Cyan
Write-Host "JWT_SECRET: $($env:JWT_SECRET.Substring(0,8))..." -ForegroundColor Cyan
Write-Host ""

# 测试数据库连接
Write-Host "正在测试数据库连接..." -ForegroundColor Yellow
try {
    go run ./cmd/main/main.go
} catch {
    Write-Host "数据库连接测试失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. MySQL服务是否正在运行" -ForegroundColor White
    Write-Host "2. 数据库用户名和密码是否正确" -ForegroundColor White
    Write-Host "3. 数据库 'image_db' 是否存在" -ForegroundColor White
    Write-Host ""
    Write-Host "如果数据库不存在，请先创建:" -ForegroundColor Yellow
    Write-Host "CREATE DATABASE image_db;" -ForegroundColor Cyan
}
