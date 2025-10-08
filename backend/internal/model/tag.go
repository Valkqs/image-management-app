package model

import "gorm.io/gorm"

type Tag struct {
	gorm.Model
	Name   string  `gorm:"size:100;not null;unique" json:"name"`
	Images []Image `gorm:"many2many:image_tags;" json:"-"` // 定义多对多关系
}