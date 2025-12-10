import React, { useState, useEffect } from 'react';
import TagManager from './TagManager';
import EXIFViewer from './EXIFViewer';
import apiClient from '../api/client';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

// 定义 Tag 类型
interface Tag {
  ID: number;
  name: string;
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
  isOpen: boolean;
  onClose: () => void;
  onImageUpdate: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, isOpen, onClose, onImageUpdate }) => {
  const [currentImage, setCurrentImage] = useState<Image>(image);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  useEffect(() => {
    setCurrentImage(image);
    setShowDeleteConfirm(false);
  }, [image]);

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

  if (!isOpen) return null;

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
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 图片区域 */}
          <div className="flex-1 bg-gray-900 flex items-center justify-center p-8">
            <img
              src={`http://localhost:8080/${currentImage.filePath}`}
              alt={currentImage.filename}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          </div>

          {/* 信息区域 */}
          <div className="w-full md:w-96 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 break-words">
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
                      <p className="text-gray-900 font-medium">{formatDate(currentImage.takenAt)}</p>
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
                        <p className="text-gray-900 font-medium">{currentImage.cameraMake}</p>
                      </div>
                    )}
                    {currentImage.cameraModel && (
                      <div>
                        <p className="text-gray-500">型号</p>
                        <p className="text-gray-900 font-medium">{currentImage.cameraModel}</p>
                      </div>
                    )}
                    {currentImage.resolution && (
                      <div>
                        <p className="text-gray-500">分辨率</p>
                        <p className="text-gray-900 font-medium">{currentImage.resolution}</p>
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
                  <p className="text-gray-900 font-medium mb-3">{formatCoordinates(currentImage.latitude, currentImage.longitude)}</p>
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

            {/* 删除按钮区域 */}
            <div className="border-t border-gray-200 p-6">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full btn btn-danger flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除图片
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 font-medium text-center">
                    ⚠️ 确定要删除这张图片吗？此操作不可恢复！
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1 btn btn-outline"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 btn btn-danger disabled:opacity-50"
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
