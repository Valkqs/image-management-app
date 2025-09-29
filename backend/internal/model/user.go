package model

import "gorm.io/gorm"

type User struct {
    gorm.Model        // 包含 ID, CreatedAt, UpdatedAt, DeletedAt 等字段
    Username   string `gorm:"size:255;not null;unique" json:"username"`
    Email      string `gorm:"size:255;not null;unique" json:"email"`
    Password   string `gorm:"size:255;not null;" json:"-"` // json:"-" 表示这个字段在序列化为JSON时应被忽略
}