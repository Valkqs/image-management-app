package model

import (
	"gorm.io/gorm"
	"time"
)

type Image struct {
	gorm.Model
	Filename      string `gorm:"size:255;not null" json:"filename"`
	FilePath      string `gorm:"size:255;not null" json:"filePath"`
	ThumbnailPath string `gorm:"size:255;not null" json:"thumbnailPath"`
	UserID        uint   `json:"userID"`
	User          User   `gorm:"foreignKey:UserID" json:"-"` // 定义外键关联
	CameraMake    string     `gorm:"size:100" json:"cameraMake"`    // 相机制造商
	CameraModel   string     `gorm:"size:100" json:"cameraModel"`   // 相机型号
	Resolution    string     `gorm:"size:50" json:"resolution"`     // 分辨率
	TakenAt       *time.Time `json:"takenAt"`                     // 拍摄时间 (使用指针以允许为空)
	Latitude      *float64   `json:"latitude"`                    // 纬度
	Longitude     *float64   `json:"longitude"`                   // 经度
}