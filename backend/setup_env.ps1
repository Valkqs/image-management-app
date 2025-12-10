# 数据库环境变量配置脚本
# 使用方法: .\setup_env.ps1
# 注意: 如果遇到执行策略错误，请运行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 设置控制台编码为 UTF-8，解决中文乱码问题
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# 设置错误处理
$ErrorActionPreference = "Continue"

Write-Host "=== 图像管理系统环境变量配置 ===" -ForegroundColor Green
Write-Host ""

# 检查是否在正确的目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedPath = Join-Path $PSScriptRoot "cmd\main\main.go"
if (-not (Test-Path $expectedPath)) {
    Write-Host "警告: 未找到 main.go 文件，请确保在 backend 目录下运行此脚本" -ForegroundColor Yellow
    Write-Host "当前目录: $PWD" -ForegroundColor Yellow
}

# 检查Go是否安装
Write-Host "正在检查Go环境..." -ForegroundColor Yellow
try {
    $goVersion = go version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Go版本: $goVersion" -ForegroundColor Green
    } else {
        Write-Host "警告: 无法检测Go版本，请确保Go已正确安装" -ForegroundColor Yellow
    }
} catch {
    Write-Host "错误: 未找到Go命令，请先安装Go" -ForegroundColor Red
    Write-Host "下载地址: https://golang.org/dl/" -ForegroundColor Cyan
    exit 1
}

# 检查MySQL是否运行
Write-Host ""
Write-Host "正在检查MySQL服务状态..." -ForegroundColor Yellow
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService) {
    $runningService = $mysqlService | Where-Object { $_.Status -eq "Running" }
    if ($runningService) {
        Write-Host "MySQL服务状态: 运行中" -ForegroundColor Green
    } else {
        Write-Host "MySQL服务状态: 已安装但未运行" -ForegroundColor Yellow
        Write-Host "提示: 请确保MySQL服务正在运行" -ForegroundColor Yellow
    }
} else {
    Write-Host "未找到MySQL服务，请确保MySQL已安装并运行" -ForegroundColor Yellow
    Write-Host "提示: 如果使用其他方式安装MySQL，请手动检查服务状态" -ForegroundColor Yellow
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

# 保存环境变量到文件（可选）
Write-Host ""
$saveToFile = Read-Host "是否将环境变量保存到 .env 文件? (y/n, 默认: n)"
if ($saveToFile -eq "y" -or $saveToFile -eq "Y") {
    $envFile = Join-Path $PSScriptRoot ".env"
    $envContent = @"
DB_USER=$dbUser
DB_PASSWORD=$dbPasswordPlain
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_NAME=$dbName
JWT_SECRET=$jwtSecret
"@
    $envContent | Out-File -FilePath $envFile -Encoding utf8 -NoNewline
    Write-Host "环境变量已保存到: $envFile" -ForegroundColor Green
    Write-Host "注意: .env 文件包含敏感信息，请勿提交到版本控制" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 配置完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Cyan
Write-Host ("1. 确保数据库 " + $dbName + " 已创建") -ForegroundColor White
Write-Host "2. 运行应用程序: go run ./cmd/main/main.go" -ForegroundColor White
Write-Host "3. 或者使用编译后的程序" -ForegroundColor White
Write-Host ""
Write-Host "提示: 环境变量仅在当前PowerShell会话中有效" -ForegroundColor Yellow
Write-Host "如果需要在新的会话中使用，请重新运行此脚本或手动设置环境变量" -ForegroundColor Yellow
