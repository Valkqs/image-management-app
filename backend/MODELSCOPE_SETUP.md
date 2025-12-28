# ModelScope API 配置指南

## 概述

本项目已从 Google Gemini API 迁移到 ModelScope（魔搭）视觉模型 API。ModelScope 提供免费的开源模型服务，通过 API-Inference 接口进行标准化调用。

## 前提条件

1. **注册 ModelScope 账号**
   - 访问 https://modelscope.cn 注册账号

2. **绑定阿里云账号并实名认证**
   - 账号注册后需绑定阿里云账号
   - 通过实名认证后才可使用 API-Inference
   - 这是使用 API 的必需步骤

3. **获取 Access Token**
   - 登录后访问：https://modelscope.cn/my/myaccesstoken
   - 复制您的 Access Token

## 环境变量配置

### 必需配置

```powershell
# ModelScope Access Token
$env:MODELSCOPE_ACCESS_TOKEN="ms-26412519-1418-43c7-bccd-3ba6fec926ca"
```

### 可选配置

```powershell
# 模型名称（默认为 Qwen/QVQ-72B-Preview）
# 视觉模型推荐：
#   - Qwen/QVQ-72B-Preview（视觉模型，支持图片分析，推荐）
#   - Qwen/Qwen-VL-Max（视觉模型）
# 文本模型（用于自然语言查询解析）：
#   - Qwen/Qwen2.5-7B-Instruct（文本模型，用于查询解析）
$env:MODELSCOPE_MODEL="Qwen/QVQ-72B-Preview"

# API Base URL（默认为 https://api-inference.modelscope.cn/v1）
$env:MODELSCOPE_BASE_URL="https://api-inference.modelscope.cn/v1"

# 请求超时时间（默认为 60s）
$env:MODELSCOPE_TIMEOUT="60s"

# HTTP/HTTPS 代理（如果需要）
$env:HTTP_PROXY="http://127.0.0.1:7890"
$env:HTTPS_PROXY="http://127.0.0.1:7890"
```

## 快速开始

### 1. 设置环境变量

```powershell
# 在 PowerShell 中设置
$env:MODELSCOPE_ACCESS_TOKEN="your-token-here"
$env:MODELSCOPE_MODEL="Qwen/QVQ-72B-Preview"
```

### 2. 测试连接

```powershell
# 运行测试脚本
go run cmd/test_models/main.go
```

如果看到 "✅ API connection successful!" 表示配置成功。

### 3. 启动服务

```powershell
# 使用启动脚本（包含代理配置）
.\start_with_proxy.ps1

# 或直接运行
go run cmd/main/main.go
```

## API 使用说明

### 视觉模型（图片分析）

项目使用视觉模型进行图片标签分析，默认模型为 `Qwen/QVQ-72B-Preview`。

**支持的模型：**
- `Qwen/QVQ-72B-Preview` - 推荐，支持图片分析
- `Qwen/Qwen-VL-Max` - 视觉模型

### 文本模型（自然语言查询）

项目使用文本模型进行自然语言查询解析，默认使用 `Qwen/Qwen2.5-7B-Instruct`。

**支持的模型：**
- `Qwen/Qwen2.5-7B-Instruct` - 文本模型，用于查询解析
- `Qwen/Qwen2.5-Coder-32B-Instruct` - 代码模型

## 功能说明

### 1. 图片标签分析

上传图片后，系统会自动调用 ModelScope 视觉模型分析图片内容，生成 5-10 个中文标签。

**API 端点：** `POST /api/images/:id/analyze`

### 2. 自然语言查询

使用自然语言描述查找图片，系统会将查询转换为结构化的搜索条件。

**API 端点：** `POST /api/mcp/query`

**示例查询：**
- "上个月拍的风景照片"
- "Canon 相机拍摄的夜景"
- "包含人物的室内照片"

## 兼容性说明

为了平滑迁移，代码中保留了对旧环境变量名的兼容：

- `GEMINI_TIMEOUT` → `MODELSCOPE_TIMEOUT`（自动兼容）
- 其他 Gemini 相关环境变量已移除

## 常见问题

### 1. "MODELSCOPE_ACCESS_TOKEN environment variable is not set"

**解决方案：** 设置 `MODELSCOPE_ACCESS_TOKEN` 环境变量

### 2. "API returned error (status 401)"

**可能原因：**
- Access Token 无效或过期
- 账号未完成实名认证
- 账号未绑定阿里云账号

**解决方案：**
1. 检查 Access Token 是否正确
2. 确认已完成实名认证
3. 重新获取 Access Token

### 3. "request timeout"

**解决方案：**
- 增加超时时间：`$env:MODELSCOPE_TIMEOUT="120s"`
- 检查网络连接
- 检查代理设置

### 4. 图片太大导致错误

**解决方案：**
- 图片大小限制为 20MB（base64 编码后）
- 使用较小的图片或压缩图片

## 更多信息

- ModelScope 官网：https://modelscope.cn
- API 文档：参考项目根目录的 `api.md` 文件
- 获取 Access Token：https://modelscope.cn/my/myaccesstoken

## 迁移说明

如果您之前使用 Gemini API，需要：

1. 注册 ModelScope 账号并完成实名认证
2. 获取 Access Token
3. 将环境变量从 `GEMINI_API_KEY` 改为 `MODELSCOPE_ACCESS_TOKEN`
4. 可选：设置 `MODELSCOPE_MODEL` 环境变量（默认为 `Qwen/QVQ-72B-Preview`）

其他配置保持不变（数据库、JWT 等）。

