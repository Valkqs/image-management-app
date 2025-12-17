package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// AIService AI 标签分析服务
type AIService struct {
	apiKey    string
	client    *http.Client
	modelName string // 缓存模型名称
	baseURL   string // API base URL
}

// ModelScopeRequest ModelScope API 请求结构（OpenAI 兼容格式）
type ModelScopeRequest struct {
	Model    string                  `json:"model"`
	Messages []ModelScopeMessage     `json:"messages"`
	Stream   bool                    `json:"stream,omitempty"`
}

// ModelScopeMessage 消息结构
type ModelScopeMessage struct {
	Role    string                  `json:"role"`
	Content ModelScopeContent        `json:"content"` // 可以是字符串或数组
}

// ModelScopeContent 内容类型，支持字符串或数组格式
type ModelScopeContent struct {
	Items []ModelScopeContentItem
	Text  string
}

// MarshalJSON 自定义 JSON 序列化，始终序列化为数组格式（用于请求）
func (c ModelScopeContent) MarshalJSON() ([]byte, error) {
	// 如果 Items 不为空，使用 Items
	if len(c.Items) > 0 {
		return json.Marshal(c.Items)
	}
	// 如果只有 Text，转换为 Items 格式
	if c.Text != "" {
		return json.Marshal([]ModelScopeContentItem{
			{
				Type: "text",
				Text: c.Text,
			},
		})
	}
	// 空内容返回空数组
	return json.Marshal([]ModelScopeContentItem{})
}

// UnmarshalJSON 自定义 JSON 解析，支持字符串和数组两种格式
func (c *ModelScopeContent) UnmarshalJSON(data []byte) error {
	// 先尝试解析为字符串
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		c.Text = str
		c.Items = []ModelScopeContentItem{
			{
				Type: "text",
				Text: str,
			},
		}
		return nil
	}

	// 如果不是字符串，尝试解析为数组
	var items []ModelScopeContentItem
	if err := json.Unmarshal(data, &items); err == nil {
		c.Items = items
		// 提取所有文本内容
		for _, item := range items {
			if item.Type == "text" {
				c.Text += item.Text
			}
		}
		return nil
	}

	return fmt.Errorf("content must be either string or array")
}

// ModelScopeContentItem 内容项（文本或图片）
type ModelScopeContentItem struct {
	Type     string              `json:"type"` // "text" 或 "image_url"
	Text     string              `json:"text,omitempty"`
	ImageURL *ModelScopeImageURL `json:"image_url,omitempty"`
}

// ModelScopeImageURL 图片URL结构
type ModelScopeImageURL struct {
	URL string `json:"url"` // 支持 data URI 格式：data:image/jpeg;base64,{base64}
}

// ModelScopeResponse ModelScope API 响应结构（OpenAI 兼容格式）
type ModelScopeResponse struct {
	Choices []ModelScopeChoice `json:"choices"`
}

// ModelScopeChoice 选择项
type ModelScopeChoice struct {
	Message ModelScopeMessage `json:"message"`
	Delta   *ModelScopeMessage `json:"delta,omitempty"` // 用于流式响应
}

// ModelScopeStreamChunk 流式响应块
type ModelScopeStreamChunk struct {
	Choices []ModelScopeChoice `json:"choices"`
}

// NewAIService 创建新的 AI 服务实例
func NewAIService() (*AIService, error) {
	apiKey := os.Getenv("MODELSCOPE_ACCESS_TOKEN")
	if apiKey == "" {
		return nil, fmt.Errorf("MODELSCOPE_ACCESS_TOKEN environment variable is not set")
	}

	// 从环境变量获取超时时间，默认60秒
	timeoutStr := os.Getenv("MODELSCOPE_TIMEOUT")
	if timeoutStr == "" {
		timeoutStr = os.Getenv("GEMINI_TIMEOUT") // 兼容旧的环境变量名
	}
	timeout := 60 * time.Second
	if timeoutStr != "" {
		if parsedTimeout, err := time.ParseDuration(timeoutStr); err == nil {
			timeout = parsedTimeout
		}
	}

	// 创建 HTTP Transport，支持代理
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment, // 自动从环境变量读取代理设置
	}

	// 如果设置了自定义代理 URL，使用它
	proxyURL := os.Getenv("HTTP_PROXY")
	if proxyURL == "" {
		proxyURL = os.Getenv("HTTPS_PROXY")
	}
	if proxyURL == "" {
		proxyURL = os.Getenv("http_proxy")
	}
	if proxyURL == "" {
		proxyURL = os.Getenv("https_proxy")
	}
	if proxyURL != "" {
		parsedProxyURL, err := url.Parse(proxyURL)
		if err == nil {
			transport.Proxy = http.ProxyURL(parsedProxyURL)
			log.Printf("Using proxy: %s", parsedProxyURL.Host)
		} else {
			log.Printf("Invalid proxy URL %s: %v", proxyURL, err)
		}
	}

	// 获取模型名称，默认为 Qwen/QVQ-72B-Preview
	modelName := os.Getenv("MODELSCOPE_MODEL")
	if modelName == "" {
		modelName = "Qwen/QVQ-72B-Preview" // 默认使用 Qwen 视觉模型
	}
	modelName = strings.TrimSpace(modelName)

	// 获取 base URL
	baseURL := os.Getenv("MODELSCOPE_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api-inference.modelscope.cn/v1"
	}

	service := &AIService{
		apiKey:    apiKey,
		modelName: modelName,
		baseURL:   baseURL,
		client: &http.Client{
			Transport: transport,
			Timeout:   timeout,
		},
	}

	log.Printf("Initialized ModelScope AI service with model: %s", modelName)
	return service, nil
}

// AnalyzeImage 分析图片并返回标签列表
func (s *AIService) AnalyzeImage(imagePath string) ([]string, error) {
	// 读取图片文件
	imageData, err := os.ReadFile(imagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image file: %w", err)
	}

	return s.AnalyzeImageFromBytes(imageData)
}

// AnalyzeImageFromBytes 从字节数据分析图片
func (s *AIService) AnalyzeImageFromBytes(imageData []byte) ([]string, error) {
	// 检查图片大小，限制为 20MB（base64 编码后）
	maxSize := 20 * 1024 * 1024 // 20MB
	if len(imageData) > maxSize {
		log.Printf("Image too large (%d bytes), attempting to compress...", len(imageData))
		return nil, fmt.Errorf("image too large (%d bytes, max %d bytes). Please use a smaller image", len(imageData), maxSize)
	}

	// 将图片转换为 base64
	base64Image := base64.StdEncoding.EncodeToString(imageData)
	
	// 检查 base64 编码后的大小
	base64Size := len(base64Image)
	if base64Size > maxSize {
		log.Printf("Base64 encoded image too large (%d bytes)", base64Size)
		return nil, fmt.Errorf("encoded image too large (%d bytes). Please use a smaller image", base64Size)
	}
	
	log.Printf("Image size: %d bytes (original), %d bytes (base64)", len(imageData), base64Size)

	// 检测图片格式（简单检测，实际应该更准确）
	mimeType := "image/jpeg"
	if len(imageData) > 4 {
		// PNG 文件头
		if imageData[0] == 0x89 && imageData[1] == 0x50 && imageData[2] == 0x4E && imageData[3] == 0x47 {
			mimeType = "image/png"
		} else if len(imageData) > 2 && imageData[0] == 0xFF && imageData[1] == 0xD8 {
			mimeType = "image/jpeg"
		} else if len(imageData) > 4 && imageData[0] == 0x47 && imageData[1] == 0x49 && imageData[2] == 0x46 {
			mimeType = "image/gif"
		}
	}

	// 构建分析提示词
	prompt := `请分析这张图片，返回5-10个中文标签，用逗号分隔。
标签类型包括但不限于：
- 场景类型：风景、城市、室内、户外、海滩、森林、山脉等
- 内容类型：人物、动物、建筑、食物、植物、车辆、物品等
- 风格类型：现代、古典、抽象、写实、艺术、摄影等
- 情感类型：温馨、壮观、宁静、活泼、神秘、浪漫等
- 其他：颜色、季节、天气等

只返回标签，用中文逗号分隔，不要其他文字，不要编号，不要说明。
例如：风景,自然,山脉,蓝天,户外`

	// 构建 data URI 格式的图片 URL
	imageDataURI := fmt.Sprintf("data:%s;base64,%s", mimeType, base64Image)

	// 构建 ModelScope API 请求（OpenAI 兼容格式）
	request := ModelScopeRequest{
		Model: s.modelName,
		Messages: []ModelScopeMessage{
			{
				Role: "system",
				Content: ModelScopeContent{
					Items: []ModelScopeContentItem{
						{
							Type: "text",
							Text: "You are a helpful assistant. You are Qwen developed by Alibaba. You should think step-by-step.",
						},
					},
				},
			},
			{
				Role: "user",
				Content: ModelScopeContent{
					Items: []ModelScopeContentItem{
						{
							Type: "image_url",
							ImageURL: &ModelScopeImageURL{
								URL: imageDataURI,
							},
						},
						{
							Type: "text",
							Text: prompt,
						},
					},
				},
			},
		},
		Stream: false,
	}

	// 序列化请求
	requestBody, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 构建 API URL
	apiURL := fmt.Sprintf("%s/chat/completions", s.baseURL)

	// 创建 HTTP 请求，使用与 client 相同的超时时间
	timeoutStr := os.Getenv("MODELSCOPE_TIMEOUT")
	if timeoutStr == "" {
		timeoutStr = os.Getenv("GEMINI_TIMEOUT") // 兼容旧的环境变量名
	}
	timeout := 60 * time.Second
	if timeoutStr != "" {
		if parsedTimeout, err := time.ParseDuration(timeoutStr); err == nil {
			timeout = parsedTimeout
		}
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	// 发送请求
	log.Printf("Calling ModelScope API with model: %s (timeout: %v)", s.modelName, timeout)
	startTime := time.Now()
	resp, err := s.client.Do(req)
	duration := time.Since(startTime)
	
	if err != nil {
		log.Printf("Failed to call ModelScope API after %v: %v", duration, err)
		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("request timeout after %v. The image may be too large or network is slow. Try using a smaller image or increase MODELSCOPE_TIMEOUT", timeout)
		}
		return nil, fmt.Errorf("failed to call ModelScope API (network error): %w", err)
	}
	log.Printf("ModelScope API responded in %v", duration)
	defer resp.Body.Close()

	// 读取响应
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 检查 HTTP 状态码
	if resp.StatusCode != http.StatusOK {
		log.Printf("ModelScope API error - Status: %s, Body: %s", resp.Status, string(responseBody))
		return nil, handleModelScopeError(resp.StatusCode, responseBody, s.modelName)
	}

	// 解析响应
	var modelScopeResp ModelScopeResponse
	if err := json.Unmarshal(responseBody, &modelScopeResp); err != nil {
		log.Printf("Failed to unmarshal ModelScope response: %v, body: %s", err, string(responseBody))
		return nil, fmt.Errorf("failed to parse ModelScope API response: %w", err)
	}

	// 提取文本内容
	if len(modelScopeResp.Choices) == 0 {
		log.Printf("No choices in ModelScope response: %s", string(responseBody))
		return nil, fmt.Errorf("no choices in ModelScope response")
	}

	// 获取内容（可能是字符串或数组格式）
	content := ""
	if modelScopeResp.Choices[0].Message.Content.Text != "" {
		// 字符串格式
		content = modelScopeResp.Choices[0].Message.Content.Text
	} else if len(modelScopeResp.Choices[0].Message.Content.Items) > 0 {
		// 数组格式
		for _, item := range modelScopeResp.Choices[0].Message.Content.Items {
			if item.Type == "text" {
				content += item.Text
			}
		}
	}

	content = strings.TrimSpace(content)
	
	if content == "" {
		log.Printf("No content in ModelScope response: %s", string(responseBody))
		return nil, fmt.Errorf("no content in ModelScope response")
	}
	
	if content == "" {
		log.Printf("Empty text in ModelScope response: %s", string(responseBody))
		return nil, fmt.Errorf("empty text content from ModelScope API")
	}

	// 解析返回的标签
	tags := parseTags(content)

	if len(tags) == 0 {
		return nil, fmt.Errorf("no tags extracted from response: %s", content)
	}

	log.Printf("AI analysis completed, extracted %d tags: %v", len(tags), tags)
	return tags, nil
}

// parseTags 解析标签字符串
func parseTags(content string) []string {
	// 移除可能的标点符号和空白
	content = strings.TrimSpace(content)
	content = strings.Trim(content, "，。、；：！？")
	
	// 按逗号或中文逗号分割
	tags := strings.FieldsFunc(content, func(r rune) bool {
		return r == ',' || r == '，' || r == ';' || r == '；'
	})

	// 清理每个标签
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		tag = strings.Trim(tag, "，。、；：！？")
		// 移除可能的编号（如 "1. 标签"）
		if idx := strings.Index(tag, "."); idx > 0 && idx < 3 {
			tag = strings.TrimSpace(tag[idx+1:])
		}
		// 移除可能的括号内容
		if idx := strings.Index(tag, "（"); idx > 0 {
			tag = tag[:idx]
		}
		if idx := strings.Index(tag, "("); idx > 0 {
			tag = tag[:idx]
		}
		tag = strings.TrimSpace(tag)
		
		// 只保留非空标签
		if tag != "" && len(tag) <= 50 { // 限制标签长度
			result = append(result, tag)
		}
	}

	return result
}

// handleModelScopeError 处理 ModelScope API 错误响应，返回友好的错误信息
func handleModelScopeError(statusCode int, responseBody []byte, modelName string) error {
	// 尝试解析错误响应
	var errorResp struct {
		Errors struct {
			Message   string `json:"message"`
			RequestID string `json:"request_id"`
		} `json:"errors"`
		Error struct {
			Message string `json:"message"`
			Type    string `json:"type"`
		} `json:"error"`
	}
	
	errorMessage := ""
	if err := json.Unmarshal(responseBody, &errorResp); err == nil {
		if errorResp.Errors.Message != "" {
			errorMessage = errorResp.Errors.Message
		} else if errorResp.Error.Message != "" {
			errorMessage = errorResp.Error.Message
		}
	}
	
	// 根据状态码提供更友好的错误信息
	switch statusCode {
	case http.StatusUnauthorized:
		if errorMessage != "" {
			if strings.Contains(errorMessage, "bind your Alibaba Cloud account") || 
			   strings.Contains(errorMessage, "绑定") ||
			   strings.Contains(errorMessage, "实名认证") {
				return fmt.Errorf("认证失败：%s\n\n解决方案：\n1. 访问 https://modelscope.cn 登录账号\n2. 绑定阿里云账号\n3. 完成实名认证\n4. 重新获取 Access Token：https://modelscope.cn/my/myaccesstoken", errorMessage)
			}
			return fmt.Errorf("认证失败 (401)：%s\n\n请检查 MODELSCOPE_ACCESS_TOKEN 是否正确，或访问 https://modelscope.cn/my/myaccesstoken 重新获取", errorMessage)
		}
		return fmt.Errorf("认证失败 (401)：请检查 MODELSCOPE_ACCESS_TOKEN 是否正确，或访问 https://modelscope.cn/my/myaccesstoken 重新获取。响应：%s", string(responseBody))
	case http.StatusForbidden:
		return fmt.Errorf("访问被拒绝 (403)：%s。请确认账号已完成实名认证并绑定了阿里云账号", errorMessage)
	case http.StatusBadRequest:
		return fmt.Errorf("请求错误 (400)：%s", errorMessage)
	case http.StatusNotFound:
		return fmt.Errorf("模型未找到 (404)：请检查 MODELSCOPE_MODEL 环境变量，当前模型：%s", modelName)
	default:
		if errorMessage != "" {
			return fmt.Errorf("ModelScope API 错误 (status %d)：%s", statusCode, errorMessage)
		}
		return fmt.Errorf("ModelScope API 返回错误 (status %d)：%s", statusCode, string(responseBody))
	}
}

// detectAvailableModel 检测可用的模型（已废弃，ModelScope 不需要检测）
// 保留此函数以保持接口兼容性，但不再使用
func (s *AIService) detectAvailableModel() (string, error) {
	// ModelScope 不需要检测模型，直接返回默认值
	return "Qwen/QVQ-72B-Preview", nil
}

// IsAvailable 检查 AI 服务是否可用
func (s *AIService) IsAvailable() bool {
	return s.apiKey != "" && s.client != nil
}

// QueryCondition 查询条件结构
type QueryCondition struct {
	Tags      []string `json:"tags"`      // 标签列表
	Month     string   `json:"month"`     // 月份，格式：2025-01
	Camera    string   `json:"camera"`    // 相机制造商
	Keywords  []string `json:"keywords"`  // 关键词（用于模糊匹配）
	Reasoning string   `json:"reasoning"` // AI的推理过程
}

// ParseNaturalLanguageQuery 将自然语言查询转换为结构化查询条件
// 如果遇到错误，会自动尝试使用备用模型重试
func (s *AIService) ParseNaturalLanguageQuery(userQuery string, availableTags []string) (*QueryCondition, error) {
	condition, err := s.parseNaturalLanguageQueryWithModel(userQuery, availableTags, s.modelName)
	if err != nil {
		// 如果是网络错误或EOF错误，尝试使用备用模型
		isNetworkError := strings.Contains(err.Error(), "EOF") || 
			strings.Contains(err.Error(), "connection") ||
			strings.Contains(err.Error(), "timeout")
		
		if isNetworkError {
			log.Printf("Primary model '%s' failed with error: %v, trying fallback models...", s.modelName, err)
			fallbackModels := []string{"Qwen/Qwen2.5-7B-Instruct", "Qwen/Qwen2.5-Coder-32B-Instruct", "Qwen/Qwen2.5-14B-Instruct"}
			for _, fallbackModel := range fallbackModels {
				if fallbackModel == s.modelName {
					continue // 跳过当前已失败的模型
				}
				log.Printf("Trying fallback model: %s", fallbackModel)
				condition, retryErr := s.parseNaturalLanguageQueryWithModel(userQuery, availableTags, fallbackModel)
				if retryErr == nil {
					log.Printf("Successfully used fallback model: %s", fallbackModel)
					return condition, nil
				}
				log.Printf("Fallback model %s also failed: %v", fallbackModel, retryErr)
			}
		}
	}
	return condition, err
}

// parseNaturalLanguageQueryWithModel 使用指定模型解析自然语言查询
func (s *AIService) parseNaturalLanguageQueryWithModel(userQuery string, availableTags []string, modelName string) (*QueryCondition, error) {
	// 构建提示词，包含可用的标签信息
	tagsInfo := ""
	if len(availableTags) > 0 {
		tagsInfo = fmt.Sprintf("\n可用的标签列表：%s", strings.Join(availableTags, "、"))
	} else {
		tagsInfo = "\n当前没有可用的标签。"
	}

	prompt := fmt.Sprintf(`你是一个图片检索助手。用户会用自然语言描述他们想要查找的图片，你需要将用户的查询转换为结构化的查询条件。

用户查询：%s
%s

重要规则：
- 标签（tags）字段：必须严格从上面的"可用标签列表"中选择，完全匹配标签名称。如果用户查询的内容在可用标签列表中没有完全匹配的标签，则返回最符合的一个标签。绝对不要创建新的标签名称，不要使用相似但不完全相同的标签。
- 如果可用标签列表为空，tags 字段必须返回空数组 []。

请根据用户的查询，提取以下信息：
1. 标签（tags）：从"可用标签列表"中选择完全匹配的标签名称，如果没有匹配的标签则返回空数组 []
2. 月份（month）：如果用户提到了时间（如"上个月"、"2025年1月"、"去年10月"等），转换为格式 "YYYY-MM"，否则返回空字符串 ""
3. 相机制造商（camera）：如果用户提到了相机品牌（如"Canon"、"Nikon"、"iPhone"等），提取品牌名称，否则返回空字符串 ""
4. 关键词（keywords）：提取查询中的其他关键词（如"风景"、"人物"、"夜景"等），用于后续搜索，返回字符串数组
5. 推理过程（reasoning）：简要说明你是如何理解用户查询的，以及为什么选择了这些标签

请以JSON格式返回，格式如下：
{
  "tags": ["标签1", "标签2"],
  "month": "2025-01",
  "camera": "Canon",
  "keywords": ["关键词1", "关键词2"],
  "reasoning": "你的推理过程"
}

只返回JSON，不要其他文字，不要使用markdown代码块。`, userQuery, tagsInfo)

	// 使用传入的模型名称，如果没有则使用默认值
	if modelName == "" {
		modelName = s.modelName
		if modelName == "" {
			modelName = os.Getenv("MODELSCOPE_MODEL")
			if modelName == "" {
				modelName = "Qwen/Qwen2.5-7B-Instruct" // 默认使用文本模型
			}
		}
	}
	
	// 验证模型名称
	modelName = strings.TrimSpace(modelName)
	
	log.Printf("Using model: %s for query parsing", modelName)

	// 构建 ModelScope API 请求（OpenAI 兼容格式）
	request := ModelScopeRequest{
		Model: modelName,
		Messages: []ModelScopeMessage{
			{
				Role: "system",
				Content: ModelScopeContent{
					Items: []ModelScopeContentItem{
						{
							Type: "text",
							Text: "You are a helpful assistant. You are Qwen developed by Alibaba.",
						},
					},
				},
			},
			{
				Role: "user",
				Content: ModelScopeContent{
					Items: []ModelScopeContentItem{
						{
							Type: "text",
							Text: prompt,
						},
					},
				},
			},
		},
		Stream: false,
	}

	// 序列化请求
	requestBody, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 构建 API URL
	apiURL := fmt.Sprintf("%s/chat/completions", s.baseURL)

	// 创建 HTTP 请求
	timeoutStr := os.Getenv("MODELSCOPE_TIMEOUT")
	if timeoutStr == "" {
		timeoutStr = os.Getenv("GEMINI_TIMEOUT") // 兼容旧的环境变量名
	}
	timeout := 60 * time.Second
	if timeoutStr != "" {
		if parsedTimeout, err := time.ParseDuration(timeoutStr); err == nil {
			timeout = parsedTimeout
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", apiURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))

	// 发送请求
	log.Printf("Calling ModelScope API for query parsing (timeout: %v)", timeout)
	startTime := time.Now()
	resp, err := s.client.Do(req)
	duration := time.Since(startTime)

	if err != nil {
		log.Printf("Failed to call ModelScope API after %v: %v", duration, err)
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("request timeout after %v. The request may be too large or network is slow. Try increasing MODELSCOPE_TIMEOUT", timeout)
		}
		// EOF 错误通常表示连接被关闭，可能是网络问题或代理配置问题
		if strings.Contains(err.Error(), "EOF") {
			return nil, fmt.Errorf("connection closed unexpectedly (EOF) when calling model '%s'. This may be caused by: 1) Network connectivity issues, 2) Proxy configuration problems, 3) API rate limiting. Please check your network and proxy settings. Error: %w", modelName, err)
		}
		return nil, fmt.Errorf("failed to call ModelScope API: %w", err)
	}
	log.Printf("ModelScope API responded in %v", duration)
	defer resp.Body.Close()

	// 读取响应
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 检查 HTTP 状态码
	if resp.StatusCode != http.StatusOK {
		log.Printf("ModelScope API error - Status: %s, Body: %s", resp.Status, string(responseBody))
		return nil, handleModelScopeError(resp.StatusCode, responseBody, modelName)
	}

	// 解析响应
	var modelScopeResp ModelScopeResponse
	if err := json.Unmarshal(responseBody, &modelScopeResp); err != nil {
		log.Printf("Failed to unmarshal ModelScope response: %v, body: %s", err, string(responseBody))
		return nil, fmt.Errorf("failed to parse ModelScope API response: %w", err)
	}

	// 提取文本内容
	if len(modelScopeResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in ModelScope response")
	}

	// 获取内容（可能是字符串或数组格式）
	content := ""
	if modelScopeResp.Choices[0].Message.Content.Text != "" {
		// 字符串格式
		content = modelScopeResp.Choices[0].Message.Content.Text
	} else if len(modelScopeResp.Choices[0].Message.Content.Items) > 0 {
		// 数组格式
		for _, item := range modelScopeResp.Choices[0].Message.Content.Items {
			if item.Type == "text" {
				content += item.Text
			}
		}
	}

	content = strings.TrimSpace(content)
	
	if content == "" {
		return nil, fmt.Errorf("empty text content from ModelScope API")
	}

	// 尝试提取JSON（可能包含markdown代码块）
	jsonContent := content
	
	// 处理 ```json 代码块
	if strings.Contains(jsonContent, "```json") {
		start := strings.Index(jsonContent, "```json")
		// 从 ```json 之后开始查找结束的 ```
		afterStart := jsonContent[start+7:]
		end := strings.Index(afterStart, "```")
		if end > 0 {
			jsonContent = afterStart[:end]
			jsonContent = strings.TrimSpace(jsonContent)
		}
	} else if strings.Contains(jsonContent, "```") {
		// 处理普通的 ``` 代码块
		start := strings.Index(jsonContent, "```")
		// 跳过开始的 ```，查找结束的 ```
		afterStart := jsonContent[start+3:]
		end := strings.Index(afterStart, "```")
		if end > 0 {
			jsonContent = afterStart[:end]
			jsonContent = strings.TrimSpace(jsonContent)
			// 移除可能的语言标识符（如 "json\n"）
			jsonContent = strings.TrimPrefix(jsonContent, "json")
			jsonContent = strings.TrimSpace(jsonContent)
		}
	}
	
	// 如果仍然包含代码块标记，尝试更激进的清理
	if strings.Contains(jsonContent, "```") {
		// 移除所有剩余的代码块标记
		jsonContent = strings.ReplaceAll(jsonContent, "```", "")
		jsonContent = strings.TrimSpace(jsonContent)
	}

	// 解析JSON
	var condition QueryCondition
	if err := json.Unmarshal([]byte(jsonContent), &condition); err != nil {
		log.Printf("Failed to parse query condition JSON: %v, content: %s", err, jsonContent)
		return nil, fmt.Errorf("failed to parse query condition: %w", err)
	}

	// 验证标签是否存在于可用标签列表中
	if len(availableTags) > 0 && len(condition.Tags) > 0 {
		// 创建可用标签的映射（用于快速查找）
		availableTagsMap := make(map[string]bool)
		for _, tag := range availableTags {
			availableTagsMap[tag] = true
		}
		
		// 过滤掉不存在的标签
		validTags := make([]string, 0)
		invalidTags := make([]string, 0)
		for _, tag := range condition.Tags {
			if availableTagsMap[tag] {
				validTags = append(validTags, tag)
			} else {
				invalidTags = append(invalidTags, tag)
			}
		}
		
		if len(invalidTags) > 0 {
			log.Printf("Warning: AI returned invalid tags that don't exist in available tags: %v. Available tags: %v", invalidTags, availableTags)
		}
		
		condition.Tags = validTags
	} else if len(availableTags) == 0 {
		// 如果没有可用标签，清空tags
		if len(condition.Tags) > 0 {
			log.Printf("Warning: AI returned tags but no tags are available. Clearing tags.")
			condition.Tags = []string{}
		}
	}

	log.Printf("Parsed query condition: tags=%v, month=%s, camera=%s, keywords=%v", 
		condition.Tags, condition.Month, condition.Camera, condition.Keywords)

	return &condition, nil
}

