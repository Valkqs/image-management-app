package model

import (
	"gorm.io/gorm"
)

type Image struct {
	gorm.Model
	Filename      string `gorm:"size:255;not null" json:"filename"`
	FilePath      string `gorm:"size:255;not null" json:"filePath"`
	ThumbnailPath string `gorm:"size:255;not null" json:"thumbnailPath"`
	UserID        uint   `json:"userID"`
	User          User   `gorm:"foreignKey:UserID" json:"-"` // 定义外键关联
	// 之后我们可以在这里添加 EXIF 等更多信息
}