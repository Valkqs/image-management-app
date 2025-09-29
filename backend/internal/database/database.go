package database

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"github.com/Valkqs/image-management-app/backend/internal/model"
)

// InitDB 初始化并返回数据库连接
func InitDB() (*gorm.DB, error) {
	// 从环境变量获取数据库连接信息，如果未设置则使用默认值
	dbUser := getEnv("DB_USER", "root")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbHost := getEnv("DB_HOST", "127.0.0.1")
	dbPort := getEnv("DB_PORT", "3306")
	dbName := getEnv("DB_NAME", "image_db")

	// 格式: "user:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)
	
	log.Printf("Connecting to database: %s@%s:%s/%s", dbUser, dbHost, dbPort, dbName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	log.Println("Database connection established.")

	// 自动迁移模式，GORM会自动创建或更新表结构
	// 这对于开发非常方便
	err = db.AutoMigrate(&model.User{}, &model.Image{})
	if err != nil {
		return nil, fmt.Errorf("failed to auto migrate database: %w", err)
	}
	log.Println("Database migrated.")

	return db, nil
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}