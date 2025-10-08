import React, { useState, useEffect } from 'react';
import TagManager from './TagManager';
import apiClient from '../api/client';

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
  onImageUpdate: () => void; // 新增回调，通知 Dashboard 刷新
}

const ImageModal: React.FC<ImageModalProps> = ({ image, isOpen, onClose, onImageUpdate }) => {
  if (!isOpen) return null;

  const [currentImage, setCurrentImage] = useState<Image>(image);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 当标签被增删后，此函数被调用以刷新数据
  const handleTagsUpdated = async () => {
    try {
      const response = await apiClient.get<Image>(`/images/${currentImage.ID}`);
      setCurrentImage(response.data);
      // 通知父组件(Dashboard)数据已更新，以便刷新整个列表
      onImageUpdate();
    } catch (error) {
      console.error("Failed to refresh image data after tag update:", error);
    }
  };

  // 删除图片
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/images/${currentImage.ID}`);
      alert('图片删除成功！');
      onClose(); // 关闭模态框
      onImageUpdate(); // 刷新画廊列表
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert('删除图片失败，请稍后重试');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 使用 useEffect 确保每次打开不同图片的模态框时，内容都正确更新
  useEffect(() => {
    setCurrentImage(image);
    setShowDeleteConfirm(false); // 重置删除确认对话框状态
  }, [image]);


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatCoordinates = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'N/A';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getGoogleMapsLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return undefined;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white', color: '#333',
        borderRadius: '12px', maxWidth: '90vw', maxHeight: '90vh',
        overflow: 'hidden', position: 'relative', display: 'flex',
        flexDirection: 'row', minHeight: '400px',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'rgba(0, 0, 0, 0.5)', color: 'white', border: 'none',
          borderRadius: '50%', width: '40px', height: '40px',
          cursor: 'pointer', fontSize: '20px', zIndex: 1001,
          lineHeight: '40px', padding: 0
        }}>
          ×
        </button>

        <div style={{ flex: '1.5', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecef' }}>
          <img
            src={`http://localhost:8080/${currentImage.filePath}`}
            alt={currentImage.filename}
            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>

        <div style={{ flex: '1', padding: '20px', borderLeft: '1px solid #dee2e6', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>图片详情</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>基本信息</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>文件名:</strong> {currentImage.filename}</div>
              <div><strong>拍摄时间:</strong> {formatDate(currentImage.takenAt)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>相机信息</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>制造商:</strong> {currentImage.cameraMake || 'N/A'}</div>
              <div><strong>型号:</strong> {currentImage.cameraModel || 'N/A'}</div>
              <div><strong>分辨率:</strong> {currentImage.resolution || 'N/A'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>位置信息</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div><strong>GPS坐标:</strong> {formatCoordinates(currentImage.latitude, currentImage.longitude)}</div>
              {currentImage.latitude && currentImage.longitude && (
                <div style={{ marginTop: '10px' }}>
                  <a href={getGoogleMapsLink(currentImage.latitude, currentImage.longitude)} target="_blank" rel="noopener noreferrer">
                    📍 在 Google 地图中查看位置
                  </a>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <TagManager
              imageID={currentImage.ID}
              tags={currentImage.Tags || []}
              onTagsUpdated={handleTagsUpdated}
            />
          </div>

          {/* 删除按钮区域 */}
          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #dee2e6' }}>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
              >
                🗑️ 删除图片
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#dc3545', marginBottom: '15px', fontSize: '14px' }}>
                  ⚠️ 确定要删除这张图片吗？此操作不可恢复！
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: isDeleting ? 0.6 : 1
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      opacity: isDeleting ? 0.6 : 1
                    }}
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
  );
};

export default ImageModal;