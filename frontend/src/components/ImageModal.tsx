import React from 'react';

interface ImageModalProps {
  image: {
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
  };
  isOpen: boolean;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ image, isOpen, onClose }) => {
  if (!isOpen) return null;

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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            fontSize: '20px',
            zIndex: 1001
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', flexDirection: 'row', minHeight: '400px' }}>
          {/* 图片部分 */}
          <div style={{ flex: '1', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={`http://localhost:8080/${image.filePath}`}
              alt={image.filename}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>

          {/* EXIF信息部分 */}
          <div style={{ 
            flex: '1', 
            padding: '20px', 
            backgroundColor: '#f8f9fa',
            borderLeft: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>图片详情</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>基本信息</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div><strong>文件名:</strong> {image.filename}</div>
                <div><strong>上传时间:</strong> {formatDate(image.takenAt)}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>相机信息</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div><strong>制造商:</strong> {image.cameraMake || 'N/A'}</div>
                <div><strong>型号:</strong> {image.cameraModel || 'N/A'}</div>
                <div><strong>分辨率:</strong> {image.resolution || 'N/A'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>位置信息</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div><strong>GPS坐标:</strong> {formatCoordinates(image.latitude, image.longitude)}</div>
                {image.latitude && image.longitude && (
                  <div style={{ marginTop: '10px' }}>
                    <a 
                      href={getGoogleMapsLink(image.latitude, image.longitude)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#007bff', 
                        textDecoration: 'none',
                        fontSize: '14px',
                        display: 'inline-block',
                        padding: '8px 16px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '4px',
                        border: '1px solid #2196f3'
                      }}
                    >
                      📍 在Google地图中查看位置
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => window.open(`http://localhost:8080/${image.filePath}`, '_blank')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginRight: '10px'
                }}
              >
                🔗 查看原图
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `http://localhost:8080/${image.filePath}`;
                  link.download = image.filename;
                  link.click();
                }}
                style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                💾 下载图片
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageModal;

