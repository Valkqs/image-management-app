package handler

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/Valkqs/image-management-app/backend/internal/model"
	"github.com/Valkqs/image-management-app/backend/internal/service"
)

// MCPQueryRequest MCP查询请求结构
type MCPQueryRequest struct {
	Query string `json:"query" binding:"required"` // 自然语言查询
}

// MCPQueryResponse MCP查询响应结构
type MCPQueryResponse struct {
	Images    []model.Image `json:"images"`
	Count     int           `json:"count"`
	Condition *service.QueryCondition `json:"condition"` // 解析出的查询条件
	Message   string        `json:"message"`             // 响应消息
}

// MCPQuery 处理MCP自然语言查询请求
func (h *Handler) MCPQuery(c *gin.Context) {
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	// 绑定请求体
	var input MCPQueryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(input.Query) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query cannot be empty"})
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

	// 获取用户可用的标签列表（用于帮助AI理解上下文）
	var tags []model.Tag
	h.DB.
		Joins("JOIN image_tags ON image_tags.tag_id = tags.id").
		Joins("JOIN images ON images.id = image_tags.image_id").
		Where("images.user_id = ?", userID).
		Group("tags.id").
		Order("tags.name ASC").
		Find(&tags)

	availableTags := make([]string, len(tags))
	for i, tag := range tags {
		availableTags[i] = tag.Name
	}

	// 使用AI解析自然语言查询
	condition, err := aiService.ParseNaturalLanguageQuery(input.Query, availableTags)
	if err != nil {
		log.Printf("Failed to parse natural language query: %v", err)
		// 返回详细的错误信息，帮助调试
		errorMsg := err.Error()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to parse query",
			"details": errorMsg,
			"message": "AI服务解析查询失败，请检查网络连接和API配置",
		})
		return
	}

	// 根据解析的条件查询图片
	query := h.DB.Preload("Tags").Where("user_id = ?", userID)

	hasTagFilter := len(condition.Tags) > 0
	hasKeywordFilter := len(condition.Keywords) > 0
	needsTagJoin := hasTagFilter || hasKeywordFilter

	// 如果需要标签相关的筛选，先JOIN tags表
	if needsTagJoin {
		query = query.Joins("INNER JOIN image_tags ON image_tags.image_id = images.id").
			Joins("INNER JOIN tags ON tags.id = image_tags.tag_id")
	}

	// 根据标签筛选
	if hasTagFilter {
		// 清理标签名称（去除空格，确保匹配）
		tagNames := make([]string, len(condition.Tags))
		for i, tag := range condition.Tags {
			tagNames[i] = strings.TrimSpace(tag)
		}
		
		log.Printf("Filtering images by tags: %v", tagNames)
		
		// 要求图片必须包含所有指定的标签
		// 使用子查询来确保图片包含所有指定的标签
		query = query.Where("tags.name IN ?", tagNames).
			Group("images.id").
			Having("COUNT(DISTINCT tags.id) >= ?", len(tagNames))
		
		log.Printf("Applied tag filter: tags must be in %v", tagNames)
	}

	// 根据关键词筛选（在标签中搜索）
	if hasKeywordFilter {
		// 构建关键词查询条件（在标签名称中搜索）
		keywordConditions := make([]string, len(condition.Keywords))
		args := make([]interface{}, 0)
		for i, keyword := range condition.Keywords {
			keywordConditions[i] = "tags.name LIKE ?"
			args = append(args, "%"+keyword+"%")
		}
		
		// 添加关键词条件（使用OR连接）
		keywordQuery := "(" + strings.Join(keywordConditions, " OR ") + ")"
		
		if hasTagFilter {
			// 如果同时有标签和关键词，使用OR连接（图片匹配标签或关键词）
			query = query.Or(keywordQuery, args...)
		} else {
			// 如果只有关键词，直接添加WHERE条件
			query = query.Where(keywordQuery, args...)
		}
		
		// 确保去重
		if !hasTagFilter {
			query = query.Group("images.id")
		}
	}

	// 根据月份筛选
	if condition.Month != "" {
		monthTime, err := time.Parse("2006-01", condition.Month)
		if err == nil {
			startOfMonth := monthTime
			endOfMonth := monthTime.AddDate(0, 1, 0)
			query = query.Where("taken_at >= ? AND taken_at < ?", startOfMonth, endOfMonth)
		}
	}

	// 根据相机制造商筛选
	if condition.Camera != "" {
		query = query.Where("camera_make LIKE ?", "%"+condition.Camera+"%")
	}

	var images []model.Image
	result := query.Order("created_at DESC").Find(&images)
	if result.Error != nil {
		log.Printf("Failed to query images: %v", result.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch images"})
		return
	}
	
	log.Printf("Query result: Found %d images matching conditions (tags=%v, month=%s, camera=%s, keywords=%v)", 
		len(images), condition.Tags, condition.Month, condition.Camera, condition.Keywords)

	// 构建响应消息
	message := "查询完成"
	if condition.Reasoning != "" {
		message = condition.Reasoning
	}

	response := MCPQueryResponse{
		Images:    images,
		Count:     len(images),
		Condition: condition,
		Message:   message,
	}

	c.JSON(http.StatusOK, response)
}

