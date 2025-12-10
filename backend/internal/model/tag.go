package model

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name   string  `gorm:"size:100;not null;unique" json:"name"`
	Source string  `gorm:"size:20;default:'user'" json:"source"` // 'user' 或 'ai'，标识标签来源
	Images []Image `gorm:"many2many:image_tags;" json:"-"` // 定义多对多关系
}