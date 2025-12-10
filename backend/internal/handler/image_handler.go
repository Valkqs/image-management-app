package handler

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	_ "image/gif"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/dsoprea/go-exif/v3"
	exifcommon "github.com/dsoprea/go-exif/v3/common"
	"github.com/gin-gonic/gin"
	"github.com/nfnt/resize"

	"github.com/Valkqs/image-management-app/backend/internal/model"
)

// cleanExifString 清理 EXIF 字符串，移除不可见字符和控制字符
func cleanExifString(s string) string {
	if s == "" {
		return ""
	}
	
	// 移除首尾空白
	cleaned := strings.TrimSpace(s)
	
	// 移除所有控制字符和非打印字符
	cleaned = strings.Map(func(r rune) rune {
		// 保留可打印字符、空格、制表符
		if unicode.IsPrint(r) || r == ' ' || r == '\t' {
			return r
		}
		// 删除其他所有字符
		return -1
	}, cleaned)
	
	// 移除多余的空白字符
	cleaned = strings.Join(strings.Fields(cleaned), " ")
	
	// 如果清理后为空，返回空字符串
	if cleaned == "" {
		return ""
	}
	
	return cleaned
}

// UploadImage ... (这个函数保持不变) ...
func (h *Handler) UploadImage(c *gin.Context) {
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get form"})
		return
	}
	files := form.File["images"]

	originalPath := "uploads/images"
	thumbPath := "uploads/thumbnails"
	os.MkdirAll(originalPath, os.ModePerm)
	os.MkdirAll(thumbPath, os.ModePerm)

	for _, file := range files {
		extension := filepath.Ext(file.Filename)
		newFileName := fmt.Sprintf("%d-%d%s", userID, time.Now().UnixNano(), extension)
		filePath := filepath.Join(originalPath, newFileName)

		if err := c.SaveUploadedFile(file, filePath); err != nil {
			log.Printf("Error saving file %s: %v", file.Filename, err)
			continue
		}

		image := model.Image{
			UserID:   userID,
			Filename: file.Filename,
			FilePath: filePath,
		}
		
		imageData, err := os.ReadFile(filePath)
		if err == nil {
			exifInfo, parseErr := parseExif(imageData)
			if parseErr == nil {
				image.CameraMake = exifInfo.CameraMake
				image.CameraModel = exifInfo.CameraModel
				image.TakenAt = exifInfo.TakenAt
				image.Latitude = exifInfo.Latitude
				image.Longitude = exifInfo.Longitude
			} else {
				log.Printf("Could not parse EXIF for %s: %v", file.Filename, parseErr)
			}
		}

		thumbnailPath, err := generateThumbnail(filePath, thumbPath, newFileName)
		if err != nil {
			log.Printf("Failed to generate thumbnail for %s: %v", file.Filename, err)
			image.ThumbnailPath = filePath
		} else {
			image.ThumbnailPath = thumbnailPath
		}

		if result := h.DB.Create(&image); result.Error != nil {
			log.Printf("Failed to save image info to db for %s: %v", file.Filename, result.Error)
			continue
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d files processed.", len(files))})
}

// generateThumbnail ... (这个函数保持不变) ...
func generateThumbnail(srcPath, destDir, newFileName string) (string, error) {
	file, err := os.Open(srcPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return "", err
	}

	thumb := resize.Resize(400, 0, img, resize.Lanczos3)

	destPath := filepath.Join(destDir, newFileName)
	out, err := os.Create(destPath)
	if err != nil {
		return "", err
	}
	defer out.Close()
	
	switch strings.ToLower(filepath.Ext(srcPath)) {
	case ".jpg", ".jpeg":
		err = jpeg.Encode(out, thumb, nil)
	case ".png":
		err = png.Encode(out, thumb)
	default:
		return "", fmt.Errorf("unsupported image format for thumbnail: %s", filepath.Ext(srcPath))
	}

	return destPath, err
}

// 【最终修正版】parseExif 函数
func parseExif(data []byte) (*model.Image, error) {
	rawExif, err := exif.SearchAndExtractExif(data)
	if err != nil {
		return nil, err
	}

	im, err := exifcommon.NewIfdMappingWithStandard()
	if err != nil {
		return nil, err
	}
	ti := exif.NewTagIndex()

	_, index, err := exif.Collect(im, ti, rawExif)
	if err != nil {
		return nil, err
	}

	info := &model.Image{}
	rootIfd := index.RootIfd

	// 辅助函数，用于安全地获取标签值并清理字符串
	getStringVal := func(tagName string) string {
		results, err := rootIfd.FindTagWithName(tagName)
		if err == nil && len(results) > 0 {
			value, err := results[0].Value()
			if err == nil {
				if valStr, ok := value.(string); ok {
					return cleanExifString(valStr)
				}
			}
		}
		return ""
	}

	info.CameraMake = getStringVal("Make")
	info.CameraModel = getStringVal("Model")

	dtStr := getStringVal("DateTimeOriginal")
	if dtStr == "" {
		dtStr = getStringVal("DateTime")
	}
	if dtStr != "" {
		if t, err := time.Parse("2006:01:02 15:04:05", dtStr); err == nil {
			info.TakenAt = &t
		}
	}

	// 【修复】获取 GPS 信息的正确方法
	// 直接从根IFD获取GPS信息
	gpsInfo, err := rootIfd.GpsInfo()
	if err == nil {
		// 从 GpsInfo 结构体中获取十进制度数
		lat := gpsInfo.Latitude.Decimal()
		lng := gpsInfo.Longitude.Decimal()
		info.Latitude = &lat
		info.Longitude = &lng
	}

	return info, nil
}

// GetUserImages 获取当前用户的图片列表，支持搜索和筛选
func (h *Handler) GetUserImages(c *gin.Context) {
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	// 获取查询参数
	tags := c.Query("tags")         // 例如: ?tags=风景,旅行
	month := c.Query("month")       // 例如: ?month=2025-10
	camera := c.Query("camera")     // 例如: ?camera=Canon

	// 构建基础查询
	query := h.DB.Preload("Tags").Where("user_id = ?", userID)

	// 根据标签筛选
	if tags != "" {
		tagNames := strings.Split(tags, ",")
		// 清理标签名称（去除空格）
		for i := range tagNames {
			tagNames[i] = strings.TrimSpace(tagNames[i])
		}
		
		// 使用子查询来查找包含指定标签的图片
		// 这里使用 INNER JOIN 来实现多对多关系的查询
		query = query.Joins("INNER JOIN image_tags ON image_tags.image_id = images.id").
			Joins("INNER JOIN tags ON tags.id = image_tags.tag_id").
			Where("tags.name IN ?", tagNames).
			Group("images.id").
			Having("COUNT(DISTINCT tags.id) >= ?", len(tagNames))
	}

	// 根据拍摄月份筛选
	if month != "" {
		// month 格式: 2025-10
		// 解析月份并构建日期范围查询
		monthTime, err := time.Parse("2006-01", month)
		if err == nil {
			// 计算月份的开始和结束时间
			startOfMonth := monthTime
			endOfMonth := monthTime.AddDate(0, 1, 0)
			
			query = query.Where("taken_at >= ? AND taken_at < ?", startOfMonth, endOfMonth)
		}
	}

	// 根据相机制造商筛选
	if camera != "" {
		query = query.Where("camera_make LIKE ?", "%"+camera+"%")
	}

	var images []model.Image
	result := query.Order("created_at DESC").Find(&images)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch images"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"images": images,
		"count":  len(images),
	})
}

func (h *Handler) GetImageByID(c *gin.Context) {
    imageID_str := c.Param("id")
	imageID, _ := strconv.Atoi(imageID_str)
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

    var image model.Image
    // 【注意】查询时同时预加载标签
    if err := h.DB.Preload("Tags").Where("id = ? AND user_id = ?", imageID, userID).First(&image).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
		return
	}

    c.JSON(http.StatusOK, image)
}

// DeleteImage 删除图片及其相关资源
func (h *Handler) DeleteImage(c *gin.Context) {
	imageID_str := c.Param("id")
	imageID, err := strconv.Atoi(imageID_str)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	// 1. 查询图片是否存在，并验证是否属于当前用户
	var image model.Image
	if err := h.DB.Where("id = ? AND user_id = ?", imageID, userID).First(&image).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found or you don't have permission to delete it"})
		return
	}

	// 2. 删除文件系统中的原始图片和缩略图
	// 删除原始图片
	if err := os.Remove(image.FilePath); err != nil {
		log.Printf("Warning: Failed to delete original image file %s: %v", image.FilePath, err)
		// 不中止操作，继续删除数据库记录
	}

	// 删除缩略图
	if image.ThumbnailPath != "" && image.ThumbnailPath != image.FilePath {
		if err := os.Remove(image.ThumbnailPath); err != nil {
			log.Printf("Warning: Failed to delete thumbnail file %s: %v", image.ThumbnailPath, err)
		}
	}

	// 3. 删除数据库中的记录（GORM 会自动处理多对多关系的关联表）
	// Select("Tags") 确保级联删除关联的标签关系
	if err := h.DB.Select("Tags").Delete(&image).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete image from database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Image deleted successfully",
		"imageID": imageID,
	})
}