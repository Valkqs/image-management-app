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
	apiKey   string
	client   *http.Client
	modelName string // 缓存模型名称
}

// ModelInfo 模型信息
type ModelInfo struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"displayName"`
	Description string   `json:"description"`
	SupportedMethods []string `json:"supportedGenerationMethods"`
}

// GeminiRequest Gemini API 请求结构
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

// GeminiContent 内容结构
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

// GeminiPart 部分内容
type GeminiPart struct {
	Text string        `json:"text,omitempty"`
	InlineData *GeminiInlineData `json:"inlineData,omitempty"`
}

// GeminiInlineData 内联数据（图片）
type GeminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

// GeminiResponse Gemini API 响应结构
type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

// GeminiCandidate 候选响应
type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}

// NewAIService 创建新的 AI 服务实例
func NewAIService() (*AIService, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY environment variable is not set")
	}

	// 从环境变量获取超时时间，默认60秒
	timeoutStr := os.Getenv("GEMINI_TIMEOUT")
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

	service := &AIService{
		apiKey: apiKey,
		client: &http.Client{
			Transport: transport,
			Timeout:   timeout,
		},
	}

	// 尝试检测可用的模型
	modelName := os.Getenv("GEMINI_MODEL")
	if modelName == "" {
		// 自动检测可用的模型
		detectedModel, err := service.detectAvailableModel()
		if err != nil {
			log.Printf("Failed to detect available model, using default: %v", err)
			modelName = "gemini-pro" // 默认模型
		} else {
			modelName = detectedModel
			log.Printf("Auto-detected available model: %s", modelName)
		}
	}
	service.modelName = modelName

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
	// 检查图片大小，Gemini API 限制为 20MB（base64 编码后）
	// 如果图片太大，需要压缩
	maxSize := 20 * 1024 * 1024 // 20MB
	if len(imageData) > maxSize {
		log.Printf("Image too large (%d bytes), attempting to compress...", len(imageData))
		// 尝试压缩图片（简单实现：如果超过限制，记录警告）
		// 实际应用中可以使用图片压缩库
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

	// 构建 Gemini API 请求
	request := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{
						Text: prompt,
					},
					{
						InlineData: &GeminiInlineData{
							MimeType: mimeType,
							Data:     base64Image,
						},
					},
				},
			},
		},
	}

	// 序列化请求
	requestBody, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 使用缓存的模型名称（在服务初始化时已检测）
	modelName := s.modelName
	if modelName == "" {
		// 如果缓存为空，尝试从环境变量获取
		modelName = os.Getenv("GEMINI_MODEL")
		if modelName == "" {
			modelName = "gemini-pro" // 最后的默认值
		}
	}
	
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", 
		modelName, s.apiKey)

	// 创建 HTTP 请求，使用与 client 相同的超时时间
	timeoutStr := os.Getenv("GEMINI_TIMEOUT")
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

	// 发送请求
	log.Printf("Calling Gemini API with model: %s (timeout: %v)", modelName, timeout)
	startTime := time.Now()
	resp, err := s.client.Do(req)
	duration := time.Since(startTime)
	
	if err != nil {
		log.Printf("Failed to call Gemini API after %v: %v", duration, err)
		// 检查是否是超时错误
		if ctx.Err() == context.DeadlineExceeded {
			return nil, fmt.Errorf("request timeout after %v. The image may be too large or network is slow. Try using a smaller image or increase GEMINI_TIMEOUT", timeout)
		}
		return nil, fmt.Errorf("failed to call Gemini API (network error): %w", err)
	}
	log.Printf("Gemini API responded in %v", duration)
	defer resp.Body.Close()

	// 读取响应
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// 检查 HTTP 状态码
	if resp.StatusCode != http.StatusOK {
		log.Printf("Gemini API error - Status: %s, Body: %s", resp.Status, string(responseBody))
		return nil, fmt.Errorf("Gemini API returned error (status %d): %s", resp.StatusCode, string(responseBody))
	}

	// 解析响应
	var geminiResp GeminiResponse
	if err := json.Unmarshal(responseBody, &geminiResp); err != nil {
		log.Printf("Failed to unmarshal Gemini response: %v, body: %s", err, string(responseBody))
		return nil, fmt.Errorf("failed to parse Gemini API response: %w", err)
	}

	// 提取文本内容
	if len(geminiResp.Candidates) == 0 {
		log.Printf("No candidates in Gemini response: %s", string(responseBody))
		return nil, fmt.Errorf("no candidates in Gemini response")
	}

	if len(geminiResp.Candidates[0].Content.Parts) == 0 {
		log.Printf("No parts in Gemini response: %s", string(responseBody))
		return nil, fmt.Errorf("no content parts in Gemini response")
	}

	content := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	if content == "" {
		log.Printf("Empty text in Gemini response: %s", string(responseBody))
		return nil, fmt.Errorf("empty text content from Gemini API")
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

// detectAvailableModel 检测可用的模型
func (s *AIService) detectAvailableModel() (string, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", s.apiKey)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to list models: %s", string(body))
	}

	var result struct {
		Models []ModelInfo `json:"models"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// 优先选择的模型列表（按优先级排序）
	preferredModels := []string{
		"gemini-1.5-pro",
		"gemini-1.5-flash", 
		"gemini-pro-vision",
		"gemini-pro",
	}

	// 创建模型名称映射（去掉 models/ 前缀）
	modelMap := make(map[string]string)
	for _, model := range result.Models {
		shortName := model.Name
		if len(shortName) > 8 && shortName[:8] == "models/" {
			shortName = shortName[8:]
		}
		
		// 检查是否支持 generateContent
		for _, method := range model.SupportedMethods {
			if method == "generateContent" {
				modelMap[shortName] = model.Name
				break
			}
		}
	}

	// 查找第一个可用的优先模型
	for _, preferred := range preferredModels {
		if fullName, exists := modelMap[preferred]; exists {
			log.Printf("Found available model: %s (full name: %s)", preferred, fullName)
			return preferred, nil
		}
	}

	// 如果没有找到优先模型，返回第一个支持 generateContent 的模型
	for shortName, fullName := range modelMap {
		log.Printf("Using first available model: %s (full name: %s)", shortName, fullName)
		return shortName, nil
	}

	return "", fmt.Errorf("no available models found")
}

// IsAvailable 检查 AI 服务是否可用
func (s *AIService) IsAvailable() bool {
	return s.apiKey != "" && s.client != nil
}

