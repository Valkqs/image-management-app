-- ============================================
-- 图片管理系统数据库建库建表脚本
-- Database: MySQL
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- ============================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `image_db` 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE `image_db`;

-- ============================================
-- 1. 用户表 (users)
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
    `created_at` DATETIME(3) NULL DEFAULT NULL COMMENT '创建时间',
    `updated_at` DATETIME(3) NULL DEFAULT NULL COMMENT '更新时间',
    `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '删除时间（软删除）',
    `username` VARCHAR(255) NOT NULL COMMENT '用户名',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱地址',
    `password` VARCHAR(255) NOT NULL COMMENT '密码（哈希值）',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_users_username` (`username`),
    UNIQUE KEY `idx_users_email` (`email`),
    KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 2. 图片表 (images)
-- ============================================
CREATE TABLE IF NOT EXISTS `images` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
    `created_at` DATETIME(3) NULL DEFAULT NULL COMMENT '创建时间',
    `updated_at` DATETIME(3) NULL DEFAULT NULL COMMENT '更新时间',
    `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '删除时间（软删除）',
    `filename` VARCHAR(255) NOT NULL COMMENT '文件名',
    `file_path` VARCHAR(255) NOT NULL COMMENT '文件路径',
    `thumbnail_path` VARCHAR(255) NOT NULL COMMENT '缩略图路径',
    `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID（外键）',
    `camera_make` VARCHAR(100) NULL DEFAULT NULL COMMENT '相机制造商',
    `camera_model` VARCHAR(100) NULL DEFAULT NULL COMMENT '相机型号',
    `resolution` VARCHAR(50) NULL DEFAULT NULL COMMENT '分辨率',
    `taken_at` DATETIME(3) NULL DEFAULT NULL COMMENT '拍摄时间',
    `latitude` DOUBLE NULL DEFAULT NULL COMMENT '纬度',
    `longitude` DOUBLE NULL DEFAULT NULL COMMENT '经度',
    PRIMARY KEY (`id`),
    KEY `idx_images_user_id` (`user_id`),
    KEY `idx_images_deleted_at` (`deleted_at`),
    KEY `idx_images_taken_at` (`taken_at`),
    KEY `idx_images_camera_make` (`camera_make`),
    CONSTRAINT `fk_images_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片表';

-- ============================================
-- 3. 标签表 (tags)
-- ============================================
CREATE TABLE IF NOT EXISTS `tags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签ID',
    `created_at` DATETIME(3) NULL DEFAULT NULL COMMENT '创建时间',
    `updated_at` DATETIME(3) NULL DEFAULT NULL COMMENT '更新时间',
    `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '删除时间（软删除）',
    `name` VARCHAR(100) NOT NULL COMMENT '标签名称',
    `source` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '标签来源：user（用户）或 ai（AI生成）',
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_tags_name` (`name`),
    KEY `idx_tags_deleted_at` (`deleted_at`),
    KEY `idx_tags_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- ============================================
-- 4. 图片标签关联表 (image_tags) - 多对多关系
-- ============================================
CREATE TABLE IF NOT EXISTS `image_tags` (
    `image_id` BIGINT UNSIGNED NOT NULL COMMENT '图片ID（外键）',
    `tag_id` BIGINT UNSIGNED NOT NULL COMMENT '标签ID（外键）',
    PRIMARY KEY (`image_id`, `tag_id`),
    KEY `idx_image_tags_tag_id` (`tag_id`),
    CONSTRAINT `fk_image_tags_image` FOREIGN KEY (`image_id`) REFERENCES `images` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_image_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图片标签关联表';

-- ============================================
-- 索引说明
-- ============================================
-- users 表：
--   - idx_users_username: 用户名唯一索引，用于快速查找和唯一性约束
--   - idx_users_email: 邮箱唯一索引，用于快速查找和唯一性约束
--   - idx_users_deleted_at: 软删除索引，用于过滤已删除记录
--
-- images 表：
--   - idx_images_user_id: 用户ID索引，用于快速查找用户的图片
--   - idx_images_deleted_at: 软删除索引
--   - idx_images_taken_at: 拍摄时间索引，用于按时间查询
--   - idx_images_camera_make: 相机制造商索引，用于按相机查询
--
-- tags 表：
--   - idx_tags_name: 标签名唯一索引，用于快速查找和唯一性约束
--   - idx_tags_deleted_at: 软删除索引
--   - idx_tags_source: 标签来源索引，用于区分用户标签和AI标签
--
-- image_tags 表：
--   - 联合主键 (image_id, tag_id): 确保同一图片不会重复关联同一标签
--   - idx_image_tags_tag_id: 标签ID索引，用于反向查找（通过标签找图片）

-- ============================================
-- 外键约束说明
-- ============================================
-- 1. images.user_id -> users.id
--    - ON DELETE CASCADE: 删除用户时，自动删除该用户的所有图片
--    - ON UPDATE CASCADE: 更新用户ID时，自动更新图片表中的用户ID
--
-- 2. image_tags.image_id -> images.id
--    - ON DELETE CASCADE: 删除图片时，自动删除该图片的所有标签关联
--    - ON UPDATE CASCADE: 更新图片ID时，自动更新关联表
--
-- 3. image_tags.tag_id -> tags.id
--    - ON DELETE CASCADE: 删除标签时，自动删除所有图片与该标签的关联
--    - ON UPDATE CASCADE: 更新标签ID时，自动更新关联表

-- ============================================
-- 使用说明
-- ============================================
-- 1. 执行此脚本前，请确保已安装 MySQL 数据库
-- 2. 确保有创建数据库的权限
-- 3. 可以通过以下方式执行：
--    - 命令行：mysql -u root -p < schema.sql
--    - MySQL Workbench：打开此文件并执行
--    - 其他 MySQL 客户端工具
-- 4. 默认数据库名称为 image_db，可在脚本开头修改
-- 5. 字符集使用 utf8mb4，支持完整的 UTF-8 字符（包括 emoji）

