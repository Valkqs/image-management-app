package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
)

func main() {
	fmt.Println("🔐 JWT密钥生成器")
	fmt.Println(strings.Repeat("=", 50))
	
	// 生成32字节的随机密钥
	key := make([]byte, 32)
	_, err := rand.Read(key)
	if err != nil {
		fmt.Printf("❌ 生成密钥失败: %v\n", err)
		return
	}
	
	// 转换为base64编码的字符串
	secret := base64.URLEncoding.EncodeToString(key)
	
	fmt.Printf("✅ 生成的JWT密钥:\n")
	fmt.Printf("JWT_SECRET=%s\n", secret)
	fmt.Println()
	fmt.Println("📋 使用方法:")
	fmt.Println("1. 在PowerShell中设置环境变量:")
	fmt.Printf("   $env:JWT_SECRET=\"%s\"\n", secret)
	fmt.Println()
	fmt.Println("2. 或者在Windows系统环境变量中设置:")
	fmt.Printf("   JWT_SECRET=%s\n", secret)
	fmt.Println()
	fmt.Println("⚠️  安全提醒:")
	fmt.Println("- 请妥善保管此密钥，不要泄露给他人")
	fmt.Println("- 生产环境中使用强密钥")
	fmt.Println("- 定期更换密钥")
	fmt.Println(strings.Repeat("=", 50))
}
