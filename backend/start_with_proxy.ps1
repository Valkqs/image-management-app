# Backend startup script with proxy configuration
# Usage: .\start_with_proxy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Image Management System - Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if GEMINI_API_KEY is set
if (-not $env:GEMINI_API_KEY) {
    Write-Host "WARNING: GEMINI_API_KEY is not set" -ForegroundColor Yellow
    Write-Host "  Please set: `$env:GEMINI_API_KEY='your-api-key'" -ForegroundColor Yellow
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
if (-not $env:GEMINI_TIMEOUT) {
    $env:GEMINI_TIMEOUT="120s"
    Write-Host "Setting default timeout: $env:GEMINI_TIMEOUT" -ForegroundColor Gray
}

# Set model (optional)
if (-not $env:GEMINI_MODEL) {
    $env:GEMINI_MODEL="gemini-2.5-flash"
    Write-Host "Setting default model: $env:GEMINI_MODEL" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Starting backend service..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start service
go run cmd/main/main.go

