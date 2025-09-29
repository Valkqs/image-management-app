package utils

import (
    "fmt"
    "os"
    "time"
    "github.com/golang-jwt/jwt/v5"
)

// JwtKey 从环境变量获取JWT签名密钥
var JwtKey = getJwtKey()

// getJwtKey 从环境变量获取JWT密钥，如果未设置则使用默认值
func getJwtKey() []byte {
    key := os.Getenv("JWT_SECRET")
    if key == "" {
        // 开发环境默认密钥，生产环境必须设置JWT_SECRET环境变量
        key = "dev_default_secret_key_change_in_production"
        fmt.Println("⚠️  Warning: Using default JWT secret. Please set JWT_SECRET environment variable in production!")
    }
    
    // 确保密钥长度足够安全（至少32字节）
    if len(key) < 32 {
        panic("JWT_SECRET must be at least 32 characters long")
    }
    
    return []byte(key)
}

// Claims 定义了JWT中存储的数据
type Claims struct {
    UserID uint `json:"user_id"`
    jwt.RegisteredClaims
}

// GenerateJWT 为指定用户ID生成一个新的JWT
func GenerateJWT(userID uint) (string, error) {
    // 设置Token的过期时间，例如24小时
    expirationTime := time.Now().Add(24 * time.Hour)

    claims := &Claims{
        UserID: userID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(expirationTime),
        },
    }

    // 创建一个新的Token
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

    // 使用我们定义的密钥来签名Token，并获取完整的编码字符串
    tokenString, err := token.SignedString(JwtKey)
    if err != nil {
        return "", err
    }

    return tokenString, nil
}