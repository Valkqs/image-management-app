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
	"strings" // 【修复】添加 strings 包的导入
	"time"

	"github.com/dsoprea/go-exif/v3"
	exifcommon "github.com/dsoprea/go-exif/v3/common"
	"github.com/gin-gonic/gin"
	"github.com/nfnt/resize"

	"github.com/Valkqs/image-management-app/backend/internal/model"
)

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

	// 辅助函数，用于安全地获取标签值
	getStringVal := func(tagName string) string {
		results, err := rootIfd.FindTagWithName(tagName)
		if err == nil && len(results) > 0 {
			value, err := results[0].Value()
			if err == nil {
				if valStr, ok := value.(string); ok {
					return valStr
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

// GetUserImages 获取当前用户的图片列表
func (h *Handler) GetUserImages(c *gin.Context) {
	userID_i, _ := c.Get("userID")
	userID := userID_i.(uint)

	var images []model.Image
	result := h.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&images)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch images"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"images": images,
		"count":  len(images),
	})
}