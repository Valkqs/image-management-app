package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

func main() {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		fmt.Println("Error: GEMINI_API_KEY environment variable is not set")
		os.Exit(1)
	}

	// 调用 ListModels API
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models?key=%s", apiKey)

	// 设置代理（如果需要）
	client := &http.Client{}
	proxyURL := os.Getenv("HTTP_PROXY")
	if proxyURL != "" {
		fmt.Printf("Using proxy: %s\n", proxyURL)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		os.Exit(1)
	}

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error calling API: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response: %v\n", err)
		os.Exit(1)
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("API returned error (status %d): %s\n", resp.StatusCode, string(body))
		os.Exit(1)
	}

	// 解析响应
	var result struct {
		Models []struct {
			Name        string   `json:"name"`
			DisplayName string   `json:"displayName"`
			Description string   `json:"description"`
			SupportedMethods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		fmt.Printf("Response body: %s\n", string(body))
		os.Exit(1)
	}

	fmt.Println("Available models:")
	fmt.Println("==================")
	
	for _, model := range result.Models {
		supportsGenerateContent := false
		for _, method := range model.SupportedMethods {
			if method == "generateContent" {
				supportsGenerateContent = true
				break
			}
		}
		
		if supportsGenerateContent {
			fmt.Printf("\n✅ %s\n", model.Name)
			fmt.Printf("   Display Name: %s\n", model.DisplayName)
			if model.Description != "" {
				fmt.Printf("   Description: %s\n", model.Description)
			}
			fmt.Printf("   Methods: %v\n", model.SupportedMethods)
		}
	}
	
	fmt.Println("\n\nModels that support generateContent:")
	fmt.Println("=====================================")
	for _, model := range result.Models {
		for _, method := range model.SupportedMethods {
			if method == "generateContent" {
				// 提取简短的模型名称（去掉 models/ 前缀）
				shortName := model.Name
				if len(shortName) > 8 && shortName[:8] == "models/" {
					shortName = shortName[8:]
				}
				fmt.Printf("  - %s\n", shortName)
				break
			}
		}
	}
}

