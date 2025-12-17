# Backend startup script with proxy configuration
# Usage: .\start_with_proxy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Image Management System - Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MODELSCOPE_ACCESS_TOKEN is set
if (-not $env:MODELSCOPE_ACCESS_TOKEN) {
    Write-Host "WARNING: MODELSCOPE_ACCESS_TOKEN is not set" -ForegroundColor Yellow
    Write-Host "  Please set: `$env:MODELSCOPE_ACCESS_TOKEN='your-access-token'" -ForegroundColor Yellow
    Write-Host "  Get your token from: https://modelscope.cn/my/myaccesstoken" -ForegroundColor Yellow
    Write-Host ""
}

# Proxy configuration (modify port according to your proxy tool)
$proxyPort = "7897"  # Modify this if using different proxy tool

Write-Host "Configuring proxy..." -ForegroundColor Green
$env:HTTP_PROXY="http://127.0.0.1:$proxyPort"
$env:HTTPS_PROXY="http://127.0.0.1:$proxyPort"
Write-Host "  HTTP_PROXY: $env:HTTP_PROXY" -ForegroundColor Gray
Write-Host "  HTTPS_PROXY: $env:HTTPS_PROXY" -ForegroundColor Gray
Write-Host ""

# Set timeout (optional)
if (-not $env:MODELSCOPE_TIMEOUT) {
    if (-not $env:GEMINI_TIMEOUT) {
        $env:MODELSCOPE_TIMEOUT="120s"
        Write-Host "Setting default timeout: $env:MODELSCOPE_TIMEOUT" -ForegroundColor Gray
    } else {
        # 兼容旧的环境变量名
        $env:MODELSCOPE_TIMEOUT=$env:GEMINI_TIMEOUT
        Write-Host "Using GEMINI_TIMEOUT as MODELSCOPE_TIMEOUT: $env:MODELSCOPE_TIMEOUT" -ForegroundColor Gray
    }
}

# Set model (optional)
if (-not $env:MODELSCOPE_MODEL) {
    $env:MODELSCOPE_MODEL="Qwen/QVQ-72B-Preview"
    Write-Host "Setting default model: $env:MODELSCOPE_MODEL" -ForegroundColor Gray
}

# Set base URL (optional)
if (-not $env:MODELSCOPE_BASE_URL) {
    $env:MODELSCOPE_BASE_URL="https://api-inference.modelscope.cn/v1"
    Write-Host "Setting default base URL: $env:MODELSCOPE_BASE_URL" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Starting backend service..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start service
go run cmd/main/main.go

