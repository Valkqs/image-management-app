package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("MODELSCOPE_ACCESS_TOKEN")
	if apiKey == "" {
		fmt.Println("Error: MODELSCOPE_ACCESS_TOKEN environment variable is not set")
		fmt.Println("Get your token from: https://modelscope.cn/my/myaccesstoken")
		os.Exit(1)
	}

	model := os.Getenv("MODELSCOPE_MODEL")
	if model == "" {
		model = "Qwen/QVQ-72B-Preview"
	}

	baseURL := os.Getenv("MODELSCOPE_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api-inference.modelscope.cn/v1"
	}

	fmt.Printf("Testing ModelScope API connection...\n")
	fmt.Printf("Model: %s\n", model)
	fmt.Printf("Base URL: %s\n", baseURL)
	fmt.Println()

	// 测试简单的文本请求
	testRequest := map[string]interface{}{
		"model": model,
		"messages": []map[string]interface{}{
			{
				"role":    "system",
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": "You are a helpful assistant.",
					},
				},
			},
			{
				"role":    "user",
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": "Hello, please respond with 'API connection successful' to confirm the connection.",
					},
				},
			},
		},
		"stream": false,
	}

	requestBody, err := json.Marshal(testRequest)
	if err != nil {
		fmt.Printf("Error creating request body: %v\n", err)
		os.Exit(1)
	}

	url := fmt.Sprintf("%s/chat/completions", baseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		os.Exit(1)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	// 设置代理（如果需要）
	client := &http.Client{}
	proxyURL := os.Getenv("HTTP_PROXY")
	if proxyURL != "" {
		fmt.Printf("Using proxy: %s\n", proxyURL)
	}

	fmt.Println("Sending test request...")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error calling API: %v\n", err)
		fmt.Println("\nPossible issues:")
		fmt.Println("1. Check your network connection")
		fmt.Println("2. Verify MODELSCOPE_ACCESS_TOKEN is correct")
		fmt.Println("3. Check proxy settings if needed")
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response: %v\n", err)
		os.Exit(1)
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("❌ API returned error (status %d):\n", resp.StatusCode)
		fmt.Println(string(body))
		fmt.Println("\nPossible issues:")
		fmt.Println("1. Invalid MODELSCOPE_ACCESS_TOKEN")
		fmt.Println("2. Model name is incorrect")
		fmt.Println("3. Account not verified (need to bind Alibaba Cloud account and complete real-name verification)")
		os.Exit(1)
	}

	// 解析响应
	var result struct {
		Choices []struct {
			Message struct {
				Content []struct {
					Type string `json:"type"`
					Text string `json:"text"`
				} `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		fmt.Printf("Response body: %s\n", string(body))
		os.Exit(1)
	}

	if len(result.Choices) > 0 && len(result.Choices[0].Message.Content) > 0 {
		responseText := result.Choices[0].Message.Content[0].Text
		fmt.Println("✅ API connection successful!")
		fmt.Printf("\nResponse: %s\n", responseText)
	} else {
		fmt.Println("⚠️  API responded but no content in response")
		fmt.Printf("Response body: %s\n", string(body))
	}
}

