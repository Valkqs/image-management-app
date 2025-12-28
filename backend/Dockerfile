# 多阶段构建：构建阶段
FROM golang:1.25-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的构建工具
RUN apk add --no-cache git

# 复制 go mod 文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
# CGO_ENABLED=0 用于创建静态链接的二进制文件，可以在 alpine 中运行
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main

# 运行阶段：使用最小的 alpine 镜像
FROM alpine:latest

# 安装必要的运行时依赖
RUN apk --no-cache add ca-certificates tzdata

# 设置时区
ENV TZ=Asia/Shanghai

WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

# 创建上传目录
RUN mkdir -p uploads/images uploads/thumbnails

# 暴露端口
EXPOSE 8080

# 运行应用
CMD ["./main"]

