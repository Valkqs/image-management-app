package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/Valkqs/image-management-app/backend/internal/model"
	"github.com/Valkqs/image-management-app/backend/internal/service"
)

// AnalyzeImage 分析图片并添加 AI 标签
func (h *Handler) AnalyzeImage(c *gin.Context) {
	imageID_str := c.Param("id")
	imageID, err := strconv.Atoi(imageID_str)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	// 验证图片所有权
	var image model.Image
	if err := h.DB.Where("id = ? AND user_id = ?", imageID, userID).First(&image).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found or you don't have permission"})
		return
	}

	// 创建 AI 服务
	aiService, err := service.NewAIService()
	if err != nil {
		log.Printf("Failed to create AI service: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "AI service is not available. Please check GEMINI_API_KEY environment variable.",
		})
		return
	}

	// 分析图片
	tagNames, err := aiService.AnalyzeImage(image.FilePath)
	if err != nil {
		log.Printf("Failed to analyze image %d: %v", imageID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to analyze image",
			"details": err.Error(),
		})
		return
	}

	// 为图片添加 AI 标签
	addedTags := make([]model.Tag, 0)
	for _, tagName := range tagNames {
		// 查找或创建标签（来源为 AI）
		var tag model.Tag
		result := h.DB.Where("name = ?", tagName).First(&tag)
		
		if result.Error != nil {
			// 标签不存在，创建新标签
			tag = model.Tag{
				Name:   tagName,
				Source: "ai",
			}
			if err := h.DB.Create(&tag).Error; err != nil {
				log.Printf("Failed to create tag %s: %v", tagName, err)
				continue
			}
		} else {
			// 标签已存在，如果来源不是 AI，更新为 AI（允许用户标签转为 AI 标签）
			if tag.Source != "ai" {
				tag.Source = "ai"
				h.DB.Save(&tag)
			}
		}

		// 检查图片是否已有此标签
		var count int64
		h.DB.Model(&image).Association("Tags").Count()
		h.DB.Table("image_tags").Where("image_id = ? AND tag_id = ?", imageID, tag.ID).Count(&count)
		if count == 0 {
			// 关联标签到图片
			if err := h.DB.Model(&image).Association("Tags").Append(&tag); err != nil {
				log.Printf("Failed to associate tag %s with image: %v", tagName, err)
				continue
			}
			addedTags = append(addedTags, tag)
		}
	}

	// 重新加载图片信息（包含所有标签）
	h.DB.Preload("Tags").First(&image, imageID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Image analyzed successfully",
		"tags":    addedTags,
		"image":   image,
	})
}

// AnalyzeImageAsync 异步分析图片（不阻塞响应）
func (h *Handler) AnalyzeImageAsync(imageID uint, imagePath string) {
	go func() {
		// 创建 AI 服务
		aiService, err := service.NewAIService()
		if err != nil {
			log.Printf("AI service not available for async analysis: %v", err)
			return
		}

		// 分析图片
		tagNames, err := aiService.AnalyzeImage(imagePath)
		if err != nil {
			log.Printf("Async analysis failed for image %d: %v", imageID, err)
			return
		}

		// 查询图片
		var image model.Image
		if err := h.DB.First(&image, imageID).Error; err != nil {
			log.Printf("Image %d not found for async analysis: %v", imageID, err)
			return
		}

		// 为图片添加 AI 标签
		for _, tagName := range tagNames {
			var tag model.Tag
			result := h.DB.Where("name = ?", tagName).First(&tag)
			
			if result.Error != nil {
				// 创建新标签
				tag = model.Tag{
					Name:   tagName,
					Source: "ai",
				}
				if err := h.DB.Create(&tag).Error; err != nil {
					log.Printf("Failed to create tag %s: %v", tagName, err)
					continue
				}
			} else {
				// 更新标签来源
				if tag.Source != "ai" {
					tag.Source = "ai"
					h.DB.Save(&tag)
				}
			}

			// 检查并关联标签
			var count int64
			h.DB.Table("image_tags").Where("image_id = ? AND tag_id = ?", imageID, tag.ID).Count(&count)
			if count == 0 {
				h.DB.Model(&image).Association("Tags").Append(&tag)
			}
		}

		log.Printf("Async AI analysis completed for image %d, added %d tags", imageID, len(tagNames))
	}()
}

