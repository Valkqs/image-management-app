# 修复 setup_env.ps1 文件编码的辅助脚本
# 使用方法: .\fix_encoding.ps1

$scriptPath = Join-Path $PSScriptRoot "setup_env.ps1"

Write-Host "正在修复文件编码..." -ForegroundColor Yellow

# 读取文件内容（自动检测编码）
$content = Get-Content $scriptPath -Raw -Encoding UTF8

# 使用 UTF-8 with BOM 重新保存
$utf8WithBom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($scriptPath, $content, $utf8WithBom)

Write-Host "文件编码已修复为 UTF-8 with BOM" -ForegroundColor Green
Write-Host "现在可以运行: .\setup_env.ps1" -ForegroundColor Cyan

