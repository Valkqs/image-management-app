package middleware

import (
    "net/http"
    "strings"
    "github.com/Valkqs/image-management-app/backend/internal/utils" 
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Bearer token is required"})
            return
        }

        claims := &utils.Claims{}

        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            // 确保签名算法是我们期望的
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, http.ErrAbortHandler
            }
            return utils.JwtKey, nil // 在utils包中公开jwtKey或创建一个返回它的函数
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            return
        }
        
        // 将用户信息存入 Gin 的上下文中，方便后续的 Handler 使用
        c.Set("userID", claims.UserID)

        c.Next()
    }
}