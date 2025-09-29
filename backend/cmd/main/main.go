package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/Valkqs/image-management-app/backend/internal/database"
	"github.com/Valkqs/image-management-app/backend/internal/handler"
	"github.com/Valkqs/image-management-app/backend/internal/middleware"
	"time"
)

func main() {
	// 1. 初始化数据库连接
	// 我们将数据库初始化逻辑封装在 internal/database 包中
	db, err := database.InitDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 2. 创建 Handler 实例，并注入数据库连接
	h := &handler.Handler{DB: db}

	// 3. 初始化 Gin 引擎
	r := gin.Default()

	// 4. 配置 CORS 中间件 (非常重要!)
	// 允许所有来源的跨域请求，这在前后端分离开发中是必需的

    r.Use(cors.New(cors.Config{
        // 允许的来源，可以指定前端的地址
        AllowOrigins:     []string{"http://localhost:5173"},
        // 允许的 HTTP 方法
        AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
        // 允许的请求头
        AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
        // 是否允许携带 cookie
        AllowCredentials: true,
        // 预检请求的有效期
        MaxAge: 12 * time.Hour,
    }))

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = append(config.AllowHeaders, "Authorization") // 允许前端携带 Authorization 头
	r.Use(cors.New(config))
	r.Static("/uploads", "./uploads")

	// 5. 设置路由组
	api := r.Group("/api/v1")
	{
		// 公开路由 (无需认证)
		api.POST("/users/register", h.Register)
		api.POST("/users/login", h.Login)

		// 受保护的路由组
		authorized := api.Group("/")
		authorized.Use(middleware.AuthMiddleware()) // 应用JWT认证中间件
		{
			// 在这里定义所有需要登录才能访问的API
			// 例如: 获取当前用户信息的示例
			authorized.GET("/users/me", func(c *gin.Context) {
				userID, _ := c.Get("userID")
				c.JSON(200, gin.H{"message": "You are authorized", "user_id": userID})
			})
            authorized.POST("/images", h.UploadImage)
            authorized.GET("/images", h.GetUserImages)
			// 其他需要保护的路由，例如图片上传
			// authorized.POST("/images", h.UploadImage) 
		}
	}

	// 6. 启动 HTTP 服务
	log.Println("Server is running on port 8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}