package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Valkqs/image-management-app/backend/internal/model"
	"github.com/Valkqs/image-management-app/backend/internal/utils"
)

// Handler 结构体，包含所有此包处理器需要的依赖
type Handler struct {
	DB *gorm.DB
}

// Register 成为 Handler 的一个方法，用于处理用户注册
func (h *Handler) Register(c *gin.Context) {
	// 定义一个用于绑定请求JSON的结构体
	var input struct {
		Username string `json:"username" binding:"required,min=4"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	// 绑定并验证请求数据
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 对密码进行哈希处理
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// 创建用户模型实例
	user := model.User{
		Username: input.Username,
		Email:    input.Email,
		Password: hashedPassword,
	}

	// 将新用户存入数据库
	if result := h.DB.Create(&user); result.Error != nil {
		// 检查是否是唯一约束冲突错误 (用户名或邮箱已存在)
		if strings.Contains(result.Error.Error(), "Duplicate entry") {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

// Login 成为 Handler 的一个方法，用于处理用户登录
func (h *Handler) Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user model.User
	// 根据邮箱在数据库中查找用户
	if err := h.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		// 如果记录未找到，GORM会返回 gorm.ErrRecordNotFound
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// 校验密码
	if !utils.CheckPasswordHash(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// 生成 JWT
	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// 返回 Token
	c.JSON(http.StatusOK, gin.H{"token": token})
}