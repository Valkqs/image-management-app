package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/Valkqs/image-management-app/backend/internal/model" // ！！！替换为你的模块路径
)

// AddTagToImage 为图片添加一个标签
func (h *Handler) AddTagToImage(c *gin.Context) {
	// 从 URL 中获取图片 ID
	imageID_str := c.Param("id")
	imageID, err := strconv.Atoi(imageID_str)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	// 绑定请求体中的标签名
	var input struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查找或创建标签。这可以避免在 tags 表中创建重复的标签
	var tag model.Tag
	if err := h.DB.FirstOrCreate(&tag, model.Tag{Name: input.Name}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error on tag"})
		return
	}

	// 查找图片并验证所有权
	var image model.Image
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)
	if err := h.DB.Where("id = ? AND user_id = ?", imageID, userID).First(&image).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found or you don't have permission"})
		return
	}

	// 为图片关联标签
	if err := h.DB.Model(&image).Association("Tags").Append(&tag); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate tag with image"})
		return
	}

	// 返回更新后的图片信息（包含所有标签）
	h.DB.Preload("Tags").First(&image, imageID)
	c.JSON(http.StatusOK, image)
}

// RemoveTagFromImage 从图片移除一个标签
func (h *Handler) RemoveTagFromImage(c *gin.Context) {
	imageID_str := c.Param("id")
	tagID_str := c.Param("tagID") // 从 URL 获取 tagID
	imageID, _ := strconv.Atoi(imageID_str)
	tagID, _ := strconv.Atoi(tagID_str)

	// 验证图片所有权
	var image model.Image
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)
	if err := h.DB.Where("id = ? AND user_id = ?", imageID, userID).First(&image).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found or you don't have permission"})
		return
	}

	// 移除关联
	var tag model.Tag
	tag.ID = uint(tagID)
	if err := h.DB.Model(&image).Association("Tags").Delete(&tag); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove tag from image"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetAllUsedTags 获取所有正在使用的标签（至少有一张图片关联的标签）
func (h *Handler) GetAllUsedTags(c *gin.Context) {
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	var tags []model.Tag
	// 查询所有标签，这些标签至少关联了当前用户的一张图片
	err := h.DB.
		Joins("JOIN image_tags ON image_tags.tag_id = tags.id").
		Joins("JOIN images ON images.id = image_tags.image_id").
		Where("images.user_id = ?", userID).
		Group("tags.id").
		Order("tags.name ASC").
		Find(&tags).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tags": tags,
	})
}