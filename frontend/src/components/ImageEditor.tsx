import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../hooks/useToast';

interface ImageEditorProps {
  imageUrl: string;
  imageID: number;
  version?: number; // 版本号，用于强制重新加载图片
  onSave: () => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, imageID, version, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // 裁剪相关状态
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // 色调调整参数
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [hue, setHue] = useState(0);
  
  const { success, error: showError } = useToast();

  // 加载图片 - 通过 API 端点获取图片避免 CORS 问题
  useEffect(() => {
    // 重置加载状态
    setImageLoaded(false);
    
    let blobUrl: string | null = null;
    
    const loadImage = async () => {
      try {
        // 添加时间戳参数避免浏览器缓存
        const response = await apiClient.get(`/images/${imageID}/file?t=${Date.now()}`, {
          responseType: 'blob',
        });
        
        const blob = response.data;
        blobUrl = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current && imageRef.current && containerRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // 设置 canvas 的内部尺寸为图片的实际尺寸
              canvas.width = img.width;
              canvas.height = img.height;
              
              // 计算合适的显示尺寸，保持宽高比
              const container = containerRef.current;
              const maxWidth = container.clientWidth - 32; // 减去 padding
              const maxHeight = window.innerHeight * 0.6; // max-h-[60vh]
              
              const imgAspect = img.width / img.height;
              let displayWidth = img.width;
              let displayHeight = img.height;
              
              if (displayWidth > maxWidth) {
                displayWidth = maxWidth;
                displayHeight = displayWidth / imgAspect;
              }
              
              if (displayHeight > maxHeight) {
                displayHeight = maxHeight;
                displayWidth = displayHeight * imgAspect;
              }
              
              // 设置 canvas 的显示尺寸（CSS）
              canvas.style.width = `${displayWidth}px`;
              canvas.style.height = `${displayHeight}px`;
              
              imageRef.current.src = img.src;
              setImageLoaded(true);
            }
          }
        };
        img.onerror = () => {
          showError('图片加载失败');
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
          }
        };
        img.src = blobUrl;
      } catch (error) {
        console.error('Failed to load image:', error);
        showError('图片加载失败');
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
      }
    };
    
    loadImage();
    
    // 清理函数：组件卸载时清理 blob URL
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageID, version]); // 添加 version 作为依赖，当版本变化时重新加载

  // 绘制图片（应用所有效果）
  const drawImage = React.useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 应用滤镜效果
    ctx.filter = `
      brightness(${100 + brightness}%)
      contrast(${100 + contrast}%)
      saturate(${100 + saturation}%)
      hue-rotate(${hue}deg)
    `;
    
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    
    // 绘制裁剪框
    if (cropMode && (cropEnd.x !== 0 || cropEnd.y !== 0)) {
      const x = Math.min(cropStart.x, cropEnd.x);
      const y = Math.min(cropStart.y, cropEnd.y);
      const width = Math.abs(cropEnd.x - cropStart.x);
      const height = Math.abs(cropEnd.y - cropStart.y);
      
      // 确保裁剪区域在 canvas 范围内
      const clampedX = Math.max(0, Math.min(x, canvas.width));
      const clampedY = Math.max(0, Math.min(y, canvas.height));
      const clampedWidth = Math.max(0, Math.min(width, canvas.width - clampedX));
      const clampedHeight = Math.max(0, Math.min(height, canvas.height - clampedY));
      
      // 绘制半透明遮罩
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 清除裁剪区域并重新绘制（应用滤镜）
      ctx.save();
      ctx.filter = `
        brightness(${100 + brightness}%)
        contrast(${100 + contrast}%)
        saturate(${100 + saturation}%)
        hue-rotate(${hue}deg)
      `;
      ctx.drawImage(
        imageRef.current,
        clampedX, clampedY, clampedWidth, clampedHeight,
        clampedX, clampedY, clampedWidth, clampedHeight
      );
      ctx.restore();
      
      // 绘制裁剪框边框
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);
      
      // 绘制角落控制点
      const cornerSize = 10;
      ctx.fillStyle = '#3b82f6';
      // 四个角
      ctx.fillRect(clampedX - cornerSize/2, clampedY - cornerSize/2, cornerSize, cornerSize);
      ctx.fillRect(clampedX + clampedWidth - cornerSize/2, clampedY - cornerSize/2, cornerSize, cornerSize);
      ctx.fillRect(clampedX - cornerSize/2, clampedY + clampedHeight - cornerSize/2, cornerSize, cornerSize);
      ctx.fillRect(clampedX + clampedWidth - cornerSize/2, clampedY + clampedHeight - cornerSize/2, cornerSize, cornerSize);
    }
  }, [brightness, contrast, saturation, hue, cropMode, cropStart, cropEnd, imageLoaded]);

  useEffect(() => {
    if (imageLoaded) {
      drawImage();
    }
  }, [drawImage, imageLoaded]);

  // 鼠标事件处理（裁剪）
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // 计算缩放比例：内部尺寸 / 显示尺寸
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !isDragging) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // 计算缩放比例：内部尺寸 / 显示尺寸
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setCropEnd({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 应用裁剪
  const applyCrop = () => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算裁剪区域（使用内部坐标）
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const width = Math.abs(cropEnd.x - cropStart.x);
    const height = Math.abs(cropEnd.y - cropStart.y);
    
    // 确保裁剪区域在 canvas 范围内
    const clampedX = Math.max(0, Math.min(x, canvas.width));
    const clampedY = Math.max(0, Math.min(y, canvas.height));
    const clampedWidth = Math.max(0, Math.min(width, canvas.width - clampedX));
    const clampedHeight = Math.max(0, Math.min(height, canvas.height - clampedY));
    
    if (clampedWidth === 0 || clampedHeight === 0) {
      showError('请选择裁剪区域');
      return;
    }
    
    // 从当前 canvas 中提取裁剪区域（已经应用了滤镜）
    const imageData = ctx.getImageData(clampedX, clampedY, clampedWidth, clampedHeight);
    
    // 创建新canvas用于裁剪后的图片
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = clampedWidth;
    croppedCanvas.height = clampedHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;
    
    // 将裁剪的区域绘制到新 canvas
    croppedCtx.putImageData(imageData, 0, 0);
    
    // 将裁剪后的内容转换为图片，用于更新 imageRef
    const croppedImageDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
    
    // 更新 imageRef 为裁剪后的图片（用于后续操作和保存）
    const newImg = new Image();
    newImg.onload = () => {
      if (imageRef.current && canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        
        // 更新 imageRef
        imageRef.current.src = newImg.src;
        
        // 更新 canvas 的内部尺寸
        canvas.width = newImg.width;
        canvas.height = newImg.height;
        
        // 重新计算显示尺寸，保持宽高比
        const maxWidth = container.clientWidth - 32;
        const maxHeight = window.innerHeight * 0.6;
        
        const imgAspect = newImg.width / newImg.height;
        let displayWidth = newImg.width;
        let displayHeight = newImg.height;
        
        if (displayWidth > maxWidth) {
          displayWidth = maxWidth;
          displayHeight = displayWidth / imgAspect;
        }
        
        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = displayHeight * imgAspect;
        }
        
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        // 重新绘制（不应用滤镜，因为裁剪时已经应用了）
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(newImg, 0, 0);
        }
        
        // 重置图片加载状态，触发重新绘制
        setImageLoaded(false);
        setTimeout(() => setImageLoaded(true), 100);
      }
    };
    newImg.src = croppedImageDataUrl;
    
    // 重置裁剪状态
    setCropMode(false);
    setCropStart({ x: 0, y: 0 });
    setCropEnd({ x: 0, y: 0 });
  };

  // 保存编辑后的图片
  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    setIsLoading(true);
    try {
      // 将canvas转换为base64
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.9);
      
      // 发送到后端
      await apiClient.put(`/images/${imageID}/edit`, {
        imageData: imageData,
      });
      
      success('图片编辑成功！');
      onSave();
    } catch (error) {
      console.error('Failed to save edited image:', error);
      showError('保存失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置所有调整
  const handleReset = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setHue(0);
    setCropMode(false);
    setCropStart({ x: 0, y: 0 });
    setCropEnd({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <button
          onClick={() => setCropMode(!cropMode)}
          className={`btn ${cropMode ? 'btn-primary' : 'btn-outline'} text-sm`}
        >
          {cropMode ? '取消裁剪' : '裁剪'}
        </button>
        {cropMode && (
          <button
            onClick={applyCrop}
            className="btn btn-primary text-sm"
          >
            应用裁剪
          </button>
        )}
        <button
          onClick={handleReset}
          className="btn btn-outline text-sm"
        >
          重置
        </button>
      </div>

      {/* 色调调整滑块 */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">色调调整</h3>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            亮度: {brightness > 0 ? '+' : ''}{brightness}%
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            对比度: {contrast > 0 ? '+' : ''}{contrast}%
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            饱和度: {saturation > 0 ? '+' : ''}{saturation}%
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            色相: {hue}°
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Canvas 画布 */}
      <div 
        ref={containerRef}
        className="flex justify-center items-center bg-gray-100 rounded-lg p-4 overflow-auto max-h-[60vh]"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
          style={{ 
            cursor: cropMode ? 'crosshair' : 'default',
            display: 'block'
          }}
        />
        <img ref={imageRef} className="hidden" alt="source" />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="btn btn-outline"
          disabled={isLoading}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="btn btn-primary"
          disabled={isLoading || !imageLoaded}
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;

