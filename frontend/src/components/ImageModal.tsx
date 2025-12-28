import React, { useState, useEffect } from 'react';
import TagManager from './TagManager';
import EXIFViewer from './EXIFViewer';
import ImageEditor from './ImageEditor';
import apiClient from '../api/client';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
import { getImageURL } from '../utils/api';

// 定义 Tag 类型
interface Tag {
  ID: number;
  name: string;
  source?: string; // 'user' 或 'ai'
}

// 定义 Image 类型
interface Image {
  ID: number;
  filename: string;
  filePath: string;
  thumbnailPath: string;
  cameraMake?: string;
  cameraModel?: string;
  resolution?: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  Tags: Tag[];
}

interface ImageModalProps {
  image: Image;
  images?: Image[]; // 所有图片列表，用于轮播
  isOpen: boolean;
  onClose: () => void;
  onImageUpdate: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, images = [], isOpen, onClose, onImageUpdate }) => {
  const [currentImage, setCurrentImage] = useState<Image>(image);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0); // 编辑器版本号，用于强制重新加载
  const [isAnalyzing, setIsAnalyzing] = useState(false); // AI 分析状态
  const { toasts, removeToast, success, error: showError } = useToast();

  // 当标签被增删后，此函数被调用以刷新数据
  const handleTagsUpdated = async () => {
    try {
      const response = await apiClient.get<Image>(`/images/${currentImage.ID}`);
      setCurrentImage(response.data);
      onImageUpdate();
    } catch (error) {
      console.error("Failed to refresh image data after tag update:", error);
      showError('刷新图片信息失败');
    }
  };

  // 删除图片
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/images/${currentImage.ID}`);
      success('图片删除成功！');
      onClose();
      onImageUpdate();
    } catch (error) {
      console.error("Failed to delete image:", error);
      showError('删除图片失败，请稍后重试');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 初始化当前图片索引
  useEffect(() => {
    if (images.length > 0) {
      const index = images.findIndex(img => img.ID === image.ID);
      if (index !== -1) {
        setCurrentIndex(index);
        setCurrentImage(images[index]);
      } else {
        setCurrentImage(image);
      }
    } else {
      setCurrentImage(image);
    }
    setShowDeleteConfirm(false);
  }, [image, images]);

  // 切换到上一张图片
  const handlePrevious = () => {
    if (images.length > 0) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      setCurrentIndex(newIndex);
      setCurrentImage(images[newIndex]);
      setShowDeleteConfirm(false);
    }
  };

  // 切换到下一张图片
  const handleNext = () => {
    if (images.length > 0) {
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(newIndex);
      setCurrentImage(images[newIndex]);
      setShowDeleteConfirm(false);
    }
  };

  // 键盘事件处理
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && images.length > 1) {
        e.preventDefault();
        const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
        setCurrentIndex(newIndex);
        setCurrentImage(images[newIndex]);
        setShowDeleteConfirm(false);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        e.preventDefault();
        const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
        setCurrentIndex(newIndex);
        setCurrentImage(images[newIndex]);
        setShowDeleteConfirm(false);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCoordinates = (lat?: number, lng?: number) => {
    if (!lat || !lng) return '无位置信息';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getGoogleMapsLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return undefined;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  // 触发 AI 分析
  const handleAnalyzeImage = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiClient.post(`/images/${currentImage.ID}/analyze`);
      success('AI 分析完成！已添加标签');
      // 刷新图片信息
      await handleTagsUpdated();
    } catch (error: any) {
      console.error("Failed to analyze image:", error);
      const errorMsg = error.response?.data?.error || 'AI 分析失败，请稍后重试';
      showError(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 处理编辑完成
  const handleEditComplete = async () => {
    setShowEditor(false);
    // 更新编辑器版本号，强制下次打开时重新加载图片
    setEditorVersion(prev => prev + 1);
    // 刷新图片信息
    try {
      const response = await apiClient.get<Image>(`/images/${currentImage.ID}`);
      // 更新图片数据，并添加时间戳来强制刷新缓存
      const updatedImage = {
        ...response.data,
        _cacheBuster: Date.now(), // 添加缓存破坏参数
      };
      setCurrentImage(updatedImage);
      onImageUpdate();
    } catch (error) {
      console.error("Failed to refresh image data after edit:", error);
      showError('刷新图片信息失败');
    }
  };

  // 打开编辑器时，更新版本号以确保重新加载图片
  const handleOpenEditor = () => {
    setEditorVersion(prev => prev + 1);
    setShowEditor(true);
  };

  if (!isOpen) return null;

  // 如果显示编辑器，只显示编辑器界面
  if (showEditor) {
    return (
      <>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowEditor(false)}
        >
        <div 
          className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl max-w-5xl w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in p-4 sm:p-6 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100">编辑图片</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ImageEditor
              key={`editor-${currentImage.ID}-${editorVersion}`}
              imageUrl={getImageURL(currentImage.filePath)}
              imageID={currentImage.ID}
              version={editorVersion}
              onSave={handleEditComplete}
              onCancel={() => setShowEditor(false)}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-0 sm:p-4 animate-fade-in"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl max-w-6xl w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 图片区域 */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-4 sm:p-8 relative min-h-0">
            {images.length > 1 && (
              <>
                {/* 上一张按钮 */}
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all z-10 touch-manipulation"
                  aria-label="上一张"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* 下一张按钮 */}
                <button
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all z-10 touch-manipulation"
                  aria-label="下一张"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* 图片计数器 */}
                <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm z-10">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
            <img
              key={`${currentImage.ID}-${(currentImage as any)._cacheBuster || ''}`}
              src={`${getImageURL(currentImage.filePath)}?v=${(currentImage as any)._cacheBuster || Date.now()}`}
              alt={currentImage.filename}
              className="max-w-full max-h-[50vh] sm:max-h-[70vh] object-contain rounded-lg"
            />
          </div>

          {/* 信息区域 */}
          <div className="w-full flex flex-col bg-white dark:bg-gray-800 transition-colors max-h-[50vh] sm:max-h-none sm:w-96">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words">
                  {currentImage.filename}
                </h2>
              </div>

              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  基本信息
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-gray-500">拍摄时间</p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(currentImage.takenAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 相机信息 */}
              {(currentImage.cameraMake || currentImage.cameraModel || currentImage.resolution) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    相机信息
                  </h3>
                  <div className="space-y-2 text-sm">
                    {currentImage.cameraMake && (
                      <div>
                        <p className="text-gray-500">制造商</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{currentImage.cameraMake}</p>
                      </div>
                    )}
                    {currentImage.cameraModel && (
                      <div>
                        <p className="text-gray-500">型号</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{currentImage.cameraModel}</p>
                      </div>
                    )}
                    {currentImage.resolution && (
                      <div>
                        <p className="text-gray-500">分辨率</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{currentImage.resolution}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 位置信息 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  位置信息
                </h3>
                <div className="text-sm">
                  <p className="text-gray-500 mb-1">GPS 坐标</p>
                  <p className="text-gray-900 dark:text-gray-100 font-medium mb-3">{formatCoordinates(currentImage.latitude, currentImage.longitude)}</p>
                  {currentImage.latitude && currentImage.longitude && (
                    <a
                      href={getGoogleMapsLink(currentImage.latitude, currentImage.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      在 Google 地图中查看
                    </a>
                  )}
                </div>
              </div>

              {/* 标签管理 */}
              <div>
                <TagManager
                  imageID={currentImage.ID}
                  tags={currentImage.Tags || []}
                  onTagsUpdated={handleTagsUpdated}
                />
              </div>

              {/* 完整 EXIF 信息查看器 */}
              <div>
                <EXIFViewer image={currentImage} />
              </div>
            </div>

            {/* 操作按钮区域 */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-2 sm:space-y-3 transition-colors">
              {/* AI 分析按钮 */}
              <button
                onClick={handleAnalyzeImage}
                disabled={isAnalyzing}
                className="w-full btn btn-outline flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base py-2.5 sm:py-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    分析中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI 智能分析
                  </>
                )}
              </button>
              
              {/* 编辑按钮 */}
              <button
                onClick={handleOpenEditor}
                className="w-full btn btn-primary flex items-center justify-center gap-2 text-sm sm:text-base py-2.5 sm:py-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑图片
              </button>
              
              {/* 删除按钮 */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full btn btn-danger flex items-center justify-center gap-2 text-sm sm:text-base py-2.5 sm:py-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除图片
                </button>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium text-center">
                    ⚠️ 确定要删除这张图片吗？此操作不可恢复！
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1 btn btn-outline text-sm sm:text-base py-2.5 sm:py-2 order-2 sm:order-1"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 btn btn-danger disabled:opacity-50 text-sm sm:text-base py-2.5 sm:py-2 order-1 sm:order-2"
                    >
                      {isDeleting ? '删除中...' : '确认删除'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageModal;
