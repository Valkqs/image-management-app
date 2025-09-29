package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Valkqs/image-management-app/backend/internal/model"
)

// UploadImage 处理图片上传
func (h *Handler) UploadImage(c *gin.Context) {
	// 1. 从中间件获取当前登录的用户ID
	userID_i, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userID := userID_i.(uint)

	// 2. 解析 multipart form
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get form err: %s", err.Error())})
		return
	}
	files := form.File["images"] // "images" 是前端上传时使用的字段名

	// 3. 遍历所有上传的文件
	for _, file := range files {
		// 生成一个唯一的文件名
		extension := filepath.Ext(file.Filename)
		newFileName := fmt.Sprintf("%d-%d%s", userID, time.Now().UnixNano(), extension)
		
		// 定义保存路径 (后续可以配置化)
		// ！！！请确保 'uploads/images/' 这个目录存在
		filePath := filepath.Join("uploads/images", newFileName)

		// 4. 保存文件到服务器
		if err := c.SaveUploadedFile(file, filePath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to save file"})
			// 注意：这里应该有逻辑来处理部分文件上传失败的情况
			continue
		}
		
		// TODO: 在这里添加生成缩略图的逻辑
		thumbnailPath := filePath // 暂时用原图路径作为缩略图路径

		// 5. 将图片信息存入数据库
		image := model.Image{
			UserID:        userID,
			Filename:      file.Filename, // 原始文件名
			FilePath:      filePath,
			ThumbnailPath: thumbnailPath,
		}
		if result := h.DB.Create(&image); result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image info to database"})
			continue
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d files uploaded successfully", len(files))})
}

// GetUserImages 获取当前用户的所有图片
func (h *Handler) GetUserImages(c *gin.Context) {
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	var images []model.Image
	// 根据 userID 查找图片，并按创建时间倒序排列
	if result := h.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&images); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve images"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": images})
}